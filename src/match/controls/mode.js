import {ruleProfiles} from '../rule-profiles.js';

export const MIXED_MODE='mixed';
export function populateModeSelector(select){
  select.add(new Option('Mundo misto · experimental',MIXED_MODE));
  for(const [id,profile] of Object.entries(ruleProfiles))select.add(new Option(profile.label,id));
}
export function navigateToMode(id){
  const url=new URL(location.href);
  url.searchParams.set('rule',id);
  location.assign(url.href);
}
