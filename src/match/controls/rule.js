import { bindBotSelectors } from '../../bots/configuration-panel.js';
import { game } from '../../browser/game.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { syncGameplayControls } from '../../patterns/editor/gameplay-controls.js';
import { applyRuleProfile, resolveRuleProfile, ruleProfiles } from '../rule-profiles.js';
import { resetGame } from './new-match.js';

const savedNotations = new Map();

function syncRuleControls() {
  const profile = game.profile;
  $('hl-rulechoice').value = profile.id;
  $('hl-ruleconfig').classList.toggle('show', !!profile.compile);
  $('hl-rule-error').textContent = '';
  $('hl-rule').removeAttribute('aria-invalid');
  if (profile.compile) {
    $('hl-rule').value = profile.physics.notation;
    savedNotations.set(profile.id, profile.physics.notation);
  }
  const selector = $('br-economy-policy');
  selector.querySelector('[value="profile"]')?.remove();
  if (profile.economy.generationQuote) selector.add(new Option('Do autômato', 'profile'));
  selector.value = game.economy.generationQuote ? 'profile' : game.economy.policy;
  syncGameplayControls(game.gameplay, profile.key);
}

export function chooseRule(id, notation) {
  const input = $('hl-rule');
  let profile;
  try {
    profile = resolveRuleProfile(id, notation ?? savedNotations.get(id));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    $('hl-rulechoice').value = game.profile.id;
    input.setAttribute('aria-invalid', 'true');
    $('hl-rule-error').textContent = 'Use B…/S… com contagens de 0 a 6.';
    return false;
  }
  if (profile.key !== game.profile.key) {
    applyRuleProfile(world, game, profile);
    syncRuleControls();
    resetGame();
  } else {
    // Canonical equivalents are edits to the text, not a new match.
    if (profile.compile) input.value = profile.physics.notation;
    input.removeAttribute('aria-invalid');
    $('hl-rule-error').textContent = '';
  }
  return true;
}

export function bindRuleControls() {
  const mode = $('br-bot-mode');
  if (new URLSearchParams(location.search).get('bots') === 'learn') game.botMode = 'learn';
  mode.value = game.botMode;
  const rate = $('br-brain-rate');
  rate.value = String(game.brainRate);
  rate.onchange = () => { game.brainRate = Number(rate.value); };
  mode.onchange = () => {
    game.botMode = mode.value;
    bindBotSelectors();
    resetGame();
  };
  const rule = $('hl-rulechoice');
  for (const [id, profile] of Object.entries(ruleProfiles)) rule.add(new Option(profile.label, id));
  rule.onchange = () => chooseRule(rule.value);
  $('hl-rule').onchange = event => chooseRule(rule.value, event.target.value);
  $('br-economy-policy').onchange = event => {
    const policy = event.target.value;
    const profilePolicy = game.profile.economy;
    applyRuleProfile(world, game, game.profile, {
      ...game.economy,
      policy: policy === 'profile' ? profilePolicy.policy ?? 'stability' : policy,
      generationQuote: policy === 'profile' ? profilePolicy.generationQuote : undefined,
    });
    syncRuleControls();
    resetGame();
  };
  syncRuleControls();
}
