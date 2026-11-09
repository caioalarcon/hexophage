"""Join the JSON rows printed by matches.mjs. Each cohort must be paired by seed."""
import csv
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2]) if len(sys.argv)>2 else Path(__file__).with_name("matches.csv")
rows = []
seen = set()
for path in sorted(source.glob("*.json")):
    m = json.loads(path.read_text())
    identity = tuple(m[k] for k in ("rule","conflict","policy","mode","F","horizon","seed"))
    if identity in seen:
        raise ValueError(f"Duplicate run {identity}")
    seen.add(identity)
    players = m.pop("players")
    assert len(players)==5 and m["finalField"]==sum(p["field"] for p in players)
    assert m["eliminated"]==sum(p["out"] for p in players)
    assert abs(m["tribute"]-sum(p["tributeOut"] for p in players)) < .001
    if m["conflict"] != "legacy":
        assert m["peakGrey"] == 0, identity
    m["richestFieldShare"] = round(max(p["field"] for p in players)/m["finalField"],4) if m["finalField"] else ""
    m["finalReserves"] = round(sum(p["cash"] for p in players),2)
    for i,role in enumerate(["defender","attacker"]):
        for metric in ["field","cash","out","flow"]:
            m[role+metric.title()] = players[i][metric]
    rows.append(m)

head = ("rule conflict policy mode F sites seed horizon gen defender ship offset angle initialPlacements "
        "ended winner eliminated firstOut activeBots positiveFlow finalField finalGrey peakLive peakGrey peakGreyFraction firstGrey "
        "buys aimed studies tribute payingBots contactTicks firstDamage lateTransfer sampledTouch samples lateTouch lateSamples firstTouch lastTouch "
        "sharedSites leadChanges eroded richestFieldShare finalReserves defenderField attackerField defenderCash attackerCash "
        "defenderOut attackerOut defenderFlow attackerFlow").split()
with target.open("w",newline="") as out:
    writer = csv.DictWriter(out,fieldnames=head,lineterminator="\n")
    writer.writeheader()
    writer.writerows(sorted(rows,key=lambda r:(r["mode"],r["F"],r["horizon"],r["rule"],r["seed"],r["conflict"],r["policy"])))
print(f"{len(rows)} matches, {sum(r['gen'] for r in rows):,} generations")
