"""Collect machine-readable results from matches.mjs stdout (see BOT-MATCHES.md)."""
import csv
import json
import sys
from pathlib import Path

raw, out = map(Path, sys.argv[1:3])
files = sorted(raw.glob('*.open.jsonl')) + sorted(raw.glob('*.large.jsonl'))
assert files
namespaces = {}
out.mkdir(parents=True, exist_ok=True)
with (out / 'matches.csv').open('w') as match_out, (out / 'stamp-trials.csv').open('w') as trial_out:
    matches, trials = csv.writer(match_out, lineterminator='\n'), csv.writer(trial_out, lineterminator='\n')
    matches.writerow('rule F generations seed cohort priorSamples purchases tactics stampTypesBought localTrials clipped scans peakLiving finalBotCells finalCash stampSpending operatingCashDelta positiveFinalFlow tributePaid eroded out winner'.split())
    contexts = ['empty', 'own', 'rival', 'field/empty', 'field/own', 'field/rival']
    trials.writerow(['rule', 'F', 'generations', 'seed', 'cohort', 'stamp', 'purchases', 'buyers'] +
                    [field for context in contexts for field in (context + '_count', context + '_mean')])
    for file in files:
        for line in file.read_text().splitlines():
            m = json.loads(line)
            if file.name.endswith('-long.large.jsonl'):
                m['cohort'] = 'long-cold'
            assert namespaces.setdefault(m['rule'], m['namespace']) == m['namespace'], 'Catalog or tariffs changed during collection'
            bots = m['players']
            cash = sum(p['cash'] for p in bots)
            operating = sum(p['income'] - p['paid'] for p in bots)
            spent = sum(p['spent'] for p in bots)
            matches.writerow([m['rule'], m['F'], m['gen'], m['seed'], m['cohort'], m['inheritedSamples'],
                              m['purchases'], m['tactics'], sum(s['purchases'] > 0 for s in m['stamps'].values()),
                              m['trials'], m['clipped'], m['studies'], m['peak'], sum(p['cells'] for p in bots),
                              round(cash, 2), round(spent), round(operating, 2), sum(p['flow'] > 0 for p in bots),
                              round(sum(p['tributeOut'] for p in bots), 2), sum(p['eroded'] for p in bots),
                              sum(p['out'] for p in bots), m['winner']])
            for stamp, row in sorted(m['stamps'].items()):
                trials.writerow([m['rule'], m['F'], m['gen'], m['seed'], m['cohort'], stamp, row['purchases'], row['buyers']] +
                                [v for key in contexts for v in row.get(key, [0, ''])])
with (out / 'auditions.csv').open('w') as target:
    w = csv.writer(target, lineterminator='\n')
    for i, file in enumerate(sorted(raw.glob('*.audition.csv'))):
        with file.open() as source:
            header, *rows = csv.reader(source)
            if i == 0:
                w.writerow(header)
            w.writerows(rows)
