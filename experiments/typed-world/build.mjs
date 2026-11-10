import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
const [html,css,js]=await Promise.all([
  readFile(new URL('template.html',here),'utf8'),readFile(new URL('style.css',here),'utf8'),
  build({entryPoints:[fileURLToPath(new URL('ui.mjs',here))],bundle:true,format:'iife',minify:true,
    charset:'utf8',target:'es2020',write:false})]);
await writeFile(new URL('index.html',here),html.replace('/* APP_STYLE */',()=>css)
  .replace('/* APP_SCRIPT */',()=>js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')));
