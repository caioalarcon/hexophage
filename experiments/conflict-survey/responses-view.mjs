// Render the measured late intercepts from responses.json on the real sphere.
// node experiments/conflict-survey/responses-view.mjs
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync}from'node:fs';
import{createHeadlessMatch}from'../../src/match/headless.js';
import{buildSphere}from'../../src/world/sphere.js';
import{STABILITY_ECONOMY}from'../../src/match/constructive-economy.js';
import{gameEconomyTick}from'../../src/match/biomass.js';
import{advanceGeneration}from'../../src/simulation/generation.js';
import{decodeRLE}from'../../src/patterns/rle.js';

const dir=new URL('./',import.meta.url),graph=buildSphere(32),origin=graph.farthest;
const trials=JSON.parse(readFileSync(new URL('responses.json',dir))).filter(r=>r.policy==='lineage'&&r.protected?.saved);
const times=[...Array.from({length:49},(_,i)=>i),64,96,160,256,512];
function step(m) {advanceGeneration(m.world);gameEconomyTick(m.world,m.game,m.removeLive,()=>{});}
const coord=[];
for(let q=-12;q<=12;q++)for(let r=-12;r<=12;r++)if(Math.abs(q+r)<=12)coord.push([q,r]);
function view(trial) {
  const branches=Array.from({length:3},()=>createHeadlessMatch(graph,{rule:trial.rule,conflict:'lineage',economy:STABILITY_ECONOMY}));
  const m=branches[0],sites=m.patchForStamp(origin,0,coord),ix=new Map(sites.map((id,i)=>[id,i]));
  const p=m.game.gameplay.patterns.find(p=>p.id===trial.target),shape=decodeRLE(p.rle);
  const mid=[0,1].map(i=>Math.round(shape.reduce((n,v)=>n+v[i],0)/shape.length));
  const seed=m.patchForStamp(origin,0,shape.map(([q,r])=>[q-mid[0],r-mid[1]]));
  for(const b of branches){assert(b.commitStamp(2,seed,false));for(let i=0;i<16;i++)step(b);}
  for(const b of branches.slice(1))assert(b.commitStamp(1,trial.shot,false));
  const frames=[];
  for(let t=0;t<=512;t++){
    if(t===trial.replyTick)assert(branches[2].commitStamp(2,trial.reply.ids,false));
    if(times.includes(t)){
      const [control,...paid]=branches;
      const reference=control.world.ownerCells[2];
      const pack=values=>Buffer.from(values).toString('base64');
      const panes=paid.map(b=>{
        const packed=new Uint8Array(Math.ceil(sites.length/4));
        for(const [i,id]of sites.entries()){let owner=b.world.owners[id];packed[i>>2]|=(owner===7?3:owner)<<((i%4)*2);}
        return {cells:pack(packed),live:b.world.activeCount,held:reference.filter(id=>b.world.owners[id]===2).length,cash:Math.round(b.game.players[1].reserve)};
      });
      frames.push({t,ref:reference.map(id=>ix.get(id)),panes});
    }
    if(t<512) for(const b of branches)step(b);
  }
  assert.equal(frames.at(-1).panes[0].live,trial.exposed.live);
  assert.equal(frames.at(-1).panes[1].live,trial.protected.live);
  return {name:trial.rule==='andreen'?'Andreen · proteger o Toggle Pair':'B2/S245 · proteger a fazenda',
    defense:trial.rule==='andreen'?'Glider de 5 células':'Oscilador de 2 células',cost:trial.protected.paid,at:trial.replyTick,reply:trial.reply.ids.map(id=>ix.get(id)),frames};
}
const scenarios=trials.map(view);
function init({coord,scenarios}){
  const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR');
  let scenario,frame=0,timer;
  const colors=['#101e29','#f68477','#53d8ad','#939ca6'];
  const corners=Array.from({length:6},(_,k)=>[(k*60+30)*Math.PI/180]).map(([a])=>[Math.cos(a),Math.sin(a)]);
  function draw(canvas,pane,state){
    const ctx=canvas.getContext('2d'),s=9,center=canvas.width/2;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const bits=atob(pane.cells);
    for(let i=0;i<coord.length;i++){
      const c=(bits.charCodeAt(i>>2)>>((i%4)*2))&3;
      const ref=state.ref.includes(i),reply=canvas.id==='protected'&&state.t===scenario.at&&scenario.reply.includes(i);
      if(!c&&!ref&&!reply)continue;
      const [q,r]=coord[i],x=center+s*Math.sqrt(3)*(q+r/2),y=center+1.5*s*r;
      ctx.beginPath();corners.forEach(([dx,dy],j)=>ctx[j?'lineTo':'moveTo'](x+dx*(s-.6),y+dy*(s-.6)));ctx.closePath();
      ctx.fillStyle=colors[c];ctx.fill();
      ctx.lineWidth=reply||ref?2:.6;ctx.strokeStyle=reply?'#ffcb57':ref?'#ecffff':'#78909b';ctx.stroke();
    }
  }
  function paint(){
    const st=scenario.frames[frame];$('scrub').value=frame;$('time').textContent='G+'+st.t;
    $('caption').textContent=scenario.defense+' em G+'+scenario.at+' · custo '+fmt.format(scenario.cost);
    for(const [i,code]of ['exposed','protected'].entries()){
      const p=st.panes[i];draw($(code),p,st);
      $(code+'-stat').textContent=p.held+'/'+st.ref.length+' células originais na fase · '+fmt.format(p.live)+' vivas no planeta · '+fmt.format(p.cash)+' créditos';
    }
  }
  function pause(){clearInterval(timer);timer=null;$('play').textContent='Reproduzir';}
  function choose(i){pause();scenario=scenarios[i];frame=0;$('scrub').max=scenario.frames.length-1;paint();}
  for(const [i,s] of scenarios.entries())$('case').add(new Option(s.name,i));
  $('case').onchange=()=>choose(Number($('case').value));
  $('scrub').oninput=e=>{pause();frame=Number(e.target.value);paint();};
  $('next').onclick=()=>{pause();frame=Math.min(frame+1,scenario.frames.length-1);paint();};
  $('prev').onclick=()=>{pause();frame=Math.max(0,frame-1);paint();};
  $('play').onclick=()=>{if(timer)return pause();if(frame===scenario.frames.length-1)frame=0;$('play').textContent='Pausar';
    timer=setInterval(()=>{if(frame===scenario.frames.length-1){pause();return;}frame++;paint();},170);};
  choose(0);
}
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hexophage · Interceptação após o disparo</title>
<style>:root{color-scheme:dark;font:15px/1.45 system-ui,sans-serif;color:#edf6f6;background:#0b151e}*{box-sizing:border-box}main{max-width:1050px;margin:auto;padding:1rem}h1{font-size:1.7rem;margin:.5rem 0}h2{font-size:1.05rem}button,select{padding:.4rem .6rem}small,footer{color:#bdcfd4}.pair{display:flex;gap:1em}.pair section{min-width:0;flex:1}canvas{display:block;width:100%;background:#101e29;border:1px solid #354856}.bar{display:flex;align-items:center;gap:.55em;margin:1em 0;flex-wrap:wrap}input{flex:1;min-width:80px}.red{color:#f68477}.green{color:#53d8ad}output{min-width:4em;font-weight:bold}footer{margin-top:1.2em}@media(max-width:520px){main{padding:.55rem}.pair{gap:.35em}.pair small{font-size:.72rem}}</style>
<main><h1>Interceptação após o disparo</h1><select id="case" aria-label="Confronto"></select><p id="caption"></p>
<div class="pair"><section><h2>Sem resposta</h2><canvas id="exposed" width="420" height="420" aria-label="Setor atacado"></canvas><small id="exposed-stat"></small></section><section><h2>Com resposta</h2><canvas id="protected" width="420" height="420" aria-label="Setor defendido"></canvas><small id="protected-stat"></small></section></div>
<div class="bar"><button id="play">Reproduzir</button><button id="prev" aria-label="Quadro anterior">−</button><input id="scrub" type="range" min="0" aria-label="Geração"><button id="next" aria-label="Próximo quadro">+</button><output id="time"></output></div>
<footer><span class="red">Vermelho · atacante</span> &nbsp; <span class="green">Verde · defensor</span> &nbsp; Branco · forma do alvo sem disparo &nbsp; Amarelo · resposta comprada<br>Esfera F32 · linhagem · economia de estabilidade. G+0 marca o disparo. As imagens mostram o setor do alvo. O total de vivas inclui o planeta inteiro.</footer></main>
<script>(${init.toString()})(${JSON.stringify({coord,scenarios})})</script></html>`;
writeFileSync(new URL('responses-view.html',dir),html);
