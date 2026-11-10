"""Frozen paired scenarios; each repetition starts from the same real spherical template."""
import csv
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from itertools import product
from pathlib import Path

here = Path(__file__).resolve().parent
cases = []
def case(series, F, treasury, farm, mode='armed', rotation=0, G=384, defense='contact', salvage=8, observer=0, carrier='p6'):
    cases.append((series,F,treasury,farm,mode,rotation,G,defense,salvage,observer,carrier))

for funds, farm, rotation in product([280,800,3200,16000,64000], ['none','small','large'], [0,2,4]):
    case('financing',32,funds,farm,rotation=rotation)
for mode, carrier, rotation in product(['armed','hold','cold','contact'], ['p6','andreen'], [0,2,4]):
    case('controls',32,3200,'small',mode,rotation,carrier=carrier)
for f, cash in product([16,32,96,320],[280,3200,64000]):
    case('scale',f,cash,'small')
for defense, salvage, rotation in product(['contact','guard'],[0,8],[0,2,4]):
    case('liquidation',32,3200,'large',rotation=rotation,defense=defense,salvage=salvage)
for cash, observer, farm in product([16000,128000,1000000,10000000], [0,1], ['none','small']):
    case('horizon',16,cash,farm,G=512,observer=observer)
case('aftermath',16,1000000,'small',G=1024,observer=1)
for carrier in ['andreen','p6']:
    for rotation in [0,1,2,3,4,5]:
        case('geometry',32,8192,'small',rotation=rotation,carrier=carrier)
for bank in [280,3200]:
    for ratio in [0,8,32,128]:
        case('collateral',32,bank,'large',salvage=ratio,G=768)

def run(job):
    group,*args=job
    p=subprocess.run(['node',here/'blast.mjs',*map(str,args)],capture_output=True,text=True)
    if p.returncode:
        raise RuntimeError(f'{job}\n{p.stderr}')
    return {'series':group, **json.loads(p.stdout)}
with ThreadPoolExecutor(max_workers=int(sys.argv[1]) if len(sys.argv)>1 else 3) as pool:
    rows=list(pool.map(run,cases))
with (here/'blast.csv').open('w') as f:
    w=csv.DictWriter(f,fieldnames=rows[0],lineterminator='\n')
    w.writeheader()
    w.writerows(rows)
print(f'{len(rows)} experiments')
