import {$} from '../layout/elements.js';
import {defaultProgressionPlan,normalizeProgressionPlan,progressionDesignLimits,resourceKinds} from '../../experiments/typed-world/game/progression.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const cardFields=c=>({cardKey:c.custom?null:c.cardKey??c.key??null,name:c.name,rule:c.rule??c.source,offsets:c.offsets.map(p=>[...p]),
  resolver:c.resolver??'contact',ballot:c.ballot??'support',sense:c.sense??'native'});
const editable=n=>Object.fromEntries(['id','name','cardKey','rule','offsets','parent','weights','vision','reach','capacity','resolver','ballot','sense'].map(k=>[k,n[k]]));

export function createProgressionPanel(getSelected){
  let draft=defaultProgressionPlan(),selected=draft.base,initialCard=null;
  const error=$('mx-plan-error'),rows=$('mx-plan-rows');
  function document(){return {version:1,base:draft.base,nodes:draft.nodes.map(editable)};}
  function status(){
    $('mx-plan-json').value=JSON.stringify(document(),null,2);
    try{
      const plan=normalizeProgressionPlan(document());
      error.textContent='';$('mx-plan-budget').textContent='Preparação: '+plan.designPoints+' / '+progressionDesignLimits.totalPoints+' pontos · até '+progressionDesignLimits.childPoints+' pontos liberados por linhagem';
      rows.replaceChildren();
      for(const n of plan.nodes){
        const row=window.document.createElement('button');row.type='button';row.dataset.recipe=n.id;
        row.setAttribute('aria-pressed',String(n.id===selected));
        const title=window.document.createElement('strong'),detail=window.document.createElement('small');
        title.textContent=n.name;
        const parent=plan.nodes.find(p=>p.id===n.parent);
        detail.textContent=(parent?parent.name+' → ':'Inicial · ')+n.size+' células · '+n.cost.map((v,i)=>resourceKinds[i].symbol+' '+v).join(' · ');
        row.append(title,detail);row.onclick=()=>{selected=n.id;render();};rows.append(row);
      }
      return plan;
    }catch(e){error.textContent=e.message;$('mx-plan-budget').textContent='Ajuste o plano para iniciar.';return null;}
  }
  function render(){
    if(!draft.nodes.some(n=>n.id===selected))selected=draft.base;
    const n=draft.nodes.find(n=>n.id===selected);
    const parents=$('mx-plan-parent');parents.replaceChildren();
    if(selected===draft.base)parents.add(new Option('Base inicial',''));
    else for(const p of draft.nodes)if(p.id!==selected)parents.add(new Option(p.name,p.id));
    parents.value=n.parent??'';parents.disabled=selected===draft.base;
    $('mx-plan-name').value=n.name;
    for(const k of ['vision','reach','capacity'])$('mx-plan-'+k).value=n[k];
    for(let k=0;k<4;k++)$('mx-plan-weight-'+k).value=n.weights[k];
    $('mx-plan-shape').textContent=n.rule+' · '+n.offsets.length+' células · '+({contact:'Contato',guard:'Guarda',phase:'Travessia',antimatter:'Antimatéria'}[n.resolver]??n.resolver);
    $('mx-plan-remove').disabled=selected===draft.base;
    status();
  }
  function update(){
    const n=draft.nodes.find(n=>n.id===selected);n.name=$('mx-plan-name').value||n.id;
    n.parent=selected===draft.base?null:$('mx-plan-parent').value;
    for(const k of ['vision','reach','capacity'])n[k]=$('mx-plan-'+k).valueAsNumber;
    n.weights=resourceKinds.map((_,k)=>$('mx-plan-weight-'+k).valueAsNumber);
    status();
  }
  for(const id of ['mx-plan-name','mx-plan-parent','mx-plan-vision','mx-plan-reach','mx-plan-capacity',...resourceKinds.map((_,k)=>'mx-plan-weight-'+k)])$(id).oninput=update;
  $('mx-plan-add').onclick=()=>{
    const c=getSelected();if(!c){error.textContent='Escolha um carimbo no Atlas primeiro.';return;}
    let i=1;while(draft.nodes.some(n=>n.id==='creation-'+i))i++;
    const id='creation-'+i;
    draft.nodes.push({id,...cardFields(c),parent:selected,weights:[40,20,20,20],vision:6,reach:8,capacity:128});
    selected=id;render();
  };
  $('mx-plan-replace').onclick=()=>{
    const c=getSelected();if(!c){error.textContent='Escolha um carimbo no Atlas primeiro.';return;}
    Object.assign(draft.nodes.find(n=>n.id===selected),cardFields(c));render();
  };
  $('mx-plan-remove').onclick=()=>{
    if(selected===draft.base)return;
    if(draft.nodes.some(n=>n.parent===selected)){error.textContent='Mude a origem dos carimbos dependentes antes de remover este.';return;}
    draft.nodes=draft.nodes.filter(n=>n.id!==selected);selected=draft.base;render();
  };
  $('mx-plan-reset').onclick=()=>{draft=defaultProgressionPlan(initialCard);selected=draft.base;render();};
  $('mx-plan-import').onclick=()=>{
    try{const value=normalizeProgressionPlan(JSON.parse($('mx-plan-json').value));draft=clone(value);selected=draft.base;render();}
    catch(e){error.textContent=e.message;}
  };
  return {
    load(plan,base){initialCard=base;draft=clone(plan??defaultProgressionPlan(base));selected=draft.base;render();},
    value(){return normalizeProgressionPlan(document());},
    setBase(c){initialCard=c;Object.assign(draft.nodes.find(n=>n.id===draft.base),cardFields(c));render();},
    show(enabled){$('mx-progression-settings').hidden=!enabled;},
  };
}
