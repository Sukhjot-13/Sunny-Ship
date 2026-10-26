> Historical shared-slab/garden-return checkpoint; the latest front publication is in [construction-review.md](/Users/sukhjot/codes/test/docs/construction-review.md). These older results are not current front-publication proof.

# Thousand Sunny construction review — October 2, 2026

Prepared for Sukhjot. **Graphics are held for your review. Exterior construction and the full main build are unfinished.** Existing partial material maps predate this checkpoint; this repair adds no textures or lighting. The [delivered pre-graphics report](/Users/sukhjot/codes/test/docs/pre-graphics-review.md) remains a preserved earlier snapshot.

> **New construction publication:** rounded forward floors/walls/ceilings are now rebuilt at 33.66 MB visual / 24.34 MB collision. Export inspection and actual walks are in progress. Results and pictures below describe the last completed shared-slab checkpoint until the new verification finishes. Graphics remain held.

## Current repair

The Library ceiling and Bath floor now form an opaque 18 cm shared slab, with one owner per exposed plane and the real stair aperture retained. The previous ceiling stripes are gone in the inspected normal-eye Library view. Microscopic source/cut fragments are cleaned without relaxing the existing metre-UV assertion; all **104 asset checks pass**.

Assets were rebuilt and published together: **33.54 MB visual / 22.91 MB collision**, 5,645 visual meshes, 34 moving openings/five hatches/three climb paths. The approved **2.2 scale / 85.8 m length / 123.2 m height** and actual 45.726 m width remain. Human eyes/body/radius/walk speed remain **1.70 m / 1.75 m / 0.34 m / 3.4 m/s**. Original FBX bytes/checksum are unchanged. [Publication manifest](/Users/sukhjot/codes/test/docs/review/construction-slab-artifact-manifest.json).

## Verification on this publication

| Check | Current result |
| --- | --- |
| Asset structure | **104/104 PASS**, including the unchanged metre-UV check. [Log](/Users/sukhjot/codes/test/docs/review/exterior-shared-slab-structure.log) |
| Exported geometry | **PASS**: original walking overlaps, all five coamings and new shared-slab depth/ownership checks. Original tolerances retained. [Log](/Users/sukhjot/codes/test/docs/review/exterior-shared-slab-coplanar.log) |
| Production build | **PASS**, 643 modules, 1.85 s. [Log](/Users/sukhjot/codes/test/docs/review/exterior-shared-slab-build.log) |
| Completed full runner before the route correction | **14/17 PASS, 3 FAIL**, terminal exit 1. Failed suites: gameplay (lower-compartment doorway, 62/63), expanded exterior (Library-to-garden clear-passage return), and room tour (Energy/Bath/Aquarium interior ladder approach). [Preserved full log](/Users/sukhjot/codes/test/docs/review/exterior-shared-slab-complete-suite.log) |
| Latest complete rerun | **15/17 PASS, 2 FAIL**, terminal exit 1. Gameplay fails the lower-compartment doorway (62/63); the room journey fails Energy Room/Bath entry. Expanded exterior and both full forced interior ladder round trips now **PASS**. [Completed full log](/Users/sukhjot/codes/test/docs/review/exterior-garden-return-complete-suite.log) |
| Actual outside walking | All four main fore/aft ascent/return routes, both toilets, both full small-ladder journeys/closures/outside returns, Dock hatch and full lookout return **PASS**. The corrected full balcony/Library→garden→gallery/slide/both side-passage journey passes targeted verification and fresh full-run stage 10. Actual WASD/E, no placement/flight/recovery for these journeys. The earlier failed garden return remains preserved. |
| Actual interior returns | All six retained stair round trips, both fore approaches/returns and the full forced stern ladder ascent/descent/outside return **PASS**. The prior filtered Library approach and full stern ladder return also pass. [Library diagnostic](/Users/sukhjot/codes/test/docs/review/exterior-shared-slab-library-walk.log) |
| Motion samples | **PASS** on the completed publication run: actual stopped deck/plant/glass regions change 0.000% over five seconds; sampled 60.21 fps at 1440×900 on Apple M3 Pro/ANGLE Metal. All nine moving/stopped/5-second images are inspected. Fine close grass interference remains visible; these samples do not accept final graphics. [Measurements](/Users/sukhjot/codes/test/docs/review/construction-slab-exterior-motion-regions.json) |
| Appearance inspection | Nine fresh exterior views and three reference-comparison plates inspected, with no capture browser/shader errors. Inspect images show appearance, not walking proof. [Context](/Users/sukhjot/codes/test/docs/review/construction-slab-appearance-context.json) |

