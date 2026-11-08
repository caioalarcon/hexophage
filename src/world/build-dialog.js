import { world } from '../browser/world-state.js';
import { openFullGlobe } from '../globe/navigator/fullscreen.js';
import { navigatorView } from '../globe/navigator/surface.js';
import { toast } from '../layout/announcements.js';
import { $ } from '../layout/elements.js';
import { resetGame } from '../match/controls/new-match.js';
import { setPlay } from '../match/controls/playback.js';
import { sphereSpawns } from '../match/spawns.js';
import { allocateCells } from '../simulation/population.js';
import { newWorld } from './load-planet.js';
import { sphereStages } from './sphere.js';

// Geometry is prepared off the UI thread. Transfer the typed arrays without a copy.
let buildJob = null;
function stopBuild() {
  const job = buildJob;
  if (!job) return;
  buildJob = null;
  job.worker?.terminate();
  if (job.url) URL.revokeObjectURL(job.url);
  if ($('br-building').open) $('br-building').close();
  return job;
}
function cancelBuild() {
  const job = stopBuild();
  if (!job) return;
  if (job.wasPlaying) setPlay(true);
  toast('Construção cancelada. A partida continua disponível.');
}
function requestSphere() {
  const f = Number($('hl-frequency').value),
    wasPlaying = world.playing,
    globeExpanded = navigatorView.expanded;
  if (buildJob) return;
  if (f === world.graph.f) {
    resetGame();
    return;
  }
  setPlay(false);
  const progress = $('br-build-progress'),
    status = $('br-build-msg');
  const n = 10 * f * f + 2,
    start = performance.now(),
    job = { f, wasPlaying, worker: null, url: null };
  buildJob = job;
  $('br-building').showModal();
  progress.value = 0;
  status.textContent = 'f' + f + ' · ' + n.toLocaleString('pt-BR') + ' células';
  function showProgress(p) {
    progress.value = p;
    status.textContent = 'f' + f + ' · ' + n.toLocaleString('pt-BR') + ' células · ' + p + '%';
  }
  function fallback() {
    if (buildJob !== job || job.fallback) return;
    job.fallback = true;
    job.worker?.terminate();
    const stages = sphereStages(f);
    function pump() {
      if (buildJob !== job) return;
      try {
        let part;
        const now = performance.now();
        do {
          part = stages.next();
        } while (!part.done && performance.now() - now < 12);
        if (!part.done) {
          showProgress(part.value);
          setTimeout(pump, 0);
          return;
        }
        const g = part.value;
        showProgress(96);
        setTimeout(() => {
          if (buildJob !== job) return;
          try {
            g.spawnIds = sphereSpawns(g);
            ready(g, allocateCells(g.n));
          } catch (e) {
            fail(e.message);
          }
        }, 0);
      } catch (e) {
        fail(e.message);
      }
    }
    setTimeout(pump, 0);
  }
  function fail(message) {
    if (buildJob !== job) return;
    stopBuild();
    if (wasPlaying) setPlay(true);
    toast('Não foi possível carregar f' + f + '. ' + message);
  }
  function ready(g, buffers) {
    if (buildJob !== job) return;
    try {
      newWorld(f, g, buffers);
      resetGame();
      if (globeExpanded) openFullGlobe(true);
      navigatorView.dirty = true;
      let bytes = 0;
      for (const obj of [g, buffers])
        for (const v of Object.values(obj)) if (ArrayBuffer.isView(v)) bytes += v.byteLength;
      stopBuild();
      toast(
        'f' +
          f +
          ' · ' +
          n.toLocaleString('pt-BR') +
          ' células · ' +
          ((performance.now() - start) / 1000).toLocaleString('pt-BR', {
            maximumFractionDigits: 1,
          }) +
          ' s para preparar · ' +
          Math.round(bytes / 1048576).toLocaleString('pt-BR') +
          ' MiB em vetores do grafo e da simulação.',
      );
    } catch (e) {
      fail(e.message);
    }
  }
  try {
    job.url = URL.createObjectURL(new Blob([HEXOPHAGE_PLANET_WORKER], { type: 'text/javascript' }));
    job.worker = new Worker(job.url);
    job.worker.onmessage = ({ data }) => {
      if (buildJob !== job) return;
      job.started = true;
      if (data.error) {
        fail(data.error);
        return;
      }
      if (data.g) {
        ready(data.g, data.buffers);
        return;
      }
      showProgress(data.p);
    };
    job.worker.onerror = (e) => {
      if (job.started) fail(e.message || 'A construção foi interrompida pelo navegador.');
      else {
        e.preventDefault();
        fallback();
      }
    };
    job.worker.postMessage(f);
  } catch (e) {
    fallback();
  }
}

export { cancelBuild, requestSphere };
