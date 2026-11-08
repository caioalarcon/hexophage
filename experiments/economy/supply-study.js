// Focused portfolio trials: same start with/without a grower, no map in the loop.
import { writeFile } from 'node:fs/promises';
import { loadMacroProfiles } from './macro-profiles.js';
import { HORIZON, RATE, simulate } from './simulator.js';
import { rules, policies } from './scenarios.js';

const profiles = await loadMacroProfiles();
const farm = Array(8).fill('p2');
const guns = [...farm, ...Array(5).fill('gun20')];
const extra = [
  {id:'supported-stalk',name:'5 P20 + um crescedor, depois gliders',start:[...guns,'stalk'],repeat:['glider'],fundGun:true},
  {id:'supported-control',name:'5 P20 e depois gliders',start:guns,repeat:['glider'],fundGun:true}
];
const runs = [];
for (const id of ['mana', 'core-wallet', 'recent-mana', 'battery']) {
  const rule = rules.find(r => r.id === id);
  for (const shipLife of [1200,12000,120000,Infinity]) {
    for (const p of extra) {
      runs.push(simulate(profiles,rule,p,{shipLife}));
    }
  }
}
const battery = rules.find(r => r.id === 'battery');
const sensitivity=[];
for (const [parameter, variants] of Object.entries({battery:[600,1000,2000],manaInterval:[3000,9000,18000],fieldDoubling:[48,96,192]})) {
  for (const value of variants) {
    for (const p of policies.filter(p=>['mixed','gun'].includes(p.id))) {
      const r = simulate(profiles,{...battery,[parameter]:value},p,{buyThrough:HORIZON-10*60*RATE});
      sensitivity.push({parameter,value,...r});
    }
  }
}
const ablations = [];
for (const [variant, patch] of [
  ['battery-only-no-pressure', { fieldDoubling: 0, pressureHalfLife: 0 }],
  ['battery-slower-mana', { manaInterval: 18000 }],
  ['battery-longer-recovery', { pressureHalfLife: 120000 }],
]) {
  const rule = { ...battery, ...patch, id: variant };
  for (const p of policies.filter(p => ['mixed','gun','glider'].includes(p.id)))
    for (const buyThrough of [HORIZON, HORIZON - 10 * 60 * RATE])
      ablations.push(simulate(profiles, rule, p, { buyThrough }));
}
await writeFile(process.argv[2] || 'supply-results.json', JSON.stringify({runs,sensitivity,ablations}));
