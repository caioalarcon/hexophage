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

Choose **Painel de jogo → Partida e bots → Autômato** to start a match on the current sphere. **Economia** selects whether mature cells or natural births earn energy. Changing the economic direction keeps the current rates. Each of the nine shipped automata loads its tested opening tariffs. **Nova com sugestão** starts a fresh match with those values. Under stability, incumbents and the wallet fund natural births. Unaffordable proposals are counted separately. [Economic trials](experiments/economic-starts/README.md). New matches and rebuilt planets keep the active profile. Loadouts and manual drawings are scoped to each rule, including the normalized B/S notation.

**Nascimento em disputa** sets how births shared by opponents are resolved. The default gives the birth to a team with the most parents, with a repeatable, team-independent tie-break on the sphere. The selector applies immediately. The original neutral ties and a veto on mixed-team births are available for experiments. [Conflict study and paired replays](experiments/conflict-survey/README.md).

The browser opens with autonomous learners. `?bots=profile` selects the fixed strategies. **Partida e bots → Surtos** changes outbreak handling live. The default **Crescimento livre** applies the native automaton. Optional containment removes interacting regions at a configurable threshold of simultaneous births (384 initially). B0 rules keep their spontaneous background. [Outbreak trials and comparison](experiments/outbreak/STUDY.md) · [Bot discovery and transfer across matches](experiments/outbreak/learning.md).

The [nine-rule survey](experiments/rule-survey/README.md) covers 409 atlas stamps, learned purchases, operating income and paired collisions. Open `?rule=ashley15&bots=learn&economy=activity&conflict=lineage` to play the combat candidate. Use `?rule=hex-b2s245&bots=learn&economy=stability&conflict=legacy&growth=classic` to inspect the earlier B2/S245 physics. Replay historical learner choices with the commit named in the corresponding study.

Add one entry to [the registry](src/match/rule-profiles.js). For example, a binary radius-one rule can start with just a name and physics:

```js
myRule: {
  label: 'B3/S23',
  physics: compileTotalistic('B3/S23'),
  economy: { policy: 'activity' },
},
```

For a positional rule, use `compileHexRule((alive, mask, degree) => ...)`. The bits follow the local ordered ring of five or six neighbours. A rule that depends on an absolute compass direction also needs an orientation convention across the sphere. The match, atlas, combat and bot previews use the compiled transition tables. To supply known patterns, add `gameplay: explorationGameplay(catalog, openingId)` from [gameplay.js](src/match/gameplay.js). With only physics configured, the editor and bots use geometric seeds. A specialized gameplay profile can supply a different loadout, opening, bot plans and strategy. A custom `economy.generationQuote(births, mature, settings)` returns `{ income, upkeep }` for both the match and the atlas.

The main game uses one automaton per match. The sparse planar atlas measures isolated seeds. For B0 it uses a finite torus so spontaneous births can be represented and accounted for separately from the player's cells.

## Mixed-physics matches

**Partida e bots → Mundo misto** opens a playable match with one shared treasury per player. Each stamp carries its own rule, orientation and conflict policy. Pick a pattern from the 409-card atlas, change its inherited rule independently and save the combination in your hand. The orbital patrol and planetary shock scenarios reproduce paid orders from the experiments. [Play the mixed world](experiments/typed-world/index.html) · [Experiments, precedence and tariffs](experiments/typed-world/README.md).

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

A player with an empty field is eliminated at settlement when its remaining reserve cannot pay for a single cell. The suggested tariffs charge one stamp-cell price per 64 generations after 512 consecutive empty generations. **Reserva sem campo** switches this charge off or on. Acquiring a site restarts the grace period. A surviving cell, an affordable manual restart or a zero stamping tariff keeps the player eligible.

## Learning bots (experimental)

Choose **Partida e bots → Bots → Aprendizes** or open the game with `?bots=learn`. The five learners have individual random seeds and share a per-generation planning budget. Each compares a legal placement with waiting on copies of one neighbourhood of the spherical graph. Purchases still go through the real match's credit and placement checks. The settings panel counts trials, purchases, checked forecasts and inherited observations. **Última previsão conferida** shows the predicted and observed local flow advantage for a paid move. **Ritmo de pesquisa** changes the shared reasoning budget live, from 1× (96 local visits per generation) to 16×, with 8× selected initially. The planner measures isolated seeds, retrieves prior field outcomes and checks marginal operating yield against the current colony before reinvesting.

Each bot learns privately during play. The browser periodically checkpoints the current match and flushes it when the tab is hidden or closed. Later matches on the same browser origin inherit the combined evidence for their physics, stamp catalog and tariffs. New contexts keep a bounded number of recent observations. A headless match accepts `{ botMode: 'learn', brain: { archive, seed } }`. Pass one `createBrainArchive()` to consecutive matches to study transfer, or a new archive for a cold start. Call `invalidateBrain()` after changing tariffs directly in headless mode.

A scout samples sectors across the sphere and active fronts of surviving rivals. The learner compares placements, orientation and observed phases with waiting under a shared visit budget. Post-purchase field observations calibrate later estimates when the same error recurs.

[Paired tactical trials](experiments/tactical-learning/README.md) · [Field feedback](experiments/decision-feedback/README.md) · [Original headless experiments](experiments/learning-bots/README.md)

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
