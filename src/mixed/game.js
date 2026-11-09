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

const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
function mount(){
  const root=$('hexlab'),fragment=$('mx-panel-template').content.cloneNode(true);
  root.classList.add('mixed');
  root.querySelector('.hl-shell').append(fragment.querySelector('.mx-arsenal'));
  $('br-rail').insertBefore(fragment.querySelector('.mx-console'),$('br-rail-controls'));
  root.append(fragment);
  const selector=$('hl-rulechoice');$('mx-mode-slot').append(selector);
  populateModeSelector(selector);selector.value=MIXED_MODE;selector.onchange=()=>navigateToMode(selector.value);
  $('mx-actions').prepend($('hl-play'),$('hl-step'));
  $('mx-speed-slot').append($('hl-speed').closest('.br-speed-knob'));
  const portrait=matchMedia('(orientation: portrait)');
  function fold(){ $('mx-league').open=!portrait.matches; }
  fold();portrait.addEventListener('change',fold);
}
export function startMixedGame(){
  mount();
  let session,controllers,atlas,options,dirty=true,lastUI=-Infinity,elapsed=0,previous=0,flow=0,lastOrders=[],event=null;
  const hand=createHand(()=>session?.match);
  const score=$('mx-score'),scoreRows=new Map();
  function syncScore(){
    const m=session.match;
    const ids=m.players.slice(1).map((_,i)=>i+1).sort((a,b)=>Number(session.alive[b])-Number(session.alive[a])||
      m.players[b].conventional-m.players[a].conventional || m.players[b].reserve-m.players[a].reserve);
    for(const id of ids){
      let box=scoreRows.get(id);
      if(!box){
        box=document.createElement('li');const btn=document.createElement('button'),name=document.createElement('span'),nums=document.createElement('small');
        btn.type='button';btn.style.setProperty('--player',game.colors[id]);name.textContent=game.symbols[id]+' '+game.names[id];
        btn.title='Centralizar em '+game.names[id];btn.append(name,nums);box.append(btn);
        btn.onclick=()=>{
          let site=session.starts[id];for(const [i,c] of session.match.cells)if(c.owner===id&&!c.wave){site=i;break;}
          centerOnPlayer(site);world.needsDraw=world.needsGrid=true;
        };
        scoreRows.set(id,box);
      }
      const p=m.players[id];box.querySelector('small').textContent=session.alive[id]?p.conventional.toLocaleString('pt-BR')+' · ◈ '+number.format(p.reserve):'Eliminado';
      score.append(box);
    }
  }
  function hud(){
    const m=session.match,p=m.players[1];
    $('br-rail-gen').textContent='G '+m.gen.toLocaleString('pt-BR');
    $('mx-cash').textContent='◈ '+number.format(p.reserve);
    $('mx-field').textContent=p.conventional.toLocaleString('pt-BR');
    $('mx-flow').textContent=(flow>0?'+':'')+number.format(flow);
    if($('mx-conflicts').open && event){
      const votes=event.policy==='support'?event.weightYes+' / '+event.weightNo:event.yes+' / '+event.no;
      const owner=event.winner?game.names[event.winner.owner]:'';
      $('mx-event').textContent='G'+event.gen+' · sim / não '+votes+' · matéria '+(event.approved?'viva':'vazia')+' · final '+(event.winner?owner+' / '+event.winner.rule:'vazio');
      $('mx-locate').hidden=false;
    }
    hand.update();syncScore();lastUI=performance.now();
  }
  function reset(next,prepared,storage){
    const sameGraph=prepared??(session?.graph.f===next.F?session.graph:undefined);
    const fresh=createGameMatch({...next,...(sameGraph?{graph:sameGraph}:{})});
    session=fresh;options=next;
    controllers=createGameBots(session.match,{seed:options.seed,interval:options.botInterval,budget:options.botBudget,onOrder:o=>{
      lastOrders.push(o);if(lastOrders.length>40)lastOrders.shift();
    }});
    game.ended=false;game.winner=0;world.matchStarted=false;lastOrders=[];flow=0;elapsed=0;
    event=null;$('mx-event').textContent='Avance para observar.';$('mx-locate').hidden=true;
    $('mx-profile-button').textContent='Economia · '+({stability:'Maduras',birth:'Nascimentos',death:'Mortes',activity:'Atividade'}[options.policy]);
    loadViewport(session,storage);world.speed=Number($('hl-speed').value);syncPlayButton();
    if(atlas)atlas.refresh();dirty=true;hud();
    toast('Partida pronta · '+(options.players-1)+' bots');
  }
  const query=new URLSearchParams(location.search),requestedSeed=query.get('seed');
  const initial={...defaultGameOptions,botInterval:12,botBudget:4};
  if(Object.hasOwn(gameEconomies,query.get('economy')))initial.policy=query.get('economy');
  if(requestedSeed!==null && /^\d{1,10}$/.test(requestedSeed) && Number(requestedSeed)<=0xffffffff)initial.seed=Number(requestedSeed);
  bindMixedViewport();reset(initial);
  atlas=createGameAtlas({host:$('mx-atlas-host'),getWallet:()=>session.match.players[1],getEconomy:()=>session.match.economy,onSelect:hand.choose,onDeck:hand.fill});
  $('mx-atlas').onclick=()=>atlas.open(hand.selected);
  $('br-build-cancel').onclick=cancelBuild;
  $('br-building').addEventListener('cancel',e=>{e.preventDefault();cancelBuild();});
  bindSettings(()=>options,()=>session.match,next=>{
    if(next.F!==session.graph.f && next.F>=64)requestSphere(next.F,(graph,buffers)=>reset(next,graph,buffers));
    else reset(next);
  });
  const targetIds=anchor=>anchor&&hand.current?stampTargets(anchor,hand.current.shape):null;
  function preview(anchor){
    if(!session.alive[1]||game.ended||!hand.selected)return null;
    const ids=targetIds(anchor),{resolver,ballot}=hand.current,c=hand.selected;
    return ids&&session.match.canStamp(1,c.rule,resolver,ids,ballot,c.sense??'native')?ids:null;
  }
  function place(anchor){
    const ids=preview(anchor),c=hand.selected,p=session.match.players[1],m=hand.current;
    if(!ids){
      const cost=c&&m?c.offsets.length*session.match.stampPrice(m.resolver):0;
      toast(game.ended?'Partida encerrada.':!session.alive[1]?'Sua colônia foi eliminada.':p.reserve<cost?
        'Faltam ◈ '+number.format(cost-p.reserve)+' para este carimbo.':!targetIds(anchor)?'O carimbo não cabe nesta região da malha.':'Posição ocupada ou junto de uma colônia adversária.');
      return false;
    }
    const ok=session.match.stamp(1,c.rule,m.resolver,ids,m.ballot,c.sense??'native');
    if(ok){dirty=true;syncField(session.match);hud();toast(c.name+' · '+resolverNames[m.resolver]);}
    return ok;
  }
  usePlacement({preview,place});
  const observe={onExistence:e=>{if(e.yes && e.no)event=e;}};
  $('mx-globe').onclick=()=>openFullGlobe(true);
  $('mx-locate').onclick=()=>{if(event){centerOnPlayer(event.site);world.needsDraw=world.needsGrid=true;}};
  $('mx-profile-button').onclick=()=>{$('mx-config').click();$('mx-economy').focus();};
  function step(){
    if(!session.step($('mx-conflicts').open?observe:undefined))return false;
    const p=session.match.players[1];
    const net=p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
    flow=session.match.gen===1?net:.8*flow+.2*(net-prevNet);prevNet=net;
    if(session.outcome===null)controllers.turn();
    else {
      game.ended=true;game.winner=session.outcome;setPlay(false);
      toast(session.outcome===1?'Você venceu!':session.outcome?game.names[session.outcome]+' venceu.':'Empate.');
    }
    if(session.eliminatedAt[1]===session.match.gen && session.outcome===null)toast('Você foi eliminado · a disputa continua.');
    world.matchStarted=true;dirty=true;return true;
  }
  let prevNet=0;
  $('hl-play').onclick=()=>{if(game.ended){reset(options);return;}world.matchStarted=true;setPlay(!world.playing);};
  $('hl-step').onclick=()=>{setPlay(false);step();syncPlayButton();hud();};
  $('hl-speed').value=String(40);world.speed=40;$('hl-speed-val').textContent='40/s';
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
    get selection(){return {key:hand.selected?.key,...hand.current};},world};
  requestAnimationFrame(frame);
}
