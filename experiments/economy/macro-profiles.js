import { generateProfiles } from './profiles.js';

// Profile rates are means over the first window. Shift to the first turn
// before integration so an affine stream reproduces complete-window totals.
export function macroProfiles(catalog) {
  return new Map(catalog.filter(p => p.usable).map(p => {
    const offset = (p.window - 1) / 2;
    return [p.id, { ...p, net: p.net-offset*p.netSlope, core: p.core-offset*p.coreSlope,
      meanLive: p.live-offset*p.liveSlope }];
  }));
}

export async function loadMacroProfiles() {
  return macroProfiles(await generateProfiles());
}
