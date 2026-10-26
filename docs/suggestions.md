# Suggestions

Ideas, findings and follow-ups. Date-stamped, kept even after they are implemented so
the reasoning is not lost.

## 🔴 Vulnerabilities / correctness risks

- **2026-10-03 — Probe an opaque source shell before fitting internal cavities.** An imported head can have an open back while appearing solid from the front. Rear rays through the raw dome then return front skin and can silently empty an intersection. Source fitting now seals the head first, rejects empty/nonmanifold Boolean output, and uses a source-front-only closed chin rather than carrying rear skin into the moving face. Actual closed/open owner rays and exported body closure remain required; passing bounds alone does not accept the mechanism.

- **2026-10-01 — Blender parent deletion silently corrupts world transforms.**
  `bpy.data.objects.remove()` on a parent object does not re-parent its children; the
  deleted parent's contribution disappears from every child's `matrix_world`. This FBX
  parents a decorative sub-assembly to Empties, so deleting them moved objects away from
  the hull. *Fixed* in `tools/build_assets.py` by capturing world matrices before the
  delete and restoring them after. Worth remembering for any future Blender step.

- **2026-10-01 — `transform_apply`, `export_apply` and `Mesh.transform()` are all
  unsafe on this asset.** The FBX has linked mesh duplicates and negative scales.
  `transform_apply` flung 18 objects hundreds of units away; `export_apply` flips
  normals; baking with `Mesh.transform()` changed the exported vertex count from 177,736
  to 182,853. The pipeline now uses a pure `matrix_world` multiply and verifies the
  written GLB. **Do not "simplify" this back to an operator call.**

- **2026-10-01 — Stale bbox on the first read after import.** Measuring bounds before
  a depsgraph update returned a centre ~50 units off, so centring silently did nothing
  and the ship sat 24 m above the origin. Scaling and centring are now separate passes.
  Any future measurement taken straight after an import or transform should be treated as
  suspect until re-measured.

## 🟢 Improvements

- **2026-10-23 — Interior finish consistency (active).** Add physically scaled timber, cloth, tile, ceramic, paper and metal detail to the existing rooms. Keep authored tile colors and patterns, existing construction and exterior finishes; use source-relative projection for unmapped furniture so texture stays fixed during ship motion.

## 🟡 New features

- **2026-10-01 — Fly-mode altitude keys are inconsistent.** `useInput.js` maps `E` to
  up and `Q` to down, and the HUD documents `Q`/`E`, but `PlayerController.jsx` checks
  `k.jump` for ascent — so `Space` lifts and `E` does nothing. Should be switched to
  `k.up` / `k.down`.

- **2026-10-01 — Explore position is not really preserved across Inspect.** The
  controller unmounts in Inspect and remounts in Explore from `spawn`, so an arbitrary
  position is lost. The gameplay test passes only because it compares a position that is
  already at the spawn. Seed the controller from the stored `position` on mount.

- **2026-10-01 — The ship bobs but the collision proxy does not.** The ship group
  animates vertically while the colliders stay static, so the player drifts relative to
  the deck on a long enough wait. Either bob the collision proxy too, or damp the bob.

- **2026-10-01 — Merge the collision proxy.** It is 3.4 MB and 3,369 separate meshes
  (2,783 floor cells). Runs at 60 fps today, but a greedy box merge plus a uniform grid
  spatial index would cut both load time and the per-frame broad phase.

- **2026-10-01 — Real textures.** Every material is procedural because the source has no
  texture data. `plan.md` section 7 lists which surfaces an artist should replace first.

- **2026-10-01 — A pale-blue flat polygon** was visible in some third-person and deck
  screenshots and has not been positively identified. Likely one of the decorative
  sub-assembly objects. Worth a dedicated visual pass.

## 🟢 Improvements

- **2026-10-22 — Give the recovered closed house one owner for stair clearance.** The exact 66 real-tread standing cuts preserve both enclosures. A later legacy broad lower-flight cut erased the starboard cheek below the upper stairs. The native envelope is now excluded from that redundant cut; all other lower approach shells keep their existing clearance. Independent actual-export opacity, body/headroom and complete forward/reverse walking checks must verify the result.

- **2026-10-15 — Room construction evidence and remaining joins.** Implemented: one-owner Aquarium/F2 floors, closed curved library bench, measured bunk/ladder clearance and the hood/chimney join. Fresh `oct15-room-final-*` photos expose remaining garden-stair enclosure, native red bow trim inside fore cabins/Storage, provisional mast/lift boards, window-blocking infirmary fittings and absent lookout gym. Finish those physical joins and canonical furnishings before graphics. Four cannon-closet photos point at walls/doors and need fixture-directed framing; do not certify cannon fit from those images. Geometry/planning passes cannot substitute for reference appearance and real walking/returns.

- **2026-10-02 — Walk to the exact ladder endpoint after the grid approach.** Read-only measurement of the failed Aquarium interior approach gives 0.206657682 m from the actual lower endpoint, outside `ladderJourney()`'s unchanged strict 0.20 m assertion. The route ends at a grid cell and `walk()` stops within 0.14 m of that cell. The exterior excursion already uses actual movement to `pointAt(ladder,0)` within 0.10 m and completes the full ladder. After the current complete runner ends, verify an equivalent real-input final approach for forced interior ladders; retain all strict endpoint, speed, body-clearance, closed-lid, descent and outside-return checks. This is a diagnosis and proposed test-driver correction, not a verified fix or permission to relax tolerances. Energy/Bath and the lower doorway remain separate failures.

