# Historical front construction review

This preserves the completed rounded-front publication and its 15/17 full result before the hollow mikan-container repair. Its assets, photographs and failures are historical; the current report is [construction-review.md](/Users/sukhjot/codes/test/docs/construction-review.md).

# Thousand Sunny construction review — October 2, 2026

Prepared for Sukhjot. **Graphics remain held for your review. Exterior construction and the main ship build are unfinished.** Existing partial maps predate this repair; no textures, lighting or player/runtime changes were made. The [pre-graphics report](/Users/sukhjot/codes/test/docs/pre-graphics-review.md) and [shared-slab/garden-return report](/Users/sukhjot/codes/test/docs/construction-shared-slab-review.md) remain historical snapshots.


## Front construction repaired

- Replaced rectangular F1/F2 forward floors, wall linings and ceilings with rounded contours traced from the retained source hull. Both ceilings have opaque 18 cm undersides. Removed duplicate flat lining/entry-floor faces while keeping actual door positions, dimensions, levels and stairs.
- Replaced the rectangular helm-support floor with the curved footprint traced from Line006's rim footing, with a matching supported 18 cm underside.
- Moved the normal-sized chest inward and trimmed only four cannon-closet partition ends to meet the curved lining. Those checked objects stay within the hull; room layouts and gun placements remain unaccepted.
- Retained the source curved timber helm enclosure at **1.05 m** height with supported posts and an open approach; removed the duplicate imported Log Pose pole. Wheel, integrated controls, instrument and bench remain. Both actual helm journeys reach the control approach and return down both fore flights.

The SBS F1/F2/F3 and H detail sheets establish rounded fore ends, approach relationships and the helm enclosure. Actual source geometry supplies reconstructed metre contours. These are **reconstructions, not official measured blueprint dimensions**; exact facade proportions, opening rhythm, sculpt and concealed fittings remain under review. The source hull ends before the upper rear transfer, whose short continuation is explicitly reconstructed.

## Current coherent publication and checks

All three assets were rebuilt and published together: **33,695,584 bytes visual / 24,379,788 bytes collision / 277,118 bytes metadata**. There are **5,628 exported visual meshes**, 34 moving openings, five hatches and three climb paths. [Exact bytes and SHA-256 manifest](/Users/sukhjot/codes/test/docs/review/construction-fore-final-artifact-manifest.json).

The approved **2.2 scale / 85.8 m length / 123.2 m height** and measured **45.726 m width** remain. Eyes/body/radius/walking speed remain **1.70 m / 1.75 m / 0.34 m / 3.4 m/s**. Original FBX remains 23,765,440 bytes with its recorded unchanged checksum.

| Check on this front publication | Result |
| --- | --- |
| Asset structure | **104/104 PASS**, including original UV/scale/source assertions. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fore-final-structure.log) |
| Independent exported geometry | **Seven groups PASS**: walking overlaps, five coamings, shared Library/Bath slab, rounded fore shells/ceilings, curved helm slab/rim containment, chest/partition containment and published outlines, human-height guard/no duplicate pole. Original 1 cm² / 3 mm overlap and 3 cm hull-containment clearances retained. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fore-final-geometry.log) |
| Production build | **PASS**, 643 modules, 2.02 s. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fore-final-build.log) |
| Targeted actual front journeys | **Both complete 17-checkpoint journeys PASS**: spawn → respective lower fore flight → shared upper flight → helm → both reverse descents → spawn. Actual WASD/E, grounded support, no recovery, placement, flight or jumps. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fore-final-walk.log), [traces/photograph poses](/Users/sukhjot/codes/test/docs/review/construction-fore-final-journeys.json) |
| Required complete npm test | **15/17 PASS, 2 FAIL**, terminal session 9639 exit 1. Gameplay fails the lower doorway (62/63); room tour fails Energy Room/Bath entry and Aquarium interior endpoint approach. All 17 suites retained; no full pass is claimed. [Current full log](/Users/sukhjot/codes/test/docs/review/exterior-fore-final-complete-suite.log) |
| Current appearance | All nine exterior views, three comparison plates, six normal-eye walking photographs and two close Inspect captures **inspected**. No capture browser/shader errors. [Context](/Users/sukhjot/codes/test/docs/review/construction-fore-final-appearance-context.json) |

Source, tests, runtime and published assets stayed frozen throughout the completed full runner. Earlier **15/17 PASS / 2 FAIL** results belong to the preceding shared-slab/garden-return publication: lower-compartment gameplay doorway and Energy Room/Bath entry. The current run retains those failures and repeats the Aquarium endpoint sensitivity. Connected room centres do not establish a continuous successful tour; all room tests and return coverage remain enabled.

The historical Aquarium interior approach stopped 0.20666 m from its endpoint against the unchanged strict 0.20 m check. It passed the preceding rerun, but its sensitivity remains disclosed rather than called repaired. The room harness restarts after failed attempts; whole-ship continuity remains unproven.

The nine-view capture records 450,352 rendered triangles / 5,135 draw calls at 1440×900 on Apple M3 Pro/ANGLE Metal. This is a capture context, not a general performance guarantee. All current exterior walking/access/lookout/control/pointer/motion/visual suites pass. Controls are operated after real walking to their exported approaches. All six retained stair round trips, both fore approaches and the forced stern ladder full return pass. Aquarium's outside route passes its full ascent/descent/closures/outside return; its interior approach stops 0.21842 m from the endpoint against the unchanged strict 0.20 m check. A normal-input endpoint alignment in the driver remains required, not a runtime or room-layout repair. Current motion samples are 0.000% stopped deck/plant/glass change over five seconds, with 60.32 fps sampled; all nine stable movement/stop copies are inspected. Fine repeated close grass patterns remain visible, so final graphics are unaccepted. [Current motion measurements](/Users/sukhjot/codes/test/docs/review/construction-fore-final-exterior-motion-regions.json).

