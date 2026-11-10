"""Reuse the held-out poses to test elapsed time and the switch near 4–8 credits."""
import itertools
from concurrent.futures import ThreadPoolExecutor
from duels import arenas,persist,run,table,workers

# Same geometries on purpose; these are changes of one condition.
conditions=[('late',0,24,384),('half-cell',1,4,96),('one-cell',1,8,96),('three-cells',1,24,96)]
if __name__=='__main__':
    tables=[]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for label,extra,fee,horizon in conditions:
            jobs=[(arena,'validation','confirm',str(extra),str(fee),str(horizon)) for arena in arenas]
            tests=list(itertools.chain.from_iterable(pool.map(run,jobs)))
            for a in ['all',*arenas]:
                t=table([r for r in tests if a=='all' or r['arena']==a],label,a)
                for row in t:row.update(eraseCost=fee,guardStampExtra=extra,horizon=horizon)
                tables+=t
    persist('duels-sensitivity.csv',tables)