- **2026-10-02 — Open the mikan pots so their soil is exposed.** The normal-eye garden captures show a red/pink filled surface. `reference_tree()` uses closed `pole()` caps at +0.60 m above the pot floor, covering the existing brown soil at +0.57 m. Replace the closed cone by a supported hollow clay shell/inner wall, retain the three pots/trees and ordinary dimensions, then verify soil visibility and walking clearance. This is an unresolved construction/base-colour repair; no texture or lighting work.
  - **October 2 update:** implemented hollow containers with unchanged placement/size/colours. All three exported soil/inner-wall/support/proxy checks and the complete actual pot/balcony/Library/slide/side-passage return pass; current full 17-suite verification remains active. The original defect and exact failed first crosscut are preserved as history.

- **2026-10-02 — Verify barrel-to-port connections, not only the side-fitting count.** Current `hull_ports()` creates 14 mirrored dark fittings, but the four fore cannon models are authored along local X at stations that do not establish a connection through those fittings. Trace actual referenced tiers/closets/openings, construct supported cannon assemblies and preserve the two special air-cannon fittings separately. Detailed firing remains the final mechanics phase; this geometry/placement finding is unresolved and graphics remain held.

- **2026-10-02 — Trace the rounded forward enclosure before room furnishings.** F1/F2 supplied SBS plans and actual exported/source-hull sections show that the current rectangular fore shell/ceiling is unsuitable: one measured F1 corner extends roughly 3.6 m beyond the retained hull section. Use the measured curved tier contour with all approach, doorway, cannon-closet, soffit and support checks retained. Do not blindly copy a broad floor perimeter into walls. This is the next E42 construction repair, still unresolved while the complete suite runs and graphics remain held.

- **2026-10-02 — Make the Library ceiling and Bath floor one physical slab.** The current export duplicates most of their plane and several wall-header/landing faces. Keep both named room regions and the real stair slot, partition their faces, and give them opaque 18 cm depth matching collision. Geometry regression reproduces 51 pairs before repair; the rebuilt export, unchanged/new geometry assertions, fresh images and real Library/full exterior ladder returns now pass. Complete verification is active in the 17-suite runner. This is construction work while graphics remain held.

- **2026-10-02 — Inspect export slivers before the remaining UV work.** The current metre-UV assertion fails on six nearly degenerate `Line002` triangles; GardenDeck's 20 horizontal triangles pass. Compare their Blender areas and float32 exported positions before choosing geometry cleanup or a diagnostic refinement. Preserve meaningful surface/UV coverage and all existing tolerances; do not accept this finding as a fix. Further graphics wait for Sukhjot's requested report/review.

- **2026-10-01 — Single test runner.** `npm test` now boots the dev server if needed and
  runs all five suites with one summary. Individual suites remain available via
  `npm run test:physics`, `test:gameplay`, `visual`.

- **2026-10-01 — Removed `src/systems/sails.jsx`,** an unreferenced duplicate of
  `src/systems/sails.js` that had drifted apart and would have confused future work.

- **2026-10-01 — `docs/architecture.md` and `docs/model-audit.md` written.** Both are
  meant to stay current; update them in the same change that alters the code.

- **2026-10-01 — Asset pipeline self-verification.** After export the pipeline reads node
  translations back out of the written GLB and warns if any disagree with Blender. This
  is the check that would have caught the original transform bug immediately.

## 🟡 Known quirks

- **2026-10-01 — The raw glTF bounding box over-reports the ship's size.** A few
  decorative objects carry a much larger local extent than the hull, so a naive
  `Box3` over `sunny.glb` reads far larger than the ship. Blender's evaluated bbox
  (39.00 × 24.87 × 40.22 m, centred) and `ship-metadata.json` are the source of truth,
  and the app places the ship from the metadata. Not visible in any render. Tests assert
  against the metadata, not the naive bbox.

## 🟡 New features (added 2026-10-01)

- **2026-10-01 — Only ~24% of walkable deck cells are reachable.** The deck raycast
  finds cells on many deck levels but nothing joins them, so the player is confined to
  a ~10 × 14 m pocket and reports being "stuck". Needs stair/ramp colliders in
  `tools/build_assets.py` so the levels connect. `tests/reachability.mjs` measures it.

- **2026-10-01 — Sails are still plain.** The reference has a gold sun emblem on the
  fore sail and a red/black striped main sail; `resolveMaterial` has the striped variant
  wired up but it selects on an object-name guess (`002`/`03`) that does not match the
  real sail names. Tag the sails properly in the pipeline instead.

- **2026-10-01 — Hull trim stripes are a straight diagonal band.** The real hull has
  bold swooping white curves. Worth doing properly in the shader with a curve function
  rather than a linear gradient.

## 🔴 Fixed during this session (2026-10-01)

- **2026-10-01 — Stair approaches and floating helm.** Replaced broad curved-rail
  collision blocks with face sections; exact thin treads and footprint support
  retain stair footing. Removed duplicate corner flights and rebuilt the port rails
  along the treads. All seven approaches and climbs now pass real walking checks.
  The helm is anchored to the measured foredeck and its post reaches the hub.

- **2026-10-01 — Water inside the hull and rendering budget.** Added a measured hull
  water cutout, fitted lower/aft floors and bare partitions. Ocean is finite with
  reduced tessellation, DPR 1 and smaller shadows. Full-window view is restored
  after the user rejected the square viewport. PBR grain/paint and ripple normals
  improve texture detail; furnished rooms remain the next phase.

