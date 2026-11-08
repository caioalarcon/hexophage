import { $ } from './elements.js';
import { updateGamePanel } from '../match/hud/ranking.js';

function bindLayoutControls() {
  const shell = document.querySelector('.hl-shell'),
    compact = matchMedia('(max-width:760px), (max-width:940px) and (max-height:500px)');
  const setPanel = (open) => {
    shell.classList.toggle('hl-panel-closed', !open);
    $('br-panel-overlay').hidden = !open;
    $('br-panel-toggle').setAttribute('aria-expanded', String(open));
  };
  setPanel(false);
  compact.addEventListener('change', () => setPanel(false));
  $('br-panel-overlay').addEventListener('pointerdown', () => setPanel(false));
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      $('br-panel-toggle').getAttribute('aria-expanded') === 'true' &&
      !document.querySelector('dialog[open]')
    )
      setPanel(false);
  });
  const tuning = $('br-tuning-toggle');
  const closeTuning = () => {
    $('hexlab').classList.remove('br-tuning-open');
    tuning.setAttribute('aria-expanded', 'false');
  };
  tuning.onclick = () => {
    const open = $('hexlab').classList.toggle('br-tuning-open');
    tuning.setAttribute('aria-expanded', String(open));
  };
  $('br-menu-step').onclick = () => {
    $('hl-step').click();
    closeTuning();
  };
  $('br-menu-reset').onclick = () => {
    $('hl-clear').click();
    closeTuning();
  };
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.br-advanced-tuning, #br-tuning-toggle')) closeTuning();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTuning();
  });
  $('br-panel-toggle').onclick = () => {
    closeTuning();
    setPanel(shell.classList.contains('hl-panel-closed'));
  };
  $('br-panel-close').onclick = () => {
    setPanel(false);
    $('br-panel-toggle').focus();
  };
  $('br-ledger-open').onclick = () => {
    $('br-ledger').showModal();
    updateGamePanel(true);
  };
}

export { bindLayoutControls };
