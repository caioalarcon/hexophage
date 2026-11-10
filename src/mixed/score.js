import {game} from '../browser/game.js';
import {world} from '../browser/world-state.js';
import {$} from '../layout/elements.js';
import {centerOnPlayer} from '../map/camera/player-sector.js';
import {atlasCamera} from '../map/atlas/camera.js';
import {pointOnSphere} from '../world/geometry.js';
import {nearestColony} from './colony.js';

const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const signed=value=>(value>0?'+':'')+number.format(value);
const net=p=>p.income-p.birthSpent-p.eraseSpent-p.friendlyEraseSpent;
const fields=[
  ['Campo e reserva',[
    ['reserve','Reserva'],['conventional','Células vivas'],['mature','Células maduras'],['waves','Células de onda'],
    ['flow','Fluxo recente / G','Média recente da renda menos custos de nascimentos e substituições.'],
  ]],
  ['Última geração',[
    ['lastBirths','Nascimentos'],['lastDeaths','Mortes'],['lastIncome','Energia gerada'],['lastCost','Custo de expansão e cortes'],
    ['lastFlow','Saldo da geração'],['lastEroded','Células liquidadas'],['lastRefused','Propostas sem energia'],
  ]],
  ['Economia acumulada',[
    ['income','Energia gerada'],['matureIncome','Por células maduras'],['birthIncome','Por nascimentos'],['deathIncome','Por mortes'],
    ['birthSpent','Gasto com nascimentos'],['eraseSpent','Cortes de adversárias'],['friendlyEraseSpent','Cortes de aliadas'],
    ['stampSpent','Gasto com carimbos'],['balance','Saldo operacional','Energia gerada menos nascimentos e cortes.'],
    ['salvageIncome','Energia de liquidações'],['eroded','Células liquidadas','Células vendidas para financiar a expansão de uma onda.'],
    ['refused','Propostas sem energia'],['unfundedCost','Custo das propostas recusadas','Soma dos custos recusados em cada geração.'],
  ]],
  ['Campo acumulado',[
    ['stamps','Carimbos inseridos'],['stampedCells','Células carimbadas'],['births','Nascimentos'],['deaths','Mortes'],
    ['erased','Adversárias substituídas'],['lost','Células tomadas'],['friendlyErased','Aliadas substituídas'],
    ['detonations','Detonações'],['waveBirths','Nascimentos de onda'],['waveErased','Cortes por ondas'],
  ]],
];

export function createScoreboard(getSession){
  const score=$('mx-score'),rows=new Map();
  let ledger=[],expanded=null;
  function reset(){
    expanded=null;
    ledger=getSession().match.players.map(p=>p&&({net:net(p),income:p.income,cost:p.birthSpent+p.eraseSpent+p.friendlyEraseSpent,
      eroded:p.eroded,refused:p.refused,flow:0,lastFlow:0,lastIncome:0,lastCost:0,lastEroded:0,lastRefused:0}));
  }
  function recordGeneration(){
    for(const [id,p] of getSession().match.players.entries()){
      if(!p)continue;
      const entry=ledger[id],cost=p.birthSpent+p.eraseSpent+p.friendlyEraseSpent;
      entry.lastFlow=net(p)-entry.net;
      entry.flow=.8*entry.flow+.2*entry.lastFlow;
      if(getSession().match.gen===1)entry.flow=entry.lastFlow;
      entry.lastIncome=p.income-entry.income;entry.lastCost=cost-entry.cost;
      entry.lastEroded=p.eroded-entry.eroded;entry.lastRefused=p.refused-entry.refused;
      entry.net=net(p);entry.income=p.income;entry.cost=cost;entry.eroded=p.eroded;entry.refused=p.refused;
    }
  }
  function addRow(id){
    const box=document.createElement('li'),button=document.createElement('button'),name=document.createElement('span'),summary=document.createElement('small');
    const details=document.createElement('div'),status=document.createElement('p'),values=new Map();
    box.dataset.player=String(id);button.type='button';button.style.setProperty('--player',game.colors[id]);
    button.title='Ver estatísticas e centralizar nas células de '+game.names[id];
    name.textContent=game.symbols[id]+' '+game.names[id];button.append(name,summary);
    details.id='mx-stats-'+id;details.className='mx-player-stats';details.hidden=true;
    button.setAttribute('aria-controls',details.id);button.setAttribute('aria-expanded','false');
    details.append(status);
    for(const [title,items] of fields){
      const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('dl');
      heading.textContent=title;
      for(const [key,label,help] of items){
        const row=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
        term.textContent=label;if(help)term.title=help;
        value.dataset.stat=key;row.append(term,value);list.append(row);values.set(key,value);
      }
      section.append(heading,list);details.append(section);
    }
    button.onclick=()=>{
      expanded=expanded===id?null:id;
      if(expanded!==null){
        const session=getSession();
        const look=world.chart?pointOnSphere(session.graph,world.center):atlasCamera.look;
        const site=nearestColony(session.graph,session.match.cells,id,look);
        if(site!==null){centerOnPlayer(site);world.needsDraw=world.needsGrid=true;}
      }
      update();
    };
    box.append(button,details);
    const row={box,button,summary,details,status,values};rows.set(id,row);return row;
  }
  function update(){
    const session=getSession(),m=session.match;
    const ids=m.players.slice(1).map((_,i)=>i+1).sort((a,b)=>Number(session.alive[b])-Number(session.alive[a])||
      m.players[b].conventional-m.players[a].conventional || m.players[b].reserve-m.players[a].reserve);
    for(const [index,id] of ids.entries()){
      const row=rows.get(id)??addRow(id),p=m.players[id],open=expanded===id;
      row.summary.textContent=session.alive[id]?p.conventional.toLocaleString('pt-BR')+' · ◈ '+number.format(p.reserve):'Eliminado';
      row.button.setAttribute('aria-expanded',String(open));row.details.hidden=!open;
      if(open){
        row.status.textContent=!session.alive[id]?'Eliminado na geração '+number.format(session.eliminatedAt[id]):
          p.stamps===0?'Aguardando o primeiro carimbo.':'Em jogo · geração '+number.format(m.gen);
        const values={...p,...ledger[id],waves:p.field-p.conventional,balance:net(p)};
        for(const [key,node] of row.values){
          node.textContent=['flow','lastFlow','balance'].includes(key)?signed(values[key]):number.format(values[key]??0);
        }
      }
      if(score.children[index]!==row.box)score.insertBefore(row.box,score.children[index]??null);
    }
  }
  return {reset,recordGeneration,update,get flow(){return ledger[1]?.flow??0;}};
}