- **2026-10-01 — Exterior restoration supersedes the old deck/material notes above.**
  Separate authored paint now follows the actual modeled swoops; the fore sail has
  a straw-hat emblem, aft sail red/black stripes and flags pirate marks. Rope ladders
  remain rigging. Displaced side geometry and the lion's face are repaired. The lawn
  is longer, and the initial 1.3× experience scale was later increased to 1.7×.
  See `docs/exterior-reference.md` for reconstruction limits and source links.

- **2026-10-01 — False walls and missing lower stair floors.** Short source pieces
  previously became 2.4 m obstacles and 3 m floor slabs blocked lower paths. Floors
  are now 0.6 m thick with retained authored layers; boundary walls respect new
  landings. Outdoor destination reachability is asserted in the single test runner.

- **2026-10-01 — "Stuck on Click to Orbit".** Inspect mode rendered a full-screen
  `position: fixed; inset: 0` overlay to prompt for pointer lock, but Inspect never
  requests pointer lock, so the overlay stayed up forever and swallowed every pointer
  event — OrbitControls could never receive a drag. Inspect now shows a passive,
  `pointer-events: none` hint instead. Covered by `tests/interaction.mjs`, which fails
  with `camera moved 0.00 m` if the overlay is reintroduced.

- **2026-10-01 — Falling off the ship was a 7 m dive into the sea.** The only fall guard
  fired near the waterline, but the deck sits ~7 m above it. Added a ledge guard: if the
  player drops more than 1.6 m below their last safe footing with no floor within reach,
  they are returned to the deck immediately.

- **2026-10-01 — The bow ornament and lion figurehead floated 60 m away.** The glTF
  exporter writes a subset of the FBX's *linked* objects with their original
  pre-transform. Fixed by rebuilding them as fresh objects with world-space geometry.
  All 263 objects now export in place and the GLB bounds match Blender exactly.

## 🟢 Blueprint and access pass

- **2026-10-01 — Whole routes matter more than isolated stair climbs.** The initial
  stair tests teleported to each base and missed rail-blocked transfers. Tests now
  walk from spawn to the helm/garden on both sides and descend back to the lawn.
  Forward landings/rail openings are aligned; rear flights are inside the hull.
- **2026-10-01 — Larger ship with human controls.** Increased the experience to
  1.7× (66.3 m length), leaving the player at 1.75 m and eyes at 1.7 m. Four bare
  floor-plan levels reserve room and aquarium space using the supplied blueprints.
- **2026-10-01 — Solid lower walls and optional flight collision.** Authored
  partitions bypass terrain-based obstacle selection, so an upper deck cannot
  erase their collision. Flight defaults to free movement; B or the HUD button
  enables swept wall/floor/ceiling collision. Walking always collides.
  The library cabin and both masts use full-height surface collision, retaining
  their open passages instead of filling each structure's bounding box.
- **2026-10-01 — Floor merging.** Equal-height cells merge into exact rectangles
  instead of filling bounding boxes around entire decks. Openings and floor
  layers are retained while reducing collision object count.

## Review repairs — 2026-10-01

- Review findings and evidence are in `docs/review-findings.md`. Keep generated geometry, metadata, and runtime door registrations synchronized; validate all rooms with connected up/down journeys before texture work.
- An asset build should export to staging and publish all three assets only after structural validation, to avoid mixed/stale artifacts after Blender failures.

- **2026-10-01 — Review repairs:** wired visible doors and dynamic collision; corrected openings, stairs and hatch support; rebuilt stale assets; aligned room placements with manga plans; preserved camera pose across Inspect; added actual room/flight journey coverage. Final validation is tracked in review-findings.md.
- **2026-10-01 — Visual fidelity follow-up:** accurate character posters/maps and detailed Soldier Dock vehicle geometry remain necessary for a finished anime/manga reproduction. Current channel labels are correct but vehicle silhouettes are unfinished. User requested textures after functional verification.

- **2026-10-01 — Current visual defects require geometry review:** confirmed sideways left mane petal, unsupported rear porthole rings, blocked direct library approach, incomplete circular room linings and exposed aft furniture. BathStair's top tread also intersects the washroom sink despite room-centre reachability. Add surface attachment/enclosure checks and inspect actual room silhouettes before claiming reference accuracy. Repair request and evidence are preserved in `docs/fix-session-prompt.md` and `docs/review-findings.md` at Sukhjot's request for a new session.

## 🟢 Exterior-first follow-up — 2026-10-01

- **2026-10-01 — Reference placement ledger before further reconstruction.** Use `docs/exterior-audit-plan.md` and matched top/side/front comparisons to resolve every exterior station/orientation/support. Working walking routes do not prove stairs, gardens or fittings occupy their canonical positions. Rooms are paused at Sukhjot's request.
- **2026-10-01 — Replace generic exterior silhouettes.** Accurate curved sails/emblems, wheel-mounted controls, stern Burst barrel, three-tree mikan cluster with calyx/stem/leaf fruit, distinct Pop Greens/flowers and sourced lantern/anchor detail are required. The current visible floating `Sunny_InteriorMainMast` has an origin/export-placement discrepancy; verify its runtime mesh and attachment before correcting/removing it.
- **2026-10-01 — Filtered material pass after geometry/colour/function.** Procedural authored grain/relief was paused to address movement shimmer. New wood/canvas/rope/leaf/fruit textures must use coherent UV scale/direction and filtering, with actual movement QA and no heavy unreferenced wear. Base-colour stability is not a complete realism pass.
- **2026-10-01 — Broader motion evidence.** Current exteriorMotion checks actual walking/grounding, stationary drift and one lower-deck pixel region after five seconds. Add matched-camera material/sail/vegetation/transparent-edge checks when those systems change; the stationary comparison alone cannot prove no movement flicker anywhere.