Connected room centres do not prove a complete tour. The room harness restarts at spawn after failed attempts; a continuous successful whole-ship room tour remains unproven. Aquarium's full exterior route passes; its interior approach failed the preceding run but completes ascent, descent and outside return in the completed rerun. The failure history and narrow endpoint sensitivity remain recorded.

Read-only diagnosis of that Aquarium failure measures the stopped feet **0.20666 m** from its actual lower endpoint, just outside the unchanged strict **0.20 m** check. Its grid approach does not finish at the exact grab point. A final normal-input approach to the endpoint still needs verification to remove the observed route sensitivity; this diagnosis does not close the failure or relax the assertion.

## Construction still left before graphics

- **Forward enclosure:** F1/F2 linings and ceilings are rectangular where the SBS plans show a rounded bow end. A measured corner reaches about 3.6 m beyond the retained source hull section. Trace the curved enclosure while preserving both fore approaches, centre helm transfer, openings, cannon closets and supported soffits.
- **Expanded outside return verification:** the completed full run stalled against balcony post .014. The corrected test follows the actual midpoint between adjacent padded posts and aligns after the Library threshold; the complete balcony/Library return/gallery/slide/both side passages now pass in [targeted evidence](/Users/sukhjot/codes/test/docs/review/exterior-garden-return-walk.log), with unchanged 0.20 m tolerance/player/collision/grounded/no-recovery checks. The fresh complete runner also passes this entire exterior suite; its two remaining failed suites are recorded above.
- **Mikan pot construction:** the closed red top of each pot covers its lower soil surface. Build an open clay shell with visible supported soil, keeping exactly three trees/pots and their placement. This is geometry/base-colour work before textures.
- **Remaining outside reference details:** finish figurehead contour/proportions, shared cabin/facade edges and supported small fittings; resolve uncertain rig, glazing and hidden hardware details from the references. Their presence alone does not establish accuracy.
- **Cannons and machinery:** the 14 side fittings do not establish completed gun assemblies or barrel connections. Current fore cannon placement/orientation needs correction. Dock contents remain rough models; detailed vehicles, anchor arrangements and canonical machinery still need construction. Extra firing mechanics come last.
- **Room-by-room build:** correct Dining/Kitchen sides and review every room's layout and furnishings against the supplied detail sheets. Repair Energy/Bath entry, Aquarium interior ladder approach and lower-compartment passage. Existing rooms are placeholders with partial fittings, not accepted accurate interiors.

The [feature ledger](/Users/sukhjot/codes/test/docs/exterior-feature-ledger.md) records measured E42/E37 findings and remaining uncertainty. Further graphics wait for Sukhjot's review; the Golden Hour rendering target is unfinished.

## Current photographs

Preserved actual failure photographs: [Energy Room](/Users/sukhjot/codes/test/docs/review/construction-slab-stall-Energy-Room.png), [Bath](/Users/sukhjot/codes/test/docs/review/construction-slab-stall-Bath.png), [Aquarium interior ladder approach](/Users/sukhjot/codes/test/docs/review/construction-slab-stall-Ladder-Aquarium-gallery-ladder.png). The original full-run [garden return stop](/Users/sukhjot/codes/test/docs/review/construction-slab-stall-Exterior-return-garden-clear-passage.png) is preserved; the corrected complete exterior suite now passes in the finished rerun. Aquarium’s earlier failed endpoint picture is historical; the same route now passes, with its measured sensitivity disclosed.

