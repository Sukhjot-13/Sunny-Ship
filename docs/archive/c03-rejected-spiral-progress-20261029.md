# Historical C03 interim progress — rejected spiral and two-tier design

`tools/sunny_interiors.py:build_interiors` now calls `open_convex_plan_slot` on the real B1 native floor at the radial Dock boundary. `tools/sunny_accuracy.py:rolling_dock` receives the preserved original fitted B1 perimeter from `apply_exterior_accuracy`, so C02 mouth reveal interpolation does not mistake the new cut edges for the hull perimeter. This is an unpublished in-progress source change: the replacement water bed, chamber and connections and their tests are not yet built. No environment variables changed.

C03 construction in progress: `tools/sunny_interiors.py:dock_water_annulus` creates a closed annular water mesh; `build_interiors` authors the radial bed, perimeter, rotating segmented partitions, portal frames, elevated physical catwalk segments, supported lowered craft, and twin fixed outlet beds/walls/water. `sunny_accuracy.py:rolling_dock` cuts the bounded wet path through the retained source hull. `build_assets.py` derives the raised sea level and metadata from the authored Dock water level, and `src/systems/navigation.js:dockBounds` carries the explicit floor flag for moving catwalk segments. The user selected raising the waterline. These changes are unpublished and unverified; real rolling gates, complete access, containment, water connection, and affected regression tests remain pending. No environment variables changed.

`build_interiors` additionally authors individually tagged inner shutter slats at each portal. `src/components/NavigationSystem.jsx:innerGateBounds` rolls the selected gate with the existing shutter state, carries it around the carousel, and supplies matching moving collision; the frame also pauses closure when a player occupies the selected portal. These changes and actual operation remain unverified. No environment variables changed.

The in-progress `build_interiors` outlet construction now supplies physical transverse bridges and elevated openings in the upper outlet walls to join the selected rotating catwalk to the retained outer circulation floor; lower water-containment walls remain continuous. These source changes have not yet been included in a coherent export or walking verification.

`tests/roomRoutes.mjs:roomRoutes` now classifies authored rotating Dock floor sections as floors rather than obstacles when planning against the initial carousel pose; all other moving Dock solids remain obstacles. This keeps the existing planner aligned with the new explicit physical floor role; real input walking verification is still required.

`build_interiors` records the actual oriented corners of each rotating catwalk section. `NavigationSystem` and `roomRoutes` convert those corners into Three coordinates, and `navigation.js:dockBounds` rotates them before computing their physical bounds instead of rotating an already enlarged AABB. This avoids expanding the selected, axis-aligned catwalk beyond its actual mesh. Export and real-body validation remain pending.

The same oriented-corner metadata now applies to rotating solid pieces, and `build_interiors` records each actual curved portal crown as 32 small physical sections instead of a filled arch AABB. Interim spiral-position collision probes found the old broad boxes intruding into otherwise clear steps; the corrected source requires a new export and real descent/return.

Portal piers and horizontal wall strips are also segmented into small real timber pieces before dynamic collision is generated, limiting conservative AABB overreach around the spiral without weakening the normal body or disabling collision.

`tests/dockSpiralClearance.test.mjs` checks the unchanged 0.34 m radius and 1.75 m body against actual static and rotating solids at every exported spiral tread, for all six selected poses and the real alignment tolerance margins; the aggregate runner includes it. Real input descent and return are still required.

`tests/dockWalkwayFootprint.test.mjs:visit` reads the actual exported walkway vertices and compares their selected-pose extents with every physical floor collider; the aggregate runner includes it. It awaits the matching export and supplements, rather than replaces, real walking.

That guard also checks every actual rotating guide-rail vertex against the finite thickness of its 60-degree radial bay divider; the result awaits the matching export.

It also checks the actual rotating walkway, divider and guide vertices stay inside the stationary outer-wall inner radius throughout rotation. This is a geometric clearance check, not a complete dynamic simulation.

The same guard compares the actual selected catwalk endpoint and fixed bridge at their common floor height, requiring a real meeting rather than a gap bridged only by collision.

The proposed chamber now has a physical annular central support wall and deliberately overlapping water surfaces at the outlet joins. The first partial export passed sampled water depth, bed, wet-path triangle and C01/C02 static checks, but predates these latest support, bridge and gate changes and is not an accepted final publication.

Following interim visual review, `build_interiors` moves the waiting floor, capstan and numbered rolling portals to 0.45 m above the Dock water and adds a supported, human-step spiral connecting them to the higher circulation. It retains a separate upper opening for the catwalk and removes the unsupported old desk and stool. `NavigationSystem` checks occupancy at the lower gate level. These revisions are source-only and require a coherent export and actual body/access validation; the interim high portal was not accepted.

The in-progress spiral includes physical outer handrail segments and posts, tagged for surface-based collision, with an actual gap at the upper catwalk entrance; their fit and complete normal-body descent/return remain to be tested.

R14 fidelity correction supersedes the earlier spiral and elevated two-tier portal/catwalk design: `build_interiors` now authors one water-level portal tier and no spiral or radial catwalks. `tools/sunny_accuracy.py:dock_ladder_access` cuts a real central waiting-room-to-lawn shaft, registers a moving lawn hatch and adds visible ladder rails/rungs and a normal-speed climb path. `apply_exterior_accuracy` includes that path in mechanism metadata. All of this is source-only and requires a matching export and real climb/return proof. The previously reviewed high/two-tier candidate remains rejected evidence.

`tests/assets.test.mjs` retains its exact existing hatch hardware, hole, moving-node and Aquarium assertions while updating their expected totals for the additional Dock ladder/hatch and explicitly requiring that mechanism. `tests/dockWaterConstruction.test.mjs` replaces the rejected spiral checks with actual ladder shaft, hatch, rung and full-body collision checks. The provisional spiral test scripts are archived under `docs/review/c03-rejected-spiral`; `tests/dockRotatingClearance.test.mjs:visit` keeps the real guide/divider clearance guards and rejects the absent unsupported design.

