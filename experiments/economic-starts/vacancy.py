"""Compare the optional empty-field fee in matched games with the same opening tariffs."""
import csv
import itertools
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

here = Path(__file__).resolve().parent
rules = ['andreen','ashley','ashley15','bays','bays245','callahan','hex-b2s245','hex-b2s34','highhex']
seeds = [593, 8087, 33703]
jobs = list(itertools.product(rules, ['wait','active'], seeds, [0,64]))
jobs += list(itertools.product(['callahan','ashley15','hex-b2s245'], ['loss'], seeds, [0,64]))
def play(job):
    return subprocess.check_output(['node', str(here/'vacancy.mjs'), *map(str, job)], text=True).strip().split(',')
with ThreadPoolExecutor(max_workers=int(sys.argv[1]) if len(sys.argv)>1 else 4) as pool:
    rows=list(pool.map(play,jobs))
with (here/'vacancy.csv').open('w', newline='') as f:
    w=csv.writer(f,lineterminator='\n')
    w.writerow('rule mode seed generationsPerStampCell grace gen winner seat subjectOut subjectStamps subjectFee totalFee eliminated purchases aimed fieldWiped cashAtLoss recoveredAt'.split())
    w.writerows(rows)