## 🟢 Reference and rendering follow-up — October 2, 2026

- **2026-10-02 — Lookout access.** N explicitly shows climbing the rope to a ladder. Add the physical floor/hatch opening and exposed ladder before textures, with normal human-speed climbing, collision against the real hatch, Inspect pose preservation and a complete keyboard ascent/return descent. Exact clearance offsets remain reconstructed dimensions; gym furnishing belongs to the subsequent room phase.

- **2026-10-02 — Source placement and retained geometry need distinct checks.** Expanded real walking exposed a gallery removed by an oversized aquarium shaft; the pipeline now derives the cut from actual tread headroom. Keep complete crossing/slide/side-passage tests and preserve their failure captures.
- **2026-10-02 — Front paint/rigging review.** First after images showed jagged depth-based anchor bands, a gold entire outer bow, rectangular unsupported shroud grids, black bowl platforms and small facade circles. Source-led corrections are authored; verify the next exported set and all attached endpoints before closing ledger entries.
- **2026-10-02 — Golden-hour material quality.** Use Sukhjot's new `stuff/Thousand Sunny at Golden Hour.png` for filtered canvas/wood/paint/metal quality and coherent warm sun/shadows, retaining anime colour regions and canonical counts from the supplied SBS references. Finish exterior geometry/function before this material phase; then apply the same quality during room-by-room work.
- **2026-10-02 — Remaining source uncertainty.** Exact hidden shroud/bracing/window counts, anchor storage/capstan linkage and submerged hull contour cannot be established from a perspective image. Disclose reconstructions and cite the visible evidence; avoid silently promoting an approximation to a canonical measurement.
## 🟢 Improvements — October 2, 2026 exterior evidence follow-up

- Replace the oversized Aquarium/central-garden stair covers with the small ladder access shown in N/F2, documenting inferred metric clearances and retaining complete ascent/return/body-clearance checks. Keep room furnishing paused during exposed access repairs.
- Derive motion-camera glazing targets from actual exported window meshes, rather than guessed coordinates. The old “glass” frame mostly showed roof/sky and therefore did not test the intended material.
- **2026-10-02 — Stern shaft underside ownership.** Both reference ladder round trips pass, but normal-eye stern shaft images expose striped hatch surrounds and fragmented floor edges. CPU export review finds overlapping neck/support/service floors and coplanar wall/furniture bottom faces visible beneath a zero-thickness library floor. Give the connecting floors disjoint ownership and a real supported underside, retain the real aperture/walking heights, and broaden exported overlap checks to the new access surfaces before textures. Verify images after rebuilding; walking passes alone do not close this visual defect.
- **2026-10-02 — Curved painted mesh normals.** Face-partition paint/aperture rebuilds duplicate vertices and can lose the source's smooth normals, leaving faceted lion/collar/anchors despite unchanged silhouette. Preserve smooth normals across coplanar paint boundaries while retaining real creases; do not solve faceting with a noisy material or shape change. Texture phase should use exported per-part UVs with construction direction and filtered maps, rather than revive legacy unfiltered world-space grain.

## 🟢 Improvements — October 2 front construction follow-up

- **2026-10-02 — Complete the sourced foredeck envelope, not only hidden cabin linings.** Independent regressions reproduced the rectangular F1 ceiling and unsupported helm-support bow. The rounded enclosure/helm footprint, physical 18 cm soffits, contained chest/four partition ends and actually serialized F1/F2 outlines now publish together. All seven exported geometry groups, 104 asset assertions and both complete 17-checkpoint actual front walking returns pass on the final front publication. Exact facade openings and cannon-to-port connections remain separate source work; these reconstructed metre outlines are not official survey dimensions. Full 17-suite run finished 15/17 PASS, 2 FAIL in `review/exterior-fore-final-complete-suite.log`; all exterior/control/return suites pass, while lower-doorway and Energy/Bath/Aquarium interior-approach failures remain.

- **2026-10-02 — Preserve the reference helm enclosure at human height.** Close F3 inspection and isolated source photographs identified Box122 as a curved rail almost 3 m tall and Cylinder044 as an overlapping spare Log Pose pole. H includes a curved timber enclosure: its topology is now retained at 1.05 m with supported posts/open approach and only the duplicate pole removed. Current independent height/footing/duplicate checks and both actual complete helm returns pass. Fresh inspected photographs disclose the close wheel framing and isolated-view hidden geometry. Full control/return suites pass in the completed 15/17 front run; final station/radius are reconstructed rather than official measurements.
## 🟢 Mikan container construction follow-up — October 2, 2026

- **2026-10-02 — Hollow pots must remain physical containers.** Read-only `reference_tree()`/pipeline inspection confirms each current pot is a capped `pole()` and only its trunk is marked as an obstacle. The red cap at +0.60 m hides soil at +0.57 m; authored pots otherwise skip obstacle collision. After the frozen front run terminates, preserve all three positions/0.60 m height/1.12 m top width/base colours and replace the cap with a clay outer wall, inward-facing inner wall, annular lip and supported bottom. Keep soil exposed at its actual height and mark the solid container footprint for collision. Verify actual exported top-down soil visibility, inner-wall orientation, footing/proxy dimensions and complete garden/Library/exterior return journeys before acceptance. No texture changes are needed. Exact vessel-wall thickness is a disclosed construction reconstruction.

