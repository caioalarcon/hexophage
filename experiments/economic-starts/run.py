"""Run a matched economy experiment from the project root."""
import argparse
import csv
import itertools
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('scratch', type=Path, help='directory for individual match records')
parser.add_argument('stage', choices=['train', 'validation', 'long', 'production'])
parser.add_argument('workers', type=int, nargs='?', default=4)
args = parser.parse_args()
here = Path(__file__).resolve().parent
args.scratch.mkdir(parents=True, exist_ok=True)
rules = ['andreen','ashley','ashley15','bays','bays245','callahan','hex-b2s245','hex-b2s34','highhex']
header = (
    'rule preset F horizon seed growth gen initialReserve boughtBy1024 buyers repeatBuyers '
    'firstBuy fifthOpener firstAttack purchases aimed stamps targets tribute eliminated fieldOwners '
    'winner peak finalField peakFraction fieldPresence cashMultiple operatingCash unfunded stampSpending'
).split()

if args.stage == 'train':
    shared = ['original','patient','cores','early','scarce','pulse']
    extras = {'hex-b2s245':['lean','reserve','front','debt'], 'callahan':['compact','cellbank','scarceCore']}
    tariffs = {rule: shared + extras.get(rule, []) for rule in rules}
    dimensions = [(20, 4096)]
    seeds = [8273, 1193, 19711, 30047]
else:
    with (here / 'selection.csv').open() as f:
        tariffs = {r['rule']: list(dict.fromkeys(['original', r['preset']])) for r in csv.DictReader(f)}
    dimensions = {
        'validation':[(32, 16384), (96, 8192)], 'long':[(32, 65536)], 'production':[(320, 16384)],
    }[args.stage]
    seeds = [9181, 16921, 41597]

def play(job):
    rule, tariff, (frequency, horizon), seed = job
    command = ['node', str(here / 'match.mjs'), rule, tariff, str(frequency), str(horizon), str(seed), 'classic']
    output = subprocess.check_output(command, text=True)
    dest = args.scratch / f'{args.stage}_{rule}_{tariff}_{frequency}_{horizon}_{seed}.csv'
    dest.write_text(output)
    [row] = csv.reader(output.splitlines())
    assert len(row) == len(header), dest
    return row

jobs = [job for rule in rules for job in itertools.product([rule], tariffs[rule], dimensions, seeds)]
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    rows = list(pool.map(play, jobs))
with (here / (args.stage + '.csv')).open('w', newline='') as dest:
    writer = csv.writer(dest, lineterminator='\n')
    writer.writerow(header)
    writer.writerows(rows)
print(args.stage, len(rows), 'matches')
