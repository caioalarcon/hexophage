"""Summarize the final matched games by tariff, automaton, frequency and horizon."""
import csv
from collections import defaultdict
from pathlib import Path
from statistics import mean

here = Path(__file__).resolve().parent
groups = defaultdict(list)
for stage in ('validation', 'long', 'production'):
    with (here / f'{stage}.csv').open() as f:
        for row in csv.DictReader(f):
            tariff = 'original' if row['preset'] == 'original' else 'selected'
            for rule in (row['rule'], 'all'):
                groups[int(row['F']), int(row['horizon']), rule, tariff].append(row)

with (here / 'outcomes.csv').open('w', newline='') as f:
    writer = csv.writer(f, lineterminator='\n')
    writer.writerow('F horizon rule tariff games earlyBuyers repeatBuyers purchases aimed gamesAimed gamesPayingTribute eliminated winners maxField meanCashMultiple'.split())
    for key, rows in sorted(groups.items()):
        direct = lambda k: sum(int(r[k]) for r in rows)
        writer.writerow([*key, len(rows), direct('boughtBy1024'), direct('repeatBuyers'),
                         direct('purchases'), direct('aimed'), sum(int(r['aimed']) > 0 for r in rows),
                         sum(float(r['tribute']) > 0 for r in rows), direct('eliminated'),
                         sum(bool(int(r['winner'] or 0)) for r in rows), max(int(r['peak']) for r in rows),
                         round(mean(float(r['cashMultiple']) for r in rows), 3)])
