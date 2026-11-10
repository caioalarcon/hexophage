"""Run deterministic crossover games; pair both seat assignments before voting."""
import argparse
import csv
import json
import subprocess
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from itertools import combinations, permutations
from pathlib import Path

HERE = Path(__file__).resolve().parent
GROUPS = {'discovery': (7,41,109,1549,811,3083,5653,14591),
          'holdout': (577,1723,4733,8221,733,2447,6277,16411),
          'replication': (991,1933,3011,4289,6151,7877,9601,17431)}
ROLES = ['contact','guard','phase','antimatter']
BALLOTS = ['support','age','geometry','robustness']
METRICS = ['last','field','cash','buyable']

def run(job):
    split, seed = job
    data = subprocess.check_output(['node', str(HERE/'league.mjs'), split, str(seed)], text=True)
    rows = [json.loads(line) for line in data.splitlines()]
    assert all(r['crossOwner'] <= r['contests'] for r in rows)
    assert len(rows) == 324 and any(r['crossOwner'] > 0 for r in rows), (split, seed)
    return rows

def save(name, rows):
    with (HERE/name).open('w', newline='', encoding='utf8') as out:
        writer = csv.DictWriter(out, fieldnames=rows[0].keys(), lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)

def legs(r,metric):
    if metric == 'last':
        seat = r['last']
        return 'open' if seat is None else 'tie' if seat == 0 else r['tags'][seat-1]
    a,b = (int((v+1e-9)//8) for v in r['cash']) if metric=='buyable' else r[metric]
    return 'tie' if abs(a-b) < 1e-6 else r['tags'][0 if a>b else 1]

def triangles(roles,edges,n):
    loops = set()
    for path in permutations(roles,n):
        if all((a,b) in edges for a,b in zip(path,path[1:]+path[:1])):
            loops.add(min(path[i:]+path[:i] for i in range(n)))
    return sorted(loops)

def aggregate(rows):
    tracks = defaultdict(list)
    for r in rows:
        if len(r['tags']) == 2:
            a,b = sorted(r['tags'],key=(BALLOTS if r['arbitration']=='ballot' else ROLES).index)
            for metric in METRICS:
                tracks[(r['split'],r['arbitration'],r['fee'],r['float'],metric,a,b,r['seed'])].append(legs(r,metric))
    tallies = defaultdict(Counter)
    for (*group,seed), result in tracks.items():
        assert len(result)==2
        count=tallies[tuple(group)]
        for w in result:
            count['leg_'+w]+=1
        a,b=group[-2:]
        vote='open' if 'open' in result else a if result.count(a)>result.count(b) else b if result.count(b)>result.count(a) else 'tie'
        count[vote]+=1
    graphs = defaultdict(dict)
    matrix = []
    for (*context,a,b), c in tallies.items():
        split, arbiter, fee, bank, metric=context
        row=dict(split=split,arbiter=arbiter,eraseFee=fee,operatingCash=bank,metric=metric,left=a,right=b,
                 leftVotes=c[a],rightVotes=c[b],tieVotes=c['tie'],openVotes=c['open'],
                 leftGames=c['leg_'+a],rightGames=c['leg_'+b],tieGames=c['leg_tie'],openGames=c['leg_open'])
        matrix.append(row)
        graphs[tuple(context)][a,b] = c
    summaries = []
    for (split,arbiter,fee,bank,metric),duels in graphs.items():
        edges=set()
        absolute=set()
        for (a,b),c in duels.items():
            for x,y in [(a,b),(b,a)]:
                if c[x]>c[y]:edges.add((x,y))
                if c[x]>len(GROUPS[split])/2:absolute.add((x,y))
        roles=BALLOTS if arbiter=='ballot' else ROLES
        cw=','.join(a for a in roles if all((a,b) in edges for b in roles if b!=a))
        hard=','.join(a for a in roles if all((a,b) in absolute for b in roles if b!=a))
        summarize=lambda n: '|'.join('>'.join(loop) for loop in triangles(roles,edges,n))
        summaries.append(dict(split=split,arbiter=arbiter,eraseFee=fee,operatingCash=bank,metric=metric,edges=len(edges),
                              condorcet=cw,absolute=hard,cycles3=summarize(3),cycles4=summarize(4)))
    return matrix,summaries

def compact(r):
    arr=lambda k:'/'.join('' if v is None else str(v) for v in r[k])
    row={k:v for k,v in r.items() if k not in ('firstThree','naturalCycle','tags','openingCost','outcome','field','cash','cuts','refused','detonations')}
    return {**row,**{k:arr(k) for k in ('tags','openingCost','outcome','field','cash','cuts','refused','detonations')}}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('workers',type=int,nargs='?',default=4)
    args=parser.parse_args()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        rows=[r for chunk in pool.map(run,[(g,s) for g,seeds in GROUPS.items() for s in seeds]) for r in chunk]
    for split in GROUPS:
        save('league-games-'+split+'.csv',[compact(r) for r in rows if r['split']==split])
    matrix,summary=aggregate(rows)
    save('league-matrix.csv',matrix)
    save('league-majorities.csv',summary)
    # One real three-owner dispute per arbiter and split, with all opening,
    # generation, vertex and conditioning parameters enough to replay it.
    witnesses={}
    for r in rows:
        for kind in ('firstThree','naturalCycle'):
            if event:=r.get(kind):
                key=(r['split'],r['arbitration'],kind)
                priority=-event['grade']
                if key not in witnesses or priority<witnesses[key][0]:
                    witnesses[key]=(priority,{**compact(r),'kind':kind,'event':event})
    (HERE/'league-witnesses.json').write_text(json.dumps([v[1] for v in witnesses.values()],indent=2)+'\n',encoding='utf8')

if __name__=='__main__':
    main()
