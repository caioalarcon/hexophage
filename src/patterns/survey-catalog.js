import { bagleyCatalog } from './bagley-catalog.js';
import { shipCatalog } from './ship-catalog.js';
import { forumCatalog } from './forum-catalog.js';
import { precursorCatalog } from './precursor-catalog.js';

export const referenceCatalog = {};
for (const source of [bagleyCatalog, shipCatalog, forumCatalog, precursorCatalog]) {
  for (const [id, entries] of Object.entries(source)) {
    (referenceCatalog[id] ??= []).push(...entries);
  }
}
