// Exhaustive PHYSICAL nomination census, before any political ranking or debit.
// A site is either empty or occupied by one of the registered material rules.
// All neighbours are visible material, each rule denotes one genotype; rotations
// are distinct oriented neighbourhoods, not samples from an evolving planet.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {rules} from '../catalog.mjs';

const ids=Object.keys(rules);
const bits=ids.map((_,i)=>1<<i), size=1<<ids.length;
const pop=Array.from({length:size},(_,n)=>n.toString(2).replaceAll('0','').length);

export function census(degree) {
  const count=Array.from({length:2},()=>Array(size).fill(0)), examples=new Map();
  const births=[],survivals=[];
  for(let ring=0;ring<1<<degree;ring++){
    births[ring]=0;survivals[ring]=0;
    for(const [i,id] of ids.entries()){
      const table=rules[id].physics.tables[degree];
      if(table[0][ring])births[ring]|=bits[i];
      if(table[1][ring])survivals[ring]|=bits[i];
    }
  }
  function record(occupied,set,encoded,center){
    count[occupied][set]++;
    const key=occupied+'-'+set;
    if(!examples.has(key))examples.set(key,{degree,set,encoded,center});
  }
  function visit(offset,ring,present,encoded){
    if(offset<degree){
      visit(offset+1,ring,present,encoded);
      for(let i=0;i<ids.length;i++)
        visit(offset+1,ring|1<<offset,present|bits[i],encoded+(i+1)*10**offset);
      return;
    }
    const proposals=births[ring]&present;
    record(0,proposals,encoded,-1);
    for(let i=0;i<ids.length;i++)
      record(1,(proposals&~bits[i])|(survivals[ring]&bits[i]),encoded,i);
  }
  assert.equal(ids.length,9,'the compact one-digit-per-site encoding assumes nine registered rules');
  visit(0,0,0,0);
  const summary=count.map((subsets,occupied)=>{
    const byCandidates=Array(ids.length+1).fill(0);
    const pairCounts=new Map();
    for(let mask=0;mask<size;mask++){
      byCandidates[pop[mask]]+=subsets[mask];
      if(!subsets[mask])continue;
      for(let i=0;i<ids.length;i++)if(mask&bits[i])
        for(let j=i+1;j<ids.length;j++)if(mask&bits[j]){
          const key=ids[i]+'/'+ids[j];pairCounts.set(key,(pairCounts.get(key)??0)+subsets[mask]);
        }
    }
    const total=byCandidates.reduce((a,b)=>a+b);
    assert.equal(total,10**degree*(occupied?9:1));
    return {degree,center:occupied?'occupied':'empty',total,byCandidates,
      occurringSets:subsets.filter(n=>n>0).length,rulePairs:pairCounts.size,contestedPairs:Object.fromEntries(pairCounts)};
  });
  return {summary,examples,ids};
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify([5,6].flatMap(n=>census(n).summary),null,2));
