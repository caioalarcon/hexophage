import {world} from '../browser/world-state.js';
import {game} from '../browser/game.js';
import {MIXED_MODE,navigateToMode,populateModeSelector} from '../match/controls/mode.js';
import {$} from '../layout/elements.js';
import {toast} from '../layout/announcements.js';
import {centerOnPlayer} from '../map/camera/player-sector.js';
import {stampTargets} from '../patterns/placement/footprint.js';
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
  let session,controllers,atlas,tools,options,dirty=true,lastUI=-Infinity,elapsed=0,previous=0,lastOrders=[],event=null,lastUndo=null,pendingHazard=null;
  const hand=createHand(()=>session?.match,{onInspect:card=>atlas.open(card,{replace:true}),onChoose:()=>tools?.select('stamp')});
  const fillDeck=cards=>{
    if(!session?.match.spatial?.enabled){hand.fill(cards);return;}
    const base=session.opening[1],known=cards.find(c=>c.key===base.key),opening=known??{...base,source:base.rule,custom:true,slotKey:base.key};
    hand.fill([opening,...cards.filter(c=>c.key!==base.key)].slice(0,Math.max(54,cards.length)));
  };
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
      const view=m.visibility(1);$('mx-vision').textContent='◉ '+view.visible.size.toLocaleString('pt-BR')+' · ◌ '+view.explored.size.toLocaleString('pt-BR');
      const targets=targetIds(world.hover),cell=world.hover?.id===undefined?null:m.cells.get(world.hover.id);
      $('mx-local-energy').textContent=targets?'◈ '+number.format(m.localReserve(1,targets)):
        cell?.owner===1?'◈ '+number.format(cell.energy)+' · G'+cell.stableAge:'◈ '+number.format(p.reserve);
      $('mx-local-energy').title='Energia armazenada nas células; construções em território explorado podem receber energia do restante do território.';
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
    event=null;lastUndo=null;pendingHazard=null;$('mx-undo').hidden=true;$('mx-event').textContent='Avance para observar.';$('mx-locate').hidden=true;
    $('mx-profile-button').textContent='Economia · '+({stability:'Maduras',birth:'Nascimentos',death:'Mortes',activity:'Atividade'}[options.policy]);
    $('mx-frontier').hidden=!session.match.spatial?.enabled;
    $('mx-cash').previousElementSibling.textContent=session.match.spatial?.enabled?'ENERGIA EM CAMPO':'RESERVA';
    if(session.match.spatial?.enabled)$('mx-profile-button').textContent='Economia · Celular';
    loadViewport(session,storage);world.speed=Number($('hl-speed').value);syncPlayButton();
    tools.refresh();tools.select('stamp');world.painting=false;
    if(atlas)atlas.refresh();dirty=true;hud();
    toast(session.match.spatial?.enabled?'Base pronta · construa na área explorada':'Partida pronta · '+(options.players-1)+' bots');
  }
  const query=new URLSearchParams(location.search),requestedSeed=query.get('seed');
  const initial={...defaultGameOptions,botInterval:12,botBudget:4,toolSettings:loadToolSettings()};
  if(query.get('experiment')==='local')initial.spatial={enabled:true};
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
  const targetIds=anchor=>anchor&&hand.current?stampTargets(anchor,hand.current.shape):null;
  function preview(anchor){
    if(tools.mode!=='stamp')return tools.preview(anchor);
    if(!session.alive[1]||game.ended||game.stopped||!hand.selected)return null;
    const ids=targetIds(anchor),{resolver,ballot}=hand.current,c=hand.selected;
    return ids?{ids,ready:session.match.canStamp(1,c.rule,resolver,ids,ballot,c.sense??'native')}:null;
  }
  function forecastHazard(before,c,ids,resolver,ballot,contract){
    if(!before.spatial?.enabled)return null;
    const changed=before.fork(),control=before.fork(),meta=contract?{contract}:{};
    if(!changed.stamp(1,c.rule,resolver,ids,ballot,c.sense??'native',meta))return null;
    const deadline=performance.now()+160;
    for(let t=0;t<192;t++){
      if(performance.now()>deadline)return 'evolução longa com risco ainda incerto';
      control.step();changed.step();
      const baseline=control.players[1].conventional,now=changed.players[1].conventional;
      if(changed.cells.size>3000||now>Math.max(baseline+80,baseline*2+ids.length*4))
        return 'crescimento rápido próximo às suas estruturas';
      if(baseline>=10 && now<baseline*.45)return 'perda acelerada das suas células';
    }
    return null;
  }
  function undoStamp(){
    if(!lastUndo)return;
    const snapshot=lastUndo;lastUndo=null;pendingHazard=null;
    setPlay(false);session.restore(snapshot.match,snapshot.alive,snapshot.eliminatedAt);
    controllers?.destroy();controllers=createGameBots(session.match,{seed:options.seed,interval:options.botInterval,budget:options.botBudget,onOrder:o=>{
      lastOrders.push(o);if(lastOrders.length>40)lastOrders.shift();
    }});
    game.ended=false;game.winner=0;game.stopped=false;game.humanEliminated=false;
    world.matchStarted=true;world.painting=false;lastOrders=[];elapsed=0;event=null;
    $('mx-undo').hidden=true;scoreboard.reset();syncField(session.match);hud();dirty=true;syncPlayButton();
    toast('Último carimbo desfeito; partida restaurada.');
  }
  $('mx-undo').onclick=undoStamp;
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&lastUndo&&!e.target.closest?.('input,textarea,select,[contenteditable="true"]')){
      e.preventDefault();undoStamp();
    }
  });
  function place(anchor){
    if(tools.mode!=='stamp')return tools.apply(anchor);
    const proposed=preview(anchor),c=hand.selected,p=session.match.players[1],m=hand.current;
    if(!proposed?.ready){
      const cost=c&&m?session.match.stampQuote(c.rule,m.resolver,c.offsets.length).total:0;
      const reason=c&&m?session.match.stampRejection(1,c.rule,m.resolver,targetIds(anchor),m.ballot,c.sense??'native'):null;
      toast(game.stopped?'Partida interrompida.':game.ended?'Partida encerrada.':!session.alive[1]?'Sua colônia foi eliminada.':reason==='darkness'?
        'O carimbo precisa caber em território já explorado.':reason==='local-energy'?
        'As células próximas precisam de mais energia para construir e abastecer este carimbo.':c?.offsets.length>session.match.toolSettings.maxStampCells?
        'Carimbo acima do limite de '+session.match.toolSettings.maxStampCells+' células.':p.reserve<cost?
        'Faltam ◈ '+number.format(cost-p.reserve)+' para este carimbo.':!targetIds(anchor)?'O carimbo não cabe nesta região da malha.':'Posição ocupada ou junto de uma colônia adversária.');
      return false;
    }
    const before=session.match.fork();
    const risk=forecastHazard(before,c,proposed.ids,m.resolver,m.ballot,null);
    const key=c.key+':'+m.resolver+':'+proposed.ids.join(',');
    if(risk && (!pendingHazard||pendingHazard.key!==key||performance.now()>pendingHazard.until)){
      pendingHazard={key,until:performance.now()+10000};
      setPlay(false);toast('Possível infestação: '+risk+'. Clique novamente para confirmar.');return false;
    }
    pendingHazard=null;
    const ok=session.match.stamp(1,c.rule,m.resolver,proposed.ids,m.ballot,c.sense??'native');
    if(ok){setPlay(false);lastUndo={match:before,alive:session.alive.slice(),eliminatedAt:session.eliminatedAt.slice(),generation:before.gen,field:before.players[1].conventional};$('mx-undo').hidden=false;dirty=true;syncField(session.match);hud();toast(c.name+' · colocado · pausa para inspeção');}
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
    else {
      game.ended=true;game.winner=session.outcome;setPlay(false);
      toast(session.outcome===1?'Você venceu!':session.outcome?game.names[session.outcome]+' venceu.':'Empate.');
    }
    if(lastUndo&&!lastUndo.alerted&&session.match.gen-lastUndo.generation<256&&session.match.players[1].conventional>Math.max(500,lastUndo.field*6)){
      lastUndo.alerted=true;setPlay(false);toast('Infestação acelerada · partida pausada. Use ↶ para desfazer.');
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
  }
  if(initial.F>=64)requestSphere(initial.F,(graph,buffers)=>boot(graph,buffers));
  else boot();
}
