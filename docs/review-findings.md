# Thousand Sunny implementation review — 2026-10-01

Reviewed source, generated GLBs, the supplied handoff, B1/F1/F2/F3 floor-plan images, and the Thousand Sunny wiki. No project-root AGENTS.md exists; /Users/sukhjot/AGENTS.md applies. This folder has no Git repository. Findings below describe the incoming implementation, before repairs.

## High severity

1. **Door runtime absent** — `src/App.jsx` SceneRig never renders DoorSystem; `src/components/Ship.jsx` never calls registerDoorNode. Reproduction: Explore, approach any red authored door; `window.__sunnyDoors` is undefined. Leaves stay shut, dynamic collision is absent. Mount the runtime and register leaf groups with lifecycle cleanup. Fix swing transforms to rotate both position and orientation around the same hinge as collision, including handles.
2. **Walls and doors disagree** — `tools/sunny_interiors.py` build_interiors: B1 transverse bulkheads and fore wall use rot=0 although their spans run across Blender Y; washroom doors use π/2 though the wall runs along X. Cannon closet walls lack openings altogether. Library partition runs through the room centre while its door is at the front. Opening a leaf cannot make these walls passable. Align walls, openings, and leaves from common coordinates; cut openings through imported facade geometry too.
3. **Generated assets do not represent source** — incoming `public/models/ship-metadata.json` has 14 rooms and 13 doors, no bath or hatches. Source declares 16+ rooms and hatch construction. Rebuild all three artifacts together and assert runtime registration and geometry against metadata.
4. **Stair/hatch topology unsafe** — `tools/sunny_interiors.py` switchback turns 90° rather than reversing and has an incomplete cross landing; hatch builds a solid frame covering its opening. `tools/sunny_exterior.py` add_fittings cuts only a small hatch at the top of long flights, leaving overhead floors across the approach. Rails stay horizontal instead of following the rise. Build full landing bridges, real perimeter frames, full headroom shafts and correctly inclined rails. Closed hatches need support; open lids must not leave phantom floors.
5. **Room program and placement disagree with plans** — shipped B1 Soldier Dock is aft (x14.29..25.41), Energy Room overlaps workshop volume (x-1.5..12), aquarium occupies one giant rectangular block rather than surrounding its lounge. Source moves B1 rooms again but still has wall orientation/entrance problems. Correct central dock, forward storage, aft workshops and aft energy room; enclose the aquarium around a walkable lounge/service passage. Several floor levels lack a usable walking connection (bath only has a decorative ladder).
6. **Regression runner does not verify completed work** — `tests/assets.test.mjs:172` crashes on deleted interiorShell; `tests/gameplay.mjs:250` dereferences a removed bulkhead name, followed by more interiorShell references. Retreaded Box names have suffixes excluded by `tests/stairFlights.mjs:2`. Update tests to new contracts while retaining actual collision, dimensions and complete up/down journey assertions.

## Medium severity

7. **Inverted, oversized aft source door retained** — Explore lawn, face stern and approach central aft doorway; screenshot [before-aft-door](review/before-aft-door.png). Rounded arch is at the bottom; an old source facade leaf remains behind the new door. Remove the old leaf and cut a human opening before adding the upright replacement.
8. **Control/support and scale drift** — GLB bounds are 79.09 m vs configured 78 m and centre x=-0.54 m; helm pedestal starts 0.12 m above foredeck and Log Pose at 0.10 m, with inconsistent support checks. Some garden/tread names and support tests refer to removed features. Anchor fittings to real supports; keep all geometry inside the intended hull envelope without stretching human objects.
9. **Runtime door transform is inconsistent even if mounted** — `src/components/DoorSystem.jsx` adds a hinge offset to the centre without rotating the centre back around it, and multiplies a local quaternion despite a world-space pivot. Inspect/flight reset clears collision but leaves meshes at prior positions. Fly collision would omit all doors. Keep visible and collision transforms together across mode changes.

## Verification at review time

- `npm run build`: PASS (Vite production build).
- `npm test`: FAIL. Physics 19/19 pass; asset suite fails bounds/length/helm then crashes; reachability fails men's quarters/aquarium/library; gameplay passes basic walk/run/jump and camera/flight mode toggles then crashes before stair journeys. Browser launch initially required execution outside the filesystem sandbox; rerun launched successfully.
- Browser screenshots use a 1.7 m eye height, 1440×900 full-window canvas. Incoming runtime has 21,537 colliders and 6,870 floors.
- The supplied tiny 99×150 plans cannot establish precise dimensions or all labels. Wiki prose and existing readable blueprint links supplement them. No claim of exact shot-for-shot anime fidelity is warranted.
- Ocean horizon, enabled-flight wall collision, all room journeys and frame rate still require complete verification after test crashes are repaired.

Repairs and final checks are recorded below as they are completed; original failures are retained here.

## Current status at requested handoff (15:42 local, October 1)

Implementation stopped at Sukhjot's request to prepare a prompt for a new session. Initial findings above are historical incoming failures, not a claim that they all remain unchanged. Runtime doors are now mounted/registered; wall/door orientations, source leaf removal, stair switchbacks/shafts, hatch support, room program, bounds/support and stale tests have received repairs. The project remains unfinished.

### High severity — verified current problems

- **Bath stair obstructed despite reachable Bath volume:** `tools/sunny_interiors.py:1250` constructs the flight and `:1265` places the washroom sink. Current `node tests/roomRoutes.mjs` passes 23 room volumes and eight other authored flights but fails BathStair. Its last tread centre is approximately Three `[27.786, -23.454, -4.070]`; the body footprint intersects exported sink basin/bowl collision. Move/reorient the sink or landing and verify both climb and descent, retaining the strict flight route assertion.
- **Interior shells remain visibly broken/exposed:** `tools/sunny_interiors.py:861` (`circular_lining`) and `:1206` onward (library/bath), plus aft room shell code around `:1145–1200`. Current library/bath captures show source roof paint, gaps, and large white source arch remnants; stern view exposes aft furniture outside a continuous enclosure. Reproduce by inspecting library/bath at normal eye height and flying behind the stern. Repair complete wall/floor/ceiling topology and source cuts before furnishings/textures. Evidence: [library](review/after-library.png), [bath](review/after-bath.png), [stern](review/reported-stern.png).

### Medium severity — verified current problems

- **Leftmost lion mane petal rotated/deformed:** `tools/sunny_exterior.py` source restoration and `Rectangle002–008` meshes. Front-on capture shows a blunt sideways petal at image left, unlike radial opposite petal. Repair its actual geometry/orientation around face centre. [Evidence](review/reported-lion.png).
- **Unsupported porthole rings:** `tools/sunny_exterior.py:796–810` (`add_fittings`) creates GardenWindow rings normal to X at an open garden edge. Four float on image left in the stern view. Aquarium/Dining frame positions also need actual-facade attachment/aperture checks. Attach and orient to real referenced walls, removing noncanonical duplicates. [Stern](review/reported-stern.png), [side](review/reported-stern-side.png).
- **Centre tree obstructs direct library approach:** centre Mikan tree around world x19.13 lies in the forward approach to LibraryDoor x21.95. A room route can detour around it, but the direct visual approach is blocked. Reposition with the reference garden plan and verify a clear recognizable entrance. [Evidence](review/reported-library-entrance.png).

