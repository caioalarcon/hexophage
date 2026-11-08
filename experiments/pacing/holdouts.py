"""Compact the exact checks produced by attention.mjs and openings.mjs."""
import json
import sys
from pathlib import Path

directory = Path(sys.argv[1])
out = {}
for name in ("short", "long", "poly-long"):
    result = json.loads((directory / f"pacing-{name}.json").read_text())
    attention = [r for r in result["attention"] if r["policy"] == "mixed"]
    full = [r for r in attention if r["horizon"] == 1_440_000]
    overnight = [r for r in attention if r["horizon"] != 1_440_000]
    def last(r):
        return {k: r["last"][k] for k in ("orders", "burst", "gunBurst", "energyFlow", "field")}
    out[name] = {
        "rule": result["rule"],
        "two_hours_mixed_orders_by_seconds_between_reviews": {r["secondsPerReview"]: r["last"]["orders"] for r in full},
        "seconds_between_unrestricted_mixed_orders": full[0]["gaps"],
        "overnight_at_common_clock_8h30": {s: last(r) for s, r in zip(("active30min_then_absent8h","reviews_every30s","founder_then_absent"),overnight,strict=True)},
        "mixed_recovery_after_complete_asset_loss": [
            {"at_minute": r["wipeAt"] / 12000, "seconds_until_next_placement": (r["firstAfterWipe"]-r["wipeAt"])/200 if r["firstAfterWipe"] is not None else None}
            for r in result["recovery"] if r["policy"] == "mixed"],
    }
openings = json.loads((directory/"pacing-openings.json").read_text())
for k, n in (("short","short"),("long","long"),("poly-long","polynomial")):
    choices=[r for r in openings if r["rule"] == n and r["life"] == 12000 and r["firstGun"] is not None]
    first=min(choices,key=lambda r:r["firstGun"])
    out[k]["fastest_funded_P20_among_45_openings"] = {"initial_total_assets": first["copies"], "asset_after_founder": first["id"], "minutes":first["firstGun"]/12000}
Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
