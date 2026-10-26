# Thousand Sunny construction review — October 4, 2026

Sukhjot, roughly **30–40% of exterior construction** and **60–75% of interior construction** remain. These are estimates of remaining effort, excluding realistic graphics. Exterior construction comes first, then accurate rooms; further graphics remain held for your review. Existing partial materials predate this continuation.

The current repair fits both white-canvas head edges and all 26 retained lashings to the actual oval yard surfaces and recesses the lookout/aft support bays. A support-only shaft cut clears the 2 cm lip found at the stern ladder landing while preserving its separate floor, hatch station, route and normal human body. Exact sewing, sector count and recess depth are reconstructed from the supplied morphology, not official measurements. The source FBX is unchanged.

Corrected asset job **93219 is terminal exit 0**. Visual/collision/metadata assets were published together: **36,116,908 / 26,788,804 / 278,144 bytes**, 5,646 meshes. Approved 2.2 scale/configured 85.8 m length and 123.2 m height, 1.70 m eyes, 1.75 m body, 0.34 m radius and 3.4 m/s walking are retained. [Exact publication](/Users/sukhjot/codes/test/docs/review/construction-fittings-artifact-manifest.json).

| Current check | Result |
| --- | --- |
| Exported geometry | **16 groups PASS**, including all preceding checks, both actual canvas-head contacts, all retained lashings and eight recessed bays at two intact oval sections. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fittings-corrected-geometry.log). |
| Asset structure | **104/104 PASS**, including unchanged normal-body stern/lookout/Aquarium shaft checks. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fittings-corrected-structure.log). |
| Access planning | All 26 room-centre plans, six flights, two reference ladders and both fore approaches connect. Planning is separate from actual walking. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fittings-corrected-routes.log). |
| Production build | **PASS**, 643 modules, 2.20 s. [Log](/Users/sukhjot/codes/test/docs/review/exterior-fittings-corrected-build.log). |
| Actual preview | All **18 current pictures individually inspected**; both capture jobs terminal exit 0, no capture errors. [Receipt](/Users/sukhjot/codes/test/docs/review/construction-fittings-appearance-receipt.json). |
| Complete unfiltered npm test | **Terminal exit1:15/17 PASS,2 FAIL**,06:33:03–07:04:25 UTC October4. All68 source/artwork/source-asset/publication hashes match before/after. Lower doorway and Energy Room/Bath fail; all exterior/access/return/lookout/control/pointer/motion/visual suites pass. [Exact receipt](/Users/sukhjot/codes/test/docs/review/construction-fittings-verification-receipt.json) / [complete log](/Users/sukhjot/codes/test/docs/review/exterior-fittings-complete-suite.log). |

The initial fittings attempt reproduced a stern landing obstruction and a defective circular-ray sampler through oval supports/access apertures. The physical skin is repaired; the new recess sampler measures intact elliptical sections with its original depth bounds. Initial logs remain preserved. The terminal runner passed all four fore/helm/garden round trips, expanded balcony/gallery/slide/both-side passages, strict Aquarium and Stern Library ladder returns, Soldier Dock hatch return, full lookout return, six forced tread returns and both fore cabin approaches. Energy Room and Bath access fail; Observation passes without a geometry repair, so its earlier repeatability issue remains open. All seven control and fifteen motion photographs were individually inspected:35/105 full-run PNGs inspected,70 pending,plus all18 separate matched appearance pictures. Fixed deck/plants/actual Library-pane regions change0.000% after5s; sampled60.22fps at1440×900/M3Pro ANGLE Metal. Mechanism frames still mainly show the wheel; direct mouth/cannon appearance is unaccepted. Flight/Inspect views are appearance only, and fixed-pose stability does not establish final material quality.

Construction still left:

- **Exterior:** figurehead bones/collar/mounts and cannon connections; sail outlines/knots and mast/rigging topology; curved facade arches/window rhythm and lookout enclosure; rails/hardware and dock/vehicle detail; full reference acceptance and repeatable complete outside journeys. Supplied page26 supports the retained full Roger on deployed white canvas; anime A is gathered, so a hat-only defect is withdrawn.
- **Interior:** reference-accurate layouts and furnishings, Dining/Kitchen side correction, lower doorway/Energy/Bath access and repeatable Bath-to-Observation transitions. Shells and connected route plans do not establish completed rooms. Rooms remain deferred until outside construction is finished.
- **Later graphics:** realistic wood, canvas, rope, metal, glass, plants, UV scale and lighting toward the Golden Hour reference, after the main build and your review.

![Current fitted fore-yard canvas and lashings](/Users/sukhjot/codes/test/docs/review/construction-fittings-detail-fore-yard.png)

![Current recessed lookout underside](/Users/sukhjot/codes/test/docs/review/construction-fittings-detail-lookout-underside.png)

[Main yard](/Users/sukhjot/codes/test/docs/review/construction-fittings-detail-main-yard.png), [aft underside](/Users/sukhjot/codes/test/docs/review/construction-fittings-detail-aft-underside.png), [top comparison](/Users/sukhjot/codes/test/docs/review/construction-fittings-comparison-top.png), [side comparison](/Users/sukhjot/codes/test/docs/review/construction-fittings-comparison-port.png), [front comparison](/Users/sukhjot/codes/test/docs/review/construction-fittings-comparison-front.png). Top roofs/yards occlude some deck; source/model sail and mouth states differ. These staged Inspect views establish appearance only.

The preceding face run **99390 completed 15/17 suites, 2 FAIL**, with all 68 hashes unchanged. It failed the lower doorway and the continuous room tour at Energy Room, Bath and Observation Deck. All exterior/return/control/motion suites passed that preceding generation, including all six stair returns and strict ladder returns. Its 60.22 fps/0.000% five-second stopped regions and inspected physical photographs are historical; they are not substituted for current verification. [Preserved report](/Users/sukhjot/codes/test/docs/construction-face-review.md).

Source: [authoring](/Users/sukhjot/codes/test/tools/sunny_accuracy.py), [independent export checks](/Users/sukhjot/codes/test/tests/exterior.test.mjs), [complete runner](/Users/sukhjot/codes/test/tests/run-all.mjs), [feature ledger](/Users/sukhjot/codes/test/docs/exterior-feature-ledger.md), [running preview](http://localhost:5173/).
