# Full-ship reference completion — November 16, 2026

Sukhjot authorized complete exterior first, then all interiors without another continuation question. This supersedes old C03/C04-only instructions. Goal remains active until the entire ship is implemented and verified, or a real blocker requires a user decision.

## Reference and scale contract

All 25 images under `stuff/images` and the golden-hour image were visually inspected in the five contact sheets. Supplied pictures and blueprints are the ONLY design authority for every part. Previous geometry, handoffs, plans and assumptions are unverified implementation. Manga/SBS establishes construction and layout; supplied anime images establish the bright palette. Golden-hour render supplies material/lighting direction, with its differing fittings not treated as canonical additions. Deployed and gathered sails are different states, not simultaneous requirements. Hidden surfaces and exact metre dimensions absent from drawings remain explicit reconstruction.

Current configured reference targets are 39 m length / 56 m overall height; working enlargement is 2.2, giving 85.8 m / 123.2 m before local ornamental changes. The original pipeline also redistributes the centre lawn (8 m band -> 12 m) and corrects upper rig height. These are shape changes, not uniform enlargement. Uniform reversal alone cannot certify exact blueprint plan agreement. No metric scale is printed legibly in supplied images. Preserve original FBX, all reference images and reversible scale export; never describe chosen dimensions as blueprint measurements.

## Exterior sequence

- [x] Clone clean original checkout and inspect existing instructions/history/reference pictures.
- [x] Capture initial top, both sides, bow, stern, quarters, garden and lookout; inventory all 8,132 mesh nodes.
- [~] Bow: rounded lion profile, expression, seven mane blades, crossed bones, gold mounts and paired anchors. New profile is a reconstruction to verify from both sides.
- [~] Exterior-facing doors: arched shapes, glazed portholes and moving hardware; verify actual apertures and both control poses.
- [ ] Hull and Dock rims/shutters, trim, port placement and lawn/channel interference.
- [ ] Foredeck, helm, Log Pose, stairs, rail rhythm and deck openings.
- [ ] Masts, sails, emblems, flags and all visible rope attachments.
- [ ] Lookout dome/windows/bowl and exterior access.
- [ ] Lawn, shade trees, swing, slide and both routes.
- [ ] Aft facade/windows/arches, gallery, garden, three mikan pots, plant beds, branch office, chimney.
- [ ] Stern observation/bath roof, glazing, lanterns, barrel and rudder.
- [x] Separate reversible reference-scale inspection artifacts and exact-source dimension receipt; every one of 8,385 exported mesh bounds passes uniform 1/2.2 transform. The prior lawn-layout shape change remains unaccepted.
- [ ] Whole exterior matched renders plus continuous control/access verification.

## Interior sequence after exterior acceptance

Men's quarters and wash; women's quarters and wash; four cannon closets; Aquarium and rear passage; kitchen/dining/pantry/clinic; Library/bath/wash/WC; paired workshops; Energy; fore stores; Soldier Dock/waiting room/vehicles; crow's nest gym. Retain original audit finding IDs as evidence until each is actually repaired and verified.

## Verification baseline

The first full existing runner is in progress. Its Blender fixture fails inside the sandbox; installed Blender runs correctly with approved unsandboxed execution. Headless Chrome also requires approved unsandboxed execution and `PUPPETEER_EXECUTABLE_PATH` because the repository's Puppeteer browser cache is absent. Actual initial browser renders succeeded with no page errors. Neither environment failure is a ship acceptance result.

No exterior or whole-ship completion is claimed. Latest code needs a coherent asset rebuild and rendered review. The older full runner was stopped at its extremely slow dense reachability scan; it did not finish. Its first Blender fixture failed due to sandbox startup, and suites 2–18 progressed through exported construction, material, navigation, asset, door and physics checks. Fresh final checks will use the approved native runtimes.

## First exterior checkpoint

Published matching Blender master, web GLB, collision and metadata; `exterior-checkpoint/receipt.json` records 24 fresh browser views and matching asset hashes. `checkpoint-inputs.json` freezes actual source/artifact hashes. All nine porthole/arch/hardware/vertical-grain guards pass; all 36 moving opening geometry/safe-closure checks pass; 116 asset checks pass on preceding same-shape generation; 15 exterior material groups pass; production build passes. Complete current runner is in progress at `/private/tmp/sunny-full-checkpoint-tests.log`, not an aggregate pass.

The first 65° curved-jaw candidate failed actual cannon-view rays (five obscured positions); the 70° correction has zero obscured positions and 0.270 head-radius lower-lip drop. The earlier coarse rim and smoothly shaded door panels were rejected during visual review; current smooth closed ellipsoid, curved smile/philtrum, timber joinery and vertical grain supersede them. Normalized head depth remains an explicitly reconstructed 0.68 diameter, subject to further comparison.

Remaining concrete exterior issues: Dock stair rails rise 1.005 m above closed lid; general Aquarium/Soldier Dock route failures are unresolved; camera-framed aft facade is oversized/blank relative to supplied construction details; tree/plant silhouette and guard relationship need repair. Those are pending, not accepted as complete. Existing red curved aft side skins are visible in supplied colored references; the earlier observation about timber siding alone is insufficient grounds to repaint the whole house. The broad facade geometry and window treatment need comparison separately.

The full runner's bow/mechanism and face-support sections now pass with 70° opening. It next fails the existing outer-boss shield support check. Independent exact rays against original `bbe2569` GLB and current GLB reproduce the same five single-skin samples at Cylinder051/054; see original/checkpoint bow-support receipts. This is a retained issue to resolve, not a newly introduced jaw failure and not a whole-bow acceptance. The C04 suite also has an existing `FoodLift_*` vs actual `Sunny_FoodLift_*` naming mismatch; no interior completion follows from that suite.
