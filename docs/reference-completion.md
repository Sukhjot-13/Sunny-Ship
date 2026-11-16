## Runtime collision checkpoint outcome

Plain loading/index integration is now verified: every205,604 collider retains exactly the old Float32 bounds/name/order/role; shared Suspense lifecycle tests pass;2,200 ordered push-out and600 boosted-flight/step comparisons pass; physics23/23 and build pass. Native gameplay finishes all63 movement/ground/flight/mode/stair/complete deck journey assertions and no runtime errors. FPS is26 (still below30), so do not call gameplay an aggregate pass or performance fixed. Exact logs/input hashes are in `review/2026-11-16/collision-runtime/`. The model/master/reference artifacts remain unchanged from R13 ad12616. No heavy jobs ran concurrently with this browser check.

Next action: fore R09 fixture passed, Python build source is authored. Update exterior material/UV selectors for new fore features, build an isolated candidate, then actual geometry/source-view/body verification. The upper approach test's actual grab-point finish is implemented but awaits its next full native ladder replay. Goal remains ACTIVE; all exterior before interiors.

## Current active work after local R13 checkpoint ad12616

R13 master/runtime/reference artifacts remain the current coherent generation (7,962 meshes/33 openings). The frozen complete41-suite run has finished at **36 PASS / 5 FAIL**; exact log is `review/2026-11-16/aft-reference/full-suite-41.log`. It passed all29 initial geometry/data/physics suites, cannon controls, complete additional exterior routes, lookout rope/ladder/hatch return, navigation walking/controls, orbit interaction, exterior motion and visuals. Failures: deck/room planned connectivity, gameplay FPS25 (all63 other gameplay assertions passed), exteriorAccess upper ladder endpoint arrival (.215m from a strict .20m grab point), and room journey (unreachable rooms plus a closed browser target). No aggregate acceptance.

The test upper-landing approach now finishes with actual W/.10m precision at the registered endpoint before unchanged ladder assertions; no placement or body relaxation. InteriorJourneys already used that precise endpoint finish.

Runtime collision optimization is now applied in source and awaiting native browser outcome: directly decode the deterministic box GLB into the exact prior Float32 bounds instead of allocating about205k unused render meshes; index immutable static queries conservatively; requery after every push-out in original list order; keep all dynamic colliders live and sweep dt once. `collisionData.test` passes every205,604 actual old mesh bound/name/order/floor flag. `collisionIndex.test` passes2,200 full-scan pose/velocity/contact-order cases plus600 boosted-flight/step cases, safety-band and cross-cell push-chain cases. Physics23/23 and production build pass. Actual full gameplay/performance run is ACTIVE at `/private/tmp/sunny-runtime-gameplay.log` (exec session shown in current chat); avoid concurrent heavy jobs until it ends. Single runner now has43 suites. These runtime edits are not yet committed.

Next R09 candidate source is also authored but **not built/applied**: upper WomensDoor moves to +Y starboard, two true circular ports go opposite, three broad arch bands face +X, ground entries use disclosed .72-storey height, both port gallery and mirrored starboard bridge remain with12cm undersides and exact actual rectangular floor support. `tools/sunny_fore_facade.py` and its fixture are new. The small source fixture PASSES real bores/glazing/retained corners/all20 outward closed upper band blocks. Runtime material/UV selectors and existing test expectations still need adapting before a future fore build; do not alter the current gameplay browser with HMR. Only after that serial run ends, update selectors, build fore candidate in isolation, verify actual shape/ports/door body access and source-relative appearance, refresh matching scale artifacts and checkpoint locally.

Whole-ship goal remains ACTIVE: all exterior first, then every interior automatically using only supplied images. Fore, vegetation/guard, rigging/proportion and final outside visual acceptance remain. R09 “to Soldier’s Dock” lower-front annotation needs cross-check against F1/B1/R14 during room connections; do not blindly retain both ground doors as men’s-cabin entries or infer a new corridor from the label alone. No remote push/deploy/publication.

