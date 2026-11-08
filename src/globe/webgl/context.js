import { world } from '../../browser/world-state.js';
import { toast } from '../../layout/announcements.js';
import { gpuCanvas } from '../../layout/elements.js';

// Native WebGL globe renderer: geometry is uploaded once per planet. Rotating
// the planet only changes three camera basis vectors, never the graph mesh.
const gpu = {
  canvas: gpuCanvas,
  gl: null,
  program: null,
  staticBuffer: null,
  liveBuffer: null,
  markerBuffer: null,
  centerBuffer: null,
  vertexCount: 0,
  planet: null,
  markerCount: 0,
  failed: false,
  lastDrawMs: 0,
  lastBuildMs: 0,
  wireF: 0,
  wireMode: 'auto',
  lodGraphs: new Map(),
};
function gpuShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw Error(message);
  }
  return sh;
}
function ensureGPU() {
  if (gpu.gl) return true;
  if (gpu.failed) return false;
  try {
    const gl =
      gpuCanvas.getContext('webgl2', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      }) ||
      gpuCanvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      });
    if (!gl) throw Error('WebGL indisponível');
    const vs = gpuShader(
      gl,
      gl.VERTEX_SHADER,
      `
    attribute vec3 a_pos;
    uniform vec3 u_right,u_up,u_look;
    uniform vec2 u_size;
    uniform float u_radius,u_focal,u_pointSize;
    uniform mediump float u_inside;
    varying mediump float v_depth;
    void main(){
      float x=dot(a_pos,u_right),y=dot(a_pos,u_up),z=dot(a_pos,u_look);
      if(u_inside>.5){
        gl_Position=vec4(2.0*x*u_focal/u_size.x,2.0*y*u_focal/u_size.y,0.0,z);
      }else{
        gl_Position=vec4(2.0*x*u_radius/u_size.x,2.0*y*u_radius/u_size.y,0.0,1.0);
      }
      gl_PointSize=u_pointSize;
      v_depth=z;
    }`,
    );
    const fs = gpuShader(
      gl,
      gl.FRAGMENT_SHADER,
      `
    precision mediump float;
    varying mediump float v_depth;
    uniform vec4 u_color;
    uniform mediump float u_inside;
    uniform float u_circles;
    void main(){
      if(u_inside>.5 ? v_depth<.1 : v_depth<.035)discard;
      if(u_circles>.5 && length(gl_PointCoord-vec2(.5))>.5)discard;
      gl_FragColor=u_color;
    }`,
    );
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gpu.gl = gl;
    gpu.program = prog;
    const loc = (name) => gl.getUniformLocation(prog, name);
    gpu.attr = gl.getAttribLocation(prog, 'a_pos');
    gpu.uni = {
      right: loc('u_right'),
      up: loc('u_up'),
      look: loc('u_look'),
      size: loc('u_size'),
      radius: loc('u_radius'),
      focal: loc('u_focal'),
      inside: loc('u_inside'),
      pointSize: loc('u_pointSize'),
      color: loc('u_color'),
      circles: loc('u_circles'),
    };
    gpu.staticBuffer = gl.createBuffer();
    gpu.liveBuffer = gl.createBuffer();
    gpu.markerBuffer = gl.createBuffer();
    gpu.centerBuffer = gl.createBuffer();
    gpu.planet = null;
    gpuCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      gpu.gl = null;
      gpu.planet = null;
      gpu.failed = true;
      gpuCanvas.style.display = 'none';
      world.needsGlobeBase = true;
      world.needsDraw = true;
      toast('WebGL interrompido; modo de compatibilidade ativado.');
    });
    return true;
  } catch (e) {
    gpu.failed = true;
    console.warn('Visualização 3D acelerada indisponível:', e);
    return false;
  }
}

export { ensureGPU, gpu, gpuShader };
