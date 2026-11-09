import {basis,pointOnSphere} from '../../src/world/geometry.js';

const colors=['','#67dfc4','#ffac7c','#86aff9'];
const outline={phase:'#d0e5ff',guard:'#f6de79',antimatter:'#f49fea'};
const dot=(arr,start,b)=>arr[start]*b[0]+arr[start+1]*b[1]+arr[start+2]*b[2];
function dimensions(canvas){
  const width=canvas.clientWidth, height=canvas.clientHeight, dpr=Math.min(2,devicePixelRatio||1);
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  }
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,width,height};
}
export function createBoard(canvas,atlas,graph){
  let focus=-1,scale=1,width=0,height=0,patch=[],projected=[];
  const v=graph.coords;
  const globe=Array.from({length:graph.n},(_,i)=>{
    const k=i*3;return [.5+Math.atan2(v[k+2],v[k])/(2*Math.PI),.5-Math.asin(v[k+1])/Math.PI];
  });
  function layout(center,zoom,w,h){
    focus=center;scale=zoom;width=w;height=h;
    const eye=pointOnSphere(graph,center),{right,up}=basis(eye), s=graph.f*zoom;
    patch=[];projected=[];
    for(let i=0;i<graph.n;i++){
      const k=i*3;if(dot(v,k,eye)<=0)continue;
      const x=w/2+s*dot(v,k,right),y=h/2-s*dot(v,k,up);
      if(x < -zoom || x>w+zoom || y < -zoom || y>h+zoom)continue;
      const path=new Path2D();
      for(let j=0;j<graph.deg[i];j++){
        const a=(6*i+j)*3,px=w/2+s*dot(graph.polygons,a,right),py=h/2-s*dot(graph.polygons,a,up);
        if(!j)path.moveTo(px,py);else path.lineTo(px,py);
      }
      path.closePath();patch.push({i,path});projected.push([i,x,y]);
    }
  }
  function draw(match,center,zoom,ghost=[],valid=true,trail){
    const {ctx,width:w,height:h}=dimensions(canvas);
    if(!w||!h)return;
    if(focus!==center||scale!==zoom||width!==w||height!==h)layout(center,zoom,w,h);
    ctx.clearRect(0,0,w,h);const marks=new Set(ghost??[]);
    for(const {i,path} of patch){
      const c=match.cells.get(i);
      ctx.fillStyle=c?(c.wave?'#d67af5':colors[c.owner]):(graph.deg[i]===5?'#294652':'#142b35');
      ctx.fill(path);
      ctx.strokeStyle=c?.wave?colors[c.owner]:outline[c?.resolver]??'#26414a';ctx.lineWidth=c?.wave?1.7:.65;ctx.stroke(path);
      if(marks.has(i)){ctx.fillStyle=valid?'#8af9e366':'#ff726a66';ctx.fill(path);ctx.strokeStyle=valid?'#b5ffe9':'#ff857d';ctx.lineWidth=1.7;ctx.stroke(path);}
    }
    const {ctx:g,width:aw,height:ah}=dimensions(atlas);g.clearRect(0,0,aw,ah);
    g.fillStyle='#324e57';for(const i of graph.pents){const [x,y]=globe[i];g.fillRect(x*aw-1,y*ah-1,2,2);}
    if(trail){g.fillStyle='#573d6f';for(const i of trail){const [x,y]=globe[i];g.fillRect(x*aw-1,y*ah-1,2,2);}}
    for(const [i,c] of match.cells){const [x,y]=globe[i];g.fillStyle=c.wave?'#eb96f8':colors[c.owner];g.fillRect(x*aw-1.2,y*ah-1.2,2.4,2.4);}
    const [x,y]=globe[center];g.strokeStyle='#f4e7c4';g.lineWidth=1;g.beginPath();g.arc(x*aw,y*ah,5,0,Math.PI*2);g.stroke();
  }
  function pick(x,y){
    let picked=-1,dist=scale*scale;
    for(const [id,px,py] of projected){const d=(px-x)**2+(py-y)**2;if(d<dist){dist=d;picked=id;}}
    return picked;
  }
  function navigate(x,y){
    const lon=2*Math.PI*(x-.5),lat=Math.PI*(.5-y),p=[Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)];
    let best=focus,high=-2;
    for(let i=0;i<graph.n;i++){const d=dot(v,i*3,p);if(d>high){high=d;best=i;}}
    return best;
  }
  return {draw,pick,navigate};
}
