// Research-only transformation. The game ships neither these gates nor their parameters.
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export function poseTreatment(root, focal) {
  const feedback=join(root,'src/bots/brain/feedback.js'), strategy=join(root,'src/bots/brain/strategy.js');
  function edit(path, pairs) {
    let code=readFileSync(path,'utf8');
    for(const [a,b] of pairs) {
      if(code.split(a).length!==2)throw Error('Unexpected pose treatment source: '+a);
      code=code.replace(a,b);
    }
    writeFileSync(path,code);
  }
  // Keep trial validation and actual observation costs identical. A small private
  // table avoids displacing general simulation evidence in this mechanism test.
  edit(feedback,[
    ['const watches=new Map();',`const watches=new Map(), poses=new Map();
  metrics.repeatedPoseBids=0;
  function poseMultiplier(t){
    if(t.player.id!==${focal}||t.spot.kind!=='rival')return 1;
    const row=poses.get(JSON.stringify(keyFor(t,'own')));
    if(!row || row.n<2)return 1;
    metrics.repeatedPoseBids++;
    return 1+.22*row.sum/(row.n+4);
  }`],
    ["memory.observe(id,'field/'+w.kind,w.stamp,relative/(Math.abs(relative)+Math.max(.0001,w.cost/w.payback)));",`
      const sample=relative/(Math.abs(relative)+Math.max(.0001,w.cost/w.payback));
      if(id!==${focal} || w.kind!=='rival' && w.cumulative)
        memory.observe(id,'field/'+w.kind,w.stamp,sample);
      if(id===${focal} && w.kind==='rival'){
        const key=JSON.stringify(w.keys.own), row=poses.get(key)??{n:0,sum:0};
        poses.delete(key);
        row.n++;row.sum+=sample;poses.set(key,row);
        if(poses.size>256)poses.delete(poses.keys().next().value);
      }`],
    ['return {observe,recordStamp,watch,correct,clear:', 'return {poseMultiplier,observe,recordStamp,watch,correct,clear:'],
  ]);
  edit(strategy,[
    ['const priority = evidence + 0.22 * observed.mean +',`const seen=player.id!==${focal}?observed.mean:
      spot.kind==='rival'||observed.count<3?0:observed.mean*observed.count/(observed.count+4);
    const priority = evidence + 0.22 * seen +`],
    ['const bid=result.ownCash-brain.rivalWeight*result.rivalCash+horizon*(ownFlow-brain.rivalWeight*rivalFlow);',
     'const bid=(result.ownCash-brain.rivalWeight*result.rivalCash+horizon*(ownFlow-brain.rivalWeight*rivalFlow))*feedback.poseMultiplier(trial);'],
  ]);
}
