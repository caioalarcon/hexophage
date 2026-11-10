"""Reproduce the paired controller × tariff comparison and the paid-order replays."""
import argparse
import csv
import itertools
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

here = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("cache", type=Path, help="Persistent directory for full order tapes")
parser.add_argument("--output", type=Path, default=here)
parser.add_argument("--workers", type=int, default=3)
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
args.output.mkdir(parents=True, exist_ok=True)
rules = "callahan bays hex-b2s34 hex-b2s245 bays245 andreen highhex ashley15 ashley".split()
seeds = [19271, 38459, 75109]

def run(case):
    rule, price, bot, seed = case
    fields = [rule, price, bot, '24', '8192', str(seed)]
    tape = args.cache / ('.'.join(fields) + '.json')
    if not tape.exists():
        content = subprocess.check_output(['node', here / 'match.mjs', *fields, '1'])
        json.loads(content)
        tape.write_bytes(content)
    game = json.loads(tape.read_text())
    keys = 'rule prices controller F seed gen bought aimed buyers firstAttack firstLoss eliminated winner field peak refused'.split()
    row = {k: game[k] for k in keys}
    metrics = game['metrics']
    for k in ['comparedSites', 'phaseTrials', 'delayedAttacks', 'forecasts', 'forecastsCensored']:
        row[k] = metrics.get(k)
    row.update(located=None, beyond60=None)
    shots = []
    if price == 'suggested' and bot == 'new':
        out = subprocess.check_output(['node', here / 'replay.mjs', tape, '3'], text=True)
        for record in map(json.loads, out.splitlines()):
            if 'located' in record:
                row.update(located=record['located'], beyond60=record['remote'])
                continue
            for arm, outcome in record['arms'].items():
                keys = 'rule seed F gen owner stamp phase offset sample t'.split()
                shots.append({**{k: record.get(k) for k in keys}, 'targetId': record['rival'], 'arm': arm, **outcome})
    return row, shots

def save(name, rows):
    with (args.output / name).open('w', newline='') as dest:
        writer = csv.DictWriter(dest, fieldnames=rows[0].keys(), lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)

cases = itertools.product(rules, ['old', 'suggested'], ['old', 'new'], seeds)
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    results = list(pool.map(run, cases))
save('matches.csv', [row for row, _ in results])
save('attacks.csv', [shot for _, shots in results for shot in shots])
