import {buildSphere} from '../../../src/world/sphere.js';
import {footprint} from '../catalog.mjs';
import {createTypedWorld} from '../engine.mjs';
import {spreadSites} from '../general/scene.mjs';
import {normalizeOpening,measureOpening,locateOpening} from './opening.mjs';
import {attachProgression,automaticOpponentPlans,defaultProgressionPlan,normalizeProgressionPlan,progressionSpatialTypes} from './progression.mjs';

// Event income can only be spent in a later generation. Each preset has the
// same opening capital, birth/stamp prices and destruction tariff.
const common={stampCost:8,birthCost:1,eraseCost:16,stableAfter:12,productionScale:60,
  stableEnergy:0,birthEnergy:0,deathEnergy:0};
export const gameEconomies={
  stability:{...common,stableEnergy:1},
  birth:{...common,birthEnergy:1.3},
  death:{...common,deathEnergy:1.3},
  activity:{...common,birthEnergy:.65,deathEnergy:.65},
};

export const defaultGameOptions=Object.freeze({F:128,seed:1,players:6,bank:640,policy:'stability',
  arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',friendlyFire:false});

export function createGameMatch(options={}) {
  const {F,seed,players,bank,policy,arbitration,eligibility,existence,passage,friendlyFire,
    economy={},toolSettings,spatial:spatialInput,initialCard,progression,unseededOwners=[],graph=buildSphere(F)}={...defaultGameOptions,...options};
  if(!Object.hasOwn(gameEconomies,policy))throw RangeError('Economia desconhecida.');
  if(!Number.isInteger(players)||players<2||players>graph.n)throw RangeError('A partida precisa de pelo menos dois jogadores e espaço na esfera.');
  if(!Array.isArray(unseededOwners)||unseededOwners.some(owner=>!Number.isInteger(owner)||owner<1||owner>players))
    throw RangeError('A abertura vazia precisa indicar jogadores da partida.');
  const plan=progression?.enabled?normalizeProgressionPlan(progression.plan??defaultProgressionPlan(initialCard)):null;
  const opponents=plan?(progression?.opponentPlans??automaticOpponentPlans(players,seed)):{};
  const planFor=owner=>opponents[owner]??plan;
  const types=plan?Object.assign({},progressionSpatialTypes(plan),...Object.values(opponents).map(progressionSpatialTypes)):null;
  const spatial=plan?{...spatialInput,enabled:true,types:{...spatialInput?.types,...types}}:spatialInput;
  let match=createTypedWorld(graph,{seed,wallets:Array(players).fill(bank),
    economy:{...gameEconomies[policy],...economy},arbitration,eligibility,existence,passage,friendlyFire,spatial});
  const sites=spreadSites(graph,players), starts=[null], opening=[null], alive=[false];
  const local=match.spatial.enabled;
  const baseFor=owner=>{
    const blueprint=planFor(owner),root=blueprint?.nodes.find(n=>n.id===blueprint.base);
    return local?normalizeOpening(root?{...root,key:root.cardKey??'custom/'+root.id,contract:root.id}:initialCard):null;
  };
  if(plan)attachProgression(match,{...progression,plan,opponentPlans:opponents,seed});
  let baseTrial=null;
  const farm=policy==='stability'?'hex-b2s245/farm-4-12':'bays/osc2';
  const [rule]=farm.split('/');
  for(let owner=1;owner<=players;owner++){
    const preferred=sites[((seed>>>0)+owner-1)%players],rotation=((seed>>>0)+owner)%6;
    if(!local&&unseededOwners.includes(owner)){starts.push(preferred);alive.push(true);opening.push(null);continue;}
    const base=baseFor(owner);
    const located=local?locateOpening(match,owner,base,preferred,rotation):{site:preferred,ids:footprint(graph,farm,preferred,rotation)};
    if(!located)throw RangeError('A base precisa caber no setor inicial da esfera e no capital de abertura. Aumente a esfera ou ajuste o desenho.');
    const {site,ids}=located;starts.push(site);alive.push(true);
    if(local&&owner===1){
      baseTrial=measureOpening(graph,base,site,rotation,{bank,seed,economy:match.economy,spatial,arbitration,eligibility,existence,passage,friendlyFire});
      if(!baseTrial.ok)throw RangeError(baseTrial.reason);
    }
    const placed=ids&&(local?match.bootstrapStamp(owner,base.rule,base.resolver,ids,base.ballot,base.sense,{contract:base.contract}):match.stamp(owner,rule,'contact',ids));
    if(!placed)
      throw RangeError('A reserva e o espaço devem comportar a colônia inicial de cada jogador.');
    opening.push(local?{...base,owner,site,ids,rotation}:{owner,key:farm,site,ids,rotation,rule,resolver:'contact',ballot:'support',sense:'native'});
  }
  // Opening colonies belong to scenario setup. The configurable stamp limit
  // applies to every player action after this setup, including bot purchases.
  if(toolSettings)match.setToolSettings(toolSettings);
  const eliminatedAt=alive.map(()=>null);
  let outcome=null;
  function step(hooks){
    if(outcome!==null)return false;
    match.step(hooks);
    let survivors=0,survivor=0;
    for(let owner=1;owner<=players;owner++){
      if(!alive[owner])continue;
      const player=match.players[owner];
      if(match.progression?.objective(owner).defeated){alive[owner]=false;player.out=true;eliminatedAt[owner]=match.gen;continue;}
      // A successful stamp records entry even if its cells die on the first tick.
      // A waiting player keeps the right to choose an opening later.
      if(player.stamps===0)player.out=false;
      if(player.conventional>0||player.stamps===0){survivors++;survivor=owner;}
      else{alive[owner]=false;player.out=true;eliminatedAt[owner]=match.gen;}
    }
    if(survivors<=1)outcome=survivors?survivor:0;
    return true;
  }
  function restore(previous,previousAlive=alive,previousEliminated=eliminatedAt){
    if(!previous||previous.graph!==graph)throw RangeError('O estado anterior precisa pertencer à mesma esfera.');
    match=previous;alive.splice(0,alive.length,...previousAlive);
    eliminatedAt.splice(0,eliminatedAt.length,...previousEliminated);
    outcome=null;
  }
  return {get match(){return match;},graph,starts,opening,alive,eliminatedAt,baseTrial,step,restore,get outcome(){return outcome;}};
}