### Reported issues needing further confirmation

- Front-left doorway after first fore stairs: one current fore doorway captured, but exact requested side and real entry/exit need targeted walking verification. [Capture](review/reported-fore-door.png).
- Exterior red hue/coverage: render appears pink/magenta; anime comparison and palette/colour-space/lighting audit remain required. Red is present in canon, so an arbitrary replacement of all red is not a supported fix.
- All other room furniture/support and detailed anime accuracy remain subject to complete visual audit. Detailed Dock vehicles, artwork and women's tea set remain incomplete. Earlier ship-control interactions/world heading have not been completed/verified.

### Verified current checks and limits

- Latest asset build: successful; 23 room volumes, 32 moving openings. Browser confirms all 32 registered.
- Current asset test: **54 passed, zero failed**. Current pure doors test: **32 moving openings pass**. Current production build: **PASS**.
- Current offline routes: **23/23 rooms, 8/9 interior flights**; BathStair fails.
- Previous-generation outdoor gameplay: **63 passed, zero failed**. It is not a full current-generation test result.
- The complete current `npm test`, current continuous room tour, final all-room visual accuracy and exterior colour audit have **not passed/been completed**. Captured flight views are visual diagnostics, not proof of ordinary walking access. Do not declare functional or anime/manga completion.
- A source-only door handle/hinge update was made after the latest build loaded the module; it still needs a rebuild and visible verification.

Full actionable request: [next-session prompt](fix-session-prompt.md). State/remaining tasks: [handoff](to-do.md).

## Latest exterior-only repair and planning handoff — 18:06 local, October 1, 2026

This section supersedes earlier “current” sections. Sukhjot paused room work, asked
for slightly more ship enlargement and movement-flicker repairs, then requested a
complete exterior accuracy plan and new-session prompt. Room scope has not resumed.
The source FBX is untouched (23,765,440 bytes); no Git repository exists in this folder.

### Current repairs and published assets

Generation 10 was successfully staged and published as visual GLB, collision GLB and
metadata together. Configured experience scale is **2.2**: length 85.8 m, height
123.2 m, measured beam 54.719 m. Human eyes/body/radius/walk speed remain
1.7/1.75/0.34 m and 3.4 m/s; metre-sized fittings remain human-sized.

- `tools/sunny_exterior.py:repair_symmetry` now preserves good `Rectangle004` and
  reflects it onto malformed `Rectangle006`. The previous copy direction had made
  both lateral petals wrong. Both pass radial/mirror geometry checks, and the new
  frontal capture shows both petals extending radially. Full sculptural anime
  fidelity remains part of the audit, not established by symmetry alone.
- `subtract_plan_polygon/remove_exterior_overlaps` trimmed **671** coplanar exterior
  faces while preserving vertical structure. The independent exported-triangle test
  finds no cross-mesh overlap above 1 cm² within 3 mm of tested outdoor walking planes.
- `add_fittings` scales exterior approach/support footprints and cuts standing
  headroom through the frontage above actual upper fore treads; collision export
  preserves those openings. The garden route walks around the existing hatch rail.
- Authored material grain/relief is paused for base-colour QA. Soft 2048 shadows,
  ship-local sail markings/filtered stripe edges, and filtered ocean ripple/specular
  address identified motion shimmer sources. Lookout roof/band/underside paint is
  corrected. This is not a complete texture/realism or all-surfaces flicker verdict.

### Complete verification result

- `npm run assets`: **PASS**, published generation 10. [Asset export log](review/exterior-final-assets.log).
- `npm run build`: **PASS**, 640 modules, Vite production bundle. [Build log](review/exterior-final-build.log).
- `npm test`: **FAIL**, exit 1; **11/13 suites pass, 2/13 fail**. [Complete test log](review/exterior-final-suite.log).

| Suite | Result |
| --- | --- |
| Navigation logic | PASS |
| Asset structure | PASS — 61 assertions |
| Exterior coplanar geometry | PASS |
| Door/hatch collision | PASS — 32 moving openings |
| Collision physics | PASS — 19 assertions |
| Deck reachability | PASS — all exported landmarks (offline evidence only) |
| All room/interior stair routes | **FAIL** — both fore toilet volumes disconnected; 23/25 rooms and 9/9 forced interior flights have planned grid paths |
| Browser gameplay | PASS — 63 assertions |
| Continuous room tour/interior stairs | **FAIL** — seven failed journeys/returns below |
| Walking to ship controls/navigation | PASS |
| Pointer/orbit interaction | PASS — 6 assertions |
| Exterior motion/stationary comparison | PASS |
| Visual capture | PASS — no runtime errors |

Actual exterior evidence: all seven individual flights climb; all four complete
lawn → helm/garden journeys use controller movement through approaches/transfers
and return descents on both sides. Both forced fore cabin approaches also enter
from the lawn and return successfully. No teleport/flight establishes these complete
journeys. Separate isolated collision/flight diagnostic tests still use debug placement
and are not counted as journey proof.

Actual control evidence: walk continuously from lawn to helm, operate E/WASD steering
and sailing, verify stable onboard feet/world yaw/water mask, sail marking coordinates,
G's current simplified Burst, walk around the console, operate selector/lever/shutters
and carousel physical bounds, select Log Pose and use R reset. These behaviours work;
the separate convenience console, illustrative destinations, rolling-shutter and Burst
approximations remain canonical-fidelity gaps in the exterior plan.

Motion evidence: actual WASD moves more than 2 m, stops grounded, invokes no automatic
recovery, drifts less than 5 cm over five seconds; sampled stationary lower-deck pixels
change **0.000%**. Moving captures were inspected. This flat base-colour deck sample
cannot prove absence of shimmer on every sail, pane, plant or distant edge. Broader
motion QA is required during the texture phase. Browser gameplay measured **59 fps**
at 1440×900 using headless Chrome/ANGLE; this is this test environment's observation.

### Verified remaining walking failures — rooms paused

1. Men's Quarters continuous-tour transfer: stalls near Three `[23.29,-47.15,-1.20]`
   while leaving the aft B1 area, despite a separately reachable room grid path.
2. Bath room journey: stalls near `[29.60,-26.10,-3.73]`; actual BathStair ascent and
   return to lawn pass. Reaching the bath stair exit is not reaching the bath room.
3. Fore Starboard Toilet: no connected planned route.
4. Fore Port Toilet: no connected planned route.
5. AquariumStair: real ascent stalls near `[14.66,-37.26,7.60]` despite a grid path.
6. StorageStair_over: real ascent stalls near `[-16.50,-41.65,7.20]`.
7. StorageStair_up return: ascent passes but return stalls at the same storage transfer.

Six forced interior flights complete ascent plus return: BathStair, EnergyStair,
KitchenStair_over, KitchenStair_up, SoldierDockStair_over and SoldierDockStair_up.
The all-room tour is broken and has no successful complete return. Screenshots after
its failures are separate journeys, not one continuous successful tour. Do not resume
room repairs until Sukhjot starts that phase.

### Exterior accuracy plan and current screenshot evidence

