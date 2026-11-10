import {axialFromPixels} from '../../../src/map/local/hex-layout.js';
import {patternOffset,patternSite} from '../../../src/patterns/planar-simulation.js';

const root3=Math.sqrt(3);
const pos=([q,r])=>[root3*(q+r/2),1.5*r];
const vertices=Array.from({length:6},(_,k)=>{
  const a=(k*60-30)*Math.PI/180;return [Math.cos(a),Math.sin(a)];
});
export function createAtlasCanvas(canvas,onEdit){
  const ctx=canvas.getContext('2d');
  let frame=new Map(),editable=false,cx=0,cy=0,size=17,drag=null;
  function draw(){
    const {width:w,height:h}=canvas.getBoundingClientRect();
    if(w<=0||h<=0)return;
    const dpi=window.devicePixelRatio||1;
    if(canvas.width!==Math.round(w*dpi)||canvas.height!==Math.round(h*dpi)){
      canvas.width=Math.round(w*dpi);canvas.height=Math.round(h*dpi);
    }
    ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);
    const hex=(x,y)=>{ctx.moveTo(x+size*vertices[0][0],y+size*vertices[0][1]);
      for(const [a,b] of vertices.slice(1))ctx.lineTo(x+size*a,y+size*b);ctx.closePath();};
    if(size>=6){
      ctx.beginPath();const limitY=h/(2*size);
      const rmin=Math.floor((cy-limitY)/1.5)-1,rmax=Math.ceil((cy+limitY)/1.5)+1;
      for(let r=rmin;r<=rmax;r++){
        const lo=Math.floor((cx-w/(2*size))/root3-r/2)-1,hi=Math.ceil((cx+w/(2*size))/root3-r/2)+1;
        for(let q=lo;q<=hi;q++){const [x,y]=pos([q,r]);hex((x-cx)*size+w/2,(y-cy)*size+h/2);}
      }
      ctx.strokeStyle='#253c46';ctx.lineWidth=.6;ctx.stroke();
    }
    ctx.beginPath();
    for(const id of frame.keys()){
      const [x,y]=pos(patternOffset(id));const px=(x-cx)*size+w/2,py=(y-cy)*size+h/2;
      if(px>=-size&&px<=w+size&&py>=-size&&py<=h+size)hex(px,py);
    }
    ctx.fillStyle=editable?'#f4bd73':'#79dec7';ctx.fill();
    if(size>=4){ctx.strokeStyle='#152e34';ctx.lineWidth=1;ctx.stroke();}
  }
  function fit(){
    let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
    for(const id of frame.keys()){
      const [x,y]=pos(patternOffset(id));x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    }
    if(!frame.size){cx=0;cy=0;size=17;}
    else{const {width:w,height:h}=canvas.getBoundingClientRect();cx=(x0+x1)/2;cy=(y0+y1)/2;
      size=Math.max(.15,Math.min(20,w/(x1-x0+5),h/(y1-y0+5)));}
    draw();
  }
  function at(ev){
    const b=canvas.getBoundingClientRect(),p=axialFromPixels((ev.clientX-b.left-b.width/2)/size+cx,(ev.clientY-b.top-b.height/2)/size+cy,1);
    return patternSite(p.q,p.r);
  }
  function stroke(ev){
    const id=at(ev);
    if(drag.sites.has(id))return;
    drag.sites.add(id);onEdit(id,drag.value);
  }
  canvas.onpointerdown=ev=>{
    if(ev.button===1 || ev.button===2 || ev.shiftKey){ev.preventDefault();drag={pan:true,x:ev.clientX,y:ev.clientY};}
    else if(editable){drag={sites:new Set(),value:!frame.has(at(ev))};stroke(ev);}
    if(drag)canvas.setPointerCapture(ev.pointerId);
  };
  canvas.onpointermove=ev=>{
    if(!drag)return;
    if(drag.pan){cx-=(ev.clientX-drag.x)/size;cy-=(ev.clientY-drag.y)/size;drag.x=ev.clientX;drag.y=ev.clientY;draw();}
    else stroke(ev);
  };
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  canvas.oncontextmenu=ev=>ev.preventDefault();
  const ro=new ResizeObserver(draw);ro.observe(canvas);
  return {set(f,edit=false,recenter=false){frame=f;editable=edit;canvas.classList.toggle('editing',edit);if(recenter)fit();else draw();},
    zoom(f){size=Math.max(.1,Math.min(48,size*f));draw();},fit,destroy(){ro.disconnect();}};
}
