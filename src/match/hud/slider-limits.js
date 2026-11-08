import { $ } from '../../layout/elements.js';

export function bindSliderLimits(sliders) {
  const dialog = $('eco-limit-dialog');
  const field = $('eco-limit');
  let active;

  function open(slider) {
    active = slider;
    $('eco-limit-name').textContent = slider.labels[0].firstChild.textContent.trim();
    field.min = slider.value;
    field.step = slider.step;
    field.max = String(Number.MAX_SAFE_INTEGER);
    field.value = slider.max;
    field.setCustomValidity('');
    dialog.showModal();
    field.select();
  }

  for (const slider of sliders) {
    const label = slider.labels[0];
    label.title = 'Definir máximo com o botão direito, Shift+F10 ou tocando no valor';
    slider.setAttribute('aria-keyshortcuts', 'Shift+F10');
    label.addEventListener('contextmenu', event => {
      event.preventDefault();
      open(slider);
    });
    slider.addEventListener('keydown', event => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        open(slider);
      }
    });
    label.querySelector('output').addEventListener('click', event => {
      event.preventDefault();
      open(slider);
    });
  }

  field.addEventListener('input', () => field.setCustomValidity(''));
  $('eco-limit-form').addEventListener('submit', event => {
    event.preventDefault();
    const maximum = field.valueAsNumber;
    if (!Number.isFinite(maximum) || maximum > Number.MAX_SAFE_INTEGER || !field.validity.valid || maximum < Number(active.value)) {
      field.setCustomValidity('Digite um máximo válido entre ' + active.value + ' e ' +
        Number.MAX_SAFE_INTEGER.toLocaleString('pt-BR') + '.');
      field.reportValidity();
      return;
    }
    active.max = String(maximum);
    dialog.close();
  });
  $('eco-limit-cancel').addEventListener('click', () => dialog.close());
}
