import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { loadMacroProfiles } from './macro-profiles.js';

const directory = new URL('./', import.meta.url);
const profiles = [...(await loadMacroProfiles()).values()].map(p => ({
  id:p.id, name:p.name, window:p.window, cells:p.cells, group:p.group, net:p.net, core:p.core,
  meanLive:p.meanLive, netSlope:p.netSlope, coreSlope:p.coreSlope, liveSlope:p.liveSlope,
  mobile:p.mobile, emitter:p.emitter, runway:p.runway,
}));
const [template, styles, bundle] = await Promise.all([
  readFile(new URL('lab/template.html', directory), 'utf8'),
  readFile(new URL('lab/style.css', directory), 'utf8'),
  build({ entryPoints:[fileURLToPath(new URL('lab/ui.js', directory))], bundle:true,
    format:'iife', write:false, minify:true, define:{ CALIBRATED_PROFILES:JSON.stringify(profiles) } }),
]);
const html = template.replace('/* INLINE_CSS */', () => styles)
  .replace('/* INLINE_JS */', () => bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
await writeFile(new URL('lab.html', directory), html);
console.log(`lab.html · ${profiles.length} padrões · ${Buffer.byteLength(html)} bytes`);
