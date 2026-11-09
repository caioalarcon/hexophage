// A material lineage may explicitly oppose occupancy. This ballot precedes
// the (separate) election of an eligible identity for one physical site.
import {material} from './arbitration.mjs';

export const existenceModes=Object.freeze(['legacy','any','majority','unanimous','support']);
export const senses=Object.freeze(['native','kin']);
export const passageModes=Object.freeze(['legacy','literal']);
const count=Array.from({length:64},(_,mask)=>mask.toString(2).replaceAll('0','').length);
export const sensorMask=(type,materialMask,ownMask)=>material(type) && type.sense!=='kin'?materialMask:ownMask;

export function voteOnExistence(mode,degree,materialMask,masks,incumbent){
  const old=material(incumbent)?incumbent:null, votes=new Map();
  let yes=0,no=0,weightYes=0,weightNo=0;
  function cast(type,own){
    const observed=sensorMask(type,materialMask,own),weight=count[own]+Number(type===old);
    const alive=Boolean(type.tables[degree][Number(!!old)][observed]);
    votes.set(type,{alive,weight,observed});
    if(alive){yes++;weightYes+=weight;}
    else {no++;weightNo+=weight;}
  }
  for(const [type,mask] of masks)if(material(type))cast(type,mask);
  if(old && !votes.has(old))cast(old,0);
  const approve=mode==='any'?yes>0:mode==='unanimous'?yes>0 && no===0:mode==='support'?weightYes>weightNo:yes>no;
  return {votes,yes,no,weightYes,weightNo,approve,aliveBefore:!!old};
}