[42-item exterior audit/repair plan](exterior-audit-plan.md) compares actual implementation
and preview with all five requested exterior images and supplied supporting plans.
[New-session prompt](exterior-session-prompt.md) is ready to copy and keeps rooms paused.
Confirmed differences include sail silhouettes/emblems, blind gold side-panel circles,
wheel controls on a convenience console, the pale Burst outlet instead of the timber
barrel, generic plants/fruit and the visibly floating `Sunny_InteriorMainMast` exported
at Three origin. Stair/railing/garden/window positions require the proposed normalized
placement ledger before any claim of accuracy. The ship is not an exact reproduction.

Current generation-10 captures (1440×900):

- [Overview](review/exterior-overview.png), [orbit 1](review/exterior-orbit-1.png),
  [orbit 2](review/exterior-orbit-2.png): Inspect appearance evidence, including remaining
  sail/hull/plant/structure mismatches.
- [Frontal figurehead](review/exterior-lion-flight-diagnostic.png): current corrected
  lateral petals, flight appearance evidence only.
- [Walking 1](review/exterior-walking-1.png), [walking 2](review/exterior-walking-2.png),
  [walking 3](review/exterior-walking-3.png): real normal-eye lawn movement.
- [Stopped](review/exterior-stopped.png), [five seconds later](review/exterior-stopped-5s.png):
  stationary comparison pair.
- [Helm reached by walking](review/walk-Helm-controls.png),
  [navigation instruments reached by walking](review/walk-Navigation-instruments.png).
- Failed room/stair evidence: `review/stall-Men-s-Quarters.png`, `review/stall-Bath.png`,
  `review/stall-Stair-AquariumStair.png`, `review/stall-Stair-StorageStair-over.png`.

Earlier screenshots and test counts elsewhere in these docs are historical. No exterior
perfection, complete all-room access or finished interior/texture claim is made.


## Exterior repair first full run — October 2, 2026

The first published repair set completed a fresh complete `npm test`: **11/14 suites pass, 3 fail**. The retained room-route and continuous interior suites fail; the new continuous balcony/gallery/slide/passages suite also failed at its gallery crossing. Full output is [first repair log](review/exterior-repair-suite-first.log). Production build passed; asset structure passed 71 assertions. This is an intermediate result, not final acceptance.

Actual exterior stair/controls evidence: gameplay 63/63, all four complete main journeys with return descents, actual walking to integrated fittings, steering/marking/water stability, seven-petal rotation/jaw, three-cola airborne Burst and landing, rolling slats/selected digits/colliders, simulated Log Pose, continued return descent, reset and separate Gaon/recoil pass. React loader console warning is fixed and the console assertion passes. Expanded walking completes the 360° balcony and actual library door threshold/return, then stops at Three `[11.11,-35.62,7.73]`; the aquarium shaft cut removes the gallery crossing. Slide and full side passages are not yet proven by that run. [Stall capture](review/stall-Exterior-gallery-opposite-end.png).

Actual interior failures in this set (rooms remain deferred): Energy Room, Dining Room, Kitchen, Pantry, Sick Bay, Bath, both fore toilets, AquariumStair, both Kitchen stairs and StorageStair_over. Separate successful routes do not establish a successful continuous all-room tour.

## Construction follow-up — October 2, 2026

Complete `exterior-construction-next-suite.log`: **FAIL, 10/14 suites pass**. Production build `exterior-construction-next-build.log`: **PASS**. Asset structure **82/82**, coplanar exterior geometry, door collision, physics, deck reachability, navigation/control walking, orbit/input, motion and visual capture suites pass. The preserved all-room route suite fails both outdoor toilets; gameplay is **62/63**, with its lower-compartment doorway check failing. The expanded exterior walk now passes the complete stern balcony, library threshold/return, gallery crossing, slide descent and direct lawn return, plus the port passage; its straight starboard entry hits the real Soldier Dock stair opening. The test now routes beside that opening on measured lawn support with unchanged grounded/recovery/tolerance requirements; a fresh run is still required.

The continuous room suite reports eleven failures: Energy Room, Aquarium Bar, Bath, both fore toilets, AquariumStair, EnergyStair return, both Soldier Dock flights, StorageStair_over and StorageStair_up return. These are retained failures, not removed checks. Room furnishing/layout remains deferred while exterior entry/access defects are repaired.

Fresh `construction2-*` appearance images were inspected. Bow divisions/white edge, dark U hull bands, anchor bands/ropes, timber Burst barrel, sash tiers and lookout are visible. The old red oval still protruded beyond the actual white scroll silhouette; `fit_scroll_paint()` corrects this in the subsequent access generation, pending new visual inspection. These screenshots precede the new ladder/hatch/outdoor toilet shell repair.

First coherent access export: asset checks **86/86**, actual envelope **85.8×45.726×123.2 m**, five moving hatches/33 openings, and no static body intersection along the 72.22 m lookout guide. Its browser climb reaches the closed hatch without placement/flight/recovery and preserves Inspect pose. The initial opening fails because the collision stop leaves less clearance than the hatch occupancy interlock requires; the controller now uses the same shared contact margin. Outdoor toilet shells are moved under the fore stairwells, but their first 0.95 m entrances fail connected-grid access; matching normal 1.10 m openings/frames are rebuilding. No successful full ascent/return or toilet entry is claimed yet.

Broadened first-set motion captures pass grounded/no-recovery/drift checks. Deck/plant sampled pixels: 0%; broad glass region: 0.1224% changed with mean channel change 0.0496; transparent/moving backgrounds remain in that region. 60.24 fps at 1440×900 on Chrome ANGLE Metal / Apple M3 Pro. These are limited measurements; inspect actual pairs before a flicker verdict. Geometry/colour corrections are now authored for the next rebuild and will need fresh validation.

Sukhjot's latest phase order is exterior construction/placement/base colours/function, exterior textures/lighting, then room by room. His newly supplied golden-hour image is the material/lighting quality reference; SBS/anime/manga remain the design evidence.

## Exterior physical access review — October 2, 2026

The coherent hatch-envelope export passes 87 structural checks and the exterior walking-plane coplanar audit. Collision planning reaches all 25 rooms and both fore cabin approaches, but StorageStair_over remains disconnected (8/9 interior flights); no full-suite pass is claimed.

`review/exterior-hatch-envelope-access-outside.log` passes both outdoor toilet thresholds/returns, each of the Soldier Dock/Aquarium/Kitchen hatch E openings, upper-tread descent and reverse journey, lid closure, real outside aft/garden stair descents and return to spawn. `review/exterior-lookout-lid-return.log` passes the full continuous lawn → guide rope → hanging ladder → closed/open hatch → real lookout floor excursion → closed-hatch return stop → E reopening → ladder/rope reverse descent → original spawn. Player size/speed and collision remain intact; neither suite uses teleport, flight, placement or recovery.

The lookout return exposed two genuine runtime faults: committing progress against a swept floor ignored its 2 mm separation plus Float32 export offset; the hatch sweep falsely expanded vertical clearance by its horizontal travel. Both are repaired with bounded movement and continuous body checks preserved. The flat-lid sweep uses endpoint bounds, allows withdrawal beneath supported feet, and still rejects closing through a person in the shaft. Regression tests preserve all earlier assertions and add measured floor-contact/body-occupancy checks.

