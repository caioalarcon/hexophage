"""Reproduce all matched cross-rule contacts and the role-swapped Condorcet tally."""
import csv
import itertools
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

here=Path(__file__).resolve().parent
roles=['contact','phase','guard','antimatter']
arenas=['glider-grower','slider-farm','ship-oscillator','glider-ship']
workers=int(sys.argv[1]) if len(sys.argv)>1 else 3
def run(config):
    return list(csv.DictReader(subprocess.check_output(
        ['node',str(here/'duels.mjs'),*config],text=True).splitlines()))
def persist(filename,rows):
    with (here/filename).open('w',newline='') as dest:
        fs=csv.DictWriter(dest,fieldnames=rows[0].keys(),lineterminator='\n')
        fs.writeheader()
        fs.writerows(rows)

def collect(mode,splits):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        samples=list(itertools.chain.from_iterable(pool.map(run,itertools.product(arenas,splits,[mode]))))
    persist('duels-'+mode+'.csv',samples)
    return samples

def table(rows,label,group):
    out=[]
    for left,right in itertools.combinations(roles,2):
        cases={}
        for r in rows:
            if {r['attackerPolicy'],r['defenderPolicy']}!={left,right}:continue
            key=r['phase'],r['arena'],r['angle'],r['lane']
            cases.setdefault(key,{})[r['attackerPolicy']]=r
        if not cases:continue
        raider=lambda row:float(row['aCash'])-float(row['dCash'])
        field=lambda row:int(row['aN'])-int(row['dN'])
        wallet=[]; board=[]; near=0
        for matched in cases.values():
            a,b=(matched[k] for k in [left,right])
            assert a['attacker']==b['attacker']
            # Mean margin across the two legs, each resolver in each role once.
            wallet.append((raider(a)-raider(b))/2)
            board.append((field(a)-field(b))/2)
            near+=any(int(r['near'])>=0 for r in matched.values())
        lw=sum(m>.01 for m in wallet)
        rw=sum(m<-.01 for m in wallet)
        out.append(dict(split=label,arena=group,left=left,right=right,votes=len(wallet),near=near,
            leftWallet=lw,tieWallet=len(wallet)-lw-rw,rightWallet=rw,
            medianWallet=round(statistics.median(wallet),3),
            leftField=sum(m>0 for m in board),tieField=sum(m==0 for m in board),rightField=sum(m<0 for m in board)))
    return out

if __name__=='__main__':
    sample=collect('league',['discovery','validation'])
    matrices=[]
    for stage in ['discovery','validation','pooled']:
        stageRows=[r for r in sample if stage=='pooled' or r['phase']==stage]
        for arena in ['all',*arenas]:
            matrices.extend(table([r for r in stageRows if arena=='all' or r['arena']==arena],stage,arena))
    persist('duels-matrix.csv',matrices)
    collect('prices',['validation'])
    collect('friendly',['validation'])
