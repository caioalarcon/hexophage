"""Write verified candidate references and stage summaries to the current directory.
Usage: python3 sweep-collate.py /tmp/hex-refined /tmp/hex-agefit-final /tmp/hex-polyfit
"""
import csv
import json
import math
from pathlib import Path
import sys
trained,age,poly=map(Path,sys.argv[1:])
ref=json.loads((trained/'summary.json').read_text())
empirical={**json.loads((age/'age-summary.json').read_text()),**json.loads((poly/'age-summary.json').read_text())}
raw=[('order','training',r) for r in csv.DictReader((trained/'per-generation.csv').open())]
raw += [(fam,'age',r) for fam in empirical for r in csv.DictReader(((poly if fam=='poly' else age)/(fam+'1g.csv')).open())]
columns=list(dict.fromkeys(k for _,_,r in raw for k in r))
with open('results-finalists.csv','w') as f:
    writer=csv.writer(f,lineterminator='\n');writer.writerow(['family','selection',*columns])
    for fam,stage,r in raw:writer.writerow([fam,stage,*[r.get(k,'') for k in columns]])
cases=[]
def add(name,fam,r):
    if any(c['name']==name for c in cases):return
    p,b,d,t=map(float,[r[k] for k in ['p','beta','d','T']])
    rule={'id':name,'price':p,'pressureHalfLife':t*200 if math.isfinite(t) else 'inf'}
    if fam=='order':rule.update(sizePower=b,orderPressureDoubling=d)
    elif fam=='mass':rule.update(massPressureDoubling=d)
    else:rule.update(massPressurePower=round(b),massPressureScale=d)
    # Early independent sources don't include all five-minute bins.
    expected={k:float(r[k]) for k in ['second_s','mixed5','mixed30','mixed60','mixed120','guns_first_min','gun120','flipper120','glider120','burst10','savedE']}
    if 'mixed15' in r:expected['mixed15']=int(r['mixed15'])
    cases.append({'name':name,'rule':rule,'expected':expected})
add('order-trained','order',ref['best'])
add('order-rounded','order',ref['simple'])
for fam,out in empirical.items():
    for name in ['long-relaxed','short','closest-trained']:
        if name in out['chosen']:add(fam+'-'+name,fam,out['chosen'][name])
Path('results-candidates.json').write_text(json.dumps(cases,indent=2)+'\n')
summary={'stage1':{'order_vectors':262144,'mass_vectors':131072,'poly_vectors':196608,'trajectories_per_vector':5,'clock_generations':1000,'order_strict':ref['broad_feasible'],'order_strict_linear_size':ref['broad_feasible_linear_size'],'mass_strict':0,'poly_strict':0},
         'refinement':{'order':{k:ref[k] for k in ['one_second','exact','exact_feasible']},
                       'empirical':{f:{k:v[k] for k in ['broad_counts_strict_relaxed_short','refine','exact']} for f,v in empirical.items()}},
         'aoe_median_reference':[.8,1.8,2.2,2.2,3.7],
         'empirical_selected':{f:{label:{k:r[k] for k in ['id','p','beta','d','T','rates','mean_abs_error']} for label,r in v['chosen'].items()} for f,v in empirical.items()}}
Path('results-search.json').write_text(json.dumps(summary,indent=2)+'\n')
