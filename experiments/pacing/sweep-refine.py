"""Select broad candidates, compare familiar whole-number premiums, and refine by clock.
Usage: python3 sweep-refine.py /tmp/hex-sweep /tmp/hex-pacing-sweep.csv /tmp/hex-refined
"""
import csv
import json
import math
from pathlib import Path
import subprocess
import sys

exe, broadpath, temp = sys.argv[1:]
folder=Path(temp)
folder.mkdir(parents=True,exist_ok=True)
def read(path):
    with open(path) as f: return list(csv.DictReader(f))
def rank(rows): return sorted(rows,key=lambda r:float(r['score']))
def subset(rows,count):
    # Retain diverse regions and the direct competitors of the simple linear-in-size family.
    group=lambda r:(float(r['beta'])==0, float(r['d'])>=.63)
    out=[]
    for a in (False,True):
        for b in (False,True):
            out+=rank(r for r in rows if group(r)==(a,b))[:count]
    return out
def params(rows):
    return [[r[k] for k in ['id','p','beta','d','T']] for r in rows]
def run(rows, name, step):
    with (folder/(name+'-in.csv')).open('w') as f: csv.writer(f).writerows(rows)
    dest=folder/(name+'.csv')
    with dest.open('w') as f: subprocess.run([exe,'--replay',str(folder/(name+'-in.csv')),str(step)],check=True,stdout=f)
    return read(dest)

broad=read(broadpath)
# Additional compact integer premiums avoid overfitting insignificant digits.
simple=[]
for p in [150,200,225,250,275,300,325,350,375,400,450,500,600]:
    for premium in [2,3,4,5,6,8]:
        for T in [75,90,105,120,135,150,165,180,210,240,270,300]:
            simple.append([300000+len(simple),p,0,1/math.log2(premium),T])
phase2=run(params(subset(broad,128))+simple,'one-second',200)
simple_rows=[r for r in phase2 if int(r['id'])>=300000]
candidates={r['id']:r for r in subset(phase2,8)+rank(simple_rows)[:24]}
phase3=run(params(candidates.values()),'per-generation',1)
feasible=lambda rs:[r for r in rs if r['feasible']=='1']
exactrank=rank(phase3)
summary={'broad_vectors':len(broad),'trajectories_per_vector':5,
         'broad_feasible':len(feasible(broad)),
         'broad_feasible_linear_size':len([r for r in feasible(broad) if float(r['beta'])==0]),
         'one_second':len(phase2),'exact':len(phase3),'exact_feasible':len(feasible(phase3)),
         'best':exactrank[0],'simple':rank(r for r in feasible(phase3) if int(r['id'])>=300000)[0]}
(folder/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary))