- **2026-10-02 — Current hollow-container authoring requires exported and walking acceptance.** The completed baseline reproduces missing proxies after all seven old geometry groups pass. `mikan_pot()` now builds the retained outer cone with a real open cavity, 5 cm annular lip/inward wall and 6 cm base, explicitly reconstructed thicknesses. Each pot is an obstacle with conservative standard box collision; no claim of exact clay-mesh collision. Independent exported rays/proxy checks and the complete existing exterior route's added normal-body contact/soil/return now pass after the coherent rebuild. The original colours, tree/fruit/soil stations and player/runtime remain unchanged; full 17-suite verification is active and graphics are held.

- **2026-10-02 — Keep the mikan detour on the open garden.** The first live detour proves pot contact/soil visibility but its transverse return approaches the Library's raised facade railing. Preserve that failure; return through the open Z=9 garden crossing with the normal body and the original complete exterior route instead. No railing, collision tolerance or runtime changes are justified by the incorrect crosscut.

- **2026-10-02 — Aim review photographs at the feature reached.** The complete 72-checkpoint exterior route passes, but inspection finds five useful poses aimed at a mast, bow or end wall. Preserve those original frames, then aim the camera only toward the actual Library door, chute and side-passage length at the same reached normal-eye position. Keep all physical walking/return assertions unchanged and inspect the replacement evidence before reporting appearance.

- **2026-10-02 — Repair the slide's real room-envelope intersection before graphics.** Corrected complete-run normal-eye images reveal a cream fragment crossing the upper starboard chute. Read-only exported triangle rays identify `Sunny_Aquarium_ceiling` 2.0–3.5 cm above `Sunny_Slide_chute` at sampled positions. Existing geometry/route passes do not cover this surface conflict. After the current full run ends, derive the necessary exterior aperture/boundary from the actual chute and human clearance, retain supported Aquarium/deck construction, add an independent exported regression, and repeat complete descent/return plus the full runner. Preserve current failure image/diagnosis; avoid masking the intrusion with paint or weakening collision/walking checks.

- **2026-10-02 — Preserve the completed acceptance boundary.** Current full mikan runner finishes 15/17 PASS, 2 FAIL (lower doorway and Energy/Bath entry), while all exterior/return/strict ladder/control/motion suites pass. Eight geometry groups/104 structure/build pass, but the confirmed slide-ceiling intersection is outside those groups. Source/artifact hashes remain unchanged across verification. Treat 30–40% remaining exterior effort as a rough judgment, never a measured accuracy score; rooms and graphics remain later work.
- **2026-10-02 — Control photographs still need reliable post-steering framing.** The initial normal-eye wheel frame and lawn return are useful, but mane/instrument/Log Pose frames still mostly show floor despite added aim requests. Preserve originals and derive/independently verify camera rays from the actual transformed ship/target before using replacement frames for appearance acceptance. Burst ocean and Gaon wheel frames are action context, not bow shape proof. This evidence limitation alone does not establish a player/runtime defect or justify weakened walking/control checks.

- **2026-10-02 — The slide's four supports must meet its curved bed.** Current `deck_details()` stops the posts at the centreline height even though their retained lateral stations are 0.47 m from the centre; the U-section rises about 16 cm there. Fit complete post heads to the actual trough underside, retain their lower floor contact and stations, make them physical, and give the single-sided chute a closed structural underside. The 6 cm body depth is a disclosed construction reconstruction. Extend independent exported coverage to the whole slide, retained Aquarium ceiling, each support head and collision bounds before authoring; repeat real descent/return and the full unchanged runner after coherent publication.

- **2026-10-03 — Supported slide repair is exported and independently checked.** Actual ceiling/skin now meets the retained closed 6 cm chute, with four fitted physical supports. All nine export groups/1,120 slide rays, 104 structure, build and full targeted 72-checkpoint return route pass. Whole-descent actual-body-footprint sampling records 62 grounded/no-recovery observations; up to 23.78 cm contact difference stays inside the original ground-contact band and is not zero-error acceptance. Corrected actual walking photographs show the cream intrusion removed. Complete unfiltered runner 68574 finishes 15/17 PASS, 2 FAIL; its separate 61 grounded/no-recovery descent samples reach up to 25.13 cm within the unchanged band. All 63 source plus four source/publication hashes match afterward; source fidelity and graphics remain open/held.

- **2026-10-03 — Finish supported rail ends around the balcony entry.** The exact current normal-eye `construction-slide-walk-Stern-balcony-4.png` shows both rail bars ending beside the fore gap without an attached end post. `human_rails()` removes bars/posts by separate midpoint/centre tests but does not author matching terminal posts. Independently measure actual exported endpoints and nearest post contacts after the frozen full run; retain the normal body, source entrance gap and complete balcony/Library return. This remains an exterior construction join, regardless of the existing walking PASS. No textures or room layout changes are needed.

