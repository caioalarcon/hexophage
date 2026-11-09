// Convert the detailed CLI outputs to compact CSVs. Keep observations at the
// first censor/deficit separate from the artificial parked balance after 10k.
import { readFile, writeFile } from 'node:fs/promises';
import { burst } from './simulator.js';

const args = process.argv.slice(2);
if (args.length !== 3) throw Error('Expected the run, supply and catalog JSON paths in that order.');
const [base, extra, scan] = await Promise.all(args.map(async p => JSON.parse(await readFile(p,'utf8'))));
const presets = new Map(base.rules.map(p=>[p.id,p]));
const quote = x => x == null ? '' : '"' + String(x).replaceAll('"','""') + '"';
const csv = rows => rows.map(row => row.map(quote).join(',')).join('\n')+'\n';
const rows = [['lote','regra','estrategia','parametro','valor','sobrevida_G','comprar_ate_G','fim_observado_G',
  'status','carimbos','compras_segunda_hora','energia','mana','populacao','flippers_imediatos','P20_imediatas','G_2','G_10','G_100','G_1000','G_area_f320']];
for(const [batch,runs] of [['principal',base.runs],['sensibilidade',base.sensitivities],['crescedor',extra.runs],
  ['bateria',extra.sensitivity],['ablacao',extra.ablations]]) {
  for(const r of runs) {
    const end = r.stop ?? r.firstInsolvent ?? base.horizon;
    const s = r.checkpoints.find(point=>point.g===end);
    if (!s) throw Error('Missing measurement at generation '+end);
    const rule = {...(presets.get(r.rule) || presets.get('battery'))};
    if(r.parameter)rule[r.parameter==='linear-price'?'price':r.parameter]=r.value;
    if(r.rule==='battery-only-no-pressure'){rule.fieldDoubling=0;rule.pressureHalfLife=0}
    if(r.rule==='battery-slower-mana')rule.manaInterval=18000;
    if(r.rule==='battery-longer-recovery')rule.pressureHalfLife=120000;
    rows.push([batch,r.rule,r.policy,r.parameter,r.value,r.shipLife,r.buyThrough,end,s.status,s.orders,
      end>=base.horizon/2?s.orders-r.atHalf:null, s.bank,s.mana,s.field,s.burst,
      burst(rule,s.bank,s.mana,s.pressure,s.orders,52), ...[2,10,100,1000].map(n=>r.marks[n]),r.breachedMap]);
  }
}
const keys=Object.keys(scan[0]);
await Promise.all([
  writeFile(new URL('./resultados.csv',import.meta.url),csv(rows)),
  writeFile(new URL('./catalogo.csv',import.meta.url),csv([keys,...scan.map(row=>keys.map(k=>row[k]))])),
]);
console.log(rows.length-1,'scenario runs;',scan.length,'catalog runs');
