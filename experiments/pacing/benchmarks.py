"""Measure RTS match duration and investment cadence from three published datasets."""

import argparse
import csv
import gzip
import io
import itertools
import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean, median, quantiles
from zipfile import ZipFile

FACILITIES = {
    "ArcheryRange",
    "Barracks",
    "Blacksmith",
    "Castle",
    "Krepost",
    "LumberCamp",
    "Market",
    "Mill",
    "MiningCamp",
    "Monastery",
    "Outpost",
    "SiegeWorkshop",
    "Stable",
    "Tower",
    "University",
}


def building(name):
    if name.startswith("TownCenter ") and name.endswith("(Main)"):
        return "facility"
    if "(" in name:
        return None
    kind = name.split()[0]
    if kind == "FARM0NNG":
        return "farm"
    if kind == "House":
        return "house"
    if kind in FACILITIES:
        return "facility"


def summarize(nums):
    if not nums:
        return None
    cuts = (
        quantiles(nums, n=100, method="inclusive") if len(nums) > 1 else [nums[0]] * 99
    )
    return {
        k: round(v, 3)
        for k, v in {
            "n": len(nums),
            "mean": mean(nums),
            "p10": cuts[9],
            "p25": cuts[24],
            "median": median(nums),
            "p75": cuts[74],
            "p90": cuts[89],
            "max": max(nums),
        }.items()
    }


def read_match(stream):
    raw = json.load(stream)
    for snap in raw["gameStates"]:
        players = []
        for p in snap["playerMain"]["players"]:
            if not p["civilization"] or p["name"] == "Gaia":
                continue
            sites = set()
            for o in p["objectList"]["objects"]:
                if not o or not o.get("n") or not o.get("p"):
                    continue
                group = building(o["n"])
                if group:
                    sites.add((group, o["p"]["x"], o["p"]["y"]))
            players.append((p["name"], sites, p["resources"]))
        yield snap["time"] / 1000, players


def measure(snapshots, metrics, durations, unique):
    _, players = snapshots[0]
    end = snapshots[-1][0]
    # Original timer counts in-game ms. Present a nominal Normal-speed (1.7×) equivalent.
    speed = 1.7
    duration = end / 60 / speed
    durations.append(duration)
    for name, baseline, initial in players:
        unique.add(name)
        seen = baseline.copy()
        events = []
        max_research = initial["totalResearchCount"]
        balances = []
        first_seen = {}

        for t, group in snapshots[1:]:
            _, sites, res = next(p for p in group if p[0] == name)
            new_research = res["totalResearchCount"]
            for key, condition in [
                ("feudal", res["age"] >= 1),
                ("castle", res["age"] >= 2),
                ("imperial", res["age"] >= 3),
                ("recorded-kill", res["kills"] > 0),
            ]:
                if condition:
                    first_seen.setdefault(key, t / speed / 60)
            stock = sum(res[k] for k in ("wood", "food", "gold", "stone"))
            gathered = sum(
                res[k] for k in ("totalWood", "totalFood", "totalGold", "totalStone")
            )
            balances.append((t / speed / 60, stock, gathered))

            changes = Counter(k for k, x, y in sites - seen)
            seen.update(sites)
            changes["tech"] = max(0, new_research - max_research)
            max_research = max(max_research, new_research)
            if changes.total():
                events.append((t / speed, changes))
        for key, val in first_seen.items():
            metrics["first-observed-minutes/" + key].append(val)
        for minute in [10, 15, 20]:
            if duration < minute:
                continue
            prior = next(row for row in reversed(balances) if row[0] <= minute - 5)
            now = next(row for row in reversed(balances) if row[0] <= minute)
            income = (now[2] - prior[2]) / (now[0] - prior[0])
            if income > 0:
                metrics["stock/minutes-of-gross-income@" + str(minute)].append(
                    now[1] / income
                )
        categories = {
            "sites": ("house", "farm", "facility"),
            "facility": ("facility",),
            "research": ("tech",),
            "macro": ("house", "farm", "facility", "tech"),
            "facility+research": ("facility", "tech"),
        }
        for key, types in categories.items():
            counted = [
                (t, sum(c[k] for k in types))
                for t, c in events
                if sum(c[k] for k in types)
            ]
            counts = sum(n for _, n in counted)
            metrics[key + "/min"].append(counts / duration)
            # Distinct observed event windows, since events in one snapshot have no known ordering.
            gaps = [b[0] - a[0] for a, b in itertools.pairwise(counted)]
            metrics[key + "/window-gap-seconds"].extend(gaps)
            if counted:
                metrics[key + "/first-observed-seconds"].append(counted[0][0])
            for start in (0, 5, 10, 15, 20, 25, 30):
                if duration < start + 5:
                    continue
                metrics[f"{key}/min@{start}-{start + 5}"].append(
                    sum(n for t, n in counted if start * 60 < t <= (start + 5) * 60) / 5
                )
    return len(players)


