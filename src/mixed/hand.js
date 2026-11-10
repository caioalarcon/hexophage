import {world} from '../browser/world-state.js';
import {$} from '../layout/elements.js';
import {drawDeckIcon} from '../deck/card-icon.js';
import {transformOffsets} from '../patterns/editor/axial-transform.js';
import {rules} from '../../experiments/typed-world/catalog.mjs';

const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const slotKey=card=>card.slotKey??card.key;

export function createHand(getMatch,{onInspect=()=>{}}={}){
  const hand=$('mx-hand'),preview=$('mx-preview'),mods=new Map(),buttons=new Map();
  let selected;
  const modifier=c=>{
    const key=slotKey(c);
    let m=mods.get(key);
    if(!m){
      m={resolver:c.resolver??'contact',ballot:c.ballot??'support'};mods.set(key,m);
    }
    if(m.original!==c.offsets){m.original=c.offsets;m.shape=c.offsets;}
    return m;
  };
  function choose(c){
    selected=c;
    const m=modifier(c);
    world.cachedStampOffsets=m.shape;
    world.stampCount=m.shape.length;world.needsDraw=true;
    $('mx-selected').textContent=c.name;
    $('mx-selected').title=c.name+' · '+rules[c.rule].label;
    drawDeckIcon(preview,m.shape);
    preview.setAttribute('aria-label','Prévia de '+c.name+' na orientação atual');
    $('mx-ballot').value=m.ballot;
    $('mx-resolver').value=m.resolver;
    for(const [key,node] of buttons)node.setAttribute('aria-pressed',String(key===slotKey(c)));
    update();
  }
  function update(){
    const match=getMatch();if(!match)return;
    const wallet=match.players[1].reserve;
    for(const btn of buttons.values()){
      const c=btn.card, cost=c.offsets.length*match.stampPrice(modifier(c).resolver);
      const affordable=wallet+1e-9>=cost;
      if(btn.dataset.afford!==String(affordable))btn.dataset.afford=String(affordable);
      const progress=btn.querySelector('.mx-card-energy'),available=Math.max(0,Math.min(wallet,cost));
      progress.style.setProperty('--charge',String(cost?available/cost:1));
      progress.setAttribute('aria-valuemax',String(cost));
      progress.setAttribute('aria-valuenow',String(available));
      progress.setAttribute('aria-valuetext',affordable?'Pronto para usar':'Faltam ◈ '+fmt.format(cost-available));
      if(btn.dataset.price!==String(cost)){
        btn.dataset.price=String(cost);
        btn.querySelector('.mx-card-cost').textContent='◈'+fmt.format(cost);
        btn.title=c.name+' · '+rules[c.rule].label+' · ◈ '+fmt.format(cost);btn.setAttribute('aria-label',btn.title);
      }
    }
    if(selected){
      const cost=selected.offsets.length*match.stampPrice(modifier(selected).resolver);
      $('mx-price').textContent='◈ '+fmt.format(cost);
    }
  }
  function fill(cards){
    buttons.clear();hand.replaceChildren();$('mx-count').textContent=String(cards.length);
    for(const c of cards){
      const btn=document.createElement('button'),icon=document.createElement('canvas'),name=document.createElement('b'),price=document.createElement('small'),progress=document.createElement('span');
      btn.type='button';btn.className='mx-card';btn.card=c;btn.dataset.key=c.key;btn.dataset.slot=slotKey(c);btn.dataset.rule=c.rule;
      btn.title=c.name+' · '+rules[c.rule].label;btn.setAttribute('aria-label',btn.title);
      icon.width=64;icon.height=52;icon.setAttribute('aria-hidden','true');name.textContent=c.name.replace(/^Oscilador (principal )?/,'').replace(/^Fazenda /,'').replace('Crescedor de colmeia (stalk)','Crescedor')
        .replace('stalk by a collision of 3 gliders','Stalk · 3 gliders').replace('stalk by a collision of 2 gilders and eater','Stalk · 2 + eater');
      price.className='mx-card-cost';
      progress.className='mx-card-energy';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Energia disponível para '+c.name);progress.setAttribute('aria-valuemin','0');
      btn.append(icon,name,price,progress);btn.onclick=()=>choose(c);
      btn.oncontextmenu=e=>{
        e.preventDefault();choose(c);
        const m=modifier(c);onInspect({...c,offsets:m.shape,resolver:m.resolver,ballot:m.ballot});
      };
      hand.append(btn);drawDeckIcon(icon,c.offsets);
      buttons.set(slotKey(c),btn);
    }
    const keep=selected&&cards.find(c=>slotKey(c)===slotKey(selected));
    if(keep||cards.length)choose(keep??cards[0]);
  }
  for(const [id,type] of [['hl-stampccw','ccw'],['hl-stampcw','cw'],['hl-stampflip','flip']]){
    $('mx-transform').append($(id));$(id).onclick=()=>{
      if(!selected)return;const m=modifier(selected);m.shape=transformOffsets(m.shape,type);choose(selected);
    };
  }
  $('mx-resolver').onchange=()=>{
    if(!selected)return;modifier(selected).resolver=$('mx-resolver').value;choose(selected);
  };
  $('mx-ballot').onchange=()=>{if(selected)modifier(selected).ballot=$('mx-ballot').value;};
  new ResizeObserver(([entry])=>{
    preview.width=Math.round(entry.contentRect.width*2);preview.height=Math.round(entry.contentRect.height*2);
    if(selected)drawDeckIcon(preview,modifier(selected).shape);
  }).observe(preview);
  const vote=$('mx-ballot').closest('.mx-vote'),help=$('mx-ballot-help'),tooltip=$('mx-ballot-tip');
  let helpTimer;
  function positionHelp(){
    if(tooltip.hidden)return;
    const anchor=vote.getBoundingClientRect(),padding=8,gap=6;
    const above=Math.max(0,anchor.top-gap-padding),below=Math.max(0,innerHeight-anchor.bottom-gap-padding),upward=above>below;
    tooltip.style.maxHeight=(upward?above:below)+'px';
    const bounds=tooltip.getBoundingClientRect();
    tooltip.style.left=Math.max(padding,Math.min(anchor.right-bounds.width,innerWidth-bounds.width-padding))+'px';
    tooltip.style.top=Math.max(padding,Math.min(upward?anchor.top-gap-bounds.height:anchor.bottom+gap,innerHeight-bounds.height-padding))+'px';
  }
  const showHelp=visible=>{
    clearTimeout(helpTimer);tooltip.hidden=!visible;help.setAttribute('aria-expanded',String(visible));
    if(visible)positionHelp();
  };
  vote.onmouseenter=()=>showHelp(true);
  vote.onmouseleave=()=>{if(!vote.contains(document.activeElement))helpTimer=setTimeout(()=>showHelp(false),120);};
  vote.addEventListener('focusin',()=>showHelp(true));
  vote.addEventListener('focusout',e=>{if(!vote.contains(e.relatedTarget))showHelp(false);});
  help.onclick=()=>showHelp(true);
  vote.onkeydown=e=>{if(e.key==='Escape'){showHelp(false);e.stopPropagation();}};
  document.addEventListener('pointerdown',e=>{if(!vote.contains(e.target))showHelp(false);},true);
  window.addEventListener('resize',positionHelp);
  window.addEventListener('scroll',positionHelp,true);
  return {fill,choose,update,get selected(){return selected;},get current(){return selected?modifier(selected):null;}};
}
