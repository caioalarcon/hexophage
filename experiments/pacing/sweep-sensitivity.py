"""Run the exact-generation clock for rounded cap-free candidates +/-20%, one parameter at a time.
Usage: python3 sweep-sensitivity.py /tmp/hex-sweep
"""
import csv
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
exe=sys.argv[1]
out=[]
for family,p,b,d,t in [('order',450,0,1/math.log2(5),135),('mass',1500,0,3,165),('mass-long',350,0,2,300),('poly',2500,2,14,4800)]:
    with tempfile.TemporaryDirectory() as tmp:
        src=Path(tmp)/'scenarios.csv'
        keys=['p','d','T'];desc=['reference'];pars=[[0,p,b,d,t]]
        for i,key in enumerate(keys):
            for f in [.8,1.2]:
                values=[p,b,d,t];values[[0,2,3][i]]*=f
                pars.append([len(pars),*values]);desc.append(key+'*'+str(f))
        with src.open('w') as f:csv.writer(f).writerows(pars)
        env=os.environ.copy()
        if family!='order':env['HEX_SWEEP_'+family.split('-')[0].upper()]='1'
        raw=subprocess.check_output([exe,'--replay',str(src),'1'],env=env,text=True)
        for desc1,r in zip(desc,csv.DictReader(raw.splitlines())):
            out.append({'family':family,'change':desc1,**r})
with open('results-sensitivity.csv','w') as f:
    w=csv.DictWriter(f,fieldnames=list(out[0]),lineterminator='\n');w.writeheader();w.writerows(out)
for family in ['order','mass','mass-long','poly']:
    rows=[r for r in out if r['family']==family];print(family)
    for key in ['mixed40','mixed120','gun120','guns_first_min','burst10','gun_fieldpeak']:
        vals=[float(r[key]) for r in rows];print(key,min(vals),max(vals))
