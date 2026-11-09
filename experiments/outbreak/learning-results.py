"""Rebuild learning.csv from the previous preview and this checkout."""
import csv
import itertools
import json
import subprocess
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
previous = Path(sys.argv[1]).resolve()
current = here.parents[1]
stages = [('before', previous, 'classic'), ('after-classic', current, 'classic'), ('after-contained', current, 'contained')]
three = [1049, 4751, 8329]
cases = [
    ('ashley15', 40, 8192, 'activity', 'puff30', [1, 2, 3, 4, *three, 42, 11, 12, 13, 14]),
    ('ashley15', 320, 16384, 'activity', 'puff30', three),
    ('hex-b2s245', 32, 8192, 'stability', 'farm-4-12', three),
    ('callahan', 96, 8192, 'stability', 'stalk', three),
]

def collect(stage, stamp, row):
    return [stage, *[row[key] for key in ('rule', 'tariff', 'F', 'limit', 'session', 'seed', 'prior')], stamp,
            row['firstTrial'].get(stamp), row['first'].get(stamp), row['buyers'].get(stamp, 0),
            row['buys'].get(stamp, 0), row['orders'], row['measured'], row['visits'],
            round(row['paid'], 2), round(row['operatingCash'], 2), round(row['cash'], 2),
            row['aimed'], row['survivors'], row['field']]

def write(rows):
    with (here / 'learning.csv').open('w', newline='') as out:
        w = csv.writer(out, lineterminator='\n')
        w.writerow('stage rule policy F horizon session seed priorSamples stamp firstTrial firstBuy buyers buys allBuys studyCount visits stampSpending operatingCash finalCash rivalBuys survivingBots livingCells'.split())
        w.writerows(rows)

if __name__ == '__main__':
    records = []
    for (rule, f, horizon, policy, stamp, seeds), (stage, source, growth) in itertools.product(cases, stages):
        for seed in seeds:
            output = subprocess.check_output(['node', here / 'learning.mjs', rule, str(seed), str(f), str(horizon),
                                              source, policy, growth], text=True)
            records.extend(collect(stage, stamp, json.loads(line)) for line in output.splitlines())
    write(records)
