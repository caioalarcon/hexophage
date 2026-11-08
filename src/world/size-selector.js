import { $ } from '../layout/elements.js';
import { cancelBuild, requestSphere } from './build-dialog.js';

function bindWorldSize() {
  const sizes = [20, 24, 32, 48, 64, 96, 160, 320, 640, 1024, 2048];
  for (const f of sizes) {
    const memory =
      f >= 1024
        ? ' · ~' +
          ((65.75 * (10 * f * f + 2)) / 1073741824).toLocaleString('pt-BR', {
            maximumFractionDigits: 1,
          }) +
          ' GiB'
        : '';
    $('hl-frequency').add(
      new Option(
        'f' + f + ' · ' + (10 * f * f + 2).toLocaleString('pt-BR') + memory,
        String(f),
        f === 320,
        f === 320,
      ),
    );
  }
  $('hl-frequency').onchange = (e) => {
    const f = Number(e.target.value);
    $('hl-rebuild').title =
      'Iniciar nova partida em f' +
      f +
      ' com ' +
      (10 * f * f + 2).toLocaleString('pt-BR') +
      ' células.';
  };
  $('hl-rebuild').onclick = requestSphere;
  $('br-build-cancel').onclick = cancelBuild;
  $('br-building').addEventListener('cancel', (e) => {
    e.preventDefault();
    cancelBuild();
  });
}

export { bindWorldSize };
