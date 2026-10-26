# Thousand Sunny review before further graphics work

> **Historical October 2 checkpoint.** Current construction progress, verification limits and photographs are maintained in [construction-review.md](/Users/sukhjot/codes/test/docs/construction-review.md). Front-mouth construction is active and its fresh complete verification is pending. Graphics remain held for Sukhjot’s review.

Prepared for Sukhjot on October 2, 2026. This report preserves the unfinished October 2 build. **Graphics are on hold**, as Sukhjot explicitly requested. No runtime, geometry, material or asset changes were made while preparing this report.

## How much remains

The exterior has substantial construction and access repairs in place. The full anime/manga build is still unfinished: room layout and furnishings need a reference-led pass, several interior journeys fail, vehicle models remain rough, and some exterior construction details are unresolved. A completion percentage would hide those differences.

| Area | Current state | Work still required |
| --- | --- | --- |
| Exterior structure | Repaired hull paint/ports, seven-petal figurehead, mast supports, deployed sails, stairs/rails, gardens, stern shell/barrel/lanterns and small ladder hatches are present. | Finish reference acceptance for sculpt proportions, shared cabin envelopes, rig attachments, glazing/fastener rhythm and hidden hardware. |
| Room build | 26 named room/access volumes and existing furnishings are exported. | Correct Dining/Kitchen sides; review each room against the supplied plans/detail sheets; repair Energy Room/Bath entry, the Aquarium interior ladder approach and lower-compartment access. Storage walking returns now pass. |
| Dock and machinery | Six dock contents and existing mouth/mane, shutter, paddle, steering and Burst previews are present. | Complete vehicle geometry, canonical room controls, anchor deployment and remaining feature behavior. Some current behavior is explicitly simulated. |
| Realistic graphics | Partial filtered material maps and UV preparation were already staged before this review request. | Resolve the remaining UV-scale failure; finish canvas, all materials, lighting and broad movement checks after review. The Golden Hour quality target is not achieved. |

The requested **2.2 scale / 85.8 m length / 123.2 m height** is retained. Actual exported width is 45.726 m. Human eye/body/radius/walking speed remain **1.70 / 1.75 / 0.34 m / 3.4 m/s**. Source `stuff/1.FBX` remains unchanged.

## Historical October 2 verification

Latest coherent asset publication: [asset generation log](/Users/sukhjot/codes/test/docs/review/exterior-metric-uv-corrected-assets.log), **40.89 MB visual / 23.14 MB collision**, 5,645 visual meshes, 34 moving openings including five hatches, and three climb paths. Visual/collision/metadata were published together.

| Check | Result for the current publication |
| --- | --- |
| Production build | **PASS**, 643 modules, 1.93 s. [Log](/Users/sukhjot/codes/test/docs/review/pre-graphics-build.log) |
| Asset assertions | **103/104 PASS; 1 FAIL**. Metre-UV consistency fails on six nearly degenerate exported `Line002` triangles; the garden's 20 horizontal triangles pass. This remains unresolved. Original structural checks remain. [Log](/Users/sukhjot/codes/test/docs/review/pre-graphics-structure.log) |
| Exported walking-plane overlaps | **PASS**, original 1 cm² / 3 mm limits retained. [Log](/Users/sukhjot/codes/test/docs/review/pre-graphics-overlaps.log) |
| All five hatch coamings | **PASS**, one visible owner for actual rim tops/inner walls. Same overlap log. |
| All-room route planning | **PASS**, 26/26 room centres, 6/6 retained tread flights, both replacement ladder connections and both fore approaches. Storage's former isolated grid connection is now connected; real walking remains separate. |
| Actual exterior journeys | **PASS** for all four fore/aft main ascent/return routes, full balcony/Library threshold/gallery/slide/both side passages, both outdoor toilets, both small ladder full descents/reverse climbs/closures/outside returns, Dock stair-hatch descent/return and the full lookout rope/ladder/hatch/floor/return journey. |
| Actual room tour | **FAIL:** Energy Room, Bath and the Aquarium ladder's interior approach. All six retained stair round trips, both fore cabin approaches and the stern ladder's forced full ascent/descent/outside return **PASS**. The same Aquarium ladder passes via the exterior approach; its interior approach stops before the grab point. The harness restarts at spawn after failed tour attempts; a complete whole-ship tour has not passed. |
| Browser gameplay | **62/63 PASS; 1 FAIL:** the open lower-compartment partition doorway remains obstructed. |
| Walking to controls / pointer interaction | **PASS**: actual grounded walking to the integrated controls, operation, return descent and pointer/orbit interaction. Existing Log Pose/Burst behavior includes simulations. |
| Movement / stopped samples | **PASS** for actual WASD/grounding/no-recovery checks and the sampled deck, plant and glass regions: **0.000%** stopped pixel change over five seconds; **57.13 fps** in the recorded 1440×900 Apple M3 Pro / ANGLE Metal sample. The glass camera independently hits the actual `Sunny_Library_lining_glass.013` pane first. This is limited sample evidence, not final graphics acceptance. [Recorded data](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-motion-regions.json) |
| Fresh preview capture | **PASS**, no recorded browser or shader errors in nine views at 1440×900. 544,637 rendered triangles in the recorded sample; ANGLE Metal / Apple M3 Pro. [Context](/Users/sukhjot/codes/test/docs/review/pre-graphics-appearance-context.json) |
| Complete 17-suite runner | **FAIL overall: 14/17 PASS, 3 FAIL**. Failed suites: asset structure, browser gameplay's lower doorway, and the continuous room tour. All 17 suites finished against the unchanged current publication. [Complete log](/Users/sukhjot/codes/test/docs/review/pre-graphics-complete-suite.log) |

