import {$} from '../layout/elements.js';
import {world} from '../browser/world-state.js';
import {toast} from '../layout/announcements.js';
import {key} from '../world/geometry.js';
import {atlasCamera,atlasOrientationAt} from '../map/atlas/camera.js';
import {DEFAULT_TOOL_SETTINGS,normalizeToolSettings,circularSites,brushAngularRadius,capturePattern,nearestPatternSite} from './field-tools.js';

const storage='hexophage.mixed.tools.v1';
export function loadToolSettings(){
  try{return normalizeToolSettings(JSON.parse(localStorage.getItem(storage)||'{}'));}
  catch{return DEFAULT_TOOL_SETTINGS;}
}
export function saveToolSettings(settings){
  try{localStorage.setItem(storage,JSON.stringify(normalizeToolSettings(settings)));return true;}
  catch{return false;}
}

export function createFieldTools({getMatch,canEdit=()=>true,onCapture=()=>{},onErase=()=>{}}){
  let mode='stamp',radius=3,cache=null;
  const modes=['stamp','erase','pick'];
  function select(next){
    if(!modes.includes(next))throw new RangeError('Ferramenta inválida.');
    if(mode!==next){world.painting=false;window.dispatchEvent(new Event('hexophage:toolchange'));}
    mode=next;cache=null;
    for(const name of modes)$('mx-tool-'+name).setAttribute('aria-pressed',String(mode===name));
    $('mx-erase-control').hidden=mode!=='erase';
    $('hexlab').dataset.fieldTool=mode;world.needsDraw=true;
    return mode;
  }
  function setRadius(value){
    const max=getMatch()?.toolSettings.maxEraseRadius??DEFAULT_TOOL_SETTINGS.maxEraseRadius;
    if(!Number.isFinite(Number(value)))return radius;
    radius=Math.max(1,Math.min(max,Math.round(Number(value))));
    $('mx-erase-radius').value=String(radius);$('mx-erase-value').value=String(radius);
    cache=null;world.needsDraw=true;return radius;
  }
  function refresh(){
    $('mx-erase-radius').max=String(getMatch()?.toolSettings.maxEraseRadius??DEFAULT_TOOL_SETTINGS.maxEraseRadius);
    setRadius(radius);cache=null;world.needsDraw=true;
  }
  const siteAt=anchor=>anchor?.id??(anchor&&world.chart?.map.get(key(anchor.q,anchor.r))?.id);
  function capture(match,center){
    const nearest=nearestPatternSite(match,center);
    if(nearest===null)return {ok:false,reason:'empty'};
    let orientation;
    if(world.chart)for(const frame of world.chart.map.values())if(frame.id===nearest){orientation=frame.ori;break;}
    orientation??=atlasOrientationAt(nearest);
    return capturePattern(match,nearest,{orientation,side:world.side});
  }
  function preview(anchor){
    const match=getMatch(),center=siteAt(anchor);
    if(mode==='stamp'||!match||center===undefined||!canEdit())return null;
    const view=mode==='pick'?[world.center,...atlasCamera.look,...atlasCamera.right]:[];
    const token=[mode,center,radius,match.gen,match.actionRevision,match.toolSettings.maxStampCells,world.orient,world.side,...view].join(':');
    if(cache?.match===match&&cache.chart===world.chart&&cache.token===token)return cache.preview;
    let p;
    if(mode==='erase'){
      const footprint=circularSites(match.graph,center,radius);
      p={tool:'erase',ids:footprint.filter(id=>match.cells.get(id)?.owner===1),footprint,ready:true,center,radius,
        angularRadius:brushAngularRadius(match.graph,center,radius)};
    }else{
      const result=capture(match,center);
      p={tool:'pick',ids:result.ids??[],ready:result.ok,center:result.center??center,result};
    }
    cache={match,chart:world.chart,token,preview:p};return p;
  }
  function apply(anchor,{quiet=false}={}){
    const p=preview(anchor);if(!p)return false;
    if(mode==='erase'){
      const removed=getMatch().erase(1,p.center,radius);
      if(removed){cache=null;world.needsDraw=true;onErase(removed);}
      return removed;
    }
    if(mode==='pick'){
      if(!p.result.ok){
        if(!quiet)toast(p.result.reason==='empty'?'Não há padrão em campo para copiar.':p.result.reason==='too-large'?
          'Padrão maior que o limite de '+getMatch().toolSettings.maxStampCells+' células.':'Este padrão atravessa uma deformação da malha.');
        return false;
      }
      try{
        const card=onCapture(p.result.card);
        select('stamp');
        if(!quiet)toast('Padrão copiado · '+p.result.ids.length+' células');
        return card;
      }catch(error){if(!quiet)toast(error.message);return false;}
    }
    return false;
  }
  for(const name of modes)$('mx-tool-'+name).onclick=()=>select(name);
  $('mx-erase-radius').oninput=e=>setRadius(e.target.valueAsNumber);
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.defaultPrevented||
      e.target.closest?.('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
    const next={v:'stamp',b:'erase',i:'pick',Escape:'stamp'}[e.key.length===1?e.key.toLowerCase():e.key];
    if(next){e.preventDefault();select(next);}
  });
  refresh();select('stamp');
  return {select,setRadius,refresh,preview,apply,get mode(){return mode;},get radius(){return radius;}};
}
