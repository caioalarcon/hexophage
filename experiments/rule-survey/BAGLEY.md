# David Bagley’s Life2D catalog

The [author's collection](https://sillycycle.com/life.html) publishes five populated rules for the hexagonal six-neighbour lattice. All 169 forms from these rules were considered, including forms marked `gui` (omitted by xlockmore’s random pattern picker). The three other hex rule descriptions in the XML have no registered forms. The named collection includes every hex form name from xlockmore 5.90’s `modes/life.h` plus 15 more. Carter Bays describes the B2/S35 and B245/S3 spaceships in [Complex Systems 15 (2005), pages 245–252](https://doi.org/10.25088/ComplexSystems.15.3.245).

| Six-neighbour rule | XML entries | Existing or repeated | Added stamps |
| --- | ---: | ---: | ---: |
| B2/S34 | 22 | 0 | 22 |
| B2/S35 (Bays) | 24 | 1 | 23 |
| B2o/S2m34 (Callahan) | 79 | 34 | 45 |
| B2o3o4m/S2om4o (Andreen) | 33 | 1 | 32 |
| B245/S3 (Bays) | 11 | 0 | 11 |
| **Total** | **169** | **36** | **133** |

Each entry’s original name maps to a stable game ID in [bagley-index.csv](bagley-index.csv). Closed orbits are deduplicated by translation, the 12 hexagonal symmetries and all phases. Emitting guns are also checked against existing seed shapes over their first nominal emission interval. Reaction setups are retained as playable seeds. For example, a collision of three gliders can build a stalk.

A period is measured by the first return to the seed position or a translated copy. For every closed cycle, the simulation measures total births and deaths, displacement, and the number of continually occupied sites. A ship translating every period has no permanent world-fixed core. Nominal emission windows for puffers and guns come from the source. Their entire configuration does not repeat, so they have no whole-pattern period in the catalog.

Several source names need qualification. Andreen’s *half c* reaches a P4 cycle after one generation, and Callahan’s *TIE fighter* takes one generation to reach P13. Callahan’s *whirlygig* returns to its original orientation at P10, although Bagley labels it P5. B2/S34’s *triangle growth* leaves a P10 oscillator after 36 generations. Bays’ *supernova* leaves a P3 object after 65 generations. Andreen’s *bouncing diagonal ship* returns to its **starting position** after 320 generations. These are all results from Hexophage’s production planar transition tables.

## Reproduction

1. Download [life2d.xml](https://sillycycle.com/java/life2d.xml) from the author, or extract `life2d/life2d.xml` from the [source archive](https://sillycycle.com/java/life2d.zip). The file dated 2024-11-22 has SHA-256 `80e52bcfe81d4915f7b6420d5d7b66a14ab2704cc3dfc601ffa1321f68a565b2`. The importer checks the hash.
2. Run `node experiments/rule-survey/import-bagley.mjs /path/to/life2d.xml` at the repository root. This regenerates the catalog and index. Life2D’s skew coordinates `(x,y)` map to Hexophage axial `(x-y,y)`.
3. Run `node --test experiments/rule-survey/bagley.test.mjs` to replay the registered closed cycles and measured remnants with the game’s real rules.
4. For comparison, the [xlockmore 5.90 release](https://sillycycle.com/xlock/xlockmore-5.90.tar.xz) contains the 154 hex form names in `modes/life.h` (SHA-256 `9daef3a8256529cc92218d1249832e625fb40af4faac7d2a654fef76313b0005`). The importer uses the larger XML collection.

## Upstream notice

Life2D is by David A. Bagley. Its documentation credits discoveries to Carter Bays, Paul Callahan, Bob Andreen and Bagley among others. The per-stamp origin field identifies the collection and does not assert individual authorship of every pattern.

> Copyright 1993 - 2022 David A. Bagley. All rights reserved.
>
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies and that both that copyright notice and this permission notice appear in supporting documentation, and that the name of the author not be used in advertising or publicity pertaining to distribution of the software without specific, written prior permission.
>
> This program is distributed in the hope that it will be “useful”, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
