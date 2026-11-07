# Hexophage

**Hexophage** is an experimental competitive cellular-automaton game. Players deploy reusable patterns on a huge spherical graph, compete for biomass, and try to be the last survivor.

## Play

Public demo: https://caioalarcon.github.io/hexophage/

After GitHub Pages is enabled, open **https://caioalarcon.github.io/hexophage/**. You can also download `index.html` and open it locally in a modern browser.

## Prototype features

- Six participants: one human player and five bots.
- Spherical hexagonal/pentagonal world with a 3D globe view.
- Paul Callahan's hexagonal **B2o/S2m34H** automaton.
- Gliders, glider guns, oscillators, editable stamps and player-owned cells.
- Biomass transfer, rankings, adjustable bots and simulation speed.
- Works entirely in the browser. This is **not yet online multiplayer**.

## Running locally

Open `index.html`. There are no dependencies, bundlers or build steps.

## Publishing to GitHub Pages

Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then save.


## Bot regression test

Run `node tests/bot-isolation.cjs` to check the five bot oscillators against independently recorded population cycles for 600 generations on the spherical map. The test requires only Node.js.

## Status

Research prototype / playable demo. Very large sphere sizes demand substantial RAM. Gameplay rules and UI are experimental. Future work includes a separate simulation backend, player-designed pattern libraries, alliances, and online multiplayer.