The preceding complete runner passed **13/17 suites**. Its real exterior journeys, both reference ladder returns, lookout return, walking to controls and pointer/orbit interaction passed. Its failures were room routes, the lower-compartment gameplay doorway, the continuous room tour, and a glazing-name test mismatch. The glazing mismatch was subsequently corrected and a targeted base-material motion run passed; that earlier result is not used as current material acceptance.

## Exterior items to review

The supplied SBS plans determine arrangement, the supplied anime image anchors the palette, and the deployed sail state follows the overall Oda drawing. The enlarged ship/lawn are requested exceptions. Hidden counts and exact metre offsets reconstructed from perspective drawings remain identified in the [42-item feature ledger](/Users/sukhjot/codes/test/docs/exterior-feature-ledger.md).

1. **Bow:** all seven mane petals, muzzle/eyes/nose, disk/bones, red/white divisions, gold collar, two stowed anchors and hawse ropes. Fine sculpt sweep/proportions remain open; a symmetrical frontal image alone does not establish accuracy.
2. **Rig:** actual fore/main mast stations and support, curved white sails with source-led Roger, red/black gaff panels, yards/platforms/shrouds, striped lookout dome, glazed band, underside and rope/ladder hatch. Hidden collars, knots, pane/dormer counts and gym furnishings remain unresolved.
3. **Decks:** both fore approaches/upper helm flight, both aft/gallery/garden routes, continuous balcony, slide, swing, outdoor toilets and the two small ladder hatch connections. Passing walking establishes access, not canonical placement.
4. **Gardens/fittings:** exactly three potted mikan trees, attached oblate fruit and calyx/stems, two shade trees, Robin flowers/Pop Greens, sloping branch-office table, integrated wheel/drum/lever/instrument and chimney. Precise hidden tool/plant inventories remain unresolved.
5. **Stern/hull:** fourteen small open hull ports, dock rolling slats/digits, dark hull bands, hollow stave Burst barrel, rudder, lanterns, striped roof/dormers/sashes. Shared exterior/interior cabin shape and unidentified cannon details still need review.

## Room-by-room work still required

Presence in metadata or a reachable room centre is not finished room accuracy or proof of a complete walking return.

| Plan tier | Existing rooms/areas requiring review | Known priority |
| --- | --- | --- |
| B1 | Storage, Soldier Dock, Usopp's Factory, Franky's Weapon Development Room, Energy Room | Storage flight/return checks now pass. Lower partition doorway and Energy entry still fail; detailed dock vehicles and machinery remain unfinished. |
| F1 fore | Men's Quarters, washroom, two cannon closets, two outdoor toilets | Bunks/kotatsu/lockers/entry fittings and closet placement against the supplied detail sheet. Outdoor toilet journeys already have evidence. |
| F1 aft | Aquarium Bar and service passage | Curved tank/bar/seating and service construction; Aquarium's interior ladder approach fails while the exterior approach completes both directions. |
| F2 fore | Women's Quarters, washroom and two cannon closets | Bed, wardrobe, vanity, tea fittings and entrance/closet relationships. |
| F2 aft | Dining, Kitchen, Pantry, Sick Bay and stern ladder access | Dining/Kitchen are on reversed plan sides; correct their shared layout and chimney relationship before graphics. |
| F3 stern | Library, Bath and Bath Washroom | Bookcases/bench/mapping desk, bath tier/access and the striped ceiling patch seen beyond the stern hatch. |
| Upper/outside | Observation Deck / branch office and lookout | Distinguish open deck, observation/library interpretation and missing lookout gym furnishings using the supplied drawings. |

## Fresh screenshots and source comparisons

All nine current views and the three comparison plates below were inspected. These are **Inspect appearance images**. Top hides sails/flags/ratlines to expose placement; none of these views substitutes for controller-driven walking.

![Current bow overview](/Users/sukhjot/codes/test/docs/review/pre-graphics-bow-quarter.png)

![Current stern and garden](/Users/sukhjot/codes/test/docs/review/pre-graphics-garden.png)

![Front comparison with supplied detail sheet](/Users/sukhjot/codes/test/docs/review/pre-graphics-comparison-front.png)

