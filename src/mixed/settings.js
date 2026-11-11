import {matrixEditor} from '../../experiments/typed-world/general/matrix-panel.mjs';
import {ruleIds,resolvers} from '../../experiments/typed-world/arbitration.mjs';
import {$} from '../layout/elements.js';
import {gameEconomies} from '../../experiments/typed-world/game/match.mjs';
import {normalizeToolSettings} from './field-tools.js';
import {saveToolSettings} from './tool-controls.js';

const tariffs={stampCost:'Plantio por célula',birthCost:'Custo por nascimento',eraseCost:'Custo por substituição',
  stableEnergy:'Renda por madura',stableAfter:'Idade de maturação',productionScale:'Escala de saturação',
  birthEnergy:'Renda por nascimento',deathEnergy:'Renda por morte',blastBirthCost:'Nascimento de onda',
  salvage:'Revenda por célula',protectedMature:'Maduras protegidas'};

export function bindSettings(getOptions,getMatch,apply,{onToolsChanged=()=>{}}={}){
  const dialog=$('mx-settings'),inputs=new Map();
  for(const f of [16,24,32,48,64,96,128,160,320])
    $('mx-size').add(new Option('F'+f+' · '+(10*f*f+2).toLocaleString('pt-BR'),String(f)));
  for(const [key,name] of Object.entries(tariffs)){
    const label=document.createElement('label'),input=document.createElement('input');
    label.textContent=name;input.type='number';input.min='0';input.step=['protectedMature','stableAfter'].includes(key)?'1':'any';input.required=true;
    input.dataset.key=key;inputs.set(key,input);label.append(input);$('mx-tariffs').append(label);
  }
  const matrix=matrixEditor($('mx-matrix'));
  const presets=['fixed','dominant','cycle','matrix'];
  function setArb(saved){
    const mode=$('mx-identity').value,families=$('mx-axis').value==='rule'?ruleIds:resolvers;
    $('mx-families').hidden=!presets.includes(mode);
    if(!presets.includes(mode))return;
    $('mx-order-line').hidden=mode==='matrix';$('mx-matrix').hidden=mode!=='matrix';
    if(mode==='matrix')matrix.setup(families,saved?.matrix);
    else{
      $('mx-order-label').textContent=mode==='cycle'?'A vence B, B vence C, C vence A':mode==='dominant'?'Família dominante':'Ordem de precedência';
      const n=mode==='dominant'?1:mode==='cycle'?3:families.length;
      $('mx-order').value=(saved?.order??families.slice(0,n)).join(', ');$('mx-order').title=families.join(', ');
    }
  }
  $('mx-identity').onchange=$('mx-axis').onchange=()=>setArb();
  function setRates(profile){
    const economy={...getMatch().economy,...profile};
    for(const [key,input] of inputs)input.value=String(economy[key]);
  }
  $('mx-config').onclick=()=>{
    const o=getOptions();
    $('mx-bot-interval').value=o.botInterval;$('mx-bot-budget').value=o.botBudget;
    $('mx-size').value=o.F;$('mx-seed').value=o.seed;$('mx-bank').value=o.bank;
    $('mx-economy').value=o.policy;$('mx-existence').value=o.existence;$('mx-identity').value=o.arbitration.mode??o.arbitration;
    $('mx-axis').value=o.arbitration.by??'resolver';$('mx-friendly').checked=o.friendlyFire;setArb(o.arbitration);
    $('mx-erase-max').value=getMatch().toolSettings.maxEraseRadius;
    $('mx-stamp-max').value=getMatch().toolSettings.maxStampCells;
    $('mx-tools-apply').textContent='Aplicar ferramentas nesta partida';
    setRates(getMatch().economy);$('mx-error').textContent='';dialog.showModal();
  };
  const readTools=()=>normalizeToolSettings({maxEraseRadius:$('mx-erase-max').valueAsNumber,maxStampCells:$('mx-stamp-max').valueAsNumber});
  $('mx-tools-apply').onclick=()=>{
    try{
      const toolSettings=readTools();getMatch().setToolSettings(toolSettings);saveToolSettings(toolSettings);
      onToolsChanged(toolSettings);$('mx-error').textContent='';
      $('mx-tools-apply').textContent='Ferramentas aplicadas';
    }catch(error){$('mx-error').textContent=error.message;}
  };
  for(const id of ['mx-erase-max','mx-stamp-max'])$(id).oninput=()=>{$('mx-tools-apply').textContent='Aplicar ferramentas nesta partida';};
  $('mx-economy').onchange=()=>setRates(gameEconomies[$('mx-economy').value]);
  $('mx-setup').onsubmit=e=>{
    e.preventDefault();
    const economy=Object.fromEntries([...inputs].map(([key,input])=>[key,input.valueAsNumber]));
    try{
      const mode=$('mx-identity').value,by=$('mx-axis').value;
      const arbitration=presets.includes(mode)?{mode,by,order:mode==='matrix'?(by==='rule'?ruleIds:resolvers):$('mx-order').value.split(',').map(x=>x.trim()),...(mode==='matrix'?{matrix:matrix.bits}:{})}:mode;
      const toolSettings=readTools();
      apply({...getOptions(),toolSettings,botInterval:$('mx-bot-interval').valueAsNumber,botBudget:$('mx-bot-budget').valueAsNumber,F:+$('mx-size').value,seed:+$('mx-seed').value,bank:$('mx-bank').value===''?getOptions().bank:+$('mx-bank').value,
        policy:$('mx-economy').value,existence:$('mx-existence').value,arbitration,friendlyFire:$('mx-friendly').checked,economy});
      saveToolSettings(toolSettings);
      dialog.close();
    }catch(error){$('mx-error').textContent=error.message;}
  };
  $('mx-settings-close').onclick=()=>dialog.close();
  dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
}
