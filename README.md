# Hexophage

Six players compete for biomass on a spherical cellular automaton. The player and five bots stamp patterns onto the same hexagonal and pentagonal graph.

[Play on GitHub Pages](https://caioalarcon.github.io/hexophage/) · [Test the private development deployment](https://hexophage-dev.epicpenguin.chatgpt.site) · [Open the current dev branch](https://raw.githack.com/caioalarcon/hexophage/dev/index.html)

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

## Automata and match profiles

Choose **Painel de jogo → Partida e bots → Autômato** to start a match on the current sphere. **Economia** selects whether mature cells or natural births earn energy. Changing the economic direction keeps the current rates. A new automaton loads its own defaults. New matches and rebuilt planets keep the active profile. Loadouts and manual drawings are scoped to each rule, including the normalized B/S notation.

Add one entry to [the registry](src/match/rule-profiles.js). For example, a binary radius-one rule can start with just a name and physics:

```js
myRule: {
  label: 'B3/S23',
  physics: compileTotalistic('B3/S23'),
  economy: { policy: 'activity' },
},
```

For a positional rule, use `compileHexRule((alive, mask, degree) => ...)`. The bits follow the local ordered ring of five or six neighbours. A rule that depends on an absolute compass direction also needs an orientation convention across the sphere. The match, atlas, combat and bot previews use the compiled transition tables. To supply known patterns, add `gameplay: explorationGameplay(catalog, openingId)` from [gameplay.js](src/match/gameplay.js). With only physics configured, the editor and bots use geometric seeds. A specialized gameplay profile can supply a different loadout, opening, bot plans and strategy. A custom `economy.generationQuote(births, mature, settings)` returns `{ income, upkeep }` for both the match and the atlas.

Each match currently has one automaton. The sparse planar atlas measures isolated seeds. For B0 it uses a finite torus so spontaneous births can be represented and accounted for separately from the player's cells.

## An isolated match

```js
import { buildSphere } from './src/world/sphere.js';
import { createHeadlessMatch } from './src/match/headless.js';

const match = createHeadlessMatch(buildSphere(32), { interval: 8 });
for (let i = 0; i < 64; i++) match.nextTick();
console.log(match.world.gen, match.game.players.map(p => match.world.ownerCells[p.id].length));
```

To select another profile, pass `{ rule: 'bays' }` or `{ rule: 'custom', notation: 'B2/S035', economy: { policy: 'activity' } }`. Omitted rates come from the profile.

Each instance owns its players, RNG, population buffers and bot reservations. Supply a `strategies` Map keyed by bot player ID to override individual decisions. The turn scheduler invokes each live bot on its configured turn. The current oscillator strategy and any replacement use the same `commitStamp(owner, ids)` command for placement and biomass accounting.

## Verification

Unit tests live beside the feature they exercise. For example, `node --test src/simulation/rules.test.js` checks the rule tables independently. The retained 600-generation integration test checks the five bots against independently recorded oscillator periods.

```sh
npx playwright install chromium
npm run test:browser
```

The browser differential suite replays the same inputs against the working build and the original production commit `18baed7` in the same Chromium process. It compares simulation state, controls, ranking, canvases and screenshots on desktop and portrait viewports, with Canvas, WebGL, a real Web Worker and the fallback. Keep the original commit available in the checkout. Set `CHROMIUM_PATH` to use an existing Chromium executable.

## Development and promotion

Push changes to `dev`. CI rebuilds the HTML, checks for a stale distribution, runs both test suites, and attaches the tested HTML to the workflow run. The branch preview serves the committed HTML and follows future pushes. The private development deployment is a separately published snapshot for playtesting.

After manual approval, merge the reviewed PR into `main`. GitHub Pages serves the root of `main` at the public game URL.

## Economic experiments

Play with the offline two-hour economy model and compare a glider attack against a control in [the experimental lab](experiments/economy/README.md).
