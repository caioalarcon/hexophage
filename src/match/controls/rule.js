import { ACTIVITY_ECONOMY, STABILITY_ECONOMY } from '../constructive-economy.js';
import { bindBotSelectors } from '../../bots/configuration-panel.js';
import { game, invalidateBrain } from '../../browser/game.js';
import { conflictPolicies } from '../../simulation/conflict.js';
import { growthPolicies } from '../../simulation/growth.js';
import { world } from '../../browser/world-state.js';
import { $ } from '../../layout/elements.js';
import { syncGameplayControls } from '../../patterns/editor/gameplay-controls.js';
import { applyRuleProfile, resolveRuleProfile, ruleProfiles, setConflictPolicy, setGrowthPolicy } from '../rule-profiles.js';
import { resetGame } from './new-match.js';

const savedNotations = new Map();


function syncGrowthControls() {
  const select = $('br-growth'), spontaneous = world.physics.birthsFromVacuum;
  select.disabled = spontaneous;
  select.value = spontaneous ? 'classic' : game.growth;
  select.title = spontaneous ? 'Regras B0 geram células no vazio' : 'Aplicar na próxima geração';
  $('br-growth-threshold').value = String(game.growthThreshold);
  $('br-growth-limit').hidden = select.value === 'classic';
}

function syncRuleControls() {
  const profile = game.profile;
  $('hl-rulechoice').value = profile.id;
  $('br-conflict').value = game.conflict;
  syncGrowthControls();
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
  $('br-empty-field').value = game.economy.emptyFieldUpkeep ? 'charge' : 'free';
  $('br-funding-row').hidden = game.economy.policy !== 'stability' || !!game.economy.generationQuote;
  $('br-birth-funding').value = game.economy.fundBirths ? 'funded' : 'erosion';
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
  const params = new URLSearchParams(location.search);
  const requestedBots = params.get('bots');
  if (requestedBots === 'learn' || requestedBots === 'profile') game.botMode = requestedBots;
  const initialPolicy = params.get('economy');
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
      fundBirths: policy === 'profile' ? profilePolicy.fundBirths : policy === 'stability',
    });
    syncRuleControls();
    resetGame();
  };
  const conflict = $('br-conflict');
  for (const [id, label] of Object.entries(conflictPolicies)) conflict.add(new Option(label, id));
  conflict.onchange = () => {
    if (game.conflict === conflict.value) return;
    setConflictPolicy(world, game, conflict.value);
    invalidateBrain();
  };
  const growth = $('br-growth'), threshold = $('br-growth-threshold');
  for (const [id, label] of Object.entries(growthPolicies)) growth.add(new Option(label, id));
  growth.onchange = () => {
    setGrowthPolicy(world, game, growth.value);
    invalidateBrain();
    syncGrowthControls();
  };
  threshold.onchange = () => {
    const value = threshold.valueAsNumber;
    if (Number.isSafeInteger(value) && value > 0 && value !== game.growthThreshold) {
      setGrowthPolicy(world, game, game.growth, value);
      invalidateBrain();
    }
    syncGrowthControls();
  };
  const requestedGrowth = params.get('growth');
  const requestedThreshold = Number(params.get('growthThreshold'));
  if (Object.hasOwn(growthPolicies, requestedGrowth))
    setGrowthPolicy(world, game, requestedGrowth,
      Number.isSafeInteger(requestedThreshold) && requestedThreshold > 0 ? requestedThreshold : game.growthThreshold);
  const requestedConflict = params.get('conflict');
  if (Object.hasOwn(conflictPolicies, requestedConflict))
    setConflictPolicy(world, game, requestedConflict);
  $('br-use-suggested').onclick = () => {
    applyRuleProfile(world, game, game.profile);
    syncRuleControls();
    resetGame();
  };
  $('br-empty-field').onchange = event => {
    game.economy.emptyFieldUpkeep = event.target.value === 'charge';
    for (const p of game.players) p.emptyGenerations = 0;
    invalidateBrain();
  };
  $('br-birth-funding').onchange = event => {
    game.economy.fundBirths = event.target.value === 'funded';
    invalidateBrain();
  };
  const requested = params.get('rule');
  const initial = requested && Object.hasOwn(ruleProfiles, requested) ? resolveRuleProfile(requested) : game.profile;
  if (params.get('preset') === 'original')
    applyRuleProfile(world, game, initial, (initialPolicy ?? (initial.id==='bays'?'activity':'stability')) === 'activity' ? ACTIVITY_ECONOMY : STABILITY_ECONOMY);
  else if (['stability','activity'].includes(initialPolicy)) applyRuleProfile(world, game, initial, {policy:initialPolicy, fundBirths:initialPolicy==='stability'});
  else if (initial.id !== game.profile.id) applyRuleProfile(world, game, initial);
  syncRuleControls();
}
