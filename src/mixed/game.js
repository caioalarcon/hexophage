import {world} from '../browser/world-state.js';
import {game} from '../browser/game.js';
import {MIXED_MODE,navigateToMode,populateModeSelector} from '../match/controls/mode.js';
import {$} from '../layout/elements.js';
import {toast} from '../layout/announcements.js';
import {centerOnPlayer} from '../map/camera/player-sector.js';
import {stampTargets} from '../patterns/placement/footprint.js';
import {key} from '../world/geometry.js';
import {usePlacement} from '../patterns/placement/plant.js';
import {requestSphere,cancelBuild} from '../world/build-dialog.js';
import {setPlay,syncPlayButton} from '../match/controls/playback.js';
import {createGameMatch,defaultGameOptions,gameEconomies} from '../../experiments/typed-world/game/match.mjs';
import {createGameBots} from '../../experiments/typed-world/game/bots.mjs';
import {createGameAtlas} from '../../experiments/typed-world/game/atlas.mjs';
import {resolverNames} from '../../experiments/typed-world/catalog.mjs';
import {openFullGlobe} from '../globe/navigator/fullscreen.js';
import {createHand} from './hand.js';
import {bindMixedViewport,loadViewport,paintViewport,syncField} from './viewport.js';
import {bindSettings} from './settings.js';
import {createScoreboard} from './score.js';
import {createFieldTools,loadToolSettings} from './tool-controls.js';

