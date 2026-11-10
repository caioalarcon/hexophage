"""Physical and financial replays for the preregistered three-way cycle hypothesis."""
import itertools
from concurrent.futures import ThreadPoolExecutor
from duels import arenas, persist, run, table, workers

def score(rows):
    # table scans combinations in contact, phase, guard order.
    votes={(r['left'],r['right']):r['leftWallet']-r['rightWallet'] for r in rows}
    return [-votes['contact','phase'],-votes['phase','guard'],votes['contact','guard']]

def main():
    grid=list(itertools.product([0,4,8,16,24,48,96],[0,1,4,8]))
    jobs=[(arena,'discovery','sweep',str(premium),str(toll)) for toll,premium in grid for arena in arenas]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        samples=iter(pool.map(run,jobs))
        tested=[]
        for toll,premium in grid:
            r=list(itertools.chain.from_iterable(next(samples) for _ in arenas))
            edges=score(table(r,'discovery','all'))
            tested.append(dict(eraseCost=toll,guardStampExtra=premium,votes=len(r)//6,phaseBeatsContact=edges[0],
                guardBeatsPhase=edges[1],contactBeatsGuard=edges[2],weakest=min(edges),total=sum(edges)))
    winner=max(tested,key=lambda r:(r['weakest'],r['total'],-abs(r['eraseCost']-24),-r['guardStampExtra']))
    persist('duels-tariffs.csv',tested)
    selected=(str(winner['guardStampExtra']),str(winner['eraseCost']))
    cases=[(arena,'validation','confirm',*selected) for arena in arenas]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        validation=list(itertools.chain.from_iterable(pool.map(run,cases)))
    tables=[]
    for arena in ['all',*arenas]:
        rows=[r for r in validation if arena=='all' or r['arena']==arena]
        tables+=table(rows,'validation',arena)
    for row in tables:
        row['eraseCost']=winner['eraseCost'];row['guardStampExtra']=winner['guardStampExtra']
    persist('duels-tariffs-validation.csv',tables)
    print('selected',winner)
    print('held out',score([r for r in tables if r['arena']=='all']))

if __name__=='__main__':main()
