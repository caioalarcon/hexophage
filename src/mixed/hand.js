import {world} from '../browser/world-state.js';
import {$} from '../layout/elements.js';
import {drawDeckIcon} from '../deck/card-icon.js';
import {transformOffsets} from '../patterns/editor/axial-transform.js';
import {rules} from '../../experiments/typed-world/catalog.mjs';

const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const ruleName=id=>rules[id]?.label.split(' · ')[0]??id;
const shortRules={callahan:'Callahan',bays:'Bays','hex-b2s34':'B2/S34','hex-b2s245':'B2/S245',
  bays245:'Bays 245',andreen:'Andreen',highhex:'HighHex',ashley15:'Ashley 15',ashley:'Ashley 16'};

export function createHand(getMatch){
  const hand=$('mx-hand'),mods=new Map(),buttons=new Map();
  let selected;
  const modifier=c=>{
    let m=mods.get(c.key);
    if(!m){
      m={resolver:c.resolver??'contact',ballot:c.ballot??'support'};mods.set(c.key,m);
    }
    if(m.original!==c.offsets){m.original=c.offsets;m.shape=c.offsets;}
    return m;
  };
  function choose(c){
    selected=c;
    const m=modifier(c);
    world.cachedStampOffsets=m.shape;
    world.stampCount=m.shape.length;world.needsDraw=true;
    $('mx-selected').textContent=c.name+' · '+ruleName(c.rule);
    $('mx-selected').title=c.name+' · '+rules[c.rule].label;
    $('mx-ballot').value=m.ballot;
    for(const btn of $('mx-resolver').children)btn.setAttribute('aria-pressed',String(btn.dataset.mode===m.resolver));
    for(const [key,node] of buttons)node.setAttribute('aria-pressed',String(key===c.key));
    update();
  }
  function update(){
    const match=getMatch();if(!match)return;
    const wallet=match.players[1].reserve;
    for(const btn of buttons.values()){
      const c=btn.card, cost=c.offsets.length*match.stampPrice(modifier(c).resolver);
      const affordable=wallet+1e-9>=cost;
      if(btn.dataset.afford!==String(affordable))btn.dataset.afford=String(affordable);
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
      const btn=document.createElement('button'),icon=document.createElement('canvas'),name=document.createElement('b'),price=document.createElement('small');
      btn.type='button';btn.className='mx-card';btn.card=c;btn.dataset.key=c.key;btn.dataset.rule=c.rule;
      btn.title=c.name+' · '+rules[c.rule].label;btn.setAttribute('aria-label',btn.title);
      icon.width=64;icon.height=52;icon.setAttribute('aria-hidden','true');name.textContent=c.name.replace(/^Oscilador (principal )?/,'').replace(/^Fazenda /,'').replace('Crescedor de colmeia (stalk)','Crescedor')
        .replace('stalk by a collision of 3 gliders','Stalk · 3 gliders').replace('stalk by a collision of 2 gilders and eater','Stalk · 2 + eater');
      const family=document.createElement('span'),value=document.createElement('span');
      family.className='mx-card-rule';family.textContent=shortRules[c.rule];value.className='mx-card-cost';price.append(family,value);
      btn.append(icon,name,price);btn.onclick=()=>choose(c);hand.append(btn);drawDeckIcon(icon,c.offsets);
      buttons.set(c.key,btn);
    }
    const keep=cards.find(c=>c.key===selected?.key);
    if(keep||cards.length)choose(keep??cards[0]);
  }
  for(const [id,type] of [['hl-stampccw','ccw'],['hl-stampcw','cw'],['hl-stampflip','flip']]){
    $('mx-transform').append($(id));$(id).onclick=()=>{
      if(!selected)return;const m=modifier(selected);m.shape=transformOffsets(m.shape,type);choose(selected);
    };
  }
  for(const btn of $('mx-resolver').children)btn.onclick=()=>{
    if(!selected)return;modifier(selected).resolver=btn.dataset.mode;choose(selected);
  };
  $('mx-ballot').onchange=()=>{if(selected)modifier(selected).ballot=$('mx-ballot').value;};
  return {fill,choose,update,get selected(){return selected;},get current(){return selected?modifier(selected):null;}};
}