def aoe2(archives):
    stats = defaultdict(list)
    durations = []
    unique = set()
    files = set()
    playergames = 0
    for archive in sorted(archives):
        with ZipFile(archive) as z:
            for name in sorted(z.namelist()):
                if not name.endswith(".recinfo"):
                    continue
                assert name not in files, name
                files.add(name)
                with z.open(name) as replay:
                    snapshots = list(read_match(replay))
                assert all(len(group) == 2 for _, group in snapshots), name
                assert all(b[0] >= a[0] for a, b in itertools.pairwise(snapshots)), name
                playergames += measure(snapshots, stats, durations, unique)
    return {
        "matches": len(files),
        "player_games": playergames,
        "player_names": len(unique),
        "last_snapshot_minutes": summarize(durations),
        "metrics": {k: summarize(v) for k, v in stats.items()},
    }


def sc2(archive):
    with ZipFile(archive) as z:
        rows = list(
            csv.DictReader(
                io.TextIOWrapper(
                    z.open("SkillCraft1_Dataset.csv"), encoding="utf-8-sig"
                )
            )
        )
    return {
        tier: {
            key: summarize(
                [
                    float(r[key]) * scale
                    for r in rows
                    if tier == 0 or int(r["LeagueIndex"]) == tier
                ]
            )
            for key, scale in [
                ("APM", 1),
                ("NumberOfPACs", 88.5 * 60),
                ("WorkersMade", 88.5 * 60),
            ]
        }
        for tier in range(9)
    }


def aoe4(archive):
    # This specific published dump is a JSON array, one complete game per line.
    # Use seconds from the API; e.g. finished_at - started_at in the source.
    seen = set()
    all_times = []
    no_valid_duration = 0
    first = None
    last = None
    with gzip.open(archive, "rt") as stream:
        for line in stream:
            record = line.strip().rstrip(",")
            if record in ("[", "]"):
                continue
            g = json.loads(record)
            assert g["kind"] == "rm_1v1"
            if g["game_id"] in seen:
                raise ValueError("duplicate game")
            seen.add(g["game_id"])
            d = g["duration"]
            if not isinstance(d, (int, float)) or d <= 0:
                no_valid_duration += 1
                continue
            t = g["started_at"]
            first = t if first is None else min(t, first)
            last = t if last is None else max(t, last)
            all_times.append(d / 60)
    result = {
        "records": len(seen),
        "invalid_duration": no_valid_duration,
        "starts": [first, last],
    }
    for key, times in [
        ("all_positive", all_times),
        ("at_least_5min", [d for d in all_times if d >= 5]),
    ]:
        result[key] = {
            "minutes": summarize(times),
            "at_least_percent": {
                cutoff: round(100 * sum(d >= cutoff for d in times) / len(times), 4)
                for cutoff in [30, 45, 60, 90, 120]
            },
        }
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--aoe2", type=Path, help="Directory with part1..part4.zip")
    ap.add_argument("--skillcraft", type=Path, help="Original SkillCraft archive")
    ap.add_argument(
        "--aoe4", type=Path, help="games_rm_1v1_s13.json.gz from AoE4 World dumps"
    )
    args = ap.parse_args()
    results = {}
    if args.aoe2:
        results["aoe2"] = aoe2(args.aoe2.glob("part*.zip"))
    if args.skillcraft:
        results["sc2"] = sc2(args.skillcraft)
    if args.aoe4:
        results["aoe4"] = aoe4(args.aoe4)
    print(json.dumps(results, indent=2))