Nine corrected-route normal-eye photographs are inspected. [Stern balcony 3](/Users/sukhjot/codes/test/docs/review/construction-garden-return-walk-Stern-balcony-3.png) visibly exposes the closed mikan pot tops and unfinished deck/rail joins. [Slide-route entry pose](/Users/sukhjot/codes/test/docs/review/construction-garden-return-walk-Slide-entry.png) and [lawn return pose](/Users/sukhjot/codes/test/docs/review/construction-garden-return-walk-Slide-return-lawn.png) show the unfinished forward enclosure; their camera aim does not establish the slide's shape. The Library-threshold picture faces a mast, and both side-passage pictures face nearby walls, so those pictures cannot establish doorway/passage appearance. Successful route/return evidence is the actual input trace/log, separate from these photographic limitations.

This overview is an Inspect capture for exterior appearance:

![Current exterior overview](/Users/sukhjot/codes/test/docs/review/construction-slab-bow-quarter.png)

This Library image comes from actual normal-human walking. Its ceiling is clean; room layout/furnishings still need their reference-led rebuild:

![Library ceiling after structural repair](/Users/sukhjot/codes/test/docs/review/construction-slab-walk-library.png)

Actual stern ladder [ascent](/Users/sukhjot/codes/test/docs/review/construction-slab-walk-stern-library-ladder-ascent.png) and [descent](/Users/sukhjot/codes/test/docs/review/construction-slab-walk-stern-library-ladder-descent.png) pictures are inspected: real frame, opaque undersides and lower support are visible without the earlier broad coincident stripes. The earlier [endpoint screenshot](/Users/sukhjot/codes/test/docs/review/construction-slab-walk-stern-library-ladder.png) has an unusable aim filled by a nearby beige surface and is not shaft appearance evidence.

Source comparisons: [front](/Users/sukhjot/codes/test/docs/review/construction-slab-comparison-front.png), [port](/Users/sukhjot/codes/test/docs/review/construction-slab-comparison-port.png), [top](/Users/sukhjot/codes/test/docs/review/construction-slab-comparison-top.png). Full current views: [front](/Users/sukhjot/codes/test/docs/review/construction-slab-front.png), [port](/Users/sukhjot/codes/test/docs/review/construction-slab-port.png), [starboard](/Users/sukhjot/codes/test/docs/review/construction-slab-starboard.png), [top](/Users/sukhjot/codes/test/docs/review/construction-slab-top.png), [stern](/Users/sukhjot/codes/test/docs/review/construction-slab-stern.png), [stern quarter](/Users/sukhjot/codes/test/docs/review/construction-slab-stern-quarter.png), [lookout](/Users/sukhjot/codes/test/docs/review/construction-slab-lookout.png), [garden](/Users/sukhjot/codes/test/docs/review/construction-slab-garden.png). Top hides sail/flag/ratline geometry to expose placement.

Repair source: [surface/slab cleanup](/Users/sukhjot/codes/test/tools/sunny_surfaces.py), [surface ownership](/Users/sukhjot/codes/test/tools/sunny_exterior.py), [independent exported geometry regression](/Users/sukhjot/codes/test/tests/exterior.test.mjs). Source/runtime/tests/assets stayed frozen throughout the completed 14/17 run. Only the test route/evidence handling changed after it; runtime, player, collision and published geometry/materials remain unchanged. The required [fresh complete runner](/Users/sukhjot/codes/test/docs/review/exterior-garden-return-complete-suite.log) finishes 15/17 with terminal exit 1. Further forward-enclosure construction starts after that stable run; a new publication will require fresh verification. Preview: [running ship](http://127.0.0.1:5173/).
