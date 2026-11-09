"""Reproduce the outbreak study; pass a scratch directory and optional number of workers."""
import csv
import json
import statistics
import subprocess
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

here = Path(__file__).resolve().parent
raw = Path(sys.argv[1]).resolve()
raw.mkdir(parents=True, exist_ok=True)
workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
rules = ['callahan', 'bays', 'hex-b2s34', 'hex-b2s245', 'bays245', 'andreen', 'highhex', 'ashley15', 'ashley']
jobs = []
for rule in rules:
    shards = 4 if rule == 'hex-b2s245' else 1
    for mode, horizon in [('contained', 1024), ('classic', 144)]:
        for shard in range(shards):
            jobs.append((f'screen-{rule}-{mode}-{shard}', ['screen', rule, 32, horizon, mode, 384, shard, shards]))
    for threshold in [384, 96]:
        jobs.append((f'atlas-{rule}-{threshold}', ['atlas', rule, 0, 1024, 'contained', threshold]))
for shard in range(4):
    jobs.append((f'endurance-shard-{shard}', ['screen', 'hex-b2s245', 32, 16384, 'contained', 384, shard, 4]))
with (here.parent / 'conflict-survey/contacts-by-pair.csv').open() as src:
    pairs = [r for r in csv.DictReader(src) if r['rule']=='hex-b2s245' and r['policy']=='lineage']
assert len(pairs)==24
for i, pair in enumerate(pairs):
    jobs.append((f'global-pair-{i}', ['case', 'hex-b2s245', 320, 4096, 'contained', 384, pair['ship'],
                 pair['target'], i%6, [-2, 0, 2][i%3], 16+i%2]))
witness = ['db-151', 'farm-4-12', 0, -2, 16]
for f in [32, 96, 320]:
    for mode, threshold in [('classic', 384), ('contained', 96), ('contained', 384), ('contained', 768)]:
        jobs.append((f'case-{f}-{mode}-{threshold}',
                     ['case', 'hex-b2s245', f, 1024 if mode == 'classic' else 4096, mode, threshold, *witness]))
for rule, name in [('ashley15', 'puff30'), ('ashley15', 'rotor126'), ('andreen', 'bagley-4-glider-gunship-p28'),
                   *[('hex-b2s245', x) for x in ['farm-4-12', 'farm-9-30', 'farm-10-36', 'farm-18-66', 'db-151']]]:
    for f in [32, 320]:
        for mode in ['classic', 'contained']:
            jobs.append((f'isolated-{rule}-{name}-{f}-{mode}', ['isolated', rule, f, 1024, mode, 384, name]))
jobs.append(('rescue-320', ['rescue', 'hex-b2s245', 320, 2048, 'contained', 384, *witness, 512]))


def run(job):
    name, args = job
    path = raw / (name + '.jsonl')
    if not path.exists():
        result = subprocess.check_output(['node', here / 'study.mjs', *map(str, args)])
        path.write_bytes(result)
    return name, [json.loads(line) for line in path.read_text().splitlines()]


def save(name, rows):
    with (here / name).open('w', newline='') as f:
        out = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n')
        out.writeheader()
        out.writerows(rows)


screens, catalogs, details = defaultdict(list), defaultdict(list), []
endurance = []
with ThreadPoolExecutor(max_workers=workers) as pool:
    for name, rows in pool.map(run, jobs):
        for r in rows:
            if name.startswith('screen-'):
                screens[r['rule'], r['growth']].append(r)
            elif name.startswith('endurance') or name.startswith('global-pair'):
                endurance.append(r)
            elif name.startswith('atlas-'):
                catalogs[r['rule'], r['threshold']].append(r)
            else:
                details.append(r)
summary = []
for (rule, mode), values in screens.items():
    ident = lambda r: (r['ship'], r['target'], r['rotation'], r['lane'], r['warm'])
    assert len(values) == len(set(map(ident, values))) == len(screens[rule, 'classic'])
    assert set(map(ident, values)) == set(map(ident, screens[rule, 'classic']))
    at = lambda field: [r[field] for r in values]
    summary.append(dict(rule=rule, mode=mode, horizon=values[0]['horizon'], poses=len(values),
                        live256At144=sum(x >= 256 for x in at('live144')),
                        medianPeak=statistics.median(at('peak')), maxPeak=max(at('peak')),
                        lastGenAtLeast256=max(at('last256')), emptyAtEnd=at('final').count(0),
                        maxFinal=max(at('final')), maxDistinctSitesVisited=max(at('visited'))))
assert sum(v['poses'] for v in summary if v['mode']=='contained') == 1944
save('contacts-summary.csv', summary)
enduranceSummary = []
for f, total in [(32, 864), (320, 24)]:
    values = [r for r in endurance if r['F']==f]
    assert len(values) == total
    enduranceSummary.append(dict(F=f, horizon=values[0]['horizon'], poses=len(values),
                                 maxPeak=max(r['peak'] for r in values), lastGenAtLeast256=max(r['last256'] for r in values),
                                 maxDistinctSitesVisited=max(r['visited'] for r in values),
                                 emptyAtEnd=sum(r['final']==0 for r in values), maxFinal=max(r['final'] for r in values)))
save('endurance.csv', enduranceSummary)
atlas = []
for (rule, threshold), values in catalogs.items():
    assert len(values) == len(set(r['pattern'] for r in values))
    changed = [r['pattern'] for r in values if r['firstDiff']]
    atlas.append(dict(rule=rule, threshold=threshold, horizon=1024, checked=len(values),
                      exact=len(values)-len(changed), maxClassicBirths=max(r['maxBirths'] for r in values),
                      changed=' '.join(changed)))
assert sum(r['checked'] for r in atlas if r['threshold']==384) == 409
save('atlas-summary.csv', atlas)
rows = []
for d in details:
    row = {k:d[k] for k in ('rule','F','ship','target','growth','threshold','horizon','peak','highAt',
                            'last256','firstEmpty','visited','final','attacker','defender')}
    row['enabledAfter'] = 512 if 'remoteExpected' in d else ''
    row['remoteExpected'],row['remoteSurvived']=d.get('remoteExpected',''),d.get('remoteSurvived','')
    rows.append(row)
save('deep-cases.csv',rows)
print('Registered stamps, matched poses and deep cases', sum(r['checked'] for r in atlas)//2,
      sum(r['poses'] for r in summary)//2,len(details))
