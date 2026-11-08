"""Summarize the coarse inversion search; rerun finalists with one-generation decisions."""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

root = Path(__file__).parent
raw, exe = Path(sys.argv[1]), sys.argv[2]
data = pd.read_csv(raw)
params = ['id', 'family', 'p', 'b', 'scale', 'half_s']
economies = data[params].drop_duplicates().sort_values('id').set_index('id')
assert len(data) == 10 * len(economies)
M = 12000


def sample(founder, policy, save=0):
    return data.query('founder == @founder & policy == @policy & save == @save').set_index('id').sort_index()


def event_minutes(x):
    return x.astype(float).where(x >= 0, np.inf) / M


def interval_loss(x, low, high):
    return np.maximum(0, np.log((low + 1) / (x + 1))) + np.maximum(0, np.log((x + 1) / (high + 1)))


def evaluate(founder):
    mine, mix, reserve, civil = [sample(founder,*args) for args in [(0,), (2,), (2,1), (1,)]]
    f = economies.copy()
    f['mine_valid_minutes'] = pd.concat([event_minutes(mine.gArea),event_minutes(mine.gDef),event_minutes(mine.gCensor)],axis=1).min(axis=1).clip(upper=120)
    f['mix_valid_minutes'] = pd.concat([event_minutes(mix.gArea),event_minutes(mix.gDef),event_minutes(mix.gCensor)],axis=1).min(axis=1).clip(upper=120)
    f['civil_valid_minutes'] = pd.concat([event_minutes(civil.gArea),event_minutes(civil.gDef),event_minutes(civil.gCensor)],axis=1).min(axis=1).clip(upper=120)
    f['gun_minutes'] = event_minutes(mix.gGun)
    f['first_minutes'] = event_minutes(mix['first'])
    f['guard_minutes'] = event_minutes(mix.gGuard)
    f['rate30_40'] = (mix.n40-mix.n30)/10
    f['rate60_120'] = (mix.n-mix.n60)/60
    f['reserve_3cell'] = reserve.burst
    return f


def screen(f, horizon):
    valid = (f.mine_valid_minutes >= horizon) & (f.mix_valid_minutes >= horizon) & (f.civil_valid_minutes >= horizon)
    rate = f.rate30_40 if horizon==40 else f.rate60_120
    productive = valid & f.guard_minutes.le(1.5) & f.gun_minutes.between(4,25) & rate.between(1,6)
    return valid, productive, productive & f.reserve_3cell.between(2,12)


def score(f, horizon):
    rate = f.rate30_40 if horizon==40 else f.rate60_120
    d = interval_loss(f.guard_minutes.clip(upper=240),0,1.5) + interval_loss(f.gun_minutes.clip(upper=240),4,25)
    # Hard validity floor outranks matching tactical cadence/spending.
    valid = np.minimum(np.minimum(f.mine_valid_minutes,f.mix_valid_minutes),f.civil_valid_minutes)
    d += 100*np.maximum(0,1-valid/horizon)
    return d + interval_loss(rate.clip(lower=0),1,6) + interval_loss(f.reserve_3cell,2,12)


def serial(value):
    return None if not np.isfinite(value) else round(float(value),6)


results = {'configurations':len(economies), 'trajectories':len(data), 'strict_configurations':int((economies.b==1).sum()), 'screens':[], 'selected':[]}
replay = [
    (-100,0,10,1,0,0),(-101,1,1500,1,3,165),(-102,1,350,1,2,300),
    (-103,2,2500,1,14,4800),(-104,3,10,1,10000,0),(-105,3,1000,1,200000,0),
    (-106,0,10,.5,0,0),(-107,0,10,2,0,0),
]
for founder in (1,4):
    f = evaluate(founder)
    for horizon in (40,120):
        valid, productive, alltests = screen(f,horizon)
        for fam in range(4):
            for strict in (True,False):
                which = (f.family == fam) & ((f.b==1) if strict else True)
                results['screens'].append(dict(founder=founder,horizon=horizon,family=fam,only_strict=strict,
                    configs=int(which.sum()),valid=int((which & valid).sum()),timing=int((which & productive).sum()),
                    timing_and_reserve=int((which & alltests).sum())))
            # One nearest strict representative per family for each founder/target.
            subset=f[(f.family==fam) & (f.b==1)]
            ranked=score(subset,horizon).sort_values()
            idx=ranked.index[0]
            r=subset.loc[idx]
            results['selected'].append(dict(founder=founder,horizon=horizon,score=serial(ranked.iloc[0]),id=int(idx),
                **{key:serial(value) for key,value in r.items()}))
            replay.append((int(idx),int(r.family),r.p,r.b,r.scale,r.half_s))
cases=root/'search-replay-input.csv'
cases.write_text(''.join(','.join(map(str,row))+'\n' for row in dict.fromkeys(replay)))
with (root/'search-replay.csv').open('w') as target:
    subprocess.run([exe, '1','1',str(cases)],stdout=target,check=True)
(root/'search-summary.json').write_text(json.dumps(results,indent=2,allow_nan=False)+'\n')
