# Hexophage

Six players compete for biomass on a spherical cellular automaton. The player and five bots stamp patterns onto the same hexagonal and pentagonal graph.

[Play on GitHub Pages](https://caioalarcon.github.io/hexophage/) · [Play the development build](https://hexophage-dev.epicpenguin.chatgpt.site)

## Playing and developing

Open `index.html` in a browser, including offline. This is a generated, self-contained distribution of the game. Edit the feature files under `src/` and regenerate it with Node 22 or newer.

```sh
npm ci
npm run build
npm test
```

The build collects the HTML fragments listed in `src/shell.html`, preserves stylesheet cascade order, and bundles the browser entry and sphere-building worker. Commit the generated `index.html` with the source change so GitHub Pages, local files and the development preview run the same build.

## Where to make a change

| Change | Start here |
| --- | --- |
| Cell birth, survival, owner inheritance and sparse/dense iteration | [simulation](src/simulation/) |
| Biomass, debt, elimination, stamping and generation order | [match](src/match/), especially [engine.js](src/match/engine.js) |
| A bot's decisions, turn order, spiral search or oscillator protection | [bots](src/bots/) |
| Patterns, editor coordinates, transforms and placement preview | [patterns](src/patterns/) |
| Cards, prices and selection of the active deck | [deck](src/deck/) |
| Sphere topology, world-size selection and background construction | [world](src/world/) |
| Local map, regional atlas, pointer input and camera | [map](src/map/) |
| Globe navigator, WebGL, Canvas fallback and wireframe detail | [globe](src/globe/) |
| HUD, layout and responsive controls | [match/hud](src/match/hud/), [match/controls](src/match/controls/) and [layout](src/layout/) |

[The browser entry](src/start.js) wires the features together. [The browser callbacks](src/browser/game-effects.js) subscribe to engine events to refresh the HUD and invalidate the renderers. Both the browser and Node use [the same turn implementation](src/match/engine.js).

## An isolated match

```js
import { buildSphere } from './src/world/sphere.js';
import { createHeadlessMatch } from './src/match/headless.js';

const match = createHeadlessMatch(buildSphere(32), { interval: 8 });
for (let i = 0; i < 64; i++) match.nextTick();
console.log(match.world.gen, match.game.players.map(p => match.world.ownerCells[p.id].length));
```

Each instance owns its players, RNG, population buffers and bot reservations. Supply a `strategies` Map keyed by bot player ID to override individual decisions. The turn scheduler invokes each live bot on its configured turn. The current oscillator strategy and any replacement use the same `commitStamp(owner, ids)` command for placement and biomass accounting.

## Verification

Unit tests live beside the feature they exercise. For example, `node --test src/simulation/rules.test.js` checks the rule tables independently. The retained 600-generation integration test checks the five bots against independently recorded oscillator periods.

```sh
npx playwright install chromium
npm run test:browser
```

The browser differential suite replays the same inputs against the working build and the original production commit `18baed7` in the same Chromium process. It compares simulation state, controls, ranking, canvases and screenshots on desktop and portrait viewports, with Canvas, WebGL, a real Web Worker and the fallback. Keep the original commit available in the checkout. Set `CHROMIUM_PATH` to use an existing Chromium executable.

## Development and promotion

Work on `dev` and publish its tested standalone HTML to the development preview. Review that build before merging `dev` into `main`. GitHub Pages serves the root of `main` at the public game URL.