const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
function mount(){
  const root=$('hexlab'),fragment=$('mx-panel-template').content.cloneNode(true);
  root.classList.add('mixed');
  root.querySelector('.hl-shell').append(fragment.querySelector('.mx-arsenal'));
  $('br-rail').insertBefore(fragment.querySelector('.mx-console'),$('br-rail-controls'));
  root.append(fragment);
  const selector=$('hl-rulechoice');$('mx-mode-slot').append(selector);
  populateModeSelector(selector);selector.value=MIXED_MODE;selector.onchange=()=>navigateToMode(selector.value);
  $('mx-actions').prepend($('hl-play'),$('hl-clear'),$('hl-step'));
  $('hl-clear').title='Parar a partida';$('hl-clear').setAttribute('aria-label','Parar a partida');
  $('mx-speed-slot').append($('hl-speed').closest('.br-speed-knob'));
  const portrait=matchMedia('(orientation: portrait)');
  function fold(){ $('mx-league').open=!portrait.matches; }
  fold();portrait.addEventListener('change',fold);
}
export function startMixedGame(){
  mount();
  let session,controllers,atlas,tools,options,dirty=true,lastUI=-Infinity,elapsed=0,previous=0,lastOrders=[],event=null,activeSource=null,lastUndo=null,pendingHazard=null;
  const hand=createHand(()=>session?.match,{onInspect:card=>atlas.open(card,{replace:true}),onChoose:()=>tools?.select('stamp')});
  const fillDeck=cards=>{
    if(session?.match.progression){
      hand.fill(activeSource?session.match.progression.childrenFor(activeSource.contract):[]);
      return;
    }
    if(!session?.match.spatial?.enabled){hand.fill(cards);return;}
    const base=session.opening[1],known=cards.find(c=>c.key===base.key),opening=known??{...base,source:base.rule,custom:true,slotKey:base.key};
    hand.fill([opening,...cards.filter(c=>c.key!==base.key)].slice(0,Math.max(54,cards.length)));
  };
  function selectFactory(site,quiet=false){
    const progression=session?.match.progression,source=progression?.sourceAt(site,1);
    if(!source)return false;
    activeSource=source;world.selectedFactory=site;
    const available=progression.childrenFor(source.contract);
    $('mx-factory-context').hidden=false;$('mx-factory-name').textContent=source.name;
    $('mx-factory-name').title=source.name+' · raio de fabricação '+source.reach;
    $('mx-deck-title').firstChild.textContent='Fabricar ';
    hand.fill(available);world.needsDraw=true;
    if(!quiet)toast(source.name+' · '+available.length+' receitas');
    return true;
  }
  function selectBase(quiet=true){
    const p=session?.match.progression;if(!p)return;
    const site=[...session.match.cells].find(([,c])=>c.owner===1&&!c.wave&&c.contract===p.plan.base)?.[0];
    if(site!==undefined)selectFactory(site,quiet);
  }
  $('mx-factory-reset').onclick=()=>selectBase();
  const scoreboard=createScoreboard(()=>session);
  tools=createFieldTools({getMatch:()=>session?.match,canEdit:()=>!!session?.alive[1]&&!game.ended&&!game.stopped,
    onCapture:card=>atlas.capture(card,hand.selected),onErase:()=>{dirty=true;}});
  function hud(){
    const m=session.match,p=m.players[1];
    $('br-rail-gen').textContent='G '+m.gen.toLocaleString('pt-BR');
    $('mx-cash').textContent='◈ '+number.format(p.reserve);
    $('mx-field').textContent=p.conventional.toLocaleString('pt-BR');
    $('mx-flow').textContent=(scoreboard.flow>0?'+':'')+number.format(scoreboard.flow);
    if(m.spatial?.enabled){
      const view=m.visibility(1);$('mx-vision').textContent='Luz: '+view.visible.size.toLocaleString('pt-BR')+' · Explorado: '+view.explored.size.toLocaleString('pt-BR');
      const targets=targetIds(world.hover),cell=world.hover?.id===undefined?null:m.cells.get(world.hover.id);
      $('mx-local-energy').textContent=targets?'Energia perto do carimbo: ◈ '+number.format(m.localReserve(1,targets)):
        cell?.owner===1?'Célula: ◈ '+number.format(cell.energy)+' · Estável por '+cell.stableAge+' G':'Energia guardada nas células · ◈ '+number.format(p.reserve);
    }
    if(m.progression){
      if(activeSource && !m.progression.sourceAt(activeSource.site,1)){
        activeSource=null;world.selectedFactory=null;selectBase(true);
      }
      const progression=m.progression,inventory=progression.inventory(1),objective=progression.objective(1);
      for(let i=0;i<4;i++)$('mx-resource-'+i).textContent=number.format(inventory[i]);
      $('mx-objective').textContent='Base '+objective.rootCells+'c';
      $('mx-objective').title='Condição de vitória: preserve ao menos uma célula da sua linhagem-base.';
      const contract=progression.contractForCard(hand.selected),node=progression.plan.nodes.find(n=>n.id===contract),ids=targetIds(world.hover);
      if(node){
        const parent=progression.plan.nodes.find(n=>n.id===(node.parent??progression.plan.base));
        const quote=ids?progression.getQuote(1,contract,ids,activeSource?.site??null):null;
        $('mx-permission').textContent=quote?(quote.ok?'✓':'×'):'↳'+parent.name;
        $('mx-permission').title=quote?.reason??('Construído por '+parent.name+' · '+node.cost.map((v,i)=>progression.resources[i].symbol+' '+v).join(' · '));
      }else {$('mx-permission').textContent='';$('mx-permission').title='Selecione uma estrutura sua para fabricar.';}
      const site=world.hover?.id??(world.hover&&world.chart?.map.get(world.hover.q+','+world.hover.r)?.id);
      const deposit=progression.resourceAt(site,1);
      $('mx-deposit-info').textContent=deposit?deposit.resource.symbol+' '+number.format(deposit.remaining):'';
      $('mx-deposit-info').title=deposit?deposit.resource.name+' · depósito do terreno · '+number.format(deposit.remaining):'Depósitos são minerais do terreno. Células estáveis adjacentes os coletam.';
    }
    if($('mx-conflicts').open && event){
      const votes=event.policy==='support'?event.weightYes+' / '+event.weightNo:event.yes+' / '+event.no;
      const owner=event.winner?game.names[event.winner.owner]:'';
      $('mx-event').textContent='G'+event.gen+' · sim / não '+votes+' · matéria '+(event.approved?'viva':'vazia')+' · final '+(event.winner?owner+' / '+event.winner.rule:'vazio');
      $('mx-locate').hidden=false;
    }
    hand.update();scoreboard.update();lastUI=performance.now();
  }
  function reset(next,prepared,storage){
    const sameGraph=prepared??(session?.graph.f===next.F?session.graph:undefined);
    const fresh=createGameMatch({...next,unseededOwners:[1],...(sameGraph?{graph:sameGraph}:{})});
    controllers?.destroy();session=fresh;options=next;
    scoreboard.reset();
    controllers=createGameBots(session.match,{seed:options.seed,interval:options.botInterval,budget:options.botBudget,onOrder:o=>{
      lastOrders.push(o);if(lastOrders.length>40)lastOrders.shift();
    }});
    game.ended=false;game.winner=0;game.stopped=false;game.humanEliminated=false;world.matchStarted=false;lastOrders=[];elapsed=0;
    event=null;activeSource=null;lastUndo=null;pendingHazard=null;world.selectedFactory=null;
    $('mx-undo').hidden=true;$('mx-factory-context').hidden=!session.match.progression;
    $('mx-deck-title').firstChild.textContent='Carimbos ';
    $('mx-event').textContent='Avance para observar.';$('mx-locate').hidden=true;
    $('mx-profile-button').textContent='Economia · '+({stability:'Maduras',birth:'Nascimentos',death:'Mortes',activity:'Atividade'}[options.policy]);
    $('mx-frontier').hidden=!session.match.spatial?.enabled;
    $('mx-cash').previousElementSibling.textContent=session.match.spatial?.enabled?'ENERGIA EM CAMPO':'RESERVA';
    if(session.match.spatial?.enabled)$('mx-profile-button').textContent='Economia · Celular';
    $('mx-materials').hidden=!session.match.progression;
    $('hexlab').dataset.experiment=session.match.progression?'resources':session.match.spatial?.enabled?'local':'classic';
    if(session.match.progression){
      $('mx-profile-button').textContent='Plano · Recursos';
      const stores=$('mx-resource-stores');stores.replaceChildren();
      for(const [i,r] of session.match.progression.resources.entries()){
        const item=document.createElement('div'),name=document.createElement('small'),amount=document.createElement('b');
        item.style.setProperty('--resource',r.color);item.title=r.use;name.textContent=r.symbol;amount.id='mx-resource-'+i;item.title=r.name+' · '+r.use;
        item.append(name,amount);stores.append(item);
      }
      $('mx-frontier-help').textContent='Clique nas suas estruturas para fabricar os carimbos liberados.';
    }else $('mx-frontier-help').textContent='Território explorado libera terreno para construir.';
    loadViewport(session,storage);
    if(session.match.progression)selectBase(true);
    world.speed=Number($('hl-speed').value);syncPlayButton();
    tools.refresh();tools.select('stamp');world.painting=false;
    if(atlas)atlas.refresh();dirty=true;hud();
    toast(session.match.spatial?.enabled?'Base pronta · explore e selecione estruturas':'Partida pronta · '+(options.players-1)+' bots');
  }
  const query=new URLSearchParams(location.search),requestedSeed=query.get('seed');
  const initial={...defaultGameOptions,botInterval:12,botBudget:4,toolSettings:loadToolSettings()};
  if(query.get('experiment')==='local')initial.spatial={enabled:true};
  if(query.get('experiment')==='resources'){initial.spatial={enabled:true};initial.progression={enabled:true};}
  if(Object.hasOwn(gameEconomies,query.get('economy')))initial.policy=query.get('economy');
  if(requestedSeed!==null && /^\d{1,10}$/.test(requestedSeed) && Number(requestedSeed)<=0xffffffff)initial.seed=Number(requestedSeed);
  if(['16','24','32','48','64','96','128','160','320'].includes(query.get('f')))initial.F=Number(query.get('f'));
  bindMixedViewport();
  $('br-build-cancel').onclick=cancelBuild;
  $('br-building').addEventListener('cancel',e=>{e.preventDefault();cancelBuild();});
  bindSettings(()=>options,()=>session.match,next=>{
    if(next.F!==session.graph.f && next.F>=64)requestSphere(next.F,(graph,buffers)=>reset(next,graph,buffers));
    else reset(next);
  },{onToolsChanged:toolSettings=>{options={...options,toolSettings};tools.refresh();hand.update();},
    getSelected:()=>hand.selected?{...hand.selected,offsets:hand.current.shape,resolver:hand.current.resolver,ballot:hand.current.ballot}:null});
  const siteAt=anchor=>anchor?.id??(anchor&&world.chart?.map.get(key(anchor.q,anchor.r))?.id);
  const targetIds=anchor=>anchor&&hand.current?stampTargets(anchor,hand.current.shape):null;
  const metadata=c=>{
    const contract=session.match.progression?.contractForCard(c);
    return contract?{contract,...(activeSource?{sourceSite:activeSource.site}:{})}:{};
  };
  function preview(anchor){
    if(tools.mode!=='stamp')return tools.preview(anchor);
    if(!session.alive[1]||game.ended||game.stopped||!hand.selected)return null;
    const ids=targetIds(anchor),{resolver,ballot}=hand.current,c=hand.selected;
    return ids?{ids,ready:session.match.canStamp(1,c.rule,resolver,ids,ballot,c.sense??'native',metadata(c))}:null;
  }
  function undoStamp(){
    if(!lastUndo)return;
    const snapshot=lastUndo;lastUndo=null;pendingHazard=null;setPlay(false);
    session.restore(snapshot.match,snapshot.alive,snapshot.eliminatedAt);
    controllers?.destroy();
    controllers=createGameBots(session.match,{seed:options.seed,interval:options.botInterval,budget:options.botBudget,onOrder:o=>{
      lastOrders.push(o);if(lastOrders.length>40)lastOrders.shift();
    }});
    game.ended=false;game.winner=0;game.stopped=false;game.humanEliminated=false;elapsed=0;
    $('mx-undo').hidden=true;scoreboard.reset();
    if(activeSource&&!session.match.progression?.sourceAt(activeSource.site,1))selectBase(true);
    syncField(session.match);hud();dirty=true;syncPlayButton();
    toast('Carimbo desfeito.');
  }
  $('mx-undo').onclick=undoStamp;
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&lastUndo&&!e.target.closest?.('input,textarea,select,[contenteditable="true"]')){
      e.preventDefault();undoStamp();
    }
  });
  function place(anchor){
    if(tools.mode!=='stamp')return tools.apply(anchor);
    const clicked=siteAt(anchor);
    if(session.match.progression&&clicked!==undefined&&selectFactory(clicked,true)){hud();return true;}
    const proposed=preview(anchor),c=hand.selected,p=session.match.players[1],m=hand.current;
    if(!proposed?.ready){
      const meta=metadata(c),contract=meta.contract;
      const cost=c&&m?session.match.stampQuote(c.rule,m.resolver,c.offsets.length,{contract}).total:0;
      const reason=c&&m?session.match.stampRejection(1,c.rule,m.resolver,targetIds(anchor),m.ballot,c.sense??'native',meta):null;
      if(session.match.progression&&!game.stopped&&!game.ended&&session.alive[1]){
        toast(session.match.progression.getQuote(1,contract,targetIds(anchor),activeSource?.site??null).reason);return false;
      }
      toast(game.stopped?'Partida interrompida.':game.ended?'Partida encerrada.':!session.alive[1]?'Sua colônia foi eliminada.':reason==='darkness'?
        'O carimbo precisa caber em território já explorado.':reason==='local-energy'?
        'As células próximas precisam de mais energia para construir e abastecer este carimbo.':c?.offsets.length>session.match.toolSettings.maxStampCells?
        'Carimbo acima do limite de '+session.match.toolSettings.maxStampCells+' células.':p.reserve<cost?
        'Faltam ◈ '+number.format(cost-p.reserve)+' para este carimbo.':!targetIds(anchor)?'O carimbo não cabe nesta região da malha.':'Posição ocupada ou junto de uma colônia adversária.');
      return false;
    }
    const before=session.match.fork();
    const ok=session.match.stamp(1,c.rule,m.resolver,proposed.ids,m.ballot,c.sense??'native',metadata(c));
    if(ok){
      lastUndo={match:before,alive:session.alive.slice(),eliminatedAt:session.eliminatedAt.slice(),generation:before.gen,field:before.players[1].conventional};
      $('mx-undo').hidden=false;dirty=true;syncField(session.match);hud();toast(c.name+' · '+resolverNames[m.resolver]);
    }
    return ok;
  }
  usePlacement({preview,place,get gesture(){return tools.mode==='erase'?'paint':'stamp';}});
  const observe={onExistence:e=>{if(e.yes&&e.no&&(!session.match.spatial?.enabled||session.match.canSee(1,e.site)))event=e;}};
  $('mx-home').onclick=()=>{centerOnPlayer(session.starts[1]);world.needsDraw=world.needsGrid=true;};
  $('mx-globe').onclick=()=>openFullGlobe(true);
  $('mx-locate').onclick=()=>{if(event){centerOnPlayer(event.site);world.needsDraw=world.needsGrid=true;}};
  $('mx-profile-button').onclick=()=>{$('mx-config').click();$('mx-economy').focus();};
  function step(){
    if(game.stopped||game.humanEliminated||game.ended)return false;
    if(!session.step($('mx-conflicts').open?observe:undefined))return false;
    if(world.painting&&tools.mode==='erase'&&world.hover)tools.apply(world.hover,{quiet:true});
    scoreboard.recordGeneration();
    if(session.outcome===null)controllers.turn();
    if(lastUndo&&!lastUndo.alerted&&session.match.gen-lastUndo.generation<256&&session.match.players[1].conventional>Math.max(500,lastUndo.field*6)){
      lastUndo.alerted=true;setPlay(false);toast('Crescimento explosivo · pausado. Use ↶ para desfazer.');
    }
    if(session.outcome!==null){
      game.ended=true;game.winner=session.outcome;setPlay(false);
      toast(session.outcome===1?'Você venceu!':session.outcome?game.names[session.outcome]+' venceu.':'Empate.');
    }
    if(session.eliminatedAt[1]===session.match.gen){
      game.humanEliminated=true;world.painting=false;setPlay(false);
      if(session.outcome===null)toast('Você foi eliminado · Nova partida disponível.');
    }
    world.matchStarted=true;dirty=true;return true;
  }
  $('hl-play').onclick=()=>{
    if(game.ended||game.stopped||game.humanEliminated){reset(options);return;}
    world.matchStarted=true;setPlay(!world.playing);
  };
  $('hl-clear').onclick=()=>{
    if(!world.matchStarted||game.ended||game.stopped||game.humanEliminated)return;
    game.stopped=true;world.painting=false;elapsed=0;setPlay(false);hud();
    toast('Partida interrompida · Nova partida disponível.');
  };
  $('hl-step').onclick=()=>{
    if(!world.matchStarted||world.playing||game.ended||game.stopped||game.humanEliminated)return;
    step();syncPlayButton();hud();
  };
  const initialSpeed=initial.spatial?.enabled?12:40;
  $('hl-speed').value=String(initialSpeed);world.speed=initialSpeed;$('hl-speed-val').textContent=initialSpeed+'/s';
  $('hl-speed').oninput=()=>{world.speed=Number($('hl-speed').value);$('hl-speed-val').textContent=world.speed+'/s';};
  const visible=()=>!$('mx-settings').open&&!$('mx-atlas-host').querySelector('dialog[open]')&&!document.hidden;
  function frame(t){
    const dt=previous?Math.min(100,t-previous):0;previous=t;
    if(world.playing&&visible()){
      elapsed=Math.min(elapsed+dt*world.speed/1000,Math.max(8,world.speed/4));
      const start=performance.now();while(elapsed>=1 && world.playing && performance.now()-start<10){elapsed--;step();}
    }else elapsed=0;
    if(dirty){syncField(session.match);dirty=false;}
    if(t-lastUI>200)hud();
    paintViewport(t);requestAnimationFrame(frame);
  }
  // Same inspectability as the classic game, with typed cells and real purchase receipts.
  window.__hexophageMixed={get session(){return session;},get controllers(){return controllers;},get orders(){return lastOrders.slice();},
    get selection(){return {key:hand.selected?.key,slotKey:hand.selected?.slotKey,card:hand.selected,...hand.current};},world,
    tools:{get mode(){return tools.mode;},get radius(){return tools.radius;},select:tools.select,setRadius:tools.setRadius,preview,apply:place}};
  function boot(graph,buffers){
    reset(initial,graph,buffers);
    atlas=createGameAtlas({host:$('mx-atlas-host'),getWallet:()=>session.match.players[1],getEconomy:()=>session.match.economy,
      getToolSettings:()=>session.match.toolSettings,onSelect:hand.choose,onDeck:fillDeck});
    $('mx-atlas').onclick=()=>atlas.open(hand.selected);
    requestAnimationFrame(frame);
    if(initial.progression?.enabled)queueMicrotask(()=>{$('mx-config').click();});
  }
  if(initial.F>=64)requestSphere(initial.F,(graph,buffers)=>boot(graph,buffers));
  else boot();
}
