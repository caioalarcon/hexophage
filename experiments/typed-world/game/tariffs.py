"""Evaluate stable income, maturity, purchase price and birth cost with matched holds."""
import csv
import io
import itertools
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE=Path(__file__).resolve().parent
BASE=(12,1,8,1)

def run(job):
    split,rates=job
    args=['node',str(HERE/'bot-survey.mjs'),split,'512','32','4','48','16','18','1','stability',','.join(map(str,rates)),str(int(split=='tariff-final'))]
    rows=list(csv.DictReader(io.StringIO(subprocess.check_output(args,text=True))))
    records=[]
    for hold,live in zip(rows[::2],rows[1::2]):
        assert hold['arm']=='hold' and live['arm']=='learn' and hold['gen']==live['gen']
        records.append(dict(split=split,stableAfter=rates[0],stableEnergy=rates[1],stampCost=rates[2],birthCost=rates[3],
            seed=live['seed'],gen=live['gen'],winner=live['winner'],buyers=live['buyers'],purchases=live['purchases'],raids=live['raids'],
            firstBuy=live['firstBuy'],medianGap=live['medianGap'],longestGap=live['longestGap'],cuts=live['cuts'],
            idleIncome=hold['meanIncome'],idleCash=hold['meanCash'],activeIncome=live['meanIncome'],activeCash=live['meanCash'],
            richerThanIdle=live['idleCashLead'],largerThanIdle=live['idleFieldLead']))
    return records

def save(filename,rows):
    with (HERE/filename).open('w',newline='',encoding='utf8') as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys(),lineterminator='\n');w.writeheader();w.writerows(rows)

def main():
    split=sys.argv[1] if len(sys.argv)>1 else 'tune'
    if split=='tune':
        rates=[BASE,*itertools.product((8,24),(.5,1),(4,8),(1,2)),*itertools.product((8,),(.65,.75,.85),(6,8),(.75,1))]
    else:
        rates=[BASE,tuple(map(float,sys.argv[2].split(',')))]
        assert split in ('tariff-holdout','tariff-final')
    with ThreadPoolExecutor(max_workers=4) as pool:
        records=[r for chunk in pool.map(run,[(split,p) for p in rates]) for r in chunk]
    save('tariff-'+split.removeprefix('tariff-')+'.csv',records)
    for group in rates:
        rows=[r for r in records if tuple(r[k] for k in ['stableAfter','stableEnergy','stampCost','birthCost'])==group]
        print(group, 'buys/raids/buyers/richer/larger',*[sum(int(r[k]) for r in rows) for k in ['purchases','raids','buyers','richerThanIdle','largerThanIdle']],
              'median interval / worst wait',statistics.median(float(r['medianGap'] or 512) for r in rows),max(int(r['longestGap']) for r in rows),
              'mean passive',round(statistics.mean(float(r['idleCash']) for r in rows)))
if __name__=='__main__':
    main()
