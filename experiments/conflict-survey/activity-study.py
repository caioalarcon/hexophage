"""Reproduce activity.csv and attacks.csv. The argument is a scratch directory."""
import csv
import itertools
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
scratch = Path(sys.argv[1]).resolve()
scratch.mkdir(parents=True, exist_ok=True)
matches = scratch / 'activity-runs'
matches.mkdir(exist_ok=True)
seeds = [4751, 8329, 1049]
policies = ['legacy', 'lineage', 'block']
rules = ['callahan', 'bays', 'hex-b2s34', 'hex-b2s245', 'bays245', 'andreen', 'highhex', 'ashley15', 'ashley']
design = [
    (rules, policies, 16, 32768),
    (['ashley15', 'bays', 'highhex'], policies, 40, 65536),
    (['ashley15', 'ashley', 'andreen', 'highhex', 'bays'], ['lineage'], 320, 65536),
    (['ashley15'], ['lineage'], 320, 360000),
]
for group, conflicts, size, horizon in design:
    for rule, conflict, seed in itertools.product(group, conflicts, seeds):
        dest = matches / f'{rule}-{conflict}-{seed}-{size}-{horizon}.json'
        if not dest.exists():
            result = subprocess.check_output(['node', here / 'matches.mjs', rule, conflict, 'organic',
                                              str(size), str(horizon), str(seed), 'activity'])
            dest.write_bytes(result)
subprocess.run([sys.executable, here / 'matches-collect.py', matches, here / 'activity.csv'], check=True)

rows = []
for size, seed, sample in itertools.product([40, 320], seeds, ['all', 'first-long']):
    text = subprocess.check_output(['node', here / 'attacks.mjs', 'ashley15', str(size), '65536',
                                    str(seed), 'lineage', sample], text=True)
    rows.extend(csv.reader(text.splitlines()))
rows.sort(key=lambda row: tuple(int(row[k]) for k in [1, 3, 4, 9]))
with (here / 'attacks.csv').open('w', newline='') as out:
    writer = csv.writer(out, lineterminator='\n')
    writer.writerow('rule F conflict seed gen owner rival stamp cost after ownCashDelta rivalCashDelta relativeCashDelta ownFieldDelta rivalFieldDelta attackEndedAfter holdEndedAfter'.split())
    writer.writerows(rows)