All nine `construction-access-*` pictures and three annotated plates were inspected. Their broadside/quarter views still expose a raised lower red section at the dock edge; E03 needs exact mesh review. The gold collar behind the lion was incorrectly narrow, and foremast collars were white. Corrected source paint is rebuilding in `review/exterior-bow-collar-assets.log`. The supplied N/F2 drawings also establish a real hatch type/station difference: the current 3.7–5 m stair covers are functional reconstructions, while N shows a small framed gallery hatch and F2 a stern ladder hatch to the observation room. Detailed station evidence is retained in the feature ledger. These remain geometry issues before textures.

The latest complete suite remains the preceding 10/14 FAIL. A fresh 17-suite run will follow stable asset publication; production build after the new runtime access repair passes in `review/exterior-access-return-build.log`. Earlier failure captures are historical and do not depict a current complete success or exterior acceptance.

## Complete access/bow baseline — October 2, 2026

Coherent bow-collar assets (`review/exterior-bow-collar-assets.log`) pass **89/89 structural assertions**. All nine `construction-bow-*` views have been inspected; the broad collar and dark foremast bands now match the selected paint anchor. The measured projected gold coverage is 49.1%. The raised red lower scroll volume remains and is undergoing a source-mesh reconstruction; those captures precede that next export.

The complete single runner (`review/exterior-access-complete-suite.log`) finishes **12/17 PASS, 5 FAIL**. Failures are roomRoutes, gameplay's lower-compartment doorway, interiorJourneys, and two new browser suites that failed before launch due to a bare JSON import in their newly shared configuration dependency. The latter startup cause is repaired with standard JSON import attributes after run completion; a pure configuration regression and production build pass (`review/exterior-config-compatible-build.log`). The new camera-aim captures and the whole runner still require rerun; do not convert their preceding isolated walking passes into full-run passes.

Passed actual exterior evidence includes all four fore/aft main journeys with return descents, the 360° balcony, real Library threshold/return, complete gallery transfer/slide descent, both long side passages/returns, real helm/instrument/dock/mane/Gaon/Burst control walking and continuous descent after navigation. Gameplay remains **62/63**; the failed lower-compartment doorway is retained. Interior actual failures are Energy Room, Library, Bath, AquariumStair, both Kitchen flights and StorageStair_over. Both Soldier Dock flight returns now pass. The full-tour Library failure is a different approach than the passed outside Library threshold; neither result cancels the other.

Motion: real grounded walking/no recovery/drift, deck/plant stopped samples **0.000%**, glass sample **0.103125%** including background; **60.197 fps** at 1440×900 on Chrome ANGLE Metal / Apple M3 Pro. Region data are in `review/exterior-motion-regions.json`; moving/stopped images still need actual inspection. These measurements do not establish all-surface stability or future texture performance.
## October 2 thin hull skin / evidence review

The source-fitted 0.10 m red panels are now published with visual/collision/metadata together. All nine `construction-skin-*` views and their annotated front/port/top comparison plates were inspected: the raised red oval beside the dock is removed, the white U border remains visible, and sampled small-port frames appear mounted. Visual export: 28.26 MB, 547,481 triangles; 89/89 structural assertions and exported walking-plane overlap audit pass. These checks do not close unresolved canonical hatch type/station or hidden hardware counts.

Actual plant stopped/5-second frames appear stable. The earlier glass evidence mostly frames the roof and sky, so its measured percentage cannot establish window stability. A corrected normal-eye target and repeated glazing captures are required. The most recent full runner is still the preceding 12/17 baseline with five failures; no current full-suite success is claimed.

## October 2 small reference ladder hatches

Current coherent publication (`review/exterior-stern-doorway-assets.log`) replaces the long Aquarium and central-garden Kitchen stair covers by the supplied small gallery grille and stern/Library ladder hatches. Visible upward hinge motion and independently tested collision bounds agree. The stern lower floor follows the actual shell section, with a real doorway/short unfurnished access neck. The doorway's filled overall wall proxy is corrected to preserve actual remaining wall/lintel solids. No room furniture phase is resumed.

Current structure: **93/93 PASS**, 5,645 meshes/544,083 triangles, 34 openings/five hatches, three climbs. Collision plans reach **26/26 rooms**, both fore approaches, **5/6 retained flights plus both replacement ladder endpoints/full-body shafts**. StorageStair_over fails. Original room checks and full replacement connection/ascent/return coverage remain. Production build passes (642 modules, 2.00 s); FBX/scale/player dimensions intact.

All nine `construction-ladders-*` pictures/three comparison plates are inspected and depict current visible geometry. Prior Aquarium full descent/ascent/closed-lid stop/closure/outside return passes in `review/exterior-aquarium-ladder-access-ready.log`. Current two-ladder journeys add lower-floor excursions/new stern connection; full results pending in the active complete 17-suite `review/exterior-reference-ladders-complete-suite.log`. Exact offsets, hidden stern neck/Library interpretation, glazing/rigging counts and stowed anchor hardware remain inferred/unresolved.

The current motion driver walks to a normal-eye Library pane and independently requires it to be the first camera-ray hit before accepting glass samples. New evidence pending. Curved-part faceting and a small red-skin station crease remain under review before materials.

The complete reference-ladder runner finishes **13/17 PASS, 4 FAIL**. Both actual reference ladders include full descents, supported lower-floor excursions, walking returns, closed-lid stops/E operations, ascent/closure and original outside returns to spawn. Lookout full return and all other exterior paths/controls pass. Retained actual room failures: Energy Room, Bath, StorageStair_over; Library now passes. Floor planning still fails Storage's upper flight and gameplay still fails the lower-compartment doorway. Motion's first camera ray hits the intended Library glass, but Three sanitizes a dot from its source name; the test now resolves preserved `userData.name` and asserts exact object identity. Fresh actual pairs are still required.

## October 2 final report before further graphics

[Current report and screenshots](pre-graphics-review.md) supersede earlier pending counts. Coherent current publication is `exterior-metric-uv-corrected-assets.log`, 40.89 MB visual / 23.14 MB collision. Fresh complete `npm test` finishes **14/17 PASS, 3 FAIL** ([full log](review/pre-graphics-complete-suite.log)); production build **PASS** (643 modules, 1.93 s). Failed suites: asset structure, browser gameplay and the continuous interior tour. Original structural assertions and walking/underside/coaming overlap checks are retained. Structure is 103/104; metre-UV consistency fails on six nearly degenerate Line002 triangles. Cause/cleanup remains unresolved.

All 26 room centres, six retained tread flights, both reference ladder endpoints and both fore approaches pass planning. All six actual tread-flight round trips, including both Storage returns, pass. Both fore approaches and the forced stern ladder return pass. Energy Room/Bath entries and the Aquarium interior grab approach fail; the same ladder passes its complete exterior route. Gameplay remains 62/63 because the open lower partition doorway blocks passage. The tour harness restarts after failures; there is no passed continuous whole-ship tour. Actual failure evidence: [Energy](review/pre-graphics-stall-Energy-Room.png), [Bath](review/pre-graphics-stall-Bath.png), [Aquarium interior approach](review/pre-graphics-stall-Ladder-Aquarium-gallery-ladder.png). The Aquarium grab prompt is visible, but the physical endpoint check fails; its cause is unverified.