`tests/exterior.test.mjs` reports the actual hatch count in its existing coaming-owner check; its geometry assertions remain unchanged.

`tests/roomRoutes.mjs:atAny` checks a genuinely supported endpoint even when its only access is the ladder. For the new Dock ladder, `roomRoutes` requires a reachable lawn endpoint, supported lower endpoint and the same full-body clear shaft, then records a descent-first route. `tests/interiorJourneys.mjs` follows that real endpoint and uses the existing ladder journey in the appropriate direction, requiring the closed-hatch stop on the return ascent. Existing ladders retain their prior route and checks.

The C03 radial, perimeter, portal and outlet walls now terminate at the actual B1 ceiling plane rather than the earlier lower 5.7 m wall height; the source-hull channel cut uses that same ceiling plane. This fixes a discovered upper enclosure gap and requires a fresh export and geometry checks.

The inner and upper arched portal openings are authored 2.85 m high, keeping their actual conservative crown collision above a normal 1.75 m body while retaining a real arch and rolling slats. The label and gate travel follow that height. This is pending export and actual-body confirmation.

`build_assets.py` now sends the rotated Dock spiral treads through existing `curved_floor_boxes` surface fitting at 10 cm, while retaining their stair columns for boundary handling. This avoids filling each rotated tread's broad AABB with unsupported walking floor. The C03 guard checks the small physical sections; normal-body ascent and descent remain required.

`build_interiors` now authors supported, colliding guide rails along both sides of the rotating wet bays and fixed outlets. Rotating rails are segmented to limit conservative dynamic collision; the small rotating-to-fixed junction and actual vehicle deployment remain subject to M10. These rails have not yet been exported or inspected.

The moving guide rails start far enough from the hub to clear the actual thickness of each widening 60-degree bay divider, not just its centreline. Exported geometry and moving-state clearance still require verification.

The rotating partitions, guides and catwalks now stop inside the fixed perimeter's inner face; the fixed bridge begins at the selected catwalk end. This is intended to avoid a rotating mesh cutting through the stationary chamber wall while retaining a real supported transfer. It requires exported clearance and actual walking checks.

The C03 geometry test requires all 120 moving guide sections and four fixed outlet guides to have their corresponding physical collision; it does not claim that vehicle deployment is implemented.

The first candidate exposed that the straight fixed guide rails were thinner than the sectioned-wall exporter threshold and received no physical boxes. `build_interiors` now leaves these axis-aligned guides as ordinary solid obstacles, while their vertical posts keep sectioned collision. A rebuild and the unchanged physical-guide assertion are required.

`tools/sunny_accuracy.py:dock_stair_clearance` finds the actual existing Dock stair treads in both switchback flights that cross newly authored upper outlet or outer chamber wall pieces, cuts their standing-body headroom above the water-containment wall and tags retained wall faces for section collision. `apply_exterior_accuracy` invokes it after mouth construction. Actual input walking exposed an additional fixed perimeter-wall intersection at the upper flight; the corrected source and expanded tread-by-tread body sweeps require a new export and normal walking/return.

`docs/review/c03-stair-clearance/fixture.py` opens the saved interim Blender master and runs the production cut against its actual outer/outlet wall and tread meshes; its `bounds` helper reports the changed walls. It is an authoring diagnostic, not a body-access receipt, and is tied to that interim master state.

`tests/dockWaterConstruction.test.mjs:visit` samples real exported Dock water and bed triangles, checks common sea/water level, wet mouth depth and outlet-wall collision, and traces the actual wet tunnel through static triangles and physical boxes at multiple depths; `tests/run-all.mjs` includes it. It does not establish controls, a complete containment proof or vehicle launch. The first construction export passed water/bed and visual-path samples; the new physical rays and final coherent export remain pending.

The same C03 exported-geometry test now requires all six lower shutter sets, the water-level waiting floor, ordinary-height spiral treads with corresponding physical floors, and explicitly colliding rotating catwalk sections. These new checks await the matching export and do not replace actual input walking.

The C03 geometry guard also samples the actual annular waiting-room base and fixed outer wall at 96 angles, explicitly excluding only the two outlet gaps. These samples await the matching export and are not a generalized watertight simulation.

The same exported-geometry guard requires the radial and outer wall tops outside the five actual retained-stair passage sections to meet the actual `Sunny_B1_ceiling` plane. It also requires those five water-bearing bases to remain and tests the body opening separately. This responds to the upper enclosure gap without treating the necessary stair opening as a defect.

The C03 guard also sweeps the normal-size body through the actual sectioned outlet-wall opening at crossing stair treads in both switchback flights and requires a retained-wall negative control outside that cut. This remains pending the matching export and real walking.

The water guard additionally interpolates the exported hull profile used by `Ocean.jsx` and checks that the authored channel water extends beyond the ocean shader's discard boundary at three lateral positions on both sides. This tests the visual water overlap, not fluid dynamics or vehicle launch.

`tools/sunny_exterior.py:open_convex_plan_slot` partitions actual world-space faces against a strictly convex counterclockwise opening and retains the outside pieces/materials. It is being developed for C03's nonrectangular floor opening; no production caller or published geometry uses it yet. No environment variables changed.

`tests/dockPlanCut.py` is a Blender fixture: its `hit` helper raycasts a cut floor, checks removed/retained regions and actual remaining area, and rejects clockwise and concave negative controls. `tests/dockPlanCut.test.mjs` runs it from the aggregate test entry point. It is a primitive check, not ship acceptance. The runner now requires the same local Blender executable used by the asset build.