- **2026-10-03 — Actual rail gap measurements confirm the next join repair.** Read-only exported end-ring analysis finds 36 bar segments, 23 posts and four free ends (`.008/.009/.026/.027`), each 43.38 cm from its nearest post axis, so their actual tube radii cannot contact. The first closed-cap-only diagnosis is discarded because floor-contact faces may be removed; successful diagnosis uses unique actual vertices/end rings. Preserve the real gap and current complete return while supplying supported terminal posts after the frozen runner; review all other retained post/bar contacts too.

- **2026-10-03 — Physical slide supports expose coarse floor-contact sampling.** The current continuous Stern Ladder Access approach stops exactly at the upper post's min-X−0.34 m radius, even though its later planned raised pose is clear. The next 40 cm floor proxy starts too far ahead for actual stepping before body/post contact. Keep the bed/support/source stations solid and refine the collision support sampling against the actual curved trough; do not shrink the player, remove the post or relax/skip the tour test. Current intended slide and separate stern-ladder returns pass, but this newly exposed approach remains required construction/function work after the frozen full runner.

- **2026-10-03 — Preserve the completed slide verification and repair its approach before acceptance.** Terminal 68574 retains lower doorway/Energy/Bath failures and newly exposes Stern Ladder Access contact; all other suites pass. All current walking/motion/control/failure images are inspected; poor floor/ocean/wall control/endpoint framing remains disclosed. Actual stopped deck/plant/Library-pane regions stay at 0.000% for five seconds, sampled 60.15 fps in the recorded hardware context. Next coherent outside repair should cover actual curved-bed collision support plus balcony bar/post joins, independently reproduce those defects, retain every existing test, then repeat the complete runner and build. No room decoration or graphics starts.

- **2026-10-03 — Fit existing rails and bed contact to actual geometry.** Independent contact baseline reproduces both upper-post approach failures and widespread old 20-station bar/24-station post mismatch, retaining all prior geometry groups. Construction now clips real standable chute triangles into small structural floor proxies and builds balcony bar runs through the 23 retained post axes/fore opening. This repairs contact without new posts, changed body size, moved source stations or weaker tests. Published/exported/walking acceptance remains required; no graphics work.

- **2026-10-03 — Include the actual upper gallery in slide ownership coverage.** New normal-eye entry shows a small cream fragment at the bottom edge; read-only actual-export camera rays identify `Sunny_AftEntryDeck` ahead of the gold trough. Aquarium-only clearance coverage missed this lip join. Expand the unchanged section/ownership regression to the real gallery deck and reproduce its failure before fitting only the intersecting deck volume to the retained trough underside. Preserve supported gallery/stations/normal-body returns; no paint/camera workaround or weakened tolerance. Current contact/rail target checks pass, but this newly observed join still needs final coherent publication/full verification.

- **2026-10-03 — Final support and gallery lip repair is published; retain acceptance boundaries.** Actual triangle-clipped <=10 cm curved-bed collision allows stepping before solid upper posts, and both balcony levels meet all 23 retained post axes without relocating them. Expanded baseline identifies the small gallery lip before fitting only its chute intersection, retaining >=98% surrounding plan/F2A station. Final eleven geometry groups/104 structure/build/route plans and original full exterior target/returns pass; 61 grounded/no-recovery observations and inspected entry/rail photographs are exact final-generation evidence. Original unfiltered full runner 40523 is active with source/publication hashes frozen; preceding 15/17 is not current acceptance. Do not use contact checks to accept unresolved figurehead/facade/opening/hardware/cannon fidelity or start graphics before Sukhjot's review.


- **2026-10-03 — Keep continuous route support distinct from node planning.** Actual Bath-to-Observation tour stalls when a compressed descent leaves the upper floor and skips reachable tread support; exact next body footprint probe is 1.003 m versus the unchanged 0.90 m guard. Forced stair returns pass. Diagnose transitions and body footprints during the room connection phase, retaining all physical tests/guards and recording whole-tour failure honestly.

- **2026-10-03 — Reconstruct the supplied curved mane contours before textures.** H/A/C show curved side blades; actual nine-section export analysis finds only 0.044–0.094 head-radius bends. Six existing side bodies need source-led curvature while retaining seven closed petals, roots/tips/depth/station and control pivots. Normalized reconstruction bounds are not blueprint measurements; require a failing baseline, actual export inspection and all prior geometry/access checks. Whole face/sculpt acceptance remains separate.


- **2026-10-03 — Continue mouth/cavity construction after the curved-mane checkpoint.** All seven bodies/curved side contours now pass actual-export regressions, and close front/both-side closed/open photographs are inspected. H still shows a larger open mouth/cavity and different cannon presentation. Classify actual muzzle/jaw/head boundaries against intended apertures and seams before adding closures; the single-plane assumption was rejected. Complete source geometry before any texture workaround or additional firing mechanics, preserving current normal-body/control/return checks.

- **2026-10-03 — Preserve terminal proof and improve feature framing during later construction checks.** Current unfiltered 56030 is terminal 15/17; control and continuous Stern tests pass, but their mane/endpoint frames mostly face floor/wall. Use separate explicit human-eye aims during future geometry verification before claiming feature appearance, keeping original body/contact/action assertions intact. Lower doorway/Energy/Bath remain for room repair; prior Observation sensitivity passes without repair this run and still needs repeatability. Continue source mouth/cavity/barrel work before graphics, which remain held.

### 2026-10-03 — Keep exterior dynamic collision in the ship frame (implemented)

