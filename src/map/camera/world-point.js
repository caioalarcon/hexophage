import { world } from '../../browser/world-state.js';
import { eastAt, pointOnSphere } from '../../world/geometry.js';

function point(v) {
  return pointOnSphere(world.graph, v);
}
function chooseEast(v) {
  return eastAt(world.graph, v);
}

export { chooseEast, point };
