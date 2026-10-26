# Sunny exterior restoration — October 1, 2026

Target: familiar post-timeskip Thousand Sunny, life-size first-person exploration.

## Sources

- [One Piece Wiki — Thousand Sunny](https://onepiece.fandom.com/wiki/Thousand_Sunny):
  reports 39 m overall length and 56 m overall height, citing Vivre Card. Deck features:
  grass lawn, slide, swing, foremast lookout, helm, Soldier Dock controls, aquarium
  hatch, three inherited mikan trees, Robin's flowers and post-timeskip Pop Greens.
- [Anime exterior image](https://static.wikia.nocookie.net/onepiece/images/b/b1/Thousand_Sunny_Infobox.png):
  timber hull; red sculpted side panels with white borders; black dock rims; red
  channel number; pale yellow lion face, cream muzzle, orange mane; wood spars;
  white foresails with a straw-hat emblem; red/black aft sail; red/yellow roof.
- [Oda's Volume 46 SBS F3 deck drawing, hosted copy](https://i.pinimg.com/originals/60/5a/80/605a804902aa7079e890830e980a2b27.png):
  fore helm, main grass deck between the foremast stairwell and aft superstructure,
  paired side deck connections, two shade trees, swing on port, slide on starboard,
  aft upper garden and factory bench, circular stern library/bathhouse exterior.

## Accuracy boundaries

The two overall dimensions are published figures. Beam, deck heights, fitting sizes,
tree spacing and navigation instrument details are reconstruction choices based on
the supplied FBX and drawings; they are not published measurements. Anime perspective
and scene-to-scene sizes vary, so this is a reference-led reconstruction rather than
a claim of exact shot-for-shot equivalence. Interiors now use the reference contract in `docs/interior-reference.md`. Doors and
hatches animate with dynamic collision. Height restoration lengthens the elevated rigging
without stretching human-scale deck structures or making the player artificially tiny.

## Source geometry defects

The original FBX has a white side scroll (`Tube009`) displaced 10.6 m upwards
from its opposite counterpart, a side panel (`Line007`) displaced 2.3 m downwards,
and a lower side piece (`Box119`) displaced 4.9 m downwards. Reconstructing those
three pieces by mirroring the attached counterparts repairs symmetry before the
scale measurement. The original eye cylinders are replaced with correctly centered
eyes; the smile follows the muzzle surface in Blender coordinates.

## First-person deck proportions

After the user reported that the deck felt too short, the central longitudinal
band was expanded by 1.5×. The authored lawn is now 10.65 m long, up from 7.1 m.
Forward and aft structures move closer to their respective ends while the overall
39 m endpoints remain fixed. Width, deck elevations, camera height, mast diameter
and rigid fittings remain in metres. This is an explicit experiential reconstruction
choice, not a published measurement of the Sunny's lawn.

The user subsequently authorized proportional enlargement for the anime feeling.
`src/config/exteriorConfig.json` therefore applies 1.7× to the restored hull and deck layout:
66.3 m overall length, 95.2 m height, 18.105 m lawn. The 39/56 m values remain
documented reference measurements. This is an intentionally enlarged experience,
not a claim that the enlarged dimensions are canon. Helm controls and exterior doors keep their human dimensions about their mounting
positions. The player stays 1.75 m tall with 1.7 m eyes and 3.4 m/s walking, so the enlargement is tangible aboard.

## Structural shell and rendering pass

The supplied B1/F1/F2/F3 plans were cross-checked against a readable reproduction
[of Oda's Volume 46 blueprint sheet](https://4.bp.blogspot.com/-XDb3Ozpx6YA/U-RHnsS3qxI/AAAAAAAACB8/DJpVz5pOdRY/s1600/artikel-Thousand_Sunny_all.jpg)
and the [second-floor drawing](https://www.thegrandline.com/images/2ndflr.jpg).
The bare shell reserves B1 storage/dock/workshop space, F1 fore quarters and aft
aquarium, F2 fore quarters and dining/kitchen/pantry/sick-bay footprints, plus an F3
circular library floor. Aquarium reserve: about 11.1 m by 21.7 m, beneath the dining
deck. Door passages retain human clearance. These remain bare reconstruction
partitions and floors; no finished or furnished rooms have been built.

The helm elevation is measured on the original foredeck, and its pedestal reaches
the wheel hub. Duplicate corner flights were removed. Source fore/aft treads are
widened; both forward lower flights meet the same cross-landing. The integrated
central stair guards have an opening, edge-following replacement rails and a broad
upper exit landing. Rear garden flights are inset within the hull, with roof slots
for headroom and landings that turn inward. A level F3 deck supports all garden
fittings. Soldier Dock plates attach to measured hull sides, with white faces, red channel
numbers and black rims; old duplicate digits are removed. Source cabin walls and
both masts use full-height sectioned collision; authored partitions stay
solid beneath higher floors. Original treads have exact thin collision boxes.

The ocean is a finite 220 m square with 96 segments per axis, gentle waves, ripple
normals and a hull-shaped fragment cutout measured from the actual hull at crest
height. Floors remain above the crests. The full-window viewport is restored;
DPR 1 and a smaller shadow map reduce rendering work. An 1800 m flat horizon ring
adds eight triangles; near waves and normals fade into it so no square sea edge
appears in the preview. Coplanar floor samples merge
into rectangles that preserve openings and levels, reducing collision workload.
Ship materials retain authored colors with PBR wood grain, surface relief, paint
wear, varying roughness, metallic fittings and translucent glazing.

Flight collision defaults off. The HUD button or B enables swept 3-axis collision
against walls, floors and ceilings, including at boosted speed. Walking always
uses collision. Artificial walking-edge guards are excluded from flight.

Validation includes the full six-suite runner, production build, seven individual
stair flights, four complete spawn-to-helm/garden journeys with return descents,
and the flight toggle against a real partition. A rendered check with the ship
hidden showed sky through the hull cutout and water outside it.

## Current review repair state

The implementing AI changed experienceScale to 2.0. The review retains that setting:
78 m configured length and 112 m height, with generated geometry centered and within
the measured envelope. The older 1.7× values above describe the preceding baseline.
Human eyes stay at 1.7 m; body height 1.75 m; walk speed 3.4 m/s. Fittings are authored
after hull enlargement in ordinary metres.

Generated assets are rebuilt together in a staging directory and published only
after successful export. Full test validation now includes nine suites, a continuous
room tour and forced up/down journeys through each authored interior stair flight.
Final pass/fail results are in docs/review-findings.md.

## Historical exterior-only revision — October 1, 2026

Sukhjot increased the experience slightly again and paused room work. The current
configuration is **2.2×**, with 85.8 m length / 123.2 m height. The 1.7× and 2.0×
sections above are historical. Body/eyes/radius/speed and metre-sized fittings remain
unchanged. The official 39/56 m dimensions remain the reference; enlargement and the
earlier central lawn stretch are disclosed user/reconstruction exceptions.

Generation 10 includes the corrected lateral petal reflection, scaled exterior
approaches and upper fore stair headroom. Coplanar floor/tread faces are trimmed;
authored surfaces now use **base colours without procedural grain/relief**, pending
the later texture phase. Soft 2048 shadows cover the enlarged hull, sail markings use
ship coordinates and ocean ripple/specular filtering reduces undersampling. Earlier
descriptions of active PBR grain and small shadows no longer describe this revision.

All four actual lawn-to-helm/garden journeys, including return descents, pass in the
current gameplay run. This verifies access, not canonical placement. The full runner
now contains 13 suites; final results and limitations are in the newest section of
`docs/review-findings.md`.

The requested complete exterior audit is `docs/exterior-audit-plan.md`; the new-session
repair prompt is `docs/exterior-session-prompt.md`. It uses the local high-resolution
supplied references and separates confirmed differences from unverified features.
Current sails/graphics, fruit/foliage, helm console, stern barrel and several other
details remain approximations. No exterior accuracy or interior completion is claimed.

## Exterior construction/access revision — October 2, 2026

Current 2.2 scale, normal human dimensions and base-colour construction phase are retained. The current 42-row ledger is `docs/exterior-feature-ledger.md`; coherent exports and dated full-suite results are tracked in `docs/to-do.md`/`docs/review-findings.md`. Curved deployed O sails/artwork, supported branched vegetation/three-pot mikan cluster, integrated controls, rolling apertures/paddles, seven-petal/jaw mechanisms, hollow timber Burst barrel, lanterns/roofs/glazing and source-mast transform repairs supersede the first discrepancy baseline.

Actual continuous WASD/E lookout rope/ladder/hatch/floor excursion/return to spawn and both outdoor toilet/three exterior hatch round trips pass. Inspect captures and walking logs remain distinct evidence. The inherited large aquarium/garden stair covers still differ from N/F2's small gallery/stern ladder hatches. Anchor deployment/hidden routing, traditional cannon classification and several hidden counts remain unresolved. No texture or room completion is claimed; room work is conditional on finishing the exterior/material sequence Sukhjot authorized.