Actual main/expanded exterior routes, full hatch/lower-floor excursions/closed-stop/E-reopen/reverse ascent/outside returns, full lookout ascent/floor/return and walking to controls pass. Pointer/orbit and final visual suites pass without runtime errors. Current sampled deck/plant/normal-eye actual-glass stopped changes are 0.000% over five seconds; 57.13 fps sampled at 1440×900 on Apple M3 Pro/ANGLE Metal. All corresponding image pairs are inspected and copied to stable report paths. Close grass patterns remain visible; stopped pixel stability is limited evidence. [Library ceiling overlaps](review/pre-graphics-walk-Library.png) remain a construction defect despite passed access.

Exterior reference acceptance/sculpt/shared envelopes/hidden hardware, reversed Dining/Kitchen sides and reference-led room furnishings, access failures and detailed dock vehicles remain unfinished. Partial maps were staged earlier; the Golden Hour quality target is not achieved. Sukhjot explicitly requested no further graphics until review. This report turn changes documentation/evidence only, with no runtime/pipeline/material/test changes or asset rebuild.

Current stern ascent/descent pictures are inspected. The shaft exposes coincident floor/neck/frame undersides and furniture bottoms beneath zero-thickness floors. The next source generation removes coplanar bases with the broadened existing ownership rule and gives exposed access floors a real 12 cm cream underside, retaining tops/holes/heights. Curved source paints regain custom smooth normals with real creases retained. These repairs are staging in `review/exterior-surface-ready-assets.log`, with fresh actual export checks/images required before acceptance.


## October 2 shared slab construction checkpoint — graphics held

This construction checkpoint follows the preserved delivered [pre-graphics report](pre-graphics-review.md). Current coherent publication is `review/exterior-shared-slab-assets.log`: 33.54 MB visual / 22.91 MB collision, unchanged source checksum and 85.8 × 45.726 × 123.2 m envelope. The opaque 18 cm shared Library ceiling/Bath floor now has one owner per exposed plane. Original walking/coaming checks and the new slab depth/ownership regression pass; all 104 asset assertions, including the unchanged metre-UV assertion, pass. Production build passes. No material, texture or lighting implementation changes.

Nine fresh exterior views and three source-comparison plates are inspected; capture has no browser/shader errors. Actual normal-human Library entry/return and full stern ladder ascent/descent/outside return pass without placement, flight or recovery (`review/exterior-shared-slab-library-walk.log`). [Library normal-eye view](review/construction-slab-walk-library.png) now shows an opaque clean ceiling; [stern ladder endpoint capture](review/construction-slab-walk-stern-library-ladder.png) preserves the actual controller pose but its aim is filled by a nearby beige surface, so it does not provide useful shaft appearance evidence. The complete ascent/descent/return proof is the recorded physical journey. Fresh current [mid-shaft ascent](review/construction-slab-walk-stern-library-ladder-ascent.png) and [descent](review/construction-slab-walk-stern-library-ladder-descent.png) photographs from the completed full-run access suite are also inspected; the frame and opaque undersides are visible without the earlier broad coincident stripes. These sampled images do not establish hidden geometry or final materials. The filtered Library run does not replace the complete runner.

A fresh unchanged 17-suite run is still required (`review/exterior-shared-slab-complete-suite.log`). Earlier Energy/Bath/Aquarium interior approach/lower-compartment doorway failures stay unresolved until verified on this publication. Rounded fore cabin construction, remaining exterior sculpt/hidden structures, accurate room layouts and detailed vehicles remain unfinished. This is not full exterior or anime/manga accuracy acceptance. Further graphics stay held for Sukhjot’s review.


Current complete shared-slab runner finishes **14/17 PASS, 3 FAIL** (terminal exit 1, completed session 86955). Asset structure is now **104/104 PASS**; gameplay retains the lower doorway failure (62/63), interior tour retains Energy/Bath/Aquarium interior approach failures, and expanded exterior newly stalls at `return garden clear passage`, actual feet `[23.470278, -29.154699, 2.575697]`, grounded/no recovery/blocker null. Later gallery/slide/side-passage checks were not executed in this failed suite; the preceding run’s expanded PASS must not be presented as current proof. All four main outside ascent/returns, both reference ladders/toilets/Dock hatch/full lookout return, all six retained interior flight round trips, both fore approach returns, forced stern ladder full return, controls, pointer, motion and visual suites pass. Current motion samples are 0.000% stopped deck/plant/glass change over five seconds and 60.21 fps at 1440×900 on Apple M3 Pro/ANGLE Metal; actual image inspection remains required before citing quality. No source/assets/materials/tests changed during verification. Graphics remain held; the new expanded return is the next construction/function investigation.

## October 2 completed garden-return rerun — graphics held

The fresh complete runner `review/exterior-garden-return-complete-suite.log` terminates exit 1, **15/17 PASS, 2 FAIL** (session 18517). All exterior walking/access/lookout/controls/return suites pass. All six retained interior flight round trips, both fore approach returns and both complete forced ladder ascent/descent/outside returns pass; Energy Room/Bath entry and the separate lower-compartment doorway remain failed. The earlier Aquarium endpoint failure did not repeat; measured 0.20666 m versus strict 0.20 m sensitivity remains disclosed. Full-tour continuity and full reference fidelity remain unproven. Sampled motion is 60.42 fps with 0.000% stopped deck/plant/glass change; the current report’s inspected frozen 60.21 fps image set remains separately identified. Nine corrected-route photographs are inspected, including their mast/wall aim limitations and unfinished pot/deck/rail/enclosure geometry. No implementation, assets or graphics changed during this completed runner. Forward-enclosure authoring is next.
## October 2 rounded front/helm construction — graphics held

Current coherent front publication is **33,695,584 bytes visual / 24,379,788 bytes collision / 277,118 bytes metadata**, with 5,628 visual meshes and unchanged FBX/enlarged ship/normal human dimensions. Actual F1/F2 floors/walls/18 cm ceilings follow sourced rounded hull sections; separate helm support follows Line006 footing with an opaque 18 cm underside. Chest/four partition ends stay within the checked hull sections; both outline metadata records now serialize. The retained source curved helm guard is 1.05 m with embedded posts/open approach; the duplicate source Log Pose pole is removed. Station/radius/short aft continuation are explicitly reconstructions; whole facade/room/sculpt accuracy is unaccepted.

Final exported asset checks **104/104 PASS**, all **seven geometry groups PASS**, production build **PASS**. Both complete 17-checkpoint actual fore/helm journeys and all four return-flight descents/spawn returns pass without flight/placement/jumps/recovery. All nine current exterior views/three source plates/six normal-eye photographs/two close Inspect details are inspected, with no capture errors; close wheel framing and deliberately hidden surrounding meshes are disclosed in [current report](construction-review.md).

Required full unchanged 17-suite runner is **active**, session 9639, `review/exterior-fore-final-complete-suite.log`; source/tests/runtime/assets are frozen. Prior lower-doorway/Energy/Bath failures and Aquarium endpoint sensitivity remain open until current verification. Closed mikan pot caps, detailed figurehead/facade/rail/hardware/cannons/vehicles and accurate rooms remain construction work. No textures, lighting or runtime/player change; further graphics stay held for Sukhjot's review.

