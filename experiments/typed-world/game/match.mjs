import {buildSphere} from '../../../src/world/sphere.js';
import {footprint} from '../catalog.mjs';
import {createTypedWorld} from '../engine.mjs';
import {spreadSites} from '../general/scene.mjs';

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

export const defaultGameOptions=Object.freeze({F:32,seed:1,players:6,bank:640,policy:'stability',
  arbitration:'ballot',eligibility:'contest',existence:'majority',passage:'literal',friendlyFire:false});

export function createGameMatch(options={}) {
  const {F,seed,players,bank,policy,arbitration,eligibility,existence,passage,friendlyFire,
    economy={},graph=buildSphere(F)}={...defaultGameOptions,...options};
  if(!Object.hasOwn(gameEconomies,policy))throw RangeError('Economia desconhecida.');
  if(!Number.isInteger(players)||players<2||players>graph.n)throw RangeError('A partida precisa de pelo menos dois jogadores e espaço na esfera.');
  const match=createTypedWorld(graph,{seed,wallets:Array(players).fill(bank),
    economy:{...gameEconomies[policy],...economy},arbitration,eligibility,existence,passage,friendlyFire});
  const sites=spreadSites(graph,players), starts=[null], opening=[null], alive=[false];
  const farm=policy==='stability'?'hex-b2s245/farm-4-12':'bays/osc2';
  const [rule]=farm.split('/');
  for(let owner=1;owner<=players;owner++){
    const site=sites[((seed>>>0)+owner-1)%players],rotation=((seed>>>0)+owner)%6;
    const ids=footprint(graph,farm,site,rotation);
    if(!ids || !match.stamp(owner,rule,'contact',ids))
      throw RangeError('A reserva e o espaço devem comportar a colônia inicial de cada jogador.');
    starts.push(site);alive.push(true);opening.push({owner,key:farm,site,ids,rotation,rule,resolver:'contact',ballot:'support',sense:'native'});
  }
  const eliminatedAt=alive.map(()=>null);
  let outcome=null;
  function step(hooks){
    if(outcome!==null)return false;
    match.step(hooks);
    let survivors=0,survivor=0;
    for(let owner=1;owner<=players;owner++){
      if(!alive[owner])continue;
      if(match.players[owner].conventional>0){survivors++;survivor=owner;}
      else{alive[owner]=false;match.players[owner].out=true;eliminatedAt[owner]=match.gen;}
    }
    if(survivors<=1)outcome=survivors?survivor:0;
    return true;
  }
  return {match,graph,starts,opening,alive,eliminatedAt,step,get outcome(){return outcome;}};
}