## Construction still left

- **Front reference fidelity:** finish figurehead face/muzzle/eyes/nose/bones and mane contour; review curved facade tiers, exact window/door heads and opening rhythm. Repaired outlines/support do not make the whole front accurate.
- **Mikan pots:** current closed red caps hide the lower soil. Build open clay shells/inner walls with visible supported soil, retaining all three trees/pots and their placement. This is geometry before textures.
- **Deck and fittings:** review remaining deck/rail joins, supports, rig endpoints, glazing and small hardware against the supplied sheets. Hidden counts/mountings remain unresolved where sources do not show them.
- **Guns and machinery:** 14 shallow side-port fittings do not prove 14 finished cannons or barrel-to-opening connections. Fore gun placement/orientation and detailed dock vehicles/canonical machinery remain unfinished. Extra firing/driving mechanics follow the main build.
- **Rooms after the outside:** correct Dining/Kitchen sides, rebuild room layouts/furnishings from the sheets and repair Energy/Bath/lower-doorway access. A fully continuous whole-ship tour remains unproven.

The [feature ledger](/Users/sukhjot/codes/test/docs/exterior-feature-ledger.md) preserves measured findings and unresolved choices. No full exterior or anime/manga accuracy acceptance is claimed. Further graphics wait for Sukhjot's review; the Golden Hour rendering target remains unfinished.

## Current photographs and their limits

Close Inspect plan view exposes the rebuilt curved front deck. Mast/canvas/rigging/tall foreground meshes are hidden for this diagnostic view; it is appearance evidence, not walking proof:

![Current curved front construction](/Users/sukhjot/codes/test/docs/review/construction-fore-final-top-detail.png)

[Isolated helm fittings](/Users/sukhjot/codes/test/docs/review/construction-fore-final-helm-detail.png) identify the actual guard/wheel/Log Pose/bench at their world transforms with surrounding meshes hidden. Its empty background does not establish deck-edge rail coverage.

Normal-eye [port entrance](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-port-upper-entrance.png), [port descent](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-port-lower-descent.png), [starboard entrance](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-starboard-upper-entrance.png) and [starboard descent](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-starboard-lower-descent.png) show actual reached stair poses. Fine repeated surface patterns remain visible in the existing maps. Both [port helm](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-port-helm.png) and [starboard helm](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-starboard-helm.png) frames show a close wheel/control prompt; their framing does not establish the complete station appearance. Input traces separately prove both descents/returns.

Matched comparisons: [front](/Users/sukhjot/codes/test/docs/review/construction-fore-final-comparison-front.png), [port](/Users/sukhjot/codes/test/docs/review/construction-fore-final-comparison-port.png), [top](/Users/sukhjot/codes/test/docs/review/construction-fore-final-comparison-top.png). The overall top retains an obstructing lookout/yard; use the disclosed close plan view for the front footprint. The drawings establish relationships/outlines rather than metric orthographic surveys.

All current views: [front](/Users/sukhjot/codes/test/docs/review/construction-fore-final-front.png), [port](/Users/sukhjot/codes/test/docs/review/construction-fore-final-port.png), [starboard](/Users/sukhjot/codes/test/docs/review/construction-fore-final-starboard.png), [top](/Users/sukhjot/codes/test/docs/review/construction-fore-final-top.png), [stern](/Users/sukhjot/codes/test/docs/review/construction-fore-final-stern.png), [bow quarter](/Users/sukhjot/codes/test/docs/review/construction-fore-final-bow-quarter.png), [stern quarter](/Users/sukhjot/codes/test/docs/review/construction-fore-final-stern-quarter.png), [lookout](/Users/sukhjot/codes/test/docs/review/construction-fore-final-lookout.png), [garden](/Users/sukhjot/codes/test/docs/review/construction-fore-final-garden.png).

Sources: [forward enclosure](/Users/sukhjot/codes/test/tools/sunny_interiors.py), [helm deck/guard](/Users/sukhjot/codes/test/tools/sunny_exterior.py), [soffits](/Users/sukhjot/codes/test/tools/sunny_surfaces.py), [publication](/Users/sukhjot/codes/test/tools/build_assets.py), [export checks](/Users/sukhjot/codes/test/tests/exterior.test.mjs), [walking diagnostic](/Users/sukhjot/codes/test/tools/fore_walk_review.mjs). Preview: [running ship](http://localhost:5173/).

Current full-run evidence, copied exactly before any later repair: [helm controls](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-Helm-controls.png), [navigation instruments](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-Navigation-instruments.png), [controls lawn return](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-Controls-return-lawn.png), [mane/mouth pose](/Users/sukhjot/codes/test/docs/review/construction-fore-final-walk-Helm-mane-mouth.png). Actual current failed approaches: [Energy Room](/Users/sukhjot/codes/test/docs/review/construction-fore-final-stall-Energy-Room.png), [Bath](/Users/sukhjot/codes/test/docs/review/construction-fore-final-stall-Bath.png), [Aquarium endpoint](/Users/sukhjot/codes/test/docs/review/construction-fore-final-stall-Ladder-Aquarium-gallery-ladder.png). All current full-run photographs are inspected. The helm-wheel and lawn-return frames are useful; the instrument and mane/mouth frames aim mostly at the floor and do not establish those parts' appearance. The actual operation/return log remains separate proof. Bath's failure photo faces a nearby wall; Energy and Aquarium photos show their actual stopped approaches.