## Latest applied checkpoint — R13 aft front

Matching R13 master/visual/collision/metadata are now applied locally: **7,962 meshes, 33 openings, five hatches**. Final25 actual-render views in `review/2026-11-16/aft-facade-final/` match all three current runtime artifact hashes; aft front/lawn/entry-grain views were personally inspected. Complete source/input manifest and terminal geometry/body/scale logs are in `review/2026-11-16/aft-reference/`. All 116 asset checks, full exterior geometry, new facade topology/authoring fixture, eight exterior moving glazed doors, all33 opening collision/closure checks, production build, and exact master/visual/reference hashes plus every7962 mesh uniform1/2.2 bound pass. Dining, Kitchen and lower Aquarium normal-control grounded lawn round trips pass. Interior contents/layout have not been accepted; only the source-required shared entry boundary was repaired. No whole-exterior acceptance.

Next: R09 mirrored upper fore door/missing paired ports and actual fore cabin access, then remaining vegetation/guard, rigging/proportion and complete exterior visual acceptance. Only afterward continue every interior room automatically. Whole-ship goal is ACTIVE; no remote publication. The completed R14 full runner remains30/39, not an aggregate pass. A current41-suite run is required on the new coherent generation; do not claim older full results cover the new R13 generation.

## R13 staged facade — latest in-progress state

R14 live checkpoint remains `6da9830`. A source-corrected R13 candidate is complete at `/private/tmp/sunny-aft-reference-candidate` (7,962 meshes, 33 openings), with one central upper aft entrance, paired tall lobed motifs, four circular lower ports, broad arch surrounds and the open shared kitchen/dining entry. Exact ratios, optical interpretation and hidden joins remain disclosed reconstruction. All 116 asset checks, the full exterior geometry suite, eight-door porthole/hardware/vertical-grain guards, independent source fixture and actual facade artifact tests pass. Serial real-input Dining, Kitchen and lower Aquarium entry/grounded lawn returns all pass; no teleport/flight/recovery. The first Dining attempt had a closed browser target during simultaneous geometry work; isolated diagnostic replay passed with native process exit0. Do not silently convert earlier browser errors into passes.

Final reveal finish repainted 729 actual reveal triangles cream (geometry/collision unchanged); fixture independently guards red-slot0 -> cream-slot transfer. Final matched camera capture is currently running at `/private/tmp/sunny-aft-final-render.log`. Review final aft/lawn/entry images, then apply the matching four candidate artifacts locally, export the matching reference copy, and verify exact 1/2.2 scale/hashes before a coherent local commit. Candidate assets have not yet replaced live R14 assets. Source/tests are in-progress edits targeting the candidate. The current reference_views helper supports isolated model/preview paths and the actual Vite renderer-module URL.

Complete R14 runner is terminal **30/39 PASS, 9 FAIL**, archived in `review/2026-11-16/dock-reference/full-suite-39.log`: all first27 suites and cannon/interaction/visual pass; deck/room plans fail; gameplay FPS24 fails; several remaining browser suites were interrupted by detached/closed targets or timeouts. No aggregate acceptance. Full single runner now registers41 suites with the new facade cases; rerun coherently after further repairs. Do not restart the old frozen run. No heavy geometry/Blender work alongside live walking while diagnosing interruptions.

Next exterior section after this facade checkpoint: full-resolution R09 shows the upper fore entry on the right viewed from the lawn toward the bow, and two circular ports on the opposite side. Current WomensDoor is mirrored on the left (Blender Y−6.263), and the pair is absent. Repair the physical door/cuts/landing and true ports, then real fore cabin approaches. Remaining outside work includes vegetation silhouettes/guard relation, rigging/source proportions, all section visual acceptance; only then begin all interiors automatically. Whole-ship goal remains ACTIVE, no remote push/deploy/publication.

## Current authoritative resume state — November 16, 2026

