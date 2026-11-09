import { DEFAULT_RULE } from '../../match/rule-profiles.js';

// Store drawn and transformed stamps per rule, including the custom notation.
const scopes = new Map();
export let savedPatterns = new Map();
scopes.set(DEFAULT_RULE, savedPatterns);

export function useSavedPatterns(key) {
  if (!scopes.has(key)) scopes.set(key, new Map());
  savedPatterns = scopes.get(key);
}
