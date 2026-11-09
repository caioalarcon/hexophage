import { createBrainArchive } from '../bots/brain/memory.js';

// Delay serialization until there are observations, and batch the five agents'
// samples into a single storage write. pagehide also covers reload and navigation.
export function browserBrainArchive() {
  let storage;
  try { storage = window.localStorage; } catch { /* Private/offline browser policy. */ }
  let session, timer;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    session?.checkpoint();
  };
  const archive = createBrainArchive(storage, () => {
    timer ??= setTimeout(flush, 15000);
  });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  return { open(namespace) {
    session?.finish();
    session = archive.open(namespace);
    return session;
  } };
}
