import {cards} from '../catalog.mjs';
import {createTypedWorld} from '../engine.mjs';
import {patchForStamp} from '../../../src/patterns/spherical-patch.js';
import {graphBall} from '../spatial.mjs';

export function normalizeOpening(value) {
  const fallback=cards.get('hex-b2s245/farm-4-12');
  const c=value??{...fallback,key:'hex-b2s245/farm-4-12',rule:fallback.source};
  const raw=c.offsets;
  if(!Array.isArray(raw)||!raw.length||raw.length>1024||raw.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isSafeInteger(v)||Math.abs(v)>128))||
      new Set(raw.map(p=>p.join(','))).size!==raw.length)throw RangeError('A base precisa de 1–1.024 células distintas, com coordenadas inteiras entre −128 e 128.');
  return {key:String(c.key??'custom-base'),name:String(c.name??'Minha base'),rule:c.rule??c.source,
    offsets:raw.map(p=>[...p]),resolver:c.resolver??'contact',ballot:c.ballot??'support',sense:c.sense??'native',
    ...(c.contract?{contract:c.contract}:{})};
}

// A larger custom seed may meet a pentagonal seam at one player's preferred
// anchor. Search its nearby sector before rejecting the player's whole design.
export function locateOpening(match,owner,card,preferred,rotation){
  const span=Math.max(...card.offsets.map(([q,r])=>Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))));
  if(match.players[owner].reserve+1e-9<card.offsets.length*match.stampPrice(card.resolver))return null;
  for(const site of graphBall(match.graph,[preferred],Math.min(24,Math.max(6,span)))){
    const ids=patchForStamp({graph:match.graph},site,rotation,card.offsets);
    if(ids&&match.stampRejection(owner,card.rule,card.resolver,ids,card.ballot,card.sense,{contract:card.contract},true)===null)return {site,ids};
  }
  return null;
}

// The actual automaton supplies the qualification; no catalogue-name whitelist.
export function measureOpening(graph,card,site,rotation,options={}) {
  const ids=patchForStamp({graph},site,rotation,card.offsets);
  if(!ids)return {ok:false,reason:'A base atravessa uma deformação da malha. Escolha outro desenho ou semente.'};
  const test=createTypedWorld(graph,{...options,wallets:[options.bank??640]});
  const plant=test.bootstrapStamp??test.stamp;
  if(!plant(1,card.rule,card.resolver,ids,card.ballot,card.sense,{contract:card.contract}))
    return {ok:false,reason:'A reserva inicial precisa pagar a base e sua carga de energia.'};
  const begin=test.players[1].income;
  for(let i=0;i<64;i++)test.step();
  const p=test.players[1],income=p.income-begin;
  return {ok:p.conventional>0&&income>0,ids,income,cells:p.conventional,reserve:p.reserve,generations:64,
    reason:income<=0?'A base precisa produzir energia durante o ensaio de 64 gerações. Use o Atlas para preparar uma semente geradora.':
      p.conventional<=0?'A base perdeu todas as células durante o ensaio de 64 gerações.':null};
}
