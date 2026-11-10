const short={callahan:'Ca',bays:'Ba','hex-b2s34':'H34','hex-b2s245':'H245',bays245:'B245',
  andreen:'An',highhex:'Hi',ashley15:'A15',ashley:'A16',
  contact:'Co',phase:'Tr',guard:'Gu',antimatter:'AM'};

export function matrixEditor(host){
  let ids=[],bits='';
  function index(i,j){return i*(2*ids.length-i-1)/2+j-i-1;}
  const beats=(i,j)=>i<j?bits[index(i,j)]==='1':bits[index(j,i)]==='0';
  function draw(){
    host.replaceChildren();
    const note=document.createElement('p');note.textContent='▲ a linha vence a coluna. Clique para inverter.';host.append(note);
    const table=document.createElement('table'),header=table.createTHead().insertRow();
    const heading=(row,id,scope)=>{
      const th=document.createElement('th');th.scope=scope;th.textContent=short[id]??'';th.title=id;row.append(th);
    };
    heading(header,'','col');
    for(const id of ids)heading(header,id,'col');
    const body=table.createTBody();
    for(const [i,left] of ids.entries()){
      const row=body.insertRow();heading(row,left,'row');
      for(const [j,right] of ids.entries()){
        const td=row.insertCell();
        if(i===j){td.textContent='·';continue;}
        const btn=document.createElement('button');btn.type='button';const wins=beats(i,j);
        btn.textContent=wins?'▲':'▽';btn.setAttribute('aria-pressed',String(wins));
        btn.title=left+(wins?' vence ':' perde para ')+right;btn.setAttribute('aria-label',btn.title);
        btn.onclick=()=>{
          const k=index(Math.min(i,j),Math.max(i,j));
          bits=bits.slice(0,k)+(bits[k]==='1'?'0':'1')+bits.slice(k+1);draw();
          host.querySelectorAll('tbody tr')[i].cells[j+1].querySelector('button').focus();
        };
        td.append(btn);
      }
    }
    host.append(table);
    const summary=document.createElement('p');
    const champ=ids.find((_,i)=>ids.every((__,j)=>i===j || beats(i,j)));
    let cycles=0;
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)for(let k=j+1;k<ids.length;k++)
      if(beats(i,j)===beats(j,k) && beats(j,k)===beats(k,i))cycles++;
    summary.textContent=(champ?'Dominante: '+champ:'Sem dominante')+' · '+cycles+' trios cíclicos na matriz';host.append(summary);
    for(const [label,circular] of [['Ordem da lista',false],['Torneio circular',true]]){
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;
      btn.onclick=()=>{bits='';for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)
        bits+=!circular || j-i<=ids.length/2?'1':'0';draw();};host.append(btn);
    }
  }
  return {setup(families,edges){
    ids=[...families];const n=ids.length*(ids.length-1)/2;
    bits=typeof edges==='string' && edges.length===n && /^[01]+$/.test(edges)?edges:'1'.repeat(n);draw();
  },get bits(){return bits;}};
}