Actual jaw baseline caught up to ~40 cm of initial Inspect bobbing in cached world bounds. NavigationSystem now measures exact descendant vertices in root-relative authored coordinates; original 2 mm open/closed physical assertions pass. Keep root-space fitting for future exterior moving parts and retain normal human clearance. Current open lower-panel proportions still require geometry refinement; a collision/closure pass alone does not establish blueprint accuracy.

### 2026-10-03 — Verify the camera follows the steered hull

Current control-state/return checks do not compare real camera position with the rendered ship matrix. Floor-facing action photos warrant an independent eye-position/aim test after the current full run. If actual measurements reproduce a conditional frame-order defect, give movement/navigation/ship updates explicit negative priorities without taking over rendering, keeping normal body and collision unchanged. This remains an investigation until a runtime baseline proves it.

### 2026-10-03 — Implemented: explicit local-eye/voyage/render ordering

The independent actual camera/hull measurement proves the suspected steered view defect (7.24587 m; stronger test baseline 7.22440 m). PlayerController -2 and NavigationSystem -1 order local human eye before voyage pose and default-priority Ship rendering, without taking over automatic rendering. Original targeted controls/return and the combined original full controls suite pass with three independent 5 mm assertions and unchanged 2 mm jaw checks. The combined full runner ends 15/17, with lower doorway/Energy/Bath failures disclosed separately and all 68 frozen hashes unchanged; Observation passes without repair and still needs repeatability work. No need to alter human dimensions or camera distance to conceal it. Preserve the independent camera check as a permanent regression. Whole source construction and realistic graphics remain unfinished; graphics stay held.

- **2026-10-03 — Correct visible face proportions and actual attachment before graphics.** Matched A/H/current front views show oversized ivory muzzle, small vertically oval eyes and a large nose. Fit the retained muzzle geometry to a smaller closed silhouette; construct circular eyes/pupils and a smaller nose against their real source skin rather than floating planar spheres. Keep all seven source mane bodies and existing mouth aperture/closed/open/depth/compact/collision/camera guards. Independent actual-export proportion/circularity/attachment checks must first reproduce the mismatch. Broad reconstruction ranges are not official blueprint measurements; bones/disk and remaining exterior fidelity are still separate open work.


## October 4 face suggestion implemented with limits

The source-led compact muzzle/circular eye rim-pupil/smaller nose attachment repair is implemented and passes the new actual-export regressions. Precise ratios and hidden embedding depths are reconstructions, not official dimensions. Remaining bones/collar/mounts, canonical white-sail hat-only base marking, rigging and scalloped underside details remain construction priorities. Full physical/control verification is active; graphics remain held.


### October 4 source-state correction and next geometry audit

Complete supplied O/page26 explicitly depicts the full Straw Hat Jolly Roger on the deployed fore white canvas. The current pipeline declares deployed O; anime A is gathered. Withdraw the previous hat-only defect rather than mixing those states. Keep black flags/full white Roger and investigate actual canvas-to-yard joins, source bone outline/volume and the barely discernible scalloped underside against A/N. Exact source geometry and independent export measurements must establish the next repair. No realistic graphics or room layouts start.


### October 4 actual oval-yard/canvas joins and recessed soffits

Independent exported audit `review/construction-fittings-baseline.json` finds all 74 white-canvas head samples buried 35.6–38.1 cm in their spars and gaps up to 80.0 cm between circular lashings and actual oval yards (208 radial rays). Fit head vertices to the real underside and shape the retained 26 lashings against the actual yard skin. Preserve canvas state/artwork/count/envelope/base materials. Actual normalized soffit cross-sections currently show shallow relief 0.035–0.071; A/N require recessed scalloped bays between supports. Preserve the retained eight-sector count/envelope/throat and source-led shape, with normalized depth clearly reconstructed. Add independent geometry contact/recess regressions without altering fourteen existing groups/body/room tests. Implementation waits for the active original full runner to finish.


## October 4 fittings construction and active complete verification

Both white-canvas head edges/all 26 retained loops now meet actual oval spar skin, and lookout/aft bays are radially recessed. Initial landing-skin lip is cleared only inside the existing stern shaft, preserving floors/stations/body. Corrected coherent export 93219 terminal exit 0; sixteen geometry groups/104 structural assertions/all route plans/build pass. All eighteen actual current preview/detail/source pictures are inspected; no capture errors. Sewing/sector metrics remain reconstructed and full soffit/window/cloth/rigging/figurehead/dock fidelity remains unfinished. Original unfiltered 17-suite run 95551 is active on 68 fixed hashes; actual journeys/returns/control/motion/room results remain pending. Front and facade source audits are read-only during the freeze. No graphics or room furnishing starts. Current report: `construction-review.md`; exact appearance receipt: `review/construction-fittings-appearance-receipt.json`.

## October4 corrected fittings verification — terminal

Original unfiltered runner95551 is terminal exit1(06:33:03–07:04:25UTC),15/17 PASS with all68 hashes unchanged. Outside/access/lookout/controls/return/pointer/motion/visual checks pass; lower doorway/Energy/Bath fail. All35 selected current physical/control/motion PNGs are individually inspected,70 additional PNGs pending;18 separate matched appearance images inspected. Stopped deck/plants/actual Library pane change0.000% after5s,sampled60.22fps at1440×900/M3Pro ANGLE Metal. Mechanism external framing and canonical fidelity remain unaccepted. Exact preserved report:`construction-fittings-review.md`; next source construction rounds retained bow bones/studs, encloses lookout windows and fits rig attachments/curved canvas. Graphics remain held and rooms follow the exterior.

## 🟢 Improvements — October 13, 2026

