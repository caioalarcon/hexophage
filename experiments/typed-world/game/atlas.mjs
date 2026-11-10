import {rules,resolverNames} from '../catalog.mjs';
import {patternOffset} from '../../../src/patterns/planar-simulation.js';
import {atlasCards,rankCards,automaticDeck,seedFrame,advanceFrame,measurePattern,stampCost} from './atlas-model.mjs';
import {createAtlasCanvas} from './atlas-canvas.mjs';

const labels=Object.fromEntries(Object.entries(rules).map(([k,p])=>[k,p.label]));
const short={callahan:'Callahan',bays:'Bays','hex-b2s34':'Hex Life','hex-b2s245':'B2/S245',bays245:'Bays 245',
  andreen:'Andreen',highhex:'HighHexLife',ashley15:'Ashley 2015',ashley:'Ashley 2016'};
const votes={support:'Apoio',age:'Idade',geometry:'Posição',robustness:'Robustez'};
const storage='hexophage.mixed.atlas.v1',fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const sign=x=>x>0?'+'+fmt.format(x):fmt.format(x);
const plain=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const selectOptions=(node,entries)=>{for(const [key,label] of entries)node.add(new Option(label,key));};
const button=(txt,title)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;if(title)b.title=title;return b;};
const defaults=Object.fromEntries(atlasCards.map(c=>[c.key,c]));
function load(){
  try{
    const obj=JSON.parse(localStorage.getItem(storage)||'{}');
    const custom=Array.isArray(obj.custom)?obj.custom.filter(c=>c.custom && typeof c.name==='string'&&typeof c.key==='string' &&
      Object.hasOwn(rules,c.rule)&&Object.hasOwn(resolverNames,c.resolver)&&Object.hasOwn(votes,c.ballot)&&
      Array.isArray(c.offsets)&&c.offsets.length&&c.offsets.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger))):[];
    const replacements=obj.replacements&&typeof obj.replacements==='object'&&!Array.isArray(obj.replacements)
      ?Object.fromEntries(Object.entries(obj.replacements).filter(([,key])=>typeof key==='string')):{};
    return {custom,pins:Array.isArray(obj.pins)?obj.pins.filter(k=>typeof k==='string'):[],replacements};
  }catch{return {custom:[],pins:[],replacements:{}};}
}
const template=`
<header class="hxa-head"><div><small>HEXOPHAGE</small><h2>Atlas de carimbos</h2></div><button type="button" data-ui="exit" aria-label="Fechar atlas">×</button></header>
<p class="hxa-target" data-ui="target" hidden></p>
<div class="hxa-columns"><section class="hxa-library" aria-label="Catálogo">
<input data-ui="search" type="search" placeholder="Buscar padrão, ID ou regra" aria-label="Buscar no atlas">
<div class="hxa-filters"><select data-ui="family" aria-label="Filtrar por autômato"><option value="">Todos os autômatos</option></select>
<select data-ui="group" aria-label="Filtrar por tipo"><option value="">Todos os tipos</option><option value="@saved">Meus carimbos</option></select></div>
<div class="hxa-toolbar"><small data-ui="count"></small><button data-ui="new">+ Criar</button></div>
<div class="hxa-results" data-ui="results" aria-label="Padrões ordenados por retorno"></div></section>
<section class="hxa-detail" aria-label="Inspeção do carimbo">
<div class="hxa-title"><div><small data-ui="meta"></small><h3 data-ui="title"></h3></div><button data-ui="edit">Editar cópia</button></div>
<p class="hxa-interaction" data-ui="interaction"></p>
<div class="hxa-frame"><canvas data-ui="canvas" aria-label="Grade hexagonal do editor"></canvas><div class="hxa-tools">
<button data-ui="minus" aria-label="Diminuir zoom">−</button><button data-ui="plus" aria-label="Aumentar zoom">+</button><button data-ui="fit" title="Enquadrar padrão">Enquadrar</button></div></div>
<div class="hxa-transport"><button data-ui="play">Evoluir</button><button data-ui="one">+1</button><button data-ui="many">+16</button><button data-ui="back">Reiniciar</button><strong data-ui="tick">G0</strong></div>
<div class="hxa-draft" data-ui="draft" hidden><label>Nome<input data-ui="name" maxlength="90" placeholder="Meu carimbo"></label><label>Autômato<select data-ui="physics"></select></label>
<small>Desenhe em G0. Shift + arrastar move a grade.</small></div>
<div class="hxa-ledger"><div><small>Plantio</small><b data-ui="price"></b></div><div><small>Fluxo estimado</small><b data-ui="flow"></b></div><div><small>Saldo do ensaio</small><b data-ui="balance"></b></div></div>
<div class="hxa-stats" data-ui="stats"></div><div class="hxa-note" data-ui="note" role="status"></div>
<footer><button data-ui="unpin" hidden>Desafixar</button><button data-ui="delete" hidden>Excluir</button><button class="hxa-primary" data-ui="use">Usar na barra</button></footer>
</section></div>`;
export function createGameAtlas({host,getEconomy,getWallet=()=>Infinity,onSelect=()=>{},onDeck=()=>{}}){
  const dialog=document.createElement('dialog');dialog.className='hxa';dialog.setAttribute('aria-label','Atlas de carimbos');dialog.innerHTML=template;host.append(dialog);
  const ui=Object.fromEntries([...dialog.querySelectorAll('[data-ui]')].map(e=>[e.dataset.ui,e]));
  const saved=load();let library=[],rows=[],deck=[],active,draft=null,source,frame,g,net,added,lost,mature,timer,limit=48,replaceSlot=null;
  const wallet=()=>{const v=getWallet();return typeof v==='number'?{reserve:v,mature:0}:{reserve:v?.reserve??Infinity,mature:v?.mature??0};};
  function store(){try{localStorage.setItem(storage,JSON.stringify(saved));return true;}catch{return false;}}
  function refreshCatalog(){
    library=[...atlasCards,...saved.custom];
    rows=rankCards(library,getEconomy(),wallet());
  }
  function refresh(){
    refreshCatalog();
    const auto=automaticDeck(rows.filter(r=>!r.card.custom)),map=new Map(library.map(c=>[c.key,c]));
    const selected=saved.pins.map(k=>map.get(k)).filter(Boolean),pinned=new Set(selected.map(c=>c.key));
    deck=[...selected,...auto.filter(c=>!pinned.has(c.key))].map(c=>({...(map.get(saved.replacements[c.key])??c),slotKey:c.key}));onDeck(deck);
    if(dialog.open){renderResults();metrics();}
  }
  function select(card){
    if(!card)return;
    if(replaceSlot!==null){
      const replacement={...card,slotKey:replaceSlot};
      if(card.key===replaceSlot)delete saved.replacements[replaceSlot];else saved.replacements[replaceSlot]=card.key;
      store();refreshCatalog();
      deck=deck.map(c=>c.slotKey===replaceSlot?replacement:c);onDeck(deck);onSelect(replacement);
      return;
    }
    delete saved.replacements[card.key];
    saved.pins=[card.key,...saved.pins.filter(k=>k!==card.key)];store();refresh();onSelect(deck.find(c=>c.slotKey===card.key)??card);
  }
  function stop(){clearInterval(timer);timer=null;ui.play.textContent='Evoluir';}
  function close(){stop();replaceSlot=null;dialog.close();}
  function open(card,{replace=false}={}){
    replaceSlot=replace?(card?.slotKey??card?.key??null):null;
    ui.target.hidden=replaceSlot===null;
    ui.target.textContent=replaceSlot===null?'':'Escolha ou edite o carimbo que vai substituir '+card.name+' neste espaço da barra.';
    if(!dialog.open)dialog.showModal();
    refreshCatalog();const current=card??active??deck[0]??atlasCards[0];inspect(current);ui.search.focus();
  }
  selectOptions(ui.family,Object.entries(labels));selectOptions(ui.physics,Object.entries(labels));
  selectOptions(ui.group,[...new Set(atlasCards.map(c=>c.group))].sort().map(s=>[s,s]));
  function renderResults(){
    const wanted=plain(ui.search.value.trim()),family=ui.family.value,group=ui.group.value;
    const results=rows.filter(({card:c})=>(!family||family===c.rule)&&(!group||(group==='@saved'?c.custom||saved.pins.includes(c.key):c.group===group))&&
      (!wanted||plain(c.name+' '+c.key+' '+labels[c.rule]+' '+c.group).includes(wanted)));
    ui.count.textContent=results.length+' '+(results.length===1?'padrão':'padrões');
    const frag=document.createDocumentFragment();
    for(const x of results.slice(0,limit)){
      const c=x.card,b=button('');b.className='hxa-row';b.dataset.card=c.key;b.setAttribute('aria-pressed',String(active?.key===c.key && !draft));
      const text=document.createElement('span'),name=document.createElement('b'),tag=document.createElement('small'),rate=document.createElement('span');
      name.textContent=c.name;tag.textContent=short[c.rule]+' · '+c.group;text.append(name,tag);rate.className='hxa-rate';rate.textContent=x.flow===null?'—':sign(x.flow)+'/G';b.append(text,rate);
      b.onclick=()=>inspect(c);frag.append(b);
    }
    if(results.length>limit){const more=button('Mais padrões');more.onclick=()=>{limit+=48;renderResults();};frag.append(more);}
    ui.results.replaceChildren(frag);
  }
  function reset(recenter=true){
    stop();g=0;added=lost=mature=0;source=draft??active;frame=seedFrame(source);net=-stampCost(source,getEconomy());ui.note.textContent='';
    view.set(frame,!!draft,recenter);metrics();
  }
  function metrics(){
    if(!source)return;
    ui.tick.textContent='G'+g;ui.title.textContent=draft?(draft.name||'Novo carimbo'):active.name;
    ui.meta.textContent=labels[source.rule]+' · '+source.group;ui.edit.hidden=!!draft;
    ui.interaction.textContent=resolverNames[source.resolver]+' · voto '+votes[source.ballot];
    ui.edit.textContent=active?.custom?'Editar':'Editar cópia';
    ui.unpin.hidden=replaceSlot!==null||!!draft||!saved.pins.includes(active?.key);ui.delete.hidden=!!draft||!active?.custom;
    ui.draft.hidden=!draft;ui.use.textContent=replaceSlot!==null?(draft?'Salvar e substituir':'Substituir neste espaço'):(draft?'Salvar e usar':'Usar na barra');
    ui.price.textContent='◈ '+fmt.format(stampCost(source,getEconomy()));
    const estimate=draft?null:rows.find(x=>x.card.key===source.key);
    ui.flow.textContent=estimate?.flow!=null?sign(estimate.flow)+'/G':g?sign((net+stampCost(source,getEconomy()))/g)+'/G':'—';
    ui.flow.title=draft?'Média das gerações do ensaio':estimate?.horizon===1024?'Projeção isolada · amostra G897–1024':'Projeção isolada a partir do plantio';
    ui.balance.textContent='◈ '+sign(net);
    ui.stats.textContent=frame.size+' vivas · '+mature+' maduras · '+added+' nascimentos · '+lost+' mortes';
    ui.balance.title='Receita menos plantio e nascimentos, em isolamento e com financiamento disponível.';
    ui.use.disabled=!source.offsets.length;
  }
  const view=createAtlasCanvas(ui.canvas,(id,value)=>{
    if(!draft||g)return;
    if(value)frame.set(id,1);else frame.delete(id);
    draft.offsets=[...frame.keys()].map(patternOffset);delete draft.nativeKey;delete draft.sample;net=-stampCost(draft,getEconomy());
    view.set(frame,true);metrics();
  });
  function inspect(c){
    active=c;draft=null;reset();renderResults();
  }
  function edit(fresh=false){
    if(fresh){draft={key:'',name:'',rule:ui.family.value||active.rule,group:'personalizado',resolver:'contact',sense:'native',ballot:'support',custom:true,offsets:[]};}
    else{
      const shared=replaceSlot!==null && active.custom && (
        deck.some(c=>c.slotKey!==replaceSlot && c.key===active.key) ||
        Object.entries(saved.replacements).some(([slot,key])=>slot!==replaceSlot && key===active.key) ||
        saved.pins.includes(active.key) && replaceSlot!==active.key);
      draft={...active,key:active.custom&&!shared?active.key:'',name:active.custom?active.name:active.name+' · cópia',nativeKey:active.nativeKey??(!active.custom?active.key:undefined),custom:true,offsets:active.offsets.map(p=>[...p])};
    }
    ui.name.value=draft.name;ui.physics.value=draft.rule;
    reset();renderResults();ui.name.focus();
  }
  function step(count){
    if(!frame.size){stop();return;}
    for(let i=0;i<count;i++){
      if(frame.size>12000){stop();ui.note.textContent='Prévia pausada em '+fmt.format(frame.size)+' células.';break;}
      const z=advanceFrame(frame,source,getEconomy(),wallet().mature);frame=z.next;g++;net+=z.flow;added+=z.births;lost+=z.deaths;
      if(!frame.size){stop();break;}
    }
    mature=0;for(const age of frame.values())if(age>=getEconomy().stableAfter)mature++;
    view.set(frame,false,true);metrics();
  }
  function commitDraft(){
    draft.name=ui.name.value.trim()||'Meu carimbo';if(!draft.offsets.length)return;
    const card={...draft,key:draft.key||'custom/'+crypto.randomUUID(),group:draft.nativeKey?(defaults[draft.nativeKey]?.group??'personalizado'):'personalizado'};
    if(!card.nativeKey || defaults[card.nativeKey]?.rule!==card.rule){
      delete card.nativeKey;card.sample=measurePattern(card,getEconomy());
    }
    const idx=saved.custom.findIndex(c=>c.key===card.key);if(idx<0)saved.custom.unshift(card);else saved.custom[idx]=card;
    if(!store()){ui.note.textContent='O navegador não conseguiu guardar o carimbo.';return;}
    draft=null;active=card;select(card);close();
  }
  ui.use.onclick=()=>{if(draft)commitDraft();else{select(active);close();}};
  ui.edit.onclick=()=>edit();ui.new.onclick=()=>edit(true);
  ui.name.oninput=()=>{draft.name=ui.name.value;metrics();};
  ui.physics.onchange=()=>{draft.rule=ui.physics.value;delete draft.nativeKey;delete draft.sample;reset();};
  ui.unpin.onclick=()=>{saved.pins=saved.pins.filter(k=>k!==active.key);store();refresh();};
  ui.delete.onclick=()=>{const key=active.key;saved.custom=saved.custom.filter(c=>c.key!==key);saved.pins=saved.pins.filter(k=>k!==key);
    for(const slot of Object.keys(saved.replacements))if(saved.replacements[slot]===key)delete saved.replacements[slot];
    store();refresh();inspect(deck[0]);onSelect(deck[0]);};
  ui.exit.onclick=close;dialog.addEventListener('close',()=>{stop();replaceSlot=null;});
  ui.one.onclick=()=>{stop();step(1);};ui.many.onclick=()=>{stop();step(16);};ui.back.onclick=()=>reset();
  ui.play.onclick=()=>{if(timer)stop();else{step(1);if(frame.size&&frame.size<=12000){timer=setInterval(()=>step(1),120);ui.play.textContent='Pausar';}}};
  ui.fit.onclick=()=>view.fit();ui.plus.onclick=()=>view.zoom(1.35);ui.minus.onclick=()=>view.zoom(1/1.35);
  for(const el of [ui.search,ui.family,ui.group])el.oninput=()=>{limit=48;renderResults();ui.results.scrollTop=0;};
  refresh();
  return {open,close,refresh,deck:()=>deck,select,destroy(){stop();view.destroy();dialog.remove();}};
}
