# Hexagonal forum patterns

The [Hexagonal Life thread](https://conwaylife.com/forums/viewtopic.php?p=28430) supplies Dean Hickerson's 1987 investigations (posted in 2016), Martin Büttner’s 2016 hexagon and drc’s tables of oscillators. The shape in Büttner's 23×23 RLE has an interior P15 but the whole structure returns after 30 steps. In Hickerson's 37×37 P9 construction, 321 of the 333 seed cells stay continuously alive. Buying it costs 3,330,000 at a stamp price of 10,000 per cell. With the 82-cell starting reserve, it requires earning or adjusting reserves before placement. Four compact drc seeds expand the B2/S34 catalog after comparing phase orbits, rotations and reflections with the registered stamps. The other entries on the sheets that were already present, including all three HighHexLife P33/P16 seeds, add zero to our count.

Hickerson’s wall uses the original 43×23 RLE. After its first generation the whole wall oscillates at P5. Removing the central cell at RLE column 21 and row 11 (both zero-based) reproduces his self-repair experiment. At generation 14 all cells in the intact control are again occupied in the damaged run. At generation 44 the debris has vanished, yielding equality of the complete configurations.

The [Outer-totalistic hexagonal rules thread](https://conwaylife.com/forums/viewtopic.php?start=50&t=3670) supplies two complete B25/S34H diagonal puffer seeds (source rectangles 53×30 and 54×66). Their original full arrangements are registered. [JMM’s post](https://conwaylife.com/forums/viewtopic.php?p=156037) supplies a single 128×100 plate of orthogonal puffers and accompanying debris. Three cropped, independently replayed moving fronts are registered. Coordinates in the table are inclusive, zero-based RLE columns and rows. These rectangles identify the exact initial seed in that plate.

| ID suffix | Crop columns | Crop rows | Cells at gen 0 | 96 | 192 | 384 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| jmm-1 | 94–108 | 16–33 | 46 | 70 | 113 | 119 |
| jmm-2 | 54–71 | 18–34 | 52 | 70 | 88 | 124 |
| jmm-3 | 29–47 | 38–56 | 48 | 102 | 150 | 246 |
| diagonal-duplo | Full seed | Full seed | 268 | 312 | 344 | 408 |
| diagonal-de-pares | Full seed | Full seed | 482 | 491 | 501 | 523 |

At 384 generations, isolated objects in the wake of JMM-2 return after two steps and those in JMM-3 after three steps. The JMM-1 wake is irregular. A fourth candidate in the lower left of the original plate converged to a previously observed moving front and is excluded. Growth here describes the observed free-space evolution. The sphere, stamp prices, birth costs and enemy interference affect what happens in a match.

Run `node --test experiments/rule-survey/forum.test.mjs` to verify the oscillator flux, the wall experiment and the population measurements for each new puffer.