Fresh actual garden-return front photographs expose three broad brown lintel faces above Aquarium/Dining/Kitchen external entrances. A/C/N show a continuous cream front; these are generic internal `wall_run` darkwood beams protruding ahead of the native skin. Recoat only the real bow-facing external face in the existing cream palette, retaining timber inward faces, geometry, access and all door metadata. A temporary candidate is prepared; production remains frozen during full runner69522. No texture/lighting work is implied.


## 🟢 Improvements — October 14, 2026

- Implemented: use the real rudder surface profile for dynamic collision, preserving steering and physical blade solidity while clearing the Energy Room. Tested full actual room/exterior/controls returns.
- Implemented: preserve an editable Blender master separately from GLB output and group its exterior, interior and moving mechanisms without changing transforms. Current source awaits first room publication.
- Implemented: match ordinary door walking contact and animation safety clearance; the short stair-to-bath approach previously reached a leaf that could no longer slide open beside the player. Direct four-side/orientation regressions preserve hatch/hinge safety checks.
- Keep furnished-room source references and appearance/whole-walking evidence together before declaring room construction accepted; checkerboard colours, upholstery and shaped fixtures establish canonical construction, while UV/textures and practical illumination belong to the following graphics phase.
## Whole-ship audit — 2026-10-22 (survey only; unimplemented)

Sukhjot requested inspection and a written report without fixes. [The whole-ship blueprint audit](whole-ship-blueprint-audit.md) records all recommendations with uniquely identified locations, references, current evidence, priorities and uncertainties. No repair sequence is resumed by this entry.

- **Construction:** C01–C09 cover fore trim intrusion, solid Dock lining/absent launch tunnels, mast/lift offset and blocked shaft, four blocked gun centerlines, physically reversed B1 workshops, absent lookout gym and clinic fittings over windows. E01–E05 cover closed-hatch rail protrusions, doorway/porthole treatment, lion profile and garden/guard arrangement.
- **Room accuracy:** INT01–INT29 cover all 19 accuracy groups: reference furniture silhouettes/placement, missing defining fittings, open Kitchen/Dining relationship, tank/lounge/curtain construction, Library/bath/workshops/Energy/storage and early Dock vehicles. Keep later vehicle and bed-period variants explicitly unresolved where supplied references differ.
- **Usable features:** M01–M10 distinguish working E/J/K/T/selector/lever/Log Pose controls from missing anchor, lift/cola-load, gun, bench, rig/swing and vehicle operation. Improve discovery; do not wrongly describe Gaon's current K trigger as absent.
- **Deferred graphics:** G01–G06 cover materials/UVs, actual room lamp lighting, region/pattern assignments, vegetation/tanks, artwork and reflections. These recommendations do not authorize graphics changes during this survey.
- **Acceptance evidence:** Resolve U01–U12 through matched views and appropriate actual routes/operation; preserve the intentional 2.2 scale, normal human body and declared stair adaptations. Existing tests and room names do not establish visual/canonical accuracy. The report's practical repair order applies only to a later authorized implementation task.


## 🟡 New Features — 2026-10-22 implementation follow-through

- Sukhjot explicitly requested a universal visible mouth-cannon control. UI01/M01 now has a visible Cannon trigger and X pointer-lock/focus handoff, Open/Close Mouth and Fire Gaon via shared real navigation actions. Cannon browser acceptance and full18-suite/build verification are complete; retain cola/Burst/cooldown guards and legacy helm J/K. Follow the live report checkpoint, not the historical survey-only entry above.
- Development preview correctness: the old Vite module cache served stale existing files after updates, including cache-busted requests. The project preview was refreshed before testing. Verify served code when a saved-source/UI discrepancy occurs; do not weaken tests for a stale page.

- **2026-10-22 — Guard bow-trim clearance with actual triangle area and exterior preservation.** The unpublished C01 candidate now uses double-precision clipping of source triangles against exact nonconvex room contours; a private master fixture clears all sampled fore levels and retains688 exterior first hits. Keep independent actual-export area/ray regression and personally inspected before/after room/closet/exterior views before accepting publication. Retain the original B1 floor contour before later cuts, rather than guessing it from the saved floor vertex order. Implementation remains paused for a future construction stage under the current exterior/water order.

## Current authorized exterior/water realism — 2026-10-22 13:56 EDT

- Sukhjot explicitly prioritizes realistic exterior textures/materials and water after the cannon milestone. Pause construction/C01 and interior textures; retain the completed C01 plan privately for later. Review physical-scale timber/paint/metal/glass/cloth/rope/plant response and ocean waves/reflections/foam in current close/wide, moving/stopped views. Preserve geometry, collisions, controls, identity/palette and performance; the active EX01–EX07 checklist is in the whole-ship report.
- Implemented for current review: isolated exterior physical PBR cache with real metre detail, canvas weave/sewn panels independent of artwork UVs, and512px planar water reflection every fourth frame with filtered dielectric/GGX shading. Retain original four waves, hull discard, source palette, models and room materials. Judge realism and performance in actual fresh browser images; material tags alone are not appearance acceptance.

- **2026-10-23 — Exterior/water pass verified:**19/19 full suites and build PASS with79 inputs unchanged. Retain scoped reflection budgeting for level views inside the hull; final window context43.95fps and appearance57.66fps, deck/plants/glass stopped changes0%. First browser-frame failure run is preserved. Use current review page for outside appearance feedback; do not resume C01 or interior textures automatically.
