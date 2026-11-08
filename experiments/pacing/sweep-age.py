"""Independent age-specific benchmark and sensitivity analysis. Reuses completed broad grids.
Usage: python3 sweep-age.py /tmp/hex-sweep /tmp/hex-orders-age.csv /tmp/hex-mass-age.csv /tmp/hex-agefit
"""
import csv
import json
import math
import os
from pathlib import Path
import subprocess
import sys

exe, path_orders, path_mass, out = sys.argv[1:5]
path_poly = sys.argv[5] if len(sys.argv)>5 else None
out = Path(out)
out.mkdir(parents=True, exist_ok=True)
keys=['id','p','beta','d','T']
# Empirical observed facilities + technologies/min, Age of Empires II, 5-min windows.
# This validation is distinct from the long-game rhythm fit. Reference medians
# condition on matches that have survived through each entire age window.
benchmark=[.8,1.8,2.2,2.2,3.7]
def age_rates(r):
    orders=[0]+[float(r[k]) for k in ['mixed5','mixed10','mixed15','mixed20','mixed25']]
    return [(y-x)/5 for x,y in zip(orders,orders[1:])]
def stats(r):
    v=lambda k:float(r[k])
    rates=age_rates(r)
    ae=sum(abs(x-y) for x,y in zip(rates,benchmark))/5
    within=lambda val,l,h:l<=val<=h
    early_ok=within(v('second_s'),15,90) and within(v('guns_first_min'),4,25)
    short_ok=early_ok and v('gunField40')<=1024002 and within((v('mixed40')-v('mixed5'))/35,1,6)
    pacing=all(within(((v(b)-v(a))/m),1,6) for a,b,m in [('mixed5','mixed30',25),('mixed30','mixed60',30),('mixed60','mixed120',60)])
    long_relaxed=early_ok and pacing and within(v('burst10'),2,20) and v('gun_fieldpeak')<=1024002 and (v('flipper120')-v('flipper60'))/60<=10
    return ae, short_ok, long_relaxed
def read(path):
    with open(path) as f: return list(csv.DictReader(f))
def input_rows(rows):
    return [[r[k] for k in keys] for r in rows]
def run(rows, family, phase, step):
    env=os.environ.copy()
    if family=='mass':env['HEX_SWEEP_MASS']='1'
    if family=='poly':env['HEX_SWEEP_POLY']='1'
    src,dest=out/(family+phase+'-in.csv'),out/(family+phase+'.csv')
    with src.open('w') as f:csv.writer(f).writerows(rows)
    with dest.open('w') as f:subprocess.run([exe,'--replay',str(src),str(step)],check=True,stdout=f,env=env)
    return read(dest)
def tiers(rows):
    enriched=[(stats(r),r) for r in rows if family=='poly' or float(r['beta'])==0]
    strict=[(s,r) for s,r in enriched if r['feasible']=='1']
    relax=[(s,r) for s,r in enriched if s[2]]
    short=[(s,r) for s,r in enriched if s[1]]
    # Favor closest age-by-age match. In a tie favor a smaller peak footprint and
    # fewer full-game bursts rather than accepting an arbitrary row order.
    order=lambda v:(v[0][0],float(v[1]['burst10']),float(v[1]['gun_fieldpeak']))
    return [sorted(items,key=order) for items in [strict,relax,short]]
all_best={}
for family,src in ([('poly',path_poly)] if path_poly else [('order',path_orders),('mass',path_mass)]):
    broad=read(src)
    t=tiers(broad);counts=[len(x) for x in t]
    picked={r['id']:r for tier in t for _,r in tier[:96]}
    simple=[]
    for p in [50,75,100,125,150,200,250,300,350,400,450,500,600,800,1000,1200,1500,2000]:
        ds=[1/math.log2(x) for x in [1.25,1.5,2,3,4,5,6,8]] if family=='order' else [.5,1,1.5,2,2.5,3,4,5,6,8,12,16]
        for d in ds:
            for T in [30,45,60,75,90,105,120,135,150,165,180,210,240,300,360,420,480,600,900]:
                simple.append([600000+len(simple),p,0,d,T])
    for r in sorted(broad,key=lambda r:float(r['score']))[:64]: picked[r['id']]=r
    if family=='poly':
        simple=[]
        for a in [1,2,3]:
            for p in [200,400,600,800,1000,1250,1500,1750,2000,2250,2500,2700,2900]:
                for k in [.1,.25,.5,1,2,3,4,6,8,10,12,14,16,18,20,22,24,26,30,35]:
                    for T in [120,300,600,1200,2400,4800,7200,14400,28800,'inf']:
                        simple.append([700000+len(simple),p,a,k,T])
    refined=run(input_rows(picked.values())+simple,family,'1s',200)
    finalists={}
    for pool in [refined,[r for r in refined if int(r['id'])>=600000]]:
        for tier in tiers(pool):
            for s,r in tier[:12]:finalists[r['id']]=r
    for pool in [refined,[r for r in refined if int(r['id'])>=600000]]:
        for r in sorted(pool,key=lambda r:float(r['score']))[:8]:finalists[r['id']]=r
    exact=run(input_rows(finalists.values()),family,'1g',1)
    groups=tiers(exact); selected={}
    for name,tier in zip(['long-strict','long-relaxed','short'],groups):
        if tier:
            candidates=[r for _,r in tier if int(r['id'])>=600000] or [r for _,r in tier]
            r=candidates[0]
            selected[name]={**r,'rates':age_rates(r),'mean_abs_error':stats(r)[0]}
    best=min(exact,key=lambda r:float(r['score']))
    selected['closest-trained']={**best,'rates':age_rates(best),'mean_abs_error':stats(best)[0]}
    all_best[family]={'broad_counts_strict_relaxed_short':counts,'refine':len(refined),'exact':len(exact),'chosen':selected}
(out/'age-summary.json').write_text(json.dumps(all_best,indent=2)+'\n')
for k,f in all_best.items():
    print(k,f['broad_counts_strict_relaxed_short'],f['refine'],f['exact'])
    for name,r in f['chosen'].items():
        print(name,*[r[k] for k in ('id','p','beta','d','T','second_s','mixed40','mixed120','guns_first_min','gun120','burst10','rates','mean_abs_error')])
