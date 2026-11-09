"""Run from any directory: python3 contacts-survey.py [/tmp/raw-contacts] [workers].
Node replays use the production engine. Raw per-pose data stays in the working directory.
"""
import csv
import json
import os
import subprocess
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

here = Path(__file__).resolve().parent
raw = Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/hex-conflict-contacts')
raw.mkdir(parents=True, exist_ok=True)
pool = ThreadPoolExecutor(max_workers=int(sys.argv[2]) if len(sys.argv)>2 else 3)
rules = ['hex-b2s245','callahan','bays','hex-b2s34','bays245','andreen','highhex','ashley15','ashley']
policies = ['legacy','lineage','block']
conditions = [*policies, 'ship-only','defender-only']
axes = ['ship','target','rotation','lane','warm']
witness = ('db-151','farm-4-12','0','-2','16')

def run(file,args):
    with file.open('w') as f:
        subprocess.run(['node',str(here/'contacts.mjs'),*map(str,args)],stdout=f,check=True)
    return file

def screen(job):
    rule, condition=job
    is_control=condition not in policies
    args=['screen',rule,'legacy' if is_control else condition,32,144]
    if is_control: args.append(condition)
    return run(raw/(rule+'.'+condition+'.csv'),args)

def load_csv(file):
    with file.open(newline='') as f: return list(csv.DictReader(f))

def save(name,rows):
    with (here/name).open('w',newline='') as f:
        w=csv.DictWriter(f, fieldnames=list(rows[0]),lineterminator='\n')
        w.writeheader()
        w.writerows(rows)

def one_case(task):
    rule,policy,F,pose,condition,ledger=task
    name='.'.join(map(str,(rule,policy,F,1024,*pose,condition,ledger)))+'.json'
    f=run(raw/name,['case',rule,policy,F,1024,*pose,condition,ledger])
    with f.open() as fp: return json.load(fp)

# Cache switch serves aggregation/review after an uninterrupted complete raw run.
reuse = os.environ.get('HEX_CONTACT_REUSE') == '1'
if not reuse:
    list(pool.map(screen,[(r,c) for r in rules for c in conditions]))

summary=[]
by_pair=[]
tasks=[]
for rule in rules:
    data={condition:load_csv(raw/(rule+'.'+condition+'.csv')) for condition in conditions}
    def pose(row): return tuple(row[k] for k in axes)
    for rows in data.values():
        assert [pose(r) for r in rows]==[pose(r) for r in data['legacy']]
        assert all(int(r['shipPhase'])==int(r['warm'])%2 for r in rows)
    assert all(int(r['peakNeutral'])==0 for c in ['ship-only','defender-only'] for r in data[c])
    for policy in policies:
        full = Counter()
        pairs = {}
        for action,ship,defender in zip(data[policy],data['ship-only'],data['defender-only']):
            n,g,p = int(action['finalNeutral']),int(action['peakNeutral']),int(action['peakLive'])
            d,base = int(action['finalDefender']),int(defender['finalDefender'])
            counts = dict(poses=1,gray=int(g>0),gray256=int(g>=256),
                          grayMajority256=int(int(action['firstNeutralMajority256'])>=0),peakLive256=int(p>=256),
                          excess256=int(p>=256 and p>int(ship['peakLive'])+int(defender['peakLive'])),
                          defenderDamage=int(d<base),defenderErased=int(d==0<base),
                          attackerSurvives=int(action['finalAttacker'])>0,
                          allLivingNeutral=int(n>0 and d+int(action['finalAttacker'])==0))
            full.update(counts)
            pairs.setdefault((action['ship'],action['target']),Counter()).update(counts)
        summary.append(dict(rule=rule,policy=policy,**full))
        by_pair.extend(dict(rule=rule,policy=policy,ship=k[0],target=k[1],**v) for k,v in pairs.items())
    # Select two *declared* challenge cases, not a new estimate of frequency.
    ranked=sorted(data['legacy'],key=lambda r:(int(r['peakNeutral']),pose(r)))
    cases=[pose(ranked[len(ranked)//2]),pose(ranked[-1])]
    if rule=='hex-b2s245': cases.append(witness)
    for shot in cases:
        for policy in policies: tasks.append((rule,policy,32,shot,'opposed','on'))
        for control in ['ship-only','defender-only']: tasks.append((rule,'legacy',32,shot,control,'on'))
for F in [32,96,320]:
    for policy in policies: tasks.append(('hex-b2s245',policy,F,witness,'opposed','on'))
    for control in ['opposed','same','ship-only','defender-only']:
        tasks.append(('hex-b2s245','legacy',F,witness,control,'off' if control in ('same','opposed') else 'on'))
    tasks.append(('hex-b2s245','lineage',F,witness,'opposed','off'))
save('contacts-summary.csv',summary)
save('contacts-by-pair.csv',by_pair)
rows=list(pool.map(one_case,dict.fromkeys(tasks)))
deep=[]
for row in rows:
    last=row['samples'][-1]
    deep.append(dict(rule=row['rule'],policy=row['policy'],F=row['F'],**{k:row[k] for k in axes},
                     owners=row['owners'],ledger=row['ledger'],peakNeutral=row['peakNeutral'],peakLive=row['peakLive'],
                     neutral=last['neutral'],attacker=last['attacker'],defender=last['defender'],
                     attackerEroded=last['attackerEroded'],defenderEroded=last['defenderEroded'],
                     firstPentagonHalo=row.get('firstPentagonHalo',''),firstDifferentShipSize=row.get('firstDifferentShipPopulation',''),
                     nearestPentagonOnDeparture=row.get('departureDistance',''),occupancyHash=row['traceHash']))
for F in [32,96,320]:
    hashes={r['occupancyHash'] for r in deep if r['F']==F and r['rule']=='hex-b2s245' and tuple(str(r[k]) for k in axes)==witness and not r['ledger']}
    assert len(hashes)==1, (F,hashes)
save('contacts-deep.csv',deep)
print(f'{sum(r["poses"] for r in summary)//3} poses, {len(deep)} deep runs, {len(by_pair)} grouped pair/policy rows')
