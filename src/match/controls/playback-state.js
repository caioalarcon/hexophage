// Control availability is derived from the session state, independent of DOM.
export function playbackState({started=false,playing=false,ended=false,eliminated=false,stopped=false}={}) {
  const terminal=ended||eliminated||stopped;
  return {
    state:ended?'finished':eliminated?'eliminated':stopped?'stopped':playing?'running':started?'paused':'ready',
    label:terminal?'Nova partida':playing?'Pausar':started?'Retomar':'Iniciar',
    icon:terminal?'↻':playing?'❚❚':'▶',
    canStep:started&&!playing&&!terminal,
    canStop:(started||playing)&&!terminal,
    canRun:!terminal,
  };
}
