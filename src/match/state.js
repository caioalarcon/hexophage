import { applyRuleProfile, resolveRuleProfile } from './rule-profiles.js';

export function createMatchState(world, { rule, notation, economy, botMode = 'profile' } = {}) {
  const game = {
    colors: [
      '#000000',
      '#52e0b4',
      '#ff7e79',
      '#63baff',
      '#f6c75f',
      '#b691ff',
      '#f783d5',
      '#8f9aa9',
    ],
    glColors: [
      null,
      new Float32Array([0.32, 0.88, 0.7, 1]),
      new Float32Array([1, 0.49, 0.47, 1]),
      new Float32Array([0.39, 0.73, 1, 1]),
      new Float32Array([0.96, 0.78, 0.37, 1]),
      new Float32Array([0.71, 0.56, 1, 1]),
      new Float32Array([0.96, 0.51, 0.83, 1]),
      new Float32Array([0.56, 0.6, 0.67, 1]),
    ],
    symbols: ['', '🦖', '🦊', '🐙', '🦂', '👾', '🤖', '⚪'],
    names: ['', 'Você', 'Raposa', 'Polvo', 'Escorpião', 'Alien', 'Robô'],
    players: [],
    botMode,
    brainRate: 8,
    tax: 0,
    interval: 10,
    average: 0,
    winner: 0,
    ended: false,
    humanHistory: null,
    lastStats: 0,
    initializing: false,
    botPlans: [],
    nextSpawn: [],
    rngState: 0x6d2b79f5,
  };
  applyRuleProfile(world, game, resolveRuleProfile(rule, notation), economy);
  return game;
}