The whole-ship goal remains ACTIVE. Exterior is not finished and the interior phase has not begun. Complete all exterior sections first, then every room autonomously. Only supplied images establish design; inherited layouts and historical source assertions remain unverified. No push, deployment or publication.

Live generation has **8,295 meshes, 35 registered openings and 5 hatches**. The master and visual export match the uniformly reversed 1/2.2 reference export across all 8,295 mesh bounds. Earlier 8,385 counts describe the first checkpoint. Chosen 39m/56m targets and lawn/rig redistribution are not blueprint measurements.

Completed R04/R14 section: removed unsupported duplicate Dock switchback, rectangular hatch/long shaft and screen; restored lawn; authored one true circular central ladder lid/coaming/hole; lowered channel crowns below the lawn while retaining full round external mouths and wet containment. Central Dock full-body E descent/ascent/grounded lawn return passes without recovery. Actual exterior geometry, 116 asset checks, broad exterior walking journeys, round mouths/water construction, reference-scale linkage, production build and 26 matched renderer shots pass. Personally reviewed lawn, round-hatch and restored-grass views. These are section evidence, not whole-exterior acceptance.

Two real collision-grid alias defects were repaired using actual geometry: annular rim cells were clipped to the physical circular shaft; gallery floor coverage now includes five exact actual rectangular upward faces, preserving hatch/stair cuts. The gallery's coarse grid had started ~9cm inside its real edge, trapping the walker against its low fascia. The exact rectangles are generated by the same helper in normal asset builds. No human dimensions, flight, teleport or collision relaxation was used.

Aquarium route diagnostics proved a clear shaft with a supported lower platform isolated from the walking-only spawn graph. Ladder plans now start at their spawn-connected endpoint and require support at both ends plus unchanged complete body clearance. After genuine ladder arrival, local walking can plan within that supported component. The first complete exterior-access retry failed at the actual coarse gallery edge; the focused Aquarium retry on exact floor coverage is TERMINAL PASS, including approach, full descent, lower-floor excursion, ascent, closure and continuous grounded return to spawn. Exact trace/log are in `review/2026-11-16/dock-reference/`. `ACCESS_FILTER` is for focused replay only; full runner leaves it unset.

First complete 33-suite checkpoint run is TERMINAL: **24 PASS / 9 FAIL**, archived as `review/2026-11-16/first-full-suite.log`. There is no remaining session64958. Two failures were invalid harness assumptions (food-lift Sunny_ naming and two hits through the intentionally open painted outer shield); retained front support, boss embedding and all physical checks pass. Other room/deck connectivity, gameplay and full access failures remain tracked. New checks must use current publication. All pending temporary harness files were restored.

Next concrete design correction: R13 was re-inspected at full resolution and enlarged for analysis. Its upper aft front has **one central arched entrance and a pair of tall ornaments/openings**, not the current two separated entrances/four generic sash windows. The lower front has circular ports around a central entrance. Correct the physical facade, joins and access, then vegetation/guard relations, all remaining exterior ledger sections, final source-relative proportional and visual acceptance. Do not globally multiply all later fittings by2.2 without checking each reference relationship.

Native Blender and Chrome work with approved unsandboxed execution. Browser executable is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; preview5173 is local. Use staging to preserve frozen live artifacts while tests run. First staged candidate in `/private/tmp/sunny-reference-dock-candidate` predates the collision-only patches: do not overwrite current collision with it. Exact source rectangle receipt is `/private/tmp/sunny-exact-gallery-boxes.json`.

## Prior evidence chronology (later authoritative state above supersedes in-progress notes)

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

## Resume point after local checkpoint 5a21cb7

Persistent whole-ship goal remains ACTIVE. Do not mark it complete. Exterior is not complete; interiors have not started. User explicitly requires continuing automatically through all remaining exterior and then all rooms using only the supplied images as design authority. No pushes/deployments were performed.