Final front full runner terminates exit 1, session 9639: **15/17 PASS, 2 FAIL**. Every exterior/return/access/lookout/control/pointer/motion/visual suite passes. Retained failed suites are lower-doorway gameplay (62/63) and room tour (Energy/Bath/Aquarium interior endpoint). All six retained flight returns, both fore approaches and forced stern ladder ascent/descent/outside return pass. Aquarium outside full return passes; interior feet are 0.21842 m from the strict 0.20 m endpoint. Stable current motion/control/failure copies exist; their inspection follows before image-quality claims. Source/tests/runtime/assets stayed frozen; no graphics change.

## October 2 hollow mikan publication and physical endpoint driver — graphics held

The pot baseline independently reproduces missing physical bodies after all seven old geometry groups pass. Actual exported caps hide soil 3 cm below clay tops. `mikan_pot()` now preserves all three 0.60 m/1.12 m positions and colours, constructing open annuli/inward clay walls/supported bottoms and standard conservative solid proxies. Wall/base thickness is reconstructed. Coherent publication is 33,714,568 / 24,381,184 / 277,118 bytes; original FBX, 2.2 scale and normal person remain unchanged. All eight independent export groups/104 structure/route plans/build pass.

First detour contact and true soil-camera ray pass, but the transverse Z=0.7 return stops at the raised Library railing. Exact failed trace/images are preserved. The corrected actual-input open-garden detour completes 72 checkpoints through pot contact/soil visibility, full 360° balcony, Library threshold/return, gallery/slide descent, both side passages and outside lawn return with zero recoveries/errors. The initial ten normal-eye images are inspected; five mast/bow/wall aims are preserved and corrected in the test's new camera-only `view(target)` helper. Nine fresh exterior views/three source plates are all inspected; figurehead/facade/rail/rig/soffit/hardware/vehicle accuracy remains unaccepted.

The ladder grid driver now finishes by actual `driveTo(pointAt(climb,0),.10)` before the unchanged strict 20 cm grab. Targeted Aquarium arrival is 4.1 cm from the endpoint; complete normal-speed ascent/closed-lid stop/E reopen/descent/outside lawn return passes. This fixes driver approach, not room construction. Current complete unfiltered 17-suite runner is active session 67618 in `review/exterior-mikan-container-complete-suite.log`; source/tests/runtime/assets remain frozen. Current lower-doorway gameplay still fails (62/63); no overall result or full-room tour pass is claimed while later suites run. No textures, lighting or runtime/player changes.

**2026-10-02 — Slide/Aquarium envelope intersection confirmed.** The current complete runner's exterior stage passes all 72 checkpoints, and all ten exact photographs are inspected. Corrected Library/chute/passage aims expose the real upper-chute defect in `construction-mikan-walk-Slide-entry.png`: cream `Sunny_Aquarium_ceiling` triangles precede the gold `Sunny_Slide_chute` at sampled actual-export camera rays, 2.0–3.5 cm above the chute surface. `construction-mikan-slide-surface-audit.json` records the identities/coordinates. Existing geometry groups exclude this intersection. Keep E22 open, add independent chute/envelope clearance regression, and preserve supported construction/complete human walking returns when repairing it after the frozen full run. No material or lighting change can repair the geometry. Balcony frames 1/2 mostly show ocean/rails and therefore do not accept whole stern structure.

**Completed mikan full runner — 2026-10-02.** Session 67618 terminates exit 1, **15/17 PASS, 2 FAIL**. Gameplay retains lower-compartment open doorway (62/63); room tour retains Energy Room/Bath only. Both physical ladder approaches/full ascent/descent/closed-lid/outside returns, all six retained flight round trips and both fore approaches pass. Current full Aquarium approach is 8.9 cm from its strict 20 cm endpoint; targeted 4.1 cm stays separate. All exterior/access/lookout/control/return/pointer/motion/visual suites pass. All 61 frozen source/test/runtime/package plus original FBX/three asset hashes match afterward; terminal receipt preserves checks.

All 15 current motion frames/seven controls/four room endpoint/failure frames and gameplay context are inspected. Deck/plant/actual Library pane stopped regions change 0.000% over five seconds, sampled 60.05 fps/1440×900/M3 Pro ANGLE Metal. Repeated grass patterns and pot/roof/figurehead faceting remain unfinished. Wheel/lawn return are useful, but mane/instruments/Log Pose still mostly show floor, Burst ocean and Gaon wheel; ladder endpoint frames face sky/wall. The lower gameplay context shows rough dock contents, not the exact blocked doorway. No appearance acceptance is inferred from those photographs. Same-X/Z vertical rays independently measure actual ceiling/chute penetration 1.97–3.53 cm; differing camera-ray hit heights are not the penetration measurement. Supported slide-envelope construction and source sculpt/facade/rig/cannon/machinery work remain open. Graphics and rooms stay held/deferred.

## October 3 supported slide and retained Aquarium boundary — graphics held

The independent baseline passes the eight preceding groups, then reproduces upper-chute ceiling intrusion, a missing opaque underside, four ~16 cm unsupported post heads and four missing physical post bodies. `fit_slide_envelope()` trims only intersecting Aquarium skin using actual chute triangles; `slide_support()` fits complete head rings to the real underside. Original top/stations/width/lips/colours remain; 6 cm structural depth and 2 mm post contact are explicitly reconstructed. All three staged assets publish together: 33,840,740 / 24,408,352 / 277,118 bytes, with original FBX unchanged.

Current nine exported geometry groups/1,120 chute section rays, 104 structure checks, all access plans and 643-module/2.21 s build pass. Targeted actual expanded journey finishes all 72 original checkpoints, full balcony/Library/gallery/slide/both side passages/lawn returns with no recovery/error. All 62 whole-descent observations are grounded, with −1.37 to +23.78 cm feet-to-highest-actual-footprint-bed differences within the unchanged 35 cm contact band. Both normal-eye slide photographs are inspected and the cream fragment is absent. Contact sampling is not a zero-error claim.

All nine fresh exterior views/three reference plates are inspected; faceted figurehead/roof/vegetation, box-like tier shapes/lookout underside and unsupported hardware/cannon fidelity remain. Top hides canvas/ratlines but has other occlusion; H's open cannon pose is not matched by the idle closed-mouth capture. Current full unchanged 17-suite runner **68574 finishes exit 1: 15/17 PASS, 2 FAIL** in `review/exterior-slide-envelope-complete-suite.log`. All 63 freshly inventoried source/test/runtime/package files plus original FBX/three assets match afterward in the terminal receipt. Gameplay retains the lower-compartment doorway failure (62/63); room tour fails Energy Room, Bath and newly exposed Stern Ladder Access. All other suites pass; no continuous whole-ship tour or finished construction is claimed. Rooms/graphics remain deferred/held. Rough 30–40% remaining exterior effort stays a judgment rather than a measured accuracy score.

