import { currentPatternId, refreshTabs } from './selection.js';
import { savedPatterns } from './saved-patterns.js';
import { stampFromPoints, stampOffsets } from './stamp-grid.js';

import { transformOffsets } from './axial-transform.js';

function transformStamp(type) {
  const transformed = transformOffsets(stampOffsets(), type);
  stampFromPoints(transformed);
  savedPatterns.set(
    currentPatternId,
    stampOffsets().map(([q, r]) => [q, r]),
  );
  refreshTabs();
}

export { transformStamp };
