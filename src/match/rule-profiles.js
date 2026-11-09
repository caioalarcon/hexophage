import { BAYS, CALLAHAN, compileTotalistic } from '../simulation/rules.js';
import { DEFAULT_CONFLICT, withConflict } from '../simulation/conflict.js';
import { catalogRules } from '../simulation/catalog-rules.js';
import { ACTIVITY_ECONOMY, STABILITY_ECONOMY, initialEnergy } from './constructive-economy.js';
import { baysGameplay, callahanGameplay, genericGameplay, getBotPlans, surveyGameplay } from './gameplay.js';

export const DEFAULT_RULE = 'callahan';

// The selector and the headless entry read the same definitions. A new rule can
// use experimental seeds and exploratory bots until it has a catalog of its own.
export const ruleProfiles = {
  callahan: {
    label: 'Callahan · B2o/S2m34', physics: CALLAHAN,
    gameplay: callahanGameplay, economy: STABILITY_ECONOMY,
  },
  bays: {
    label: 'Bays · B2/S35', physics: BAYS,
    gameplay: baysGameplay, economy: ACTIVITY_ECONOMY,
  },
  ...Object.fromEntries(Object.entries({
    'hex-b2s34': 'Hexagonal Life', 'hex-b2s245': 'Hex B2/S245', bays245: 'Bays 245', andreen: 'Andreen',
    highhex: 'HighHexLife', ashley15: 'Ashley 2015', ashley: 'Hex Life · Ashley 2016',
  }).map(([id, name]) => [id, {
    label: name + ' · ' + catalogRules[id].notation, physics: catalogRules[id],
    gameplay: surveyGameplay(id), economy: STABILITY_ECONOMY,
  }])),
  custom: {
    label: 'B/S personalizada', compile: compileTotalistic, defaultNotation: 'B2/S35',
    gameplay: genericGameplay, economy: STABILITY_ECONOMY,
  },
};

export function resolveRuleProfile(id = DEFAULT_RULE, notation) {
  if (!Object.hasOwn(ruleProfiles, id)) throw new RangeError('Regra desconhecida: ' + id);
  const profile = ruleProfiles[id];
  const physics = profile.compile ? profile.compile(notation ?? profile.defaultNotation) : profile.physics;
  if (!physics) throw new RangeError('Regra inválida: ' + notation);
  return {
    gameplay: genericGameplay, economy: STABILITY_ECONOMY, ...profile, id, physics,
    key: profile.compile ? id + '/' + physics.notation : id,
  };
}

export function setConflictPolicy(world, game, id) {
  world.physics = withConflict(game.profile.physics, id);
  game.conflict = id;
}

export function applyRuleProfile(world, game, profile, overrides) {
  world.rule = profile.id;
  game.profile = profile;
  setConflictPolicy(world, game, game.conflict ?? DEFAULT_CONFLICT);
  game.gameplay = profile.gameplay;
  game.economy = { ...STABILITY_ECONOMY, ...profile.economy, ...overrides };
  game.init = initialEnergy(game.economy);
  game.bots = [...getBotPlans(game.gameplay, game.economy).defaults];
}
