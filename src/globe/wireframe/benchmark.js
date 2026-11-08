import { world } from '../../browser/world-state.js';
import { globeContext } from '../camera/view.js';
import { gpuShader } from '../webgl/context.js';
import { $, cv } from '../../layout/elements.js';
import { atlasCamera } from '../../map/atlas/camera.js';
import { cross } from '../../world/geometry.js';
import { sphereCorner } from '../../world/sphere.js';

// Submit one real, un-decimated wireframe on a separate drawing surface.
// At most four batches are queued before waiting for their GPU fence.
let wireBench = null;
async function measureWholeWire() {
  const button = $('br-wire-bench'),
    status = $('br-wire-report'),
    preview = $('br-wire-preview');
  if (wireBench) {
    wireBench.cancelled = true;
    button.disabled = true;
    return;
  }
  const g = world.graph,
    job = { cancelled: false },
    canvas = document.createElement('canvas'),
    r = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2),
    width = Math.max(1, Math.round(r.width * dpr)),
    height = Math.max(1, Math.round(r.height * dpr));
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    status.textContent = 'Este teste requer WebGL 2.';
    return;
  }
  wireBench = job;
  button.textContent = 'Cancelar medição';
  preview.hidden = true;
  const count = (n) => n.toLocaleString('pt-BR'),
    idle = () => new Promise((resolve) => setTimeout(resolve, 0));
  let cursor = 0,
    edges = 0,
    sync = null;
  function stillRunning() {
    if (job.cancelled || g !== world.graph) return false;
    if (gl.isContextLost()) throw Error('Contexto WebGL interrompido');
    return true;
  }
  try {
    status.textContent = 'Preparando medição de ' + count(g.edges) + ' arestas…';
    await idle();
    const prog = gl.createProgram();
    const vs = gpuShader(
      gl,
      gl.VERTEX_SHADER,
      `#version 300 es
   in vec3 a;uniform vec3 right,up,look;uniform vec2 scale;out float z;
   void main(){z=dot(a,look);gl_Position=vec4(scale*vec2(dot(a,right),dot(a,up)),0.,1.);}`,
    );
    const fs = gpuShader(
      gl,
      gl.FRAGMENT_SHADER,
      `#version 300 es
   precision highp float;in float z;out vec4 color;
   void main(){if(z<0.)discard;color=vec4(.35,.77,.80,1.);}`,
    );
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(prog) || 'Erro de programa WebGL');
    gl.useProgram(prog);
    const view =
      world.view === 'globe'
        ? globeContext()
        : { look: atlasCamera.look, right: atlasCamera.right };
    gl.uniform3fv(gl.getUniformLocation(prog, 'look'), view.look);
    gl.uniform3fv(gl.getUniformLocation(prog, 'right'), view.right);
    gl.uniform3fv(gl.getUniformLocation(prog, 'up'), cross(view.look, view.right));
    const diameter = 0.88 * Math.min(width, height);
    gl.uniform2f(gl.getUniformLocation(prog, 'scale'), diameter / width, diameter / height);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.035, 0.06, 0.095, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const chunk = 8192,
      vertices = new Float32Array(chunk * 6 * 6),
      corners = new Float32Array(18);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.STREAM_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    const t0 = performance.now();
    let lastUI = t0,
      lastYield = t0,
      batches = 0;
    while (cursor < g.n && stillRunning()) {
      const end = Math.min(cursor + chunk, g.n);
      let w = 0;
      for (; cursor < end; cursor++) {
        const d = g.deg[cursor];
        for (let k = 0; k < d; k++) sphereCorner(g, cursor, k, corners, k * 3);
        for (let k = 0; k < d; k++) {
          const nk = (k + 1) % d;
          if (cursor > g.adj[cursor * 6 + nk]) continue;
          const a = k * 3,
            b = nk * 3;
          vertices[w++] = corners[a];
          vertices[w++] = corners[a + 1];
          vertices[w++] = corners[a + 2];
          vertices[w++] = corners[b];
          vertices[w++] = corners[b + 1];
          vertices[w++] = corners[b + 2];
        }
      }
      if (w) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices, 0, w);
        gl.drawArrays(gl.LINES, 0, w / 3);
        edges += w / 6;
      }
      if (++batches % 4 === 0 || cursor === g.n) {
        sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!sync) throw Error('Falha ao criar fence WebGL');
        gl.flush();
        while (stillRunning()) {
          const result = gl.clientWaitSync(sync, 0, 0);
          if (result === gl.ALREADY_SIGNALED || result === gl.CONDITION_SATISFIED) break;
          if (result === gl.WAIT_FAILED) throw Error('Falha ao aguardar conclusão WebGL');
          await idle();
          lastYield = performance.now();
        }
        gl.deleteSync(sync);
        sync = null;
      }
      const now = performance.now();
      if (now - lastUI > 130) {
        status.textContent =
          Math.floor((100 * cursor) / g.n) +
          '% · ' +
          count(edges) +
          ' de ' +
          count(g.edges) +
          ' arestas';
        lastUI = now;
      }
      if (now - lastYield >= 8) {
        await idle();
        lastYield = performance.now();
      }
    }
    if (!stillRunning()) {
      status.textContent = 'Medição cancelada.';
      return;
    }
    const ms = performance.now() - t0;
    if (edges !== g.edges || gl.getError() !== gl.NO_ERROR)
      throw Error('Falha ao renderizar a malha inteira');
    preview.width = Math.min(320, width);
    preview.height = Math.max(1, Math.round((height * preview.width) / width));
    preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
    preview.hidden = false;
    status.textContent =
      'f' +
      g.f +
      ' · ' +
      count(edges) +
      ' arestas · ' +
      width +
      ' × ' +
      height +
      ' px · ' +
      (ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      ' s · ' +
      (edges / Math.max(ms, 0.01) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) +
      ' milhões de arestas/s. Tempo total da geração dos contornos à conclusão confirmada pelo WebGL.';
  } catch (e) {
    status.textContent = 'Medição interrompida. ' + e.message;
  } finally {
    if (sync) gl.deleteSync(sync);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = canvas.height = 1;
    wireBench = null;
    button.disabled = false;
    button.textContent = 'Medir malha integral';
  }
}

function bindWireBenchmark() {
  $('br-wire-bench').onclick = measureWholeWire;
  $('br-bench-show').onclick = () => {
    if ($('br-panel-toggle').getAttribute('aria-expanded') !== 'true') $('br-panel-toggle').click();
    const button = $('br-wire-bench');
    button.closest('details').open = true;
    button.scrollIntoView({ block: 'nearest' });
    button.focus({ preventScroll: true });
    if (!wireBench) measureWholeWire();
  };
}

export { bindWireBenchmark };
