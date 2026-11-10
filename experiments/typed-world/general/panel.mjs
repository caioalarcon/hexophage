import {explainContest,arbitrationModes,ballots,ruleIds,resolvers} from '../arbitration.mjs';
import {matrixEditor} from './matrix-panel.mjs';
import {rules,resolverNames} from '../catalog.mjs';

const policyNames={matrix:'Matriz editável',legacy:'Original',support:'Apoio local',phase:'Preferência à travessia',
  fixed:'Ordem fixa',majority:'Maioria de três critérios',dominant:'Dominante designado',
  ecology:'Maioria de apoio, idade e robustez',cycle:'Ciclo entre três',ballot:'Voto herdado por carimbo'};
export const ballotNames={support:'Apoio',age:'Idade',geometry:'Ordem dos sítios',robustness:'Robustez'};
const el=id=>document.getElementById(id);
const add=(select,values,labels)=>select.replaceChildren(...values.map(id=>new Option(labels[id]??id,id)));
const ruleLabels=Object.fromEntries(Object.entries(rules).map(([key,r])=>[key,r.label.split(' · ')[0]]));

export function setupPanel(params){
  add(el('arb'),arbitrationModes,policyNames);
  add(el('ballot'),ballots,ballotNames);
  const orderEl=el('family-order'),matrix=matrixEditor(el('matrix-editor'));
  function refresh(resetOrder=false){
    const mode=el('arb').value, by=el('axis').value;
    const ordered=['fixed','dominant','cycle','matrix'].includes(mode), families=by==='rule'?ruleIds:resolvers;
    el('ordered-arb').hidden=!ordered;el('matrix-editor').hidden=mode!=='matrix';orderEl.closest('label').hidden=mode==='matrix';
    if(resetOrder){
      if(mode==='matrix')matrix.setup(families);
      const defaults=mode==='matrix'?families:by==='rule'?['callahan','bays','ashley',...families.filter(x=>!['callahan','bays','ashley'].includes(x))]:['contact','guard','phase','antimatter'];
      orderEl.value=(mode==='cycle'?defaults.slice(0,3):mode==='dominant'?defaults.slice(0,1):defaults).join(', ');
    }
    orderEl.title=families.join(', ');
    el('order-label').textContent=mode==='cycle'?'A vence B, B vence C, C vence A':mode==='dominant'?'Família dominante':'Famílias em ordem de preferência';
    el('kin').disabled=el('admit').value!=='contest';
    el('stamp-vote').hidden=mode!=='ballot';
  }
  el('arb').onchange=()=>refresh(true);
  el('axis').onchange=()=>refresh(true);
  el('admit').onchange=()=>refresh();
  function preset(all,fromURL=false,defaultMode='ballot'){
    el('arb').value=all?defaultMode:'legacy';el('admit').value=all?'contest':'legacy';
    el('kin').checked=all;el('axis').value='rule';
    if(fromURL){
      if(arbitrationModes.includes(params.get('arb')))el('arb').value=params.get('arb');
      if(['legacy','contest'].includes(params.get('admit')))el('admit').value=params.get('admit');
      if(params.has('kin'))el('kin').checked=params.get('kin')==='1';
      if(params.get('by')==='resolver')el('axis').value='resolver';
    }
    refresh(true);
    if(fromURL && el('arb').value==='matrix')matrix.setup(el('axis').value==='rule'?ruleIds:resolvers,params.get('edges'));
    else if(fromURL && params.has('order'))orderEl.value=params.get('order');
  }
  function settings(){
    const mode=el('arb').value,eligibility=el('admit').value;
    const ordered=['fixed','dominant','cycle','matrix'].includes(mode);
    const order=orderEl.value.split(',').map(id=>id.trim()).filter(Boolean);
    return {arbitration:ordered?{mode,by:el('axis').value,order,...(mode==='matrix'?{matrix:matrix.bits}:{})}:mode,eligibility,
      friendlyFire:eligibility==='contest' && el('kin').checked};
  }
  return {preset,settings};
}


// Keep the event transcript only. The engine reconstructs individual ballots
// on demand, without changing the simulation or its treasury.
export function contestMeter(){
  let selected=null, filter=null, drawn=null, total=0, multi=0, cycles=0;
  function observe(event){
    total++;if(event.claims.length>=3)multi++;
    if(event.cycle)cycles++;
    if(filter && !filter(event))return;
    if(!selected || event.claims.length>=selected.claims.length)selected=event;
  }
  function show(policy){
    el('contest-stats').textContent=total.toLocaleString('pt-BR')+(total===1?' disputa · ':' disputas · ')+multi.toLocaleString('pt-BR')+' com 3+ propostas · '+cycles.toLocaleString('pt-BR')+(cycles===1?' ciclo no topo':' ciclos no topo');
    el('locate-contest').disabled=!selected;
    if(!selected){drawn=null;el('contest-detail').textContent='';el('election-audit').replaceChildren();return;}
    const name=c=>ruleLabels[c.rule]+' ('+resolverNames[c.resolver]+')';
    const winner=selected.winner;
    el('contest-detail').textContent='G'+selected.gen+' · sítio '+selected.site+' · '+
      selected.claims.map(name).join(' / ')+' → '+(winner?name(winner):'vazio')+
      (selected.cycle?' · ciclo no topo':'');
    if(!el('why-contest').open || drawn===selected)return;
    drawn=selected;
    const audit=el('election-audit');audit.replaceChildren();
    function line(str){const row=document.createElement('p');row.textContent=str;audit.append(row);}
    const tag=i=>String.fromCharCode(65+i);
    for(const [i,c] of selected.claims.entries()){
      const kind={survival:'sobrevivência',birth:'nascimento',ignition:'ignição'}[c.kind];
      line(tag(i)+' · '+name(c)+' · jogador '+c.owner+' · '+kind+' · apoio '+c.support+
        ', idade '+c.age+', robustez '+(c.robustness??0)+' · voto: '+ballotNames[c.ballot]);
    }
    for(const round of explainContest(policy,selected).rounds){
      for(const edge of round.edges){
        const ballotsCast=edge.for+edge.against+edge.abstain;
        const tally=ballotsCast?' · '+edge.for+' a '+edge.against+(edge.abstain?' ('+edge.abstain+' abstenção)':''):'';
        const reason=ballotsCast && edge.for!==edge.against?'maioria':(policyNames[edge.reason]??ballotNames[edge.reason]??edge.reason);
        line(tag(edge.winner)+' vence '+tag(edge.loser)+tally+' · '+reason);
      }
      line('Topo '+round.top.map(tag).join(', ')+' · '+tag(round.preferred)+(round.accepted?' ocupa o sítio.':' sem verba, sai da disputa.'));
    }
  }
  return {observe,show,search(predicate){selected=null;filter=predicate;},resume(){filter=null;},
    get selected(){return selected;},get multi(){return multi;},get cycles(){return cycles;}};
}
