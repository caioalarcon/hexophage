"""Select initial tariffs from training rows only. Tie-breaks never read held-out seeds."""
import csv
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean

here = Path(__file__).resolve().parent
with (here/'train.csv').open() as f:
    groups = defaultdict(lambda: defaultdict(list))
    for row in csv.DictReader(f):
        groups[row['rule']][row['preset']].append(row)

# Keep a stable economy wherever it funds repeatable decisions and preserves
# viable fields. Aim, tribute and diversity then discriminate among qualifiers.
selected = []
ranks = []
for rule, tariffs in sorted(groups.items()):
    scores = []
    for name, rows in sorted(tariffs.items()):
        avg = lambda k: mean(float(r[k] or 0) for r in rows)
        repeated = avg('repeatBuyers')
        opens = avg('boughtBy1024')
        free = avg('fieldPresence')
        scoped = max(float(r['peakFraction']) for r in rows) <= 0.30
        viable = repeated >= 3.5 and opens >= 3.5 and free >= 0.50 and scoped
        capital = 0.25 <= avg('cashMultiple') <= 8
        stability = name!='pulse' and (name!='original' or rule!='bays')
        attacks = sum(int(r['aimed'])>0 for r in rows)
        touches = sum(float(r['tribute'])>0 for r in rows)
        # Cheap spending loops are never themselves counted as combat. Wealth
        # ratio breaks remaining ties, favouring reserves close to opening.
        score = (int(viable), int(viable and stability), int(viable and capital),
                 attacks, touches, round(free,1), min(8,round(avg('stamps'))),
                 -abs(math.log2(max(.001,avg('cashMultiple')))), repeated)
        scores.append((score,name))
        ranks.append([rule,name,int(viable),int(stability),int(capital),attacks,touches,
                      round(opens,2),round(repeated,2),round(free,3),round(avg('cashMultiple'),3)])
    name = max(scores)[1]
    selected.append((rule,name))
with (here/'selection.csv').open('w',newline='') as f:
    w=csv.writer(f,lineterminator='\n');w.writerow(['rule','preset']);w.writerows(selected)
with (here/'candidate-summary.csv').open('w',newline='') as f:
    w=csv.writer(f,lineterminator='\n');w.writerow('rule preset viable stability capital seedsWithDirectedPurchase seedsWithPaidDamage earlyBuyers repeatBuyers fieldPresence cashMultiple'.split());w.writerows(ranks)