Current complete-run slide repeat observes 61/61 grounded samples over 2.9995 s with −2.27 to +25.13 cm footprint-bed differences within the original 35 cm band, no recovery/errors; the targeted 62-sample result stays separate. All ten current walking/15 motion/seven control/five room-failure-endpoint photographs plus gameplay context are inspected. Deck/plant/actual Library pane regions show 0.000% five-second stopped change; sampled 60.15 fps, 1440×900/M3 Pro ANGLE Metal. Mane/instrument/Log Pose frames mainly show floor, Burst ocean, Gaon wheel and ladder endpoints sky/wall; gameplay context is rough dock contents, not the exact lower-doorway stall. These limitations remain explicit.

The new Stern Ladder Access stop equals the first physical slide post's min-X minus the normal 0.34 m radius; actual future raised pose is clear but the 40 cm floor cell begins beyond initial post contact. Keep physical posts/body/tests and refine support against the real curved bed before acceptance. Separately, exported unique-vertex/end-ring measurements show four unsupported balcony bar ends 43.38 cm from nearest post axes. Both are next exterior construction repairs, regardless of intended walking PASS. No room layout/graphics/runtime change accompanies this diagnosis.

## October 3 final curved-bed contact, gallery entry and supported balcony joins — graphics held

The preceding continuous room-tour stop is independently reproduced at upper slide post min-X minus unchanged 0.34 m body radius, before the coarse 40 cm floor can supply a step. Actual export baseline also rejects 60 balcony bar ends off retained post axes, including four free entry ends 43.38 cm away. Authoring now clips actual curved bed triangles into <=10 cm footprints (1,236 physical floor boxes) and connects both rail levels through all 23 retained post axes with 44 bars, retaining stations/entry gap/body/posts/tests.

Initial contact publication passes the original filtered Stern approach/full walking return and complete exterior target. Newly inspected entry photography reveals a small cream fragment; read-only actual triangle rays identify upper `Sunny_AftEntryDeck`, not previously fitted Aquarium skin. Expanded ownership baseline fails on that gallery layer before repair. `fit_slide_envelope()` now also fits only its chute intersection; whole-slide rays and >=98% retained deck plan/F2A station protect surrounding construction.

Final coherent publication 84640 is terminal exit 0: 33,893,148 visual / 24,990,488 collision / 277,417 metadata bytes, original FBX unchanged. Eleven geometry groups/104 structure/route plans/build pass (643 modules, 2.25 s). Final original 72-checkpoint exterior target/returns pass, no errors/placement/flight/jump/recovery; 61 descent samples are grounded (+3.62..+18.91 cm within unchanged 35 cm band), not zero-error acceptance. All nine final Inspect views/three plates/ten targeted walking photos are inspected: entry cream lip is absent and retained-post joins are visible. Figurehead/facade/opening/rig/hardware/soffit/cannon fidelity remains incomplete; plates and targeted passes do not establish whole-source accuracy.

Final full original unfiltered 17-suite runner 40523 is active. All 63 source/test/runtime/package/config and four source/publication hashes matched before it and still match during documentation updates. Lower-compartment doorway has repeated (gameplay 62/63); continuous room-tour/Stern/control/access/motion results require terminal current verification. Preceding supported-slide 15/17 remains historical. Source freeze/player/runtime/rooms/graphics hold remain; 6 cm depth/2 mm contacts/exact metre offsets are reconstruction choices.


## October 3 terminal final-contact verification and unchanged repeats

Complete original unfiltered 40523 is terminal exit 1: 14/17 PASS, gameplay lower doorway plus room/control detached-frame suites fail. Unchanged control repeat 86550 is terminal PASS, including all actions/continuous return; all seven photos inspected with floor/ocean/wheel framing limits. Unchanged unfiltered room repeat 65156 is terminal FAIL Energy Room/Bath/Observation Deck, with continuous Stern approach/segment return, all six retained flight round trips, both strict reference ladders/returns and both fore returns PASS. All 67 source/publication hashes still match; neither repeat replaces the full result or establishes a whole unbroken tour. Four selected current failure/endpoint photos are inspected, including poor wall framing; 42 exact repeat photos are preserved separately. Observation stop is the internal Bath-stair descent before the outside deck; actual unchanged normal-footprint proposals lose upper floor and leave a 1.003 m probe distance exceeding the existing 0.90 m guard. Preserve this room-route failure for its actual repair, without changing body or guards. No source/runtime/room/graphics change.


## October 3 current curved-mane construction — graphics held

Six retained side blades are rebuilt from H/A/C curved forms; central crown/seven closed bodies/source roots/tips/depth/mechanisms/base paint are retained. Twelve independent exported geometry groups/104 structure/all access plans/build PASS; actual nine-section bends 0.2055–0.3281 head radii versus 0.0436–0.0943 baseline. Coherent publication is 33,915,156 / 24,993,060 / 277,405 bytes. All nine matching views/three source plates/six close closed/open/both-side views are inspected. Staged mouth exposes unresolved cavity/opening/cannon presentation/face construction. Boundary counts alone do not certify closure; initial single-plane interpretation was rejected from actual multi-height data. No new graphics/room/runtime/body work. Current complete original unfiltered runner 56030 is active on 67 fixed hashes; gameplay lower doorway repeats at 62/63. Old contact full 14/17 and later repeats remain preserved separately, not substituted. Whole figurehead/exterior/continuous whole ship remain incomplete.

### October 3 current curved-mane terminal checkpoint

Original full unfiltered npm test 56030 is terminal exit 1: **15/17 PASS, 2 FAIL**. Lower-compartment doorway (62/63), continuous Energy Room and Bath access fail. All current exterior/access/lookout/controls/motion/visual suites, six forced stair round trips, two strict ladder round trips and both fore returns pass. Current continuous Stern segment and walking return pass; failed earlier room segments require reset, so whole unbroken room tour remains unaccepted. Observation passes without source repair; historical descent sensitivity stays disclosed. All 67 frozen source/publication hashes match after the run. The terminal receipt preserves 109 timestamp-qualified original artifacts; 22 of 105 full-run PNGs are inspected, other 83 pending, plus all 18 separate matched Inspect/reference views already inspected. Actual mane action and Stern endpoint pictures mainly face floor/wall and do not accept feature appearance. Three current stationary deck/plant/actual-pane pairs are inspected with 0.000% measured change over five seconds; sampled 60.25 fps does not certify final graphics. Repeated fine patterns/faceting remain. Geometry/rooms/graphics completeness is not claimed; graphics stay held. Exact receipt: `review/construction-mane-verification-receipt.json`.


## October 3 mouth construction and real runtime frame repair

Current coherent mouth publication passes 13 exported geometry groups (240 open owners/eight mane angles plus all earlier checks), 104 asset assertions and all access plans. Fresh runtime build passes. Actual physical verification reproduced two different problems: correct-project Vite served old NavigationSystem, then refreshed code cached jaw collision in initial Inspect bobbed world space rather than authored ship space. Both diagnoses/baselines are preserved. Exact descendant vertices in root-relative space now pass original 2 mm open/closed checks and targeted actual controls/return/Gaon. Fresh pictures/full unfiltered verification are required; no whole-front/exterior/room/graphics acceptance follows. Rough construction effort remaining 30–40% exterior/60–75% interior; graphics additionally held.