![Side comparison with supplied anime reference](/Users/sukhjot/codes/test/docs/review/pre-graphics-comparison-port.png)

![Top comparison with supplied SBS plan](/Users/sukhjot/codes/test/docs/review/pre-graphics-comparison-top.png)

Additional current views: [front](/Users/sukhjot/codes/test/docs/review/pre-graphics-front.png), [port](/Users/sukhjot/codes/test/docs/review/pre-graphics-port.png), [starboard](/Users/sukhjot/codes/test/docs/review/pre-graphics-starboard.png), [stern](/Users/sukhjot/codes/test/docs/review/pre-graphics-stern.png), [stern quarter](/Users/sukhjot/codes/test/docs/review/pre-graphics-stern-quarter.png), [lookout](/Users/sukhjot/codes/test/docs/review/pre-graphics-lookout.png), [top](/Users/sukhjot/codes/test/docs/review/pre-graphics-top.png).

Actual measured placements/tags/support are in the [current all-mesh CSV](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-inventory.csv) and [JSON](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-inventory.json). The reference images in `stuff/images/` remain unchanged.

Current normal-eye ladder evidence: [Aquarium ascent](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-aquarium-ladder-ascent.png), [stern ascent showing the remaining Library ceiling stripes](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-stern-library-ladder-ascent.png), [stern descent and repaired coaming](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-stern-library-ladder-descent.png). These images preserve actual controller poses reached by W/E, with no placement/flight/recovery. Source and publication hashes are recorded in the [artifact manifest](/Users/sukhjot/codes/test/docs/review/pre-graphics-artifact-manifest.json).

Actual walking evidence: [helm controls](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Helm-controls.png), [lookout floor](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Lookout-floor.png), [lookout return descent](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Lookout-return-descent.png). Existing room construction is visible in [Men's Quarters](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Men-s-Quarters.png) and [Kitchen](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Kitchen.png); these captures do not establish finished furnishing accuracy.

The Library ceiling visibly contains overlapping striped surfaces. This remains a construction issue even though the Library walking route passes.

![Unresolved Library ceiling overlaps](/Users/sukhjot/codes/test/docs/review/pre-graphics-walk-Library.png)

Actual failed approach captures: [Energy Room](/Users/sukhjot/codes/test/docs/review/pre-graphics-stall-Energy-Room.png), [Bath](/Users/sukhjot/codes/test/docs/review/pre-graphics-stall-Bath.png), [Aquarium interior ladder approach](/Users/sukhjot/codes/test/docs/review/pre-graphics-stall-Ladder-Aquarium-gallery-ladder.png). The Aquarium capture shows a grab prompt, but the test reports that the required endpoint was not physically reached. The cause remains unverified; it is not dismissed as a test-only failure.

Moving/stopped/five-second images for all three sampled regions were inspected. The close grass view shows a fine repeated interference pattern; a stable stopped image does not establish good movement appearance. Preserved evidence: [deck moving](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-walking-2.png), [deck stopped](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-stopped.png), [deck five seconds](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-stopped-5s.png); [plants moving](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-plants-moving.png), [plants stopped](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-plants-stopped.png), [plants five seconds](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-plants-stopped-5s.png); [actual glass moving](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-glass-moving.png), [glass stopped](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-glass-stopped.png), [glass five seconds](/Users/sukhjot/codes/test/docs/review/pre-graphics-exterior-glass-stopped-5s.png). Broader material, lighting and motion quality remain unfinished and on hold.

## Review boundary

Implementation locations: exterior construction in [sunny_accuracy.py](/Users/sukhjot/codes/test/tools/sunny_accuracy.py) and [sunny_exterior.py](/Users/sukhjot/codes/test/tools/sunny_exterior.py); room/shaft construction in [sunny_interiors.py](/Users/sukhjot/codes/test/tools/sunny_interiors.py); surface/UV preparation in [sunny_surfaces.py](/Users/sukhjot/codes/test/tools/sunny_surfaces.py) and [sunny_uv.py](/Users/sukhjot/codes/test/tools/sunny_uv.py). Current runtime uses [Ship.jsx](/Users/sukhjot/codes/test/src/components/Ship.jsx), [DoorSystem.jsx](/Users/sukhjot/codes/test/src/components/DoorSystem.jsx), [NavigationSystem.jsx](/Users/sukhjot/codes/test/src/components/NavigationSystem.jsx), [PlayerController.jsx](/Users/sukhjot/codes/test/src/components/PlayerController.jsx) and the unfinished [exteriorMaterials.js](/Users/sukhjot/codes/test/src/systems/exteriorMaterials.js).

The main build is not complete and no claim of full anime/manga accuracy is made. Sukhjot's latest priority is exterior construction, then accurate room construction across the ship, then realistic graphics, with extra feature mechanics last. Sukhjot requested this report before further graphics and will review it first. No additional material, lighting or graphics implementation is authorized past this checkpoint until that review arrives.