The complete frozen-generation `npm test` process is still running via exec session `64958`; latest observed suite is 25/33 universal cannon controls. Log: `/private/tmp/sunny-full-checkpoint-tests.log`. Wait for it to finish, inspect real failures, copy its terminal log and summarize the actual suite result. Do not restart the same full run or rebuild unchanged assets. Native Blender/Chrome must run with approved `require_escalated`; `PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Existing preview is at port5173.

Next concrete exterior repairs after current verification: (1) eliminate retained Dock handrails protruding 1.005m through the actual shut lawn lid without hiding meshes or breaking access; (2) resolve original/current identical five single-skin rays on outer shield bosses Cylinder051/054, preserving visible front surfaces and fore room clearance; (3) reference-based facade/plant/rail/proportion corrections and all remaining exterior ledger features. Any old convenience geometry must be checked against images before being retained as faithful. Current first exterior source/build/artifacts/24 views and reversible 1× export are coherently saved at 5a21cb7.

## Current second exterior section — in authoring

R14 was re-inspected directly: its central ladder is the sole lawn connection and its opening is circular. Removed generation of the unsourced secondary switchback, rectangular hatch/long shaft, and their channel perforations/screen. The source now authors a true round aperture/coaming/lid; isolated Blender fixture passes actual aperture, corner retention, solid-disc and hardware-parent checks. The channel crown now stays below the deck until its outboard final-quarter flare; 101 sampled profile sections remain convex. The next export must verify both actual lawn continuity and full circular external mouths, wet/collision support and real E/ladder round trips. No source-only acceptance.

The old 33-suite run is still active at suite29 on the first checkpoint assets. To preserve its harness while it completes, revised `dockWaterConstruction.test.mjs`, `assets.test.mjs`, `exteriorAccess.mjs` and `stairFlights.mjs` are staged as plain files under `/private/tmp/sunny-pending-exterior/tests/`; live test sources remain HEAD. After the process is terminal, copy those four files back before rebuilding/running the new publication. No runtime JS has changed during its browser tests.

## First full suite terminal / new Dock publication

First full suite completed at 24/33 PASS and 9 FAIL, exit1. Its exact log is `docs/review/2026-11-16/first-full-suite.log`. Passes include actual helm navigation/control round trip, universal cannon controls, complete fore-lookout rope/ladder/hatch return, all 36 old opening geometries, physical materials and visual capture. Failures: food-lift naming assertion; two-skin boss-test assumption; room/deck planned connectivity; gameplay; exterior journey; obsolete ladder-count access assertion; room journeys; garden motion journey blocked at the old raised crown. No aggregate success.

The R14 stage completed with all four old live hashes unchanged. Actual candidate guards pass 15 restored-grass probes, circular aperture/lid/retained diagonal floor corners, no duplicate stair/hatch/screen, below-lawn crowns, full circular mouths, wet containment and wide static rays. Matching candidate assets/master have now been applied together after the old runner closed. Pending harness files are restored, source/material selectors now use only the canonical connection, and full native control/render checks follow.

## Applied R14 access / physical proof

The first real round-hatch attempt exposed coarse 40cm terrain cells spilling from the annular rim into the otherwise clear bore. Exact body sweep identified `COLL_Floor_2324`. `round_access_collision` now trims all affected floor layers to the registered circular bore with 4cm conservative strips while preserving unrelated solids and floors below the shaft. Exact existing deterministic collision accessor bounds were regenerated through the same new function used in the asset builder; visuals and editable master remained unchanged. Independent 10,201-point coverage/idempotence checks and full-body shaft/exit sweep pass.

Fresh actual-control run `/private/tmp/sunny-dock-ladder-body-fixed.log` passes lawn approach, E/ladder descent to the waiting platform, return ascent and final grounded walking return to spawn; no recoveries. Both round-mouth/outlet geometry suites, physical water/containment, 35 moving openings, all 116 asset checks and exact 1× scale linkage pass. Updated coaming checks measure a closed torus with 32 actual inner/outer sections rather than incorrectly requiring four rectangular walls. Broader exterior walking and the complete geometry suite are now running; not yet aggregate acceptance.