October 3 fresh actual-runtime appearance: all 18 views/plates and seven preserved targeted control photographs are individually inspected. Open cavity clears all mane bodies, but the 90° lower panel extends too far below the face with a visible black strip/tray; open pose/proportions/cannon presentation need source-led refinement before exterior acceptance. Face/eyes/nose/bones/disk and remaining external detail also remain open. Control action frames have floor/ocean/wheel framing limits. Current receipt: `review/construction-mouth-appearance-receipt.json`; full original unfiltered runner active, no source/asset edits overlapping it.

Current A/C side/source comparison also keeps sail shape/yard attachment and rigging topology open; the broadside silhouette and base lion hue still need source matching. The current anime anchor has a yellow face and orange mane, while manga mane tints differ. Retain the declared A colour variant rather than mixing them. No metre measurement is inferred from these perspective drawings and no source/asset edit occurs during full verification.

Current open-pose diagnosis measures the lower muzzle **2.802 m / 0.591 head radii below the entire face** at the authored 90° pose. Exact exported minimum-X-to-open-Y transformation proves this without intermediate-angle box inflation. H shows a compact chin adjacent to the opening; refit lower muzzle/panel/proportions together after terminal verification. Data: `review/construction-mouth-open-pose-diagnosis.json`. Reference supplies no official hidden metre/hinge/angle dimensions.

Independent steered-camera correspondence remains unverified: the actual action photos consistently face floor/ocean after heading changes, while the control test checks local player stability and navigation state rather than world-space eye correspondence with the rendered hull. NavigationSystem applies camera pose in a default-priority frame callback and Explore PlayerController mounts conditionally, so subscriber order warrants an actual matrix-based check after the fixed full runner. Treat this as an investigation, not a verified failure or reason to change assertions without a baseline.

## October 3 independent steered-camera failure and compact-mouth batch

The original mouth full run completes 15/17 PASS with all 67 source/publication hashes unchanged; lower doorway and Energy Room/Bath/Observation tour fail. Previous Observation PASS without repair does not repeat. Existing exterior/control-state passes missed actual camera correspondence. After terminal completion, independent rendered ship-matrix/normal-eye diagnosis measures zero pre-steering and 7.24587 m post-steering error. Added 5 mm steering/Burst/landing assertions reproduce 7.22440 m failure before runtime repair, then the complete original targeted controls suite passes with explicit -2 local physics/eye, -1 voyage transform, default 0 ship rendering. No body scaling or tolerance waiver.

The current source then reduces the 90° open-mouth tray to a 65° source-led fold at its real bottom edge, aligns authored Blender -Y axis with actual Three +Z, and corrects A's base yellow. Actual-export excess lower-face descent falls 0.591 → 0.269 head radii while all existing aperture owner samples stay clear. Exact reference hinge/angle sizes are unprovided and reconstruction remains disclosed. Coherent publication, thirteen geometry groups, 104 structure/access checks and build (643 modules/2.15 s) pass. All eighteen matched appearance views are inspected; whole source face/cannon/sails/facades/hardware remain unfinished. This supersedes the earlier unverified camera investigation with a reproduced defect and repaired independent guard.

Combined original unfiltered **3491 ends 2026-10-04 01:56:00 UTC, exit 1: 15/17 PASS, 2 FAIL**, all 68 frozen hashes unchanged. Lower doorway (62/63) and continuous Energy Room/Bath tour access fail. Observation passes without geometry repair, so earlier transition failure remains open for repeatability. All original exterior/access/lookout/control/pointer/motion/visual suites and all six forced stair/two strict ladder/two fore returns pass; failed/reset room segments still preclude an unbroken whole-ship tour. Current full 5 mm camera and 2 mm jaw assertions pass, with wheel/instruments visibly retained in all seven inspected controls pictures. These helm frames do not show actual mouth/cannon operation directly.

Exact receipt `review/construction-mouth-camera-verification-receipt.json` preserves **108 timestamp-qualified original artifacts, 105 PNG / three JSON**. **35 PNGs individually inspected / seventy pending**, plus all eighteen separate matched images. All fifteen motion photos inspected: stopped deck/plants/actual Library pane regions change 0.000% over five seconds, sampled **49.96 fps at 1440×900/Apple M3 Pro ANGLE Metal**. Fine repeated patterns/faceting remain; fixed-pose stability does not establish absence of movement aliasing or finished graphics. Observation endpoint mainly frames a wall, not its room layout. No source/assets/second browser/Blender overlapped full verification; scale/body/FBX/room pause/graphics hold remain.


## October 4 current face generation

The 26 new baseline facial mismatches are repaired; all fourteen exported groups/104 structure checks/build PASS. Smaller muzzle and nose and circular attached eyes improve selected A/H references in eighteen inspected current views. Whole-front and broad exterior accuracy remains open. Original full runner 99390 started 04:09:25 UTC, remains active and repeats the lower-doorway failure; both fore return and expanded exterior journeys pass. Prior 15/17 and 49.96 fps belong to the earlier camera publication. Current report and appearance receipt distinguish pending physical/control/motion acceptance. Graphics held; rooms follow exterior completion.


### October 4 source-state correction and next geometry audit

Complete supplied O/page26 explicitly depicts the full Straw Hat Jolly Roger on the deployed fore white canvas. The current pipeline declares deployed O; anime A is gathered. Withdraw the previous hat-only defect rather than mixing those states. Keep black flags/full white Roger and investigate actual canvas-to-yard joins, source bone outline/volume and the barely discernible scalloped underside against A/N. Exact source geometry and independent export measurements must establish the next repair. No realistic graphics or room layouts start.


## October 4 fittings construction and active complete verification

Both white-canvas head edges/all 26 retained loops now meet actual oval spar skin, and lookout/aft bays are radially recessed. Initial landing-skin lip is cleared only inside the existing stern shaft, preserving floors/stations/body. Corrected coherent export 93219 terminal exit 0; sixteen geometry groups/104 structural assertions/all route plans/build pass. All eighteen actual current preview/detail/source pictures are inspected; no capture errors. Sewing/sector metrics remain reconstructed and full soffit/window/cloth/rigging/figurehead/dock fidelity remains unfinished. Original unfiltered 17-suite run 95551 is active on 68 fixed hashes; actual journeys/returns/control/motion/room results remain pending. Front and facade source audits are read-only during the freeze. No graphics or room furnishing starts. Current report: `construction-review.md`; exact appearance receipt: `review/construction-fittings-appearance-receipt.json`.

## October4 corrected fittings verification — terminal

Original unfiltered runner95551 is terminal exit1(06:33:03–07:04:25UTC),15/17 PASS with all68 hashes unchanged. Outside/access/lookout/controls/return/pointer/motion/visual checks pass; lower doorway/Energy/Bath fail. All35 selected current physical/control/motion PNGs are individually inspected,70 additional PNGs pending;18 separate matched appearance images inspected. Stopped deck/plants/actual Library pane change0.000% after5s,sampled60.22fps at1440×900/M3Pro ANGLE Metal. Mechanism external framing and canonical fidelity remain unaccepted. Exact preserved report:`construction-fittings-review.md`; next source construction rounds retained bow bones/studs, encloses lookout windows and fits rig attachments/curved canvas. Graphics remain held and rooms follow the exterior.
