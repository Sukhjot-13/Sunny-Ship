> Historical mouth publication before the combined camera/65-degree fold/base-yellow batch. Current report: [construction-review.md](/Users/sukhjot/codes/test/docs/construction-review.md).

# Thousand Sunny preceding mouth construction review — October 3, 2026

Sukhjot, approximately **30–40% of exterior construction** and **60–75% of interior construction** remain. These are rough estimates of effort, not measured accuracy scores. Room shells and routes exist, but accurate room layouts, furnishings and access repairs are unfinished. Exterior construction comes first, then accurate rooms, then realistic graphics after your review. **Graphics remain held.** Existing partial materials predate this continuation.

## Current front-mouth construction

The source-led mouth now has an enclosed taller aperture, opaque cut walls, a thin lower chin panel hinged at its actual lower edge, an attached horizontal closed-muzzle seam and a genuinely hollow recessed cannon barrel. The rear cavity stays ahead of all seven unchanged rotating mane bodies. Exact hidden hinge/depth/metre values are reconstruction choices; the source drawings do not supply those dimensions. No cannon extension is implemented by this repair, and whole-front fidelity is still incomplete.

All three assets were successfully published together: **33,876,868-byte visual / 24,993,540-byte collision / 277,920-byte metadata**, **5,646 meshes**. Original FBX remains unchanged. Approved **2.2 scale, 85.8 m length / 123.2 m height** and normal **1.70 m eyes / 1.75 m body / 0.34 m radius / 3.4 m/s walking** remain intact. [Exact publication](/Users/sukhjot/codes/test/docs/review/construction-mouth-artifact-manifest.json).

| Current check | Result |
| --- | --- |
| Exported geometry | **13 groups PASS**, retaining all 12 preceding groups. New checks cover 240 open samples across eight real mane angles, closed painted cover, taller aperture, thin chin, five closed opaque bodies and deep bore. [Log](/Users/sukhjot/codes/test/docs/review/exterior-mouth-geometry.log) |
| Asset structure | **104/104 PASS**. [Log](/Users/sukhjot/codes/test/docs/review/exterior-mouth-structure.log) |
| Room/access plans | All 26 room centres, six retained flights, both ladders and both fore approaches connect. Planning is separate from actual walking. [Log](/Users/sukhjot/codes/test/docs/review/exterior-mouth-routes.log) |
| Production build | **PASS**, 643 modules, 1.82 s, after the runtime bounds repair. [Log](/Users/sukhjot/codes/test/docs/review/exterior-mouth-build.log) |
| Actual targeted controls and return | Both final PASS assertions: real port helm walk, open/closed jaw bounds within unchanged 2 mm, steering/water/UVs, Chicken/jaw, Burst/landing, dock controls/collision, Log Pose simulation, stair descent/lawn return, reset and separate starboard Gaon/recoil. Test process is absent after continuation; exact tool exit was unavailable. [Log](/Users/sukhjot/codes/test/docs/review/exterior-mouth-controls.log) / [receipt](/Users/sukhjot/codes/test/docs/review/construction-mouth-targeted-controls-receipt.json) |
| Matched appearance | All **18 current images individually inspected**, no capture errors: six current 90° closed/open/both-side poses, nine whole-ship views and three reference plates. Lower open panel still extends too far below the face; whole-front fidelity is incomplete. [Receipt](/Users/sukhjot/codes/test/docs/review/construction-mouth-appearance-receipt.json). Prior stale 1.05-radian views are archived. |
| Full npm test | Preceding mouth source/runtime **15/17 PASS, 2 FAIL**, terminal session 90393 exit 1, all 67 hashes unchanged. Lower-compartment doorway (62/63), Energy Room/Bath/Observation tour failed; all original exterior/access/lookout/control returns passed. This historical result predates the stronger camera assertion/current compact fold. A fresh full runner remains required. [Exact receipt](/Users/sukhjot/codes/test/docs/review/construction-mouth-verification-receipt.json) |

The preview first served an older controls transform despite the correct project directory; a confirmed refresh restored current code. The unchanged physical test then caught cached jaw boxes contaminated by the initial Inspect bobbing pose. Exact descendant vertices are now cached in the authored ship frame before hinge motion. Both reproduced failures and diagnoses are preserved: [stale preview](/Users/sukhjot/codes/test/docs/review/construction-mouth-cached-preview-diagnosis.json), [runtime frame](/Users/sukhjot/codes/test/docs/review/construction-mouth-runtime-bounds-diagnosis.json). Tests and collision tolerances were not weakened.

## Construction still left

- **Exterior:** open lower-panel pose/proportions and cannon presentation; remaining face/eye/nose/bone/disk proportions and attachments; supported cannon connections; sail silhouettes/attachment edges, hat-only white-sail artwork and mast/rigging topology; curved façades, arched door/window heads and opening rhythm; soffits/lookout underside; rail, rigging and hardware endpoints/mounts; detailed dock machinery/vehicles; final source comparison and continuous walking/return verification. Independent steered-camera/Burst/landing correspondence now passes targeted testing; current combined-batch full verification is pending. The [feature ledger](/Users/sukhjot/codes/test/docs/exterior-feature-ledger.md) retains unresolved or unsupported choices.
- **Interior:** reference-accurate room layouts and furnishings, reversed Dining/Kitchen sides, lower-compartment doorway/Energy Room/Bath access repairs, and repeatable Observation stair descent. Existing room-centre planning passes do not accept these rooms.
- **Graphics afterwards:** wood/canvas/rope/metal/glass/plant materials, proper UV scale, lighting and the Golden Hour quality target. No new textures, sun or lighting have started in this construction batch.

The [preceding completed mane report](/Users/sukhjot/codes/test/docs/construction-mane-review.md) preserves its exact 15/17 runner, screenshots, full exterior/access/control returns, 0.000% stopped motion samples and remaining room failures. Observation passed without a source repair, so historical descent sensitivity remains disclosed. Failed room segments required reset; no whole unbroken ship tour is accepted.

Source: [mouth authoring](/Users/sukhjot/codes/test/tools/sunny_accuracy.py), [physical mechanism frame](/Users/sukhjot/codes/test/src/components/NavigationSystem.jsx), [independent geometry checks](/Users/sukhjot/codes/test/tests/exterior.test.mjs), [real controls/return](/Users/sukhjot/codes/test/tests/navigation.mjs). [Running preview](http://localhost:5173/).

## Fresh current-runtime screenshots

![Current closed face; eye/nose/bone and disk fidelity remains unfinished](/Users/sukhjot/codes/test/docs/review/construction-mouth-detail-closed-front.png)

![Clear open cavity; lower panel extends too far below the face and still needs source matching](/Users/sukhjot/codes/test/docs/review/construction-mouth-detail-open-front.png)

Both obliques: [open port](/Users/sukhjot/codes/test/docs/review/construction-mouth-detail-open-port.png), [open starboard](/Users/sukhjot/codes/test/docs/review/construction-mouth-detail-open-starboard.png). Reference comparisons: [top](/Users/sukhjot/codes/test/docs/review/construction-mouth-comparison-top.png), [side](/Users/sukhjot/codes/test/docs/review/construction-mouth-comparison-port.png), [front](/Users/sukhjot/codes/test/docs/review/construction-mouth-comparison-front.png). These are appearance evidence. All seven targeted physical photographs are inspected; helm/lawn are useful, while action/instrument frames mostly face floor/ocean/wheel and cannot accept feature appearance.
