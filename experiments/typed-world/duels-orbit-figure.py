"""Render the measured F24 geometry and the six-lap ledger as a single SVG."""
import csv
import json
import subprocess
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from matplotlib.lines import Line2D
from matplotlib.ticker import FuncFormatter
import numpy as np

here=Path(__file__).resolve().parent
geometry="""
import {buildSphere} from '../../src/world/sphere.js';
import {orbitScene,openOrbit} from './duels-orbit-scene.mjs';
import {createTypedWorld} from './engine.mjs';
const g=buildSphere(24), s=orbitScene(g);
const xyz=id=>[...g.coords.subarray(3*id,3*id+3)];
const path=s.frames.map(ids=>{
  const v=[0,0,0];for(const id of ids)for(let k=0;k<3;k++)v[k]+=g.coords[3*id+k];
  return v.map(x=>x/Math.hypot(...v));
});
const initial=[false,true].map(farm=>{
  const m=createTypedWorld(g,{wallets:[240,24000],seed:23,economy:{phasePriority:1,eraseCost:24}});
  openOrbit(m,s,farm);return m.players[1].reserve;
});
console.log(JSON.stringify({path:[...path,path[0]],launch:xyz(s.launchSite),farms:s.freeCenters.map(xyz),
  sponsor:xyz(s.sponsorSite),pents:g.pents.map(xyz),initial}));
"""
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',geometry],cwd=here,text=True))
p=Path(here/'duels-orbit.csv')
with p.open() as f:
    records=[r for r in csv.DictReader(f) if r['fee']=='24' and r['bank']=='240']
matplotlib.rcParams.update({'font.family':'DejaVu Sans','svg.fonttype':'none','svg.hashsalt':'hexophage-orbit-v1','font.size':10})
fig=plt.figure(figsize=(10,6.2),facecolor='#fcfcfa')
fig.text(.055,.948,'Patrulha orbital com quatro fazendas no percurso',fontsize=20,weight='bold',color='#172a36')
fig.text(.057,.903,'Slider de Ashley 2016   ·   Esfera F24   ·   Fazendas de B2/S245   ·   24 créditos por célula apagada',fontsize=10.5,color='#52636c')
navy='#263f55'; attack='#007d72'; target='#b54b20'; cash='#475a91'
unit=lambda v:np.asarray(v)/np.linalg.norm(v)
front=unit(np.asarray(data['launch'])+.22*np.asarray(data['sponsor']))
def splitline(ax,xyz,right,up,look,color,width):
    p=np.asarray(xyz); x=p@right;y=p@up
    mask=p@look<0; x[mask]=np.nan;y[mask]=np.nan
    ax.plot(x,y,color=color,linewidth=width,solid_capstyle='round',zorder=2)
for index,look in enumerate([front,-front]):
    ax=fig.add_axes([.05+.257*index,.455,.246,.37])
    ax.set_aspect('equal');ax.set(xlim=(-1.04,1.04),ylim=(-1.04,1.04));ax.axis('off')
    ax.add_patch(Circle((0,0),1,facecolor='#e8f0ee',edgecolor='#818f95',lw=.85))
    right=unit(np.cross([0,0,1],look));up=unit(np.cross(look,right))
    for lat in np.radians(np.arange(-60,90,30)):
        lon=np.linspace(-np.pi,np.pi,181)
        splitline(ax,np.transpose([np.cos(lon)*np.cos(lat),np.sin(lon)*np.cos(lat),np.full_like(lon,np.sin(lat))]),right,up,look,'#c5d1d0',.55)
    for lon in np.radians(np.arange(0,360,30)):
        lat=np.linspace(-np.pi/2,np.pi/2,91)
        splitline(ax,np.transpose([np.cos(lat)*np.cos(lon),np.cos(lat)*np.sin(lon),np.sin(lat)]),right,up,look,'#c5d1d0',.55)
    splitline(ax,data['path'],right,up,look,attack,2)
    for v in data['pents']:
        if np.dot(v,look)>=0:ax.scatter(np.dot(v,right),np.dot(v,up),marker='p',s=10,color='#7d8b92',zorder=3)
    points=[(data['launch'],'^',attack)]+[(v,'o',target) for v in data['farms']]+[(data['sponsor'],'s',cash)]
    for v,marker,color in points:
        if np.dot(v,look)>=0:ax.scatter(np.dot(v,right),np.dot(v,up),marker=marker,s=82,color=color,edgecolors='white',linewidth=.9,zorder=5)
    ax.set_title(['Hemisfério do lançamento','Hemisfério oposto'][index],fontsize=10.3,color=navy,pad=4)
info=fig.add_axes([.585,.495,.385,.29]);info.axis('off')
info.text(0,1,'Uma volta em 240 gerações',color=navy,weight='bold',fontsize=13)
for i,(mark,c,desc) in enumerate([('^',attack,'Lançamento da nave'),('o',target,'Quatro fazendas do adversário'),('s',cash,'Fazenda que financia a nave')]):
    y=.77-i*.17
    info.add_line(Line2D([.018],[y],transform=info.transAxes,marker=mark,color=c,ms=7,lw=0))
    info.text(.065,y,desc,va='center',fontsize=10,color=navy)
info.text(0,.12,'A linha acompanha o centro das seis células\ndo Slider. Ele retorna aos mesmos seis sítios.',fontsize=9,color='#52636c',va='top',linespacing=1.45)

ax=fig.add_axes([.083,.13,.49,.225],facecolor='#fcfcfa')
ax.set_title('Reserva da nave ao completar cada volta',loc='left',fontsize=12,weight='bold',pad=7,color=navy)
for i,col in [(0,'#758184'),(1,cash)]:
    rows=[r for r in records if int(r['sponsorFarm'])==i]
    amounts=[data['initial'][i]]+[float(r['cash']) for r in rows]
    ax.plot(range(7),amounts,'o-',color=col,lw=2,ms=4,clip_on=False)
ax.set(xlim=(-.08,6.12),ylim=(-200,5200),xticks=range(7),yticks=[0,2000,4000])
ax.yaxis.set_major_formatter(FuncFormatter(lambda x,pos:f'{int(x):,}'.replace(',','.')))
ax.set_xlabel('Voltas desde o lançamento',fontsize=9,color=navy)
ax.grid(axis='y',lw=.5,color='#d4dedc');ax.set_axisbelow(True)
ax.spines[['top','right']].set_visible(False);ax.spines[['left','bottom']].set_color('#aab5b5')
ax.tick_params(length=0,labelcolor=navy,pad=4,labelsize=9)
fig.text(.610,.294,'Com a fazenda patrocinadora',color=cash,fontsize=11,weight='bold')
fig.text(.610,.248,'108 cortes pagos em seis voltas.\nSaldo final de 4.871,45 créditos.',fontsize=10,color=navy,va='top',linespacing=1.4)
fig.text(.610,.159,'Sem a fazenda',color='#59686b',fontsize=11,weight='bold')
fig.text(.610,.118,'Três cortes pagos. A trajetória se\ndesfaz 25 gerações após o disparo.',fontsize=10,color=navy,va='top',linespacing=1.4)
fig.text(.055,.027,'Carteira inicial de 240. O adversário pode recomprar as fazendas a cada volta. A nave tem prioridade no vazio.',color='#52636c',fontsize=8.5)
fig.savefig(here/'duels-orbit.svg',metadata={'Date':None})
if __name__=='__main__':
    import sys
    if len(sys.argv)>1:fig.savefig(sys.argv[1],dpi=115)
