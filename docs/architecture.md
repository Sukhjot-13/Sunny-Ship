# Neutral trial architecture

Current production source/assets at baseline; no previous repair prototypes/algorithms supplied. `trial/packet.md` records the original findings, references, coordinate convention, constraints and criteria. `trial/original-evidence/` contains selected original survey screenshots/data only. `AGENTS.md` mirrors shared project instructions. `tests/*.mjs` and three audit tools only replace hardcoded localhost5173 strings with the common optional base URL; all assertions unchanged. `vite.config.js` adds per-workspace cache and strict explicit port. The new trial resource wrapper serializes heavy jobs and records queue/execution times; inventory its functions when added. Update this inventory for all candidate modifications/functions.

## Environment Variables

`SUNNY_BASE_URL`: optional isolated preview base URL in browser/test/audit scripts; defaultlocalhost5173. `SUNNY_PORT`: strict Vite port, default5173. Existing `URL` remains supported by legacy gameplay/interaction/interior journey tests. Existing `ROOM_FILTER` can narrow focused interior journeys but MUST be unset for full npm test. Shared dependencies are read-only and Vite cache is workspace-local. `SUNNY_CDP`: optional existing browser WebSocket endpoint in `tools/exterior_audit.mjs` (otherwise launches a browser). `NAV_DEBUG`: optional route-planner diagnostic output in `tests/roomRoutes.mjs`. There are no production runtime environment variables in `src/`; the resource wrapper merely inherits its caller environment.

`trial/resource.mjs` — common heavy-job lock, `record` appends queue/execution events; `release` removes only its own lock; top-level waits for live owners and starts the exact child command; signal/exit handlers stop child and release lock. `trial/baseline.mjs` — `sha` verifies every served model matches local input, `three` converts original poses, browser `cameraSurvey` selects only the main camera, top-level saves current unchanged views and exact named-lining ray intersections. Appearance only; no player or geometry changes. All outputs under `trial/results/`.

Common harness correction: audit/navigation/baseline inspection imports now read the actual `/.vite-cache/deps/@react-three_fiber.js` instance after cache relocation. The obsolete `/node_modules/.vite/deps/` URL loaded a second module instance and could not find the canvas root. This corrects inspection plumbing identically in both candidates; product code and assertions remain unchanged.

## C01 candidate diagnostic evidence (2026-10-26)

`trial/results/diagnose.mjs` — reads published GLB source triangle vertices against existing fore room outlines; `inside` performs a winding-independent point-in-polygon probe. This is a diagnostic, not full triangle-intersection proof. `trial/results/inspect-shield.py` — opens the candidate's existing editable master and reports welded shield topology without saving it; top-level only. `trial/results/report.md` records evidence, timings, scope and candid candidate status. `trial/results/before-sunny.glb`, `before-collision.glb`, `before-metadata.json` retain unchanged candidate baseline inputs for independent preservation checks. Remaining `trial/results/baseline-*` logs and `common-baseline/` are coordinator-provided unchanged baseline evidence.

## C01 source repair (2026-10-26)

`tools/sunny_fore_trim.py` — reconciles the retained exterior bow shield with actual room construction. `split_polygon` partitions convex painted source polygons at a plane; `profile_prisms` converts paired hull-section outline stations to exact finite strips, retaining nonconvex source bends; `subtract_prism` keeps surface pieces outside one strip with early rejection; `reconcile_fore_trim` clips only Circle038 source geometry through all B1/F1/F2 room volumes while retaining face materials and writes its construction receipt. Cuts terminate behind the existing lining; no covering skin or material/visibility trick is added. The original painted shield already has open boundary edges; this repair does not claim to make that inherited shell watertight.

`tools/sunny_interiors.py` — existing `build_interiors` additionally retains the original B1 outline before access cuts and exports B1/F1/F2 construction volumes from existing floors/ceilings. Existing 12 cm floor soffit depth is used below each floor; no canonical hidden metric thickness is asserted. All other functions unchanged. `tools/sunny_exterior.py` — existing `restore_exterior` invokes trim reconciliation after furnishings/paint and before common surface cleanup, UVs and collision publication; other functions unchanged. `tools/build_assets.py` — existing metadata assembly publishes construction volumes/receipt; existing pipeline rebuilds visual, collision and editable master together; all functions unchanged. Environment variables are unchanged.

## C01 independent exported regression (2026-10-26)

`tests/foreTrim.test.mjs` — reads actual exported shield triangles through their complete node transforms. `triangles` resolves indexed world triangles, with recursive `visit`; `intersectionArea` measures clipped 3D polygon area; `prisms` ear-triangulates actual construction outlines independently of the source station-strip implementation. Tests all three fore construction envelopes, keeps all seven room records and physical B1/F1/F2 linings, and permits only Float32 rounding clearance (20 micrometres). Optional first CLI argument selects an earlier GLB for negative-control evidence. `tests/run-all.mjs` retains all 20 original suites and adds this regression as suite 21; existing `ensureServer` and `run` functions are unchanged. No new environment variables.

`trial/results/c01-views.mjs` — saves ten matched before/after room/closet/exterior views. `sha` verifies served candidate hashes, `three` converts original Blender poses, browser `cameraSurvey` places only the primary camera; request interception supplies saved baseline assets for the before phase. No product visibility/material changes. `trial/results/c01-preservation.mjs` — `sha` hashes inputs; `signatures` compares full non-target GLB primitive attributes/indices/materials and local transforms, collision bytes, rooms, doors, outlines and original FBX; saves hashes for all published assets/master. These scripts use existing `SUNNY_BASE_URL`; no new variables.

`docs/suggestions.md` — dated C01 regression-maintenance and inherited open-shell topology notes; no functions.

Fresh metadata scan (2026-10-26): forward B1 room record is exactly `Storage Room`; the seven-room regression uses that existing name without renaming product content. Full suite remains pending asset publication.

Fresh readability/syntax scan (2026-10-26): exported regression expanded into named intermediate steps; assertion logic, numeric clearance and coverage unchanged. No build source inputs changed.

Fresh regression geometry scan (2026-10-26): Float32 clearance applies only to true polygon perimeter edges and top/bottom boundaries. Internal earcut seams remain covered, including vertical triangles lying on a seam. Existing F1/F2 physical outlines are independently required to equal the recorded cut envelopes. Build source inputs remain frozen.

## Common harness recovery — October28,2026

Coordinator applied identical resource-wrapper revision2 to both worktrees. New `readOwner` tolerates the transient empty/missing JSON file between exclusive creation and complete write; lock acquisition retries, stale-owner cleanup rechecks ownership, and `release` tolerates concurrent missing files. No participant implementation/assertion changed. Prior missing terminal jobs were interrupted by account usage limits, not counted as repair failures. All product/assets and previous results are preserved; build reruns are not required merely to resume.

## C01 High recovery numerical correction — October28,2026

`tools/sunny_fore_trim.py` — `split_polygon` and `subtract_prism` now use Python double-precision tuple arithmetic through all sequential half-space operations; `profile_prisms` retains exact double plane coefficients; `reconcile_fore_trim` converts transformed source vertices once and computes fragment area in double precision before final Blender mesh publication. Repeated single-precision Vector dot/lerp operations produced residual boundary slivers in the first completed candidate; independent 20µm regression remains unchanged. No room or envelope enlargement.

## Complete current tracked file/function inventory — October28,2026

This appendix inventories the inherited sanitized candidate and C01 additions without consulting excluded historical documentation. Generated dependency/cache/build folders and Git internals are excluded. Inline functions are identified by source line and calling operation; named functions retain their source docstring where available. C01 behavior and evidence details above remain authoritative.

### `.gitignore`

Purpose: Local/generated/private-file exclusions.

Functions: none (declarative data, module-level execution, document or binary asset).

### `AGENTS.md`

Purpose: Shared project behavior/architecture instructions.

Functions: none (declarative data, module-level execution, document or binary asset).

### `assets/sunny-master.blend`

Purpose: Editable Blender master for the exported generation.

Functions: none (declarative data, module-level execution, document or binary asset).

### `docs/architecture.md`

Purpose: Project documentation; retained context or current inventory/log as indicated by filename.

Functions: none (declarative data, module-level execution, document or binary asset).

### `docs/exterior-reference.md`

Purpose: Project documentation; retained context or current inventory/log as indicated by filename.

Functions: none (declarative data, module-level execution, document or binary asset).

### `docs/interior-reference.md`

Purpose: Project documentation; retained context or current inventory/log as indicated by filename.

Functions: none (declarative data, module-level execution, document or binary asset).

### `docs/model-comparison-20261026.md`

Purpose: Project documentation; retained context or current inventory/log as indicated by filename.

Functions: none (declarative data, module-level execution, document or binary asset).

### `docs/suggestions.md`

Purpose: Project documentation; retained context or current inventory/log as indicated by filename.

Functions: none (declarative data, module-level execution, document or binary asset).

### `index.html`

Purpose: HTML entry point.

Functions: none (declarative data, module-level execution, document or binary asset).

### `package-lock.json`

Purpose: Pinned dependency resolution.

Functions: none (declarative data, module-level execution, document or binary asset).

### `package.json`

Purpose: Dependency and single test/build/dev command definitions.

Functions: none (declarative data, module-level execution, document or binary asset).

### `plan.md`

Purpose: Inherited baseline plan retained unchanged.

Functions: none (declarative data, module-level execution, document or binary asset).

### `public/artwork/straw-hat-jolly-roger.svg`

Purpose: Retained public artwork/icon asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `public/favicon.svg`

Purpose: Retained public artwork/icon asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `public/models/ship-metadata.json`

Purpose: Coherently exported runtime visual, physical collision or metadata asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `public/models/sunny-collision.glb`

Purpose: Coherently exported runtime visual, physical collision or metadata asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `public/models/sunny.glb`

Purpose: Coherently exported runtime visual, physical collision or metadata asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `readme.md`

Purpose: Existing project usage documentation.

Functions: none (declarative data, module-level execution, document or binary asset).

### `src/App.jsx`

Purpose: App mode, ship loading and scene composition.

- `ProgressBridge` (L20): Feed drei's loader progress into the store for the loading screen.

- `inline useStore at L22` (L22): useStore callback.

- `inline useEffect at L23` (L23): useEffect callback.

- `SceneRig` (L38): Camera control arbitration.   Inspect mode -> OrbitControls owns the camera.  Explore mode -> the player controller writes it directly.  The player transform lives in the zustand store, so returning from Inspect  to Explore restores exactly where the player was standing.

- `inline useStore at L39` (L39): useStore callback.

- `inline useMemo at L48` (L48): useMemo callback.

- `inline useEffect at L61` (L61): useEffect callback.

- `inline useEffect at L75` (L75): useEffect callback.

- `inline callback at L77` (L77): Inline callback.

- `App` (L107): Implements App.

- `inline useStore at L111` (L111): useStore callback.

- `inline useStore at L112` (L112): useStore callback.

- `enter` (L114): Implements enter.

- `onCanvasClick` (L125): Implements onCanvasClick.

### `src/components/CannonControls.jsx`

Purpose: Runtime CannonControls component and its lifecycle behavior.

- `CannonControls` (L6): Visible global controls for the actual Gaon mechanism, with focus handoff.

- `inline useStore at L7` (L7): useStore callback.

- `inline useStore at L7` (L7): useStore callback.

- `inline useStore at L8` (L8): useStore callback.

- `inline useStore at L8` (L8): useStore callback.

- `inline useEffect at L12` (L12): useEffect callback.

- `inline useEffect at L17` (L17): useEffect callback.

- `closeOnEscape` (L21): still close the panel and return focus to the visible trigger.

- `inline callback at L23` (L23): Inline callback.

- `showPanel` (L26): Exit captured-look mode before focusing ordinary accessible buttons.

- `operate` (L28): Execute shared mechanism actions; domain guards remain authoritative.

- `inline callback at L35` (L35): Inline callback.

- `inline callback at L42` (L42): Inline callback.

- `inline callback at L44` (L44): Inline callback.

- `inline callback at L48` (L48): Inline callback.

### `src/components/DoorSystem.jsx`

Purpose: Runtime DoorSystem component and its lifecycle behavior.

- `registerDoorNode` (L44): Register a moving leaf/lid. Call this from Ship.jsx with the cloned object  whose name matches the door metadata's 'node'.   @param {string} name node name from the metadata  @param {import('three').Object3D} object3d the leaf / lid (or a group holding it)  @returns {() => void} unregister

- `inline callback at L45` (L45): Inline callback.

- `inline callback at L49` (L49): Inline callback.

- `getDoorNode` (L58): Registered object for a node name, or undefined.

- `DoorSystem` (L62): Implements DoorSystem.

- `inline useMemo at L67` (L67): useMemo callback.

- `inline useMemo at L72` (L72): useMemo callback.

- `inline useEffect at L74` (L74): useEffect callback.

- `inline useEffect at L80` (L80): useEffect callback.

- `inline onInteract at L80` (L80): onInteract callback.

- `inline useEffect at L87` (L87): useEffect callback.

- `state` (L89): Implements state.

- `colliders` (L90): Implements colliders.

- `doors` (L91): Implements doors.

- `near` (L92): Implements near.

- `toggle` (L93): Implements toggle.

- `registered` (L94): Implements registered.

- `inline callback at L96` (L96): Inline callback.

- `inline useEffect at L99` (L99): useEffect callback.

- `inline callback at L99` (L99): Inline callback.

- `inline useFrame at L101` (L101): useFrame callback.

### `src/components/Environment.jsx`

Purpose: Runtime Environment component and its lifecycle behavior.

- `Lighting` (L15): Lighting rig: a warm key sun that casts the shadows, a cool hemisphere fill  for sky/ground bounce, and a soft rim so the hull silhouette reads against  the sky.

- `SkyDome` (L51): Procedural sky dome. A cheap gradient + sun disc that also feeds the scene  environment so PBR materials get sensible ambient reflections.

- `inline useMemo at L55` (L55): useMemo callback.

- `InspectCamera` (L112): Orbit camera used by Inspect mode.   The target and framing distance are shared with SceneRig so the camera and  the controls agree on what "the whole ship" means.

- `inline useStore at L113` (L113): useStore callback.

- `inline callback at L131` (L131): Inline callback.

- `inline callback at L134` (L134): Inline callback.

### `src/components/EnvironmentMap.jsx`

Purpose: Runtime EnvironmentMap component and its lifecycle behavior.

- `ProceduralEnvironment` (L15): Procedural image-based lighting.   The ship is lit by a real directional sun, but shadowed surfaces were  rendering almost black because there was no environment to bounce light  into them. This builds a PMREM environment from a small procedural sky  (sky gradient + sun disc + sea colour) and ass...

- `inline useEffect at L18` (L18): useEffect callback.

- `inline callback at L63` (L63): Inline callback.

### `src/components/NavigationSystem.jsx`

Purpose: Runtime NavigationSystem component and its lifecycle behavior.

- `pivotNode` (L13): Apply an authored pivot rotation while preserving baked mesh offsets.

- `movingBounds` (L18): Bounds of the same transformed corners used by each shutter mesh.

- `shipLocalBounds` (L24): Cache exact mechanism bounds in the authored ship frame, excluding bobbing.

- `inline traverse at L26` (L26): traverse callback.

- `rudderSurfaceSections` (L35): Actual rudder skin sections in the same ship-local frame as its animation.

- `inline traverse at L37` (L37): traverse callback.

- `inline map at L48` (L48): map callback.

- `NavigationSystem` (L55): Wheel controls, guarded rolling apertures, mane/jaw/paddles and navigation.

- `inline useMemo at L57` (L57): useMemo callback.

- `inline useMemo at L57` (L57): useMemo callback.

- `inline useMemo at L58` (L58): useMemo callback.

- `inline map at L58` (L58): map callback.

- `inline useEffect at L59` (L59): useEffect callback.

- `inline onInteract at L60` (L60): onInteract callback.

- `operate` (L70): Implements operate.

- `state` (L81): Implements state.

- `yaw` (L81): Implements yaw.

- `dockColliders` (L81): Implements dockColliders.

- `jawColliders` (L81): Implements jawColliders.

- `shutters` (L81): Implements shutters.

- `inline filter at L81` (L81): filter callback.

- `inline map at L81` (L81): map callback.

- `inline callback at L82` (L82): Inline callback.

- `inline useFrame at L85` (L85): useFrame callback.

- `inline some at L89` (L89): some callback.

- `inline callback at L97` (L97): Inline callback.

- `inline find at L105` (L105): find callback.

- `inline map at L147` (L147): map callback.

- `inline map at L148` (L148): map callback.

- `inline filter at L148` (L148): filter callback.

- `inline sort at L148` (L148): sort callback.

- `inline map at L151` (L151): map callback.

- `inline filter at L151` (L151): filter callback.

- `inline sort at L151` (L151): sort callback.

- `inline from at L157` (L157): from callback.

- `inline callback at L157` (L157): Inline callback.

### `src/components/Ocean.jsx`

Purpose: Runtime Ocean component and its lifecycle behavior.

- `horizonGeometry` (L198): Four flat rectangles around the detailed ocean, only eight triangles.

- `Ocean` (L213): forwardRef callback.

- `inline useMemo at L217` (L217): useMemo callback.

- `inline useMemo at L220` (L220): useMemo callback.

- `inline from at L246` (L246): from callback.

- `inline useMemo at L252` (L252): useMemo callback.

- `inline useEffect at L258` (L258): useEffect callback.

- `reflectionFrames` (L260): Implements reflectionFrames.

- `inline callback at L261` (L261): Inline callback.

- `inline useEffect at L263` (L263): useEffect callback.

- `inline callback at L263` (L263): Inline callback.

- `inline useEffect at L264` (L264): useEffect callback.

- `inline callback at L264` (L264): Inline callback.

- `inline useFrame at L266` (L266): useFrame callback.

- `waveHeightAt` (L304): Height of the ocean surface at a world position.  Mirrors the vertex shader's Gerstner sum so the ship can bob with the waves.

### `src/components/PlayerController.jsx`

Purpose: Runtime PlayerController component and its lifecycle behavior.

- `PlayerController` (L41): First-person / third-person walker.   Physics is integrated manually rather than with a physics engine:  - velocity integrates acceleration and gravity  - ground is found by probing the collision floors beneath the player  - horizontal collision pushes the player out on the shallowest axis, which...

- `inline useMemo at L44` (L44): useMemo callback.

- `inline useStore at L48` (L48): useStore callback.

- `inline useStore at L49` (L49): useStore callback.

- `inline useEffect at L71` (L71): useEffect callback.

- `inline useEffect at L84` (L84): useEffect callback.

- `inline onInteract at L84` (L84): onInteract callback.

- `inline useEffect at L106` (L106): useEffect callback.

- `position` (L108): Implements position.

- `grounded` (L109): Implements grounded.

- `speed` (L110): Implements speed.

- `vel` (L111): Implements vel.

- `support` (L112): Implements support.

- `lastSafe` (L113): Implements lastSafe.

- `yaw` (L114): Implements yaw.

- `pitch` (L115): Implements pitch.

- `flyCollision` (L116): Implements flyCollision.

- `colliderCount` (L117): Implements colliderCount.

- `look` (L118): Implements look.

- `teleport` (L122): Implements teleport.

- `respawn` (L129): Implements respawn.

- `blocker` (L137): Implements blocker.

- `recoveries` (L138): Implements recoveries.

- `floorCount` (L139): Implements floorCount.

- `nearbyColliders` (L141): Physical contact diagnostics share the actual runtime collision world.

- `inline filter at L143` (L143): filter callback.

- `inline map at L146` (L146): map callback.

- `climbing` (L148): Implements climbing.

- `inline callback at L151` (L151): Inline callback.

- `inline useEffect at L155` (L155): useEffect callback.

- `onLockChange` (L156): Implements onLockChange.

- `reset` (L160): Implements reset.

- `releaseClimb` (L161): Implements releaseClimb.

- `inline callback at L164` (L164): Inline callback.

- `inline useFrame at L168` (L168): useFrame callback.

### `src/components/Ship.jsx`

Purpose: Runtime Ship component and its lifecycle behavior.

- `Ship` (L29): The Thousand Sunny.   The GLB keeps one node per original FBX object, and the Blender pipeline  stamped each with a 'sunny_part' semantic tag (mast / sail / rigging /  trim / hull_below / deck). That tag drives material selection, so  re-exporting the model does not break the app - no hardcoded n...

- `inline useMemo at L34` (L34): useMemo callback.

- `inline useEffect at L35` (L35): useEffect callback.

- `inline callback at L35` (L35): Inline callback.

- `inline useMemo at L38` (L38): useMemo callback.

- `inline traverse at L45` (L45): traverse callback.

- `paint` (L81): Implements paint.

- `inline useEffect at L98` (L98): useEffect callback.

- `inline traverse at L100` (L100): traverse callback.

- `inline callback at L105` (L105): Inline callback.

- `inline forEach at L105` (L105): forEach callback.

- `inline useMemo at L109` (L109): useMemo callback.

- `inline useMemo at L110` (L110): useMemo callback.

- `inline useFrame at L112` (L112): useFrame callback.

- `inline useEffect at L143` (L143): useEffect callback.

- `inline callback at L143` (L143): Inline callback.

- `inline useEffect at L151` (L151): useEffect callback.

- `inline callback at L153` (L153): Inline callback.

- `inferPart` (L165): Fallback classifier if the pipeline's custom property is missing.

### `src/components/UI.jsx`

Purpose: Runtime UI component and its lifecycle behavior.

- `UI` (L8): Minimal UI: a title screen before you enter, and a subtle HUD once playing.

- `inline useStore at L9` (L9): useStore callback.

- `inline useStore at L10` (L10): useStore callback.

- `inline useStore at L11` (L11): useStore callback.

- `inline useStore at L12` (L12): useStore callback.

- `inline useStore at L13` (L13): useStore callback.

- `inline useStore at L14` (L14): useStore callback.

- `inline useStore at L15` (L15): useStore callback.

- `inline useStore at L16` (L16): useStore callback.

- `inline useStore at L17` (L17): useStore callback.

- `inline useStore at L18` (L18): useStore callback.

- `inline useStore at L19` (L19): useStore callback.

- `inline useStore at L20` (L20): useStore callback.

- `inline useStore at L21` (L21): useStore callback.

- `inline useStore at L22` (L22): useStore callback.

- `inline useStore at L23` (L23): useStore callback.

### `src/config/exteriorConfig.json`

Purpose: Central exteriorConfig configuration.

Functions: none (declarative data, module-level execution, document or binary asset).

### `src/config/renderConfig.js`

Purpose: Central renderConfig configuration.

Functions: none (declarative data, module-level execution, document or binary asset).

### `src/config/shipConfig.js`

Purpose: Central shipConfig configuration.

Functions: none (declarative data, module-level execution, document or binary asset).

### `src/hooks/useInput.js`

Purpose: Keyboard/mouse input hook.

- `onInteract` (L17): Subscribe to the interact key. Returns an unsubscribe function.

- `fireInteract` (L21): Implements fireInteract.

- `useInput` (L32): Central keyboard + mouse input.   Pointer lock is requested by clicking the canvas; Esc releases it (browser  native). Keys are tracked in a ref so the physics loop can read them without  causing React re-renders on every keydown.

- `inline useStore at L46` (L46): useStore callback.

- `inline useStore at L47` (L47): useStore callback.

- `inline useStore at L48` (L48): useStore callback.

- `inline useStore at L49` (L49): useStore callback.

- `inline useStore at L50` (L50): useStore callback.

- `inline useStore at L51` (L51): useStore callback.

- `inline useEffect at L54` (L54): useEffect callback.

- `inline useEffect at L58` (L58): useEffect callback.

- `set` (L59): Implements set.

- `onDown` (L74): Implements onDown.

- `onUp` (L100): Implements onUp.

- `onBlur` (L103): Implements onBlur.

- `inline callback at L111` (L111): Inline callback.

- `inline useEffect at L121` (L121): useEffect callback.

- `onMove` (L122): Implements onMove.

- `inline callback at L129` (L129): Inline callback.

### `src/main.jsx`

Purpose: React root mount.

Functions: none (declarative data, module-level execution, document or binary asset).

### `src/state/useStore.js`

Purpose: Shared application state store.

- `inline create at L9` (L9): create callback.

- `setCannonPanelOpen` (L41): Implements setCannonPanelOpen.

- `setNavigation` (L49): Implements setNavigation.

- `setLoading` (L51): Implements setLoading.

- `setStarted` (L52): Implements setStarted.

- `setLocked` (L54): Implements setLocked.

- `toggleCameraMode` (L56): Implements toggleCameraMode.

- `inline set at L57` (L57): set callback.

- `togglePersonMode` (L65): Implements togglePersonMode.

- `inline set at L66` (L66): set callback.

- `toggleFlight` (L71): Implements toggleFlight.

- `inline set at L72` (L72): set callback.

- `toggleFlyCollision` (L78): Implements toggleFlyCollision.

- `inline set at L78` (L78): set callback.

- `setMovementMode` (L83): Implements setMovementMode.

- `setPlayer` (L86): Called every physics tick by the controller.

- `setNearClimb` (L88): Implements setNearClimb.

- `inline set at L88` (L88): set callback.

- `setWind` (L90): Implements setWind.

- `toggleHelp` (L92): Implements toggleHelp.

- `inline set at L92` (L92): set callback.

- `setHudMessage` (L93): Implements setHudMessage.

- `setNearInteraction` (L100): Called every frame by the door system. Both setters compare before writing  so a steady state (same opening, same open flag, same count) never produces  a new object - at 60 fps that would re-render the HUD forever.

- `inline set at L101` (L101): set callback.

- `setOpenDoorCount` (L111): Implements setOpenDoorCount.

- `inline set at L112` (L112): set callback.

- `clearInteraction` (L114): Implements clearInteraction.

- `inline set at L115` (L115): set callback.

### `src/systems/climbing.js`

Purpose: Shared climbing runtime system.

- `dist` (L4): Implements dist.

- `inline map at L4` (L4): map callback.

- `clamp` (L5): Implements clamp.

- `reachedClimbPoint` (L8): A swept floor contact retains its separation gap; GLB coordinates are Float32.

- `normalizeClimbs` (L13): Validate Blender paths and cache their metre lengths in Three coordinates.

- `inline flatMap at L14` (L14): flatMap callback.

- `inline some at L16` (L16): some callback.

- `inline some at L16` (L16): some callback.

- `inline map at L17` (L17): map callback.

- `pointAt` (L25): Interpolate continuously along the exact authored polyline.

- `inline map at L29` (L29): map callback.

- `closestOnPath` (L35): Closest physical position/progress on a path; no movement or teleport.

- `inline map at L38` (L38): map callback.

- `inline reduce at L38` (L38): reduce callback.

- `inline reduce at L39` (L39): reduce callback.

- `inline map at L40` (L40): map callback.

- `createClimbingSystem` (L47): Endpoint-only attachment and bounded proposals; the controller owns collision.

- `nearest` (L50): Implements nearest.

- `inline flatMap at L51` (L51): flatMap callback.

- `inline map at L51` (L51): map callback.

- `inline filter at L52` (L52): filter callback.

- `inline sort at L52` (L52): sort callback.

- `attach` (L54): Implements attach.

- `restore` (L59): Implements restore.

- `inline find at L60` (L60): find callback.

- `propose` (L65): Implements propose.

- `commit` (L70): Implements commit.

- `detach` (L71): Implements detach.

- `active` (L72): Implements active.

- `progress` (L72): Implements progress.

### `src/systems/collision.js`

Purpose: Shared collision runtime system.

- `setDynamic` (L67): Replace the dynamic collider set. Call once per frame with plain data so the  caller never allocates a Box3 itself:   setDynamic([{ min: [x, y, z], max: [x, y, z], name: 'DOOR_ForeDoor' }])   The Box3 instances and entry objects are pooled and reused; entries with a  non-finite bound are dropped ...

- `clearDynamic` (L104): Drop every dynamic collider (leaves frozen open would otherwise block).

- `buildWorld` (L115): Implements buildWorld.

- `inline traverse at L122` (L122): traverse callback.

- `resolveList` (L144): Axis-separated capsule-vs-one-list resolution. Shared by 'resolve' for the  static boxes and the dynamic layer; keeps the push-out maths in one place.

- `ceilingIn` (L184): Solid test for 'hasCeiling', over one list.

- `blockedIn` (L197): Solid overlap test for 'isBlocked', over one list.

- `useCollision` (L210): Implements useCollision.

- `inline useMemo at L213` (L213): useMemo callback.

- `raycastDown` (L218): Implements raycastDown.

- `resolve` (L242): Implements resolve.

- `hasCeiling` (L264): Implements hasCeiling.

- `isBlocked` (L269): Implements isBlocked.

- `stepHeightAt` (L275): Implements stepHeightAt.

- `moveFlight` (L278): Implements moveFlight.

- `flightBoxes` (L298): Implements flightBoxes.

### `src/systems/doors.js`

Purpose: Shared doors runtime system.

- `clamp` (L101): Implements clamp.

- `num` (L103): Implements num.

- `toThree` (L108): Blender (x, y, z) -> three.js (x, z, -y), per shipMeta.toThree.

- `vec3` (L118): Read a player position given as an array or as an {x, y, z} object.

- `normalizeDoor` (L128): One opening, normalised into three.js space with everything the per-frame  maths needs precomputed. Mutated in place for the lifetime of the system.

- `doorMotion` (L198): Closed-centre displacement and rotation; shared by visible and solid leaves.  A lift hinges about local Y at floor level, along the lid's +X edge.

- `writeBox` (L221): Write the leaf's world AABB at openness 't' into 'out'  ([minX, minY, minZ, maxX, maxY, maxZ]). Slide/hatch leaves translate; swing  leaves rotate about the hinge and their AABB is the bounding box of the  rotated extents (see the AABB note at the top of this file).

- `travel` (L242): How far any point of the leaf can travel while openness goes a -> b.  Slide/hatch: the straight travel distance. Swing: the arc, bounded by  'radius  dTheta', where the radius is the furthest leaf corner from the  hinge (the chord is never longer than the arc).

- `stepClear` (L267): True when the leaf's WHOLE continuous path from openness 'a' to 'b' stays at  least CONTACT_GAP clear of the capsule.   This is a proof, not a sample: the capsule is inflated by the distance the  leaf can travel during the step, so "the box at 'b' is outside the inflated  capsule" implies "the bo...

- `clampToPlayer` (L300): Largest openness in [from, to] whose whole path is capsule-clear.   'clear' is monotone (the swept region for a bigger step contains the region  for a smaller one), so a plain bisection is exact rather than heuristic:  14 iterations resolves the bound to well under a millimetre.

- `createDoorSystem` (L314): Implements createDoorSystem.

- `writeCollider` (L327): Fill a door's published collider from its current openness.

- `publish` (L350): Every leaf is published as solid, open or shut: "open" means the doorway  is passable, not that the leaf has stopped existing. A fully open sliding  leaf is parked flat against the wall (still a real obstacle) and a swung  leaf is out in the room.

- `reset` (L362): Implements reset.

- `nearestHatch` (L379): Nearest hatch within reach, given a feet position in three.js space.

- `nearestInteraction` (L403): Nearest hatch within reach of 'playerPosition', else null.

- `update` (L420): Advance every leaf.   @param {number} dt seconds (clamped, non-finite treated as 0)  @param {number[]|{x:number,y:number,z:number}|null} playerPosition FEET  position in three.js space; null closes everything  @param {{enabled?:boolean}} [options] enabled:false snaps shut and clears  @returns {{c...

- `toggleHatch` (L494): Latch a hatch open/closed. Returns the id, or null if it is not a hatch.

- `inline find at L495` (L495): find callback.

- `interactNearest` (L503): Toggle the nearest hatch in reach. Returns the id, or null.

- `getState` (L509): Implements getState.

- `getColliders` (L513): Implements getColliders.

### `src/systems/exteriorMaterials.js`

Purpose: Shared exteriorMaterials runtime system.

- `clamp` (L5): Implements clamp.

- `fract` (L6): Implements fract.

- `hash` (L7): Implements hash.

- `wave` (L8): Implements wave.

- `sample` (L25): Periodic texture sample: neutral albedo factor, metre relief and roughness.

- `texture` (L69): Configure every map with trilinear mipmaps and anisotropic filtering.

- `exteriorTextureSet` (L81): Generate shared neutral albedo, physical relief normals and roughness maps.

- `at` (L92): Implements at.

- `exteriorMaterial` (L103): Resolve a physical finish without changing the sourced painted region.

### `src/systems/flightCollision.js`

Purpose: Shared flightCollision runtime system.

- `sweepFlight` (L3): Implements sweepFlight.

- `inline filter at L14` (L14): filter callback.

- `inline some at L15` (L15): some callback.

### `src/systems/interactions.js`

Purpose: Shared interactions runtime system.

- `createInteractionBus` (L2): One-shot interaction dispatch with explicit priority and consumption.

- `subscribe` (L4): Implements subscribe.

- `inline callback at L5` (L5): Inline callback.

- `inline callback at L7` (L7): Inline callback.

- `emit` (L9): Implements emit.

- `inline sort at L10` (L10): sort callback.

### `src/systems/interiorLighting.js`

Purpose: Shared interiorLighting runtime system.

- `createInteriorLightRig` (L5): Two shadowed fixtures at most; records remain in source/ship coordinates.

- `inline map at L7` (L7): map callback.

- `inline from at L8` (L8): from callback.

- `update` (L17): Select nearby existing lamps, fading at the room-light budget boundary.

- `inline sort at L21` (L21): sort callback.

- `inline filter at L22` (L22): filter callback.

- `inline filter at L25` (L25): filter callback.

- `inline map at L25` (L25): map callback.

- `inline filter at L26` (L26): filter callback.

- `dispose` (L38): Free only this rig's two shadow targets when the ship is replaced.

### `src/systems/materials.js`

Purpose: Shared materials runtime system.

- `surfaceNoiseTexture` (L19): Implements surfaceNoiseTexture.

- `hash` (L22): Implements hash.

- `authoredMaterial` (L35): Stable authored base colours. Fine procedural detail is paused for geometry QA.

- `base` (L55): Implements base.

- `woodMaterial` (L63): Wood: plank/grain structure, used for the deck and masts.

- `inline callback at L73` (L73): Inline callback.

- `inline callback at L136` (L136): Inline callback.

- `shipSurfaceMaterial` (L153): The main ship surface material.   The source model merges the hull sides and the deck planking into a handful  of very large meshes, so no per-object material assignment can separate  them. Instead this shader decides per-fragment:   - upward-facing surfaces near deck height -> timber planking  -...

- `inline callback at L176` (L176): Inline callback.

- `inline callback at L260` (L260): Inline callback.

- `deckWoodMaterial` (L270): Deck planking. The generic wood material derives its plank rows from local  Y, which is correct for a vertical mast but degenerate on a flat deck (Y is  near-constant, so the pattern turns into moire). This one lays the planks  out in the local XZ plane and adds butt joints.

- `inline callback at L280` (L280): Inline callback.

- `inline callback at L324` (L324): Inline callback.

- `hullMaterial` (L329): Painted hull planking: cream-green with subtle plank seams and wear.

- `inline callback at L339` (L339): Inline callback.

- `inline callback at L370` (L370): Inline callback.

- `sailMaterial` (L375): Sail canvas: woven cloth with panel seams and a painted stripe.

- `inline callback at L386` (L386): Inline callback.

- `inline callback at L430` (L430): Inline callback.

- `metalMaterial` (L435): Polished painted metal / brass fittings.

- `ropeMaterial` (L444): Rope / rigging: fibrous, matte.

- `inline callback at L448` (L448): Inline callback.

- `inline callback at L463` (L463): Inline callback.

- `fallbackMaterial` (L468): Everything the GLB has not been given an explicit material for.

- `resolveMaterial` (L480): Resolve a material for a ship node, from the semantic tag written by the  Blender pipeline. Called once per node and memoised in the map cache.

### `src/systems/navigation.js`

Purpose: Shared navigation runtime system.

- `initial` (L5): Implements initial.

- `resetVoyage` (L8): Implements resetVoyage.

- `shipYaw` (L9): Implements shipYaw.

- `channelName` (L10): Implements channelName.

- `channelAngle` (L11): Implements channelAngle.

- `cannonAvailability` (L13): Shared readiness for the visible panel and keyboard mechanism actions.

- `operateCannon` (L18): Operate the existing real cannon from either user interface.

- `advanceCannon` (L31): Animate the real jaw/blast in Inspect as well as while walking.

- `rotatePoint` (L37): Rotate a ship-local point around a Y-up pivot.

- `dockBounds` (L42): Conservative physical bounds follow the carousel's exact mesh rotation.

- `inline map at L43` (L43): map callback.

- `inline map at L46` (L46): map callback.

- `inline map at L46` (L46): map callback.

- `inline map at L46` (L46): map callback.

- `inline map at L46` (L46): map callback.

- `shutterPose` (L50): Slats travel vertically then wrap around an X-axis roller; digits share it.

- `advanceVoyage` (L58): Closures pause for occupied apertures; carousel turns after full closure.

- `startBurst` (L92): Three tank barrels fund one Burst. Flight dimensions are simulated.

- `fireGaon` (L94): Uncompensated Gaon spends three barrels and recoils; no damage simulation.

### `src/systems/oceanReflection.js`

Purpose: Shared oceanReflection runtime system.

- `createOceanReflection` (L5): Budgeted planar reflection. Waves distort this image in the water shader.

- `frames` (L15): Implements frames.

- `ready` (L15): Implements ready.

- `update` (L17): Render only above the surface; retain main-camera hooks and visibility.

- `inline map at L35` (L35): map callback.

- `inline forEach at L38` (L38): forEach callback.

- `inline callback at L41` (L41): Inline callback.

- `inline forEach at L46` (L46): forEach callback.

- `dispose` (L50): Implements dispose.

### `src/systems/realisticExterior.js`

Purpose: Shared realisticExterior runtime system.

- `clamp` (L5): Implements clamp.

- `fract` (L6): Implements fract.

- `smooth` (L7): Implements smooth.

- `wave` (L8): Implements wave.

- `hash` (L10): Deterministic integer noise; no time-dependent grain or per-frame allocation.

- `noise` (L16): Periodic smooth noise keeps every generated albedo/data tile seamless.

- `at` (L18): Implements at.

- `sample` (L40): Neutral albedo, actual relief in metres, and absolute surface roughness.

- `makeTexture` (L96): Repeating filtered maps; colour conversion is confined to albedo.

- `realisticTextureSet` (L105): Shared PBR maps are generated once; normal slopes use the real tile size.

- `at` (L115): Implements at.

- `usesRealisticExterior` (L126): Protect authored room finishes/furniture while upgrading actual exterior.

- `exteriorSurfaceRole` (L134): Surface identity comes from material and fitting context, never random colour.

- `realisticExteriorMaterial` (L151): Physical finish with unchanged source palette; legacy room cache stays separate.

### `src/systems/realisticInterior.js`

Purpose: Shared realisticInterior runtime system.

- `clamp` (L6): Implements clamp.

- `noise` (L16): Stable periodic noise for fine fibres and fired glaze, without animation.

- `texture` (L21): Colour-managed mipmapped maps; repetition is measured in metres.

- `interiorTextureSet` (L29): Cache fabric, paper and ceramic maps; timber/metals share exterior map data only.

- `at` (L45): Implements at.

- `usesRealisticInterior` (L55): Upgrade authored rooms/furniture only after the exterior classifier has declined.

- `interiorSurfaceRole` (L61): Retain the authored surface identity and existing patterned colour regions.

- `interiorGeometry` (L86): Add metric projection attributes to a private clone, retaining every shape/index/UV.

- `interiorTileSize` (L101): The physical floor grid was authored in these same global source metres.

- `applyInteriorProjection` (L109): Seamless three-axis PBR projection for furniture that has no authored UVs.

- `realisticInteriorMaterial` (L152): Separate cached room materials; source/exterior instances are never modified.

- `inline callback at L163` (L163): Inline callback.

- `inline callback at L163` (L163): Inline callback.

### `src/systems/sails.js`

Purpose: Shared sails runtime system.

- `makeSailMaterial` (L150): Build a sail ShaderMaterial.

- `emblemTexture` (L198): Configure the Suspense-loaded shared vector paint; no load during render.

- `updateWind` (L216): Advance the wind simulation. Returns the current state.  Two incommensurate sines give natural gusting without random noise.

### `src/systems/shipMeta.js`

Purpose: Shared shipMeta runtime system.

- `useShipMeta` (L13): Ship metadata loader.   'ship-metadata.json' is written by tools/build_assets.py in BLENDER  coordinates (Z-up). The GLB is exported with export_yup=True, so three.js  receives Y-up. Every position coming out of the metadata is therefore  converted here, so the rest of the app only ever deals wit...

- `inline useEffect at L16` (L16): useEffect callback.

- `inline then at L19` (L19): then callback.

- `inline then at L23` (L23): then callback.

- `inline catch at L27` (L27): catch callback.

- `inline callback at L31` (L31): Inline callback.

- `toThree` (L38): Blender (Z-up) -> three.js (Y-up).

- `boxToThree` (L43): Vector3-style helper for a Blender box.

- `convertMeta` (L51): Implements convertMeta.

- `inline map at L72` (L72): map callback.

- `fallbackMeta` (L91): Implements fallbackMeta.

### `src/systems/stepSupport.js`

Purpose: Shared stepSupport runtime system.

- `stepSupport` (L2): Highest climbable floor touched by the same footprint used for collisions.

### `src/systems/surfaceCollision.js`

Purpose: Shared surfaceCollision runtime system.

- `component` (L2): Implements component.

- `clip` (L5): Clip a convex polygon to one coordinate half-plane.

- `inline map at L15` (L15): map callback.

- `surfaceCollisionBounds` (L27): Clip real triangles into small horizontal cells, merging their skin bounds  only within each cell. This retains the closed blade profile without a  whole-envelope phantom wall or thousands of duplicate triangle boxes.  Input is an array of triangles of [x, y, z] points in ship-local Y-up metres.

- `inline some at L31` (L31): some callback.

- `inline some at L31` (L31): some callback.

- `inline map at L34` (L34): map callback.

- `inline map at L35` (L35): map callback.

- `inline map at L36` (L36): map callback.

- `inline map at L37` (L37): map callback.

- `inline map at L44` (L44): map callback.

- `inline map at L44` (L44): map callback.

- `inline map at L45` (L45): map callback.

- `inline map at L45` (L45): map callback.

### `stuff/1.FBX`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/Thousand Sunny at Golden Hour.png`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Mini_Merry_II.html`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Sunnyworkroom.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Aquarium_Bar.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Crow%27s_Nest_and_Survey_Room.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Figurehead%2C_Helm%2C_and_Anchors.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Kitchen%2C_Dining_Room%2C_and_Sick_Bay.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Library%2C_Workrooms%2C_and_Bathhouse.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny%27s_Men_and_Woman_Quarters.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_Digitally_Colored_Manga.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_Infobox.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.126.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.192-193.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.26.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.46.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.66.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_Sunny_pg.86.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_aquarium_bar.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_bathroom.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_boys_room.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_crows_nest.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_girls_room.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_kitchen.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_library.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_sick_bay.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Thousand_sunny_usopp_factory.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `stuff/images/Usopp%27s_Garden_of_Pop_Greens.webp`

Purpose: Unmodified supplied source/reference asset.

Functions: none (declarative data, module-level execution, document or binary asset).

### `tests/assets.test.mjs`

Purpose: Verification of assets.test behavior; helpers are listed where present.

- `check` (L14): Implements check.

- `closedExportedMeshes` (L26): Implements closedExportedMeshes.

- `inline every at L28` (L28): every callback.

- `inline find at L29` (L29): find callback.

- `key` (L32): Implements key.

- `inline map at L32` (L32): map callback.

- `inline from at L35` (L35): from callback.

- `inline map at L37` (L37): map callback.

- `inline map at L38` (L38): map callback.

- `inline every at L49` (L49): every callback.

- `inline flatMap at L71` (L71): flatMap callback.

- `inline map at L73` (L73): map callback.

- `inline filter at L74` (L74): filter callback.

- `inline filter at L75` (L75): filter callback.

- `inline find at L76` (L76): find callback.

- `inline find at L76` (L76): find callback.

- `inline filter at L82` (L82): filter callback.

- `inline filter at L83` (L83): filter callback.

- `inline filter at L83` (L83): filter callback.

- `inline map at L84` (L84): map callback.

- `acc` (L92): Implements acc.

- `visit` (L93): Implements visit.

- `inline map at L115` (L115): map callback.

- `inline every at L117` (L117): every callback.

- `inline map at L118` (L118): map callback.

- `inline every at L127` (L127): every callback.

- `inline map at L128` (L128): map callback.

- `inline map at L128` (L128): map callback.

- `inline map at L130` (L130): map callback.

- `inline map at L133` (L133): map callback.

- `inline filter at L136` (L136): filter callback.

- `inline map at L137` (L137): map callback.

- `inline map at L141` (L141): map callback.

- `inline map at L145` (L145): map callback.

- `inline filter at L146` (L146): filter callback.

- `inline map at L151` (L151): map callback.

- `inline reduce at L153` (L153): reduce callback.

- `inline filter at L159` (L159): filter callback.

- `inline filter at L160` (L160): filter callback.

- `inline filter at L161` (L161): filter callback.

- `inline filter at L162` (L162): filter callback.

- `inline map at L174` (L174): map callback.

- `inline map at L175` (L175): map callback.

- `inline map at L176` (L176): map callback.

- `inline map at L187` (L187): map callback.

- `inline every at L199` (L199): every callback.

- `inline every at L202` (L202): every callback.

- `inline filter at L204` (L204): filter callback.

- `inline every at L205` (L205): every callback.

- `inline every at L205` (L205): every callback.

- `inline filter at L206` (L206): filter callback.

- `inline every at L206` (L206): every callback.

- `inline every at L206` (L206): every callback.

- `inline find at L206` (L206): find callback.

- `uvWorld` (L208): Implements uvWorld.

- `deckMetres` (L210): Implements deckMetres.

- `inline find at L211` (L211): find callback.

- `inline from at L216` (L216): from callback.

- `inline map at L218` (L218): map callback.

- `inline every at L229` (L229): every callback.

- `inline find at L230` (L230): find callback.

- `inline find at L230` (L230): find callback.

- `inline flatMap at L231` (L231): flatMap callback.

- `inline filter at L231` (L231): filter callback.

- `inline filter at L234` (L234): filter callback.

- `inline every at L235` (L235): every callback.

- `inline every at L235` (L235): every callback.

- `inline every at L235` (L235): every callback.

- `inline every at L237` (L237): every callback.

- `inline every at L237` (L237): every callback.

- `inline every at L238` (L238): every callback.

- `inline every at L239` (L239): every callback.

- `inline map at L241` (L241): map callback.

- `inline every at L244` (L244): every callback.

- `inline find at L248` (L248): find callback.

- `inline find at L248` (L248): find callback.

- `inline filter at L250` (L250): filter callback.

- `inline some at L250` (L250): some callback.

- `inline every at L251` (L251): every callback.

- `inline find at L251` (L251): find callback.

- `inline every at L251` (L251): every callback.

- `inline find at L251` (L251): find callback.

- `inline filter at L252` (L252): filter callback.

- `inline filter at L252` (L252): filter callback.

- `inline every at L252` (L252): every callback.

- `inline filter at L253` (L253): filter callback.

- `inline every at L254` (L254): every callback.

- `inline some at L254` (L254): some callback.

- `inline some at L254` (L254): some callback.

- `inline some at L254` (L254): some callback.

- `inline filter at L255` (L255): filter callback.

- `inline every at L256` (L256): every callback.

- `inline some at L256` (L256): some callback.

- `inline every at L256` (L256): every callback.

- `inline filter at L256` (L256): filter callback.

- `inline some at L256` (L256): some callback.

- `inline filter at L256` (L256): filter callback.

- `inline some at L256` (L256): some callback.

- `inline some at L257` (L257): some callback.

- `inline some at L257` (L257): some callback.

- `inline filter at L258` (L258): filter callback.

- `inline some at L258` (L258): some callback.

- `inline filter at L259` (L259): filter callback.

- `inline find at L259` (L259): find callback.

- `inline filter at L260` (L260): filter callback.

- `inline every at L261` (L261): every callback.

- `inline every at L263` (L263): every callback.

- `inline some at L263` (L263): some callback.

- `inline every at L263` (L263): every callback.

- `inline find at L263` (L263): find callback.

- `inline find at L263` (L263): find callback.

- `inline find at L263` (L263): find callback.

- `inline filter at L265` (L265): filter callback.

- `smoothPaintSeams` (L267): Measure actual normal continuity at a paint boundary, across primitives.

- `inline find at L268` (L268): find callback.

- `inline from at L273` (L273): from callback.

- `inline filter at L277` (L277): filter callback.

- `inline map at L277` (L277): map callback.

- `inline filter at L278` (L278): filter callback.

- `inline every at L278` (L278): every callback.

- `inline every at L278` (L278): every callback.

- `inline every at L283` (L283): every callback.

- `inline find at L284` (L284): find callback.

- `inline find at L284` (L284): find callback.

- `materialNames` (L287): Implements materialNames.

- `inline map at L287` (L287): map callback.

- `inline find at L288` (L288): find callback.

- `inline find at L288` (L288): find callback.

- `inline find at L288` (L288): find callback.

- `projectedPaintFraction` (L290): Measure paint coverage on actual exported triangles projected along the bow.

- `inline from at L294` (L294): from callback.

- `inline find at L303` (L303): find callback.

- `inline every at L305` (L305): every callback.

- `inline find at L305` (L305): find callback.

- `inline every at L305` (L305): every callback.

- `inline every at L306` (L306): every callback.

- `inline find at L306` (L306): find callback.

- `inline filter at L306` (L306): filter callback.

- `inline filter at L307` (L307): filter callback.

- `inline filter at L307` (L307): filter callback.

- `inline every at L307` (L307): every callback.

- `inline some at L307` (L307): some callback.

- `inline every at L309` (L309): every callback.

- `inline find at L309` (L309): find callback.

- `inline every at L309` (L309): every callback.

- `inline find at L310` (L310): find callback.

- `inline find at L310` (L310): find callback.

- `inline find at L311` (L311): find callback.

- `inline some at L313` (L313): some callback.

- `inline every at L315` (L315): every callback.

- `inline find at L316` (L316): find callback.

- `inline filter at L318` (L318): filter callback.

- `inline some at L318` (L318): some callback.

- `inline every at L321` (L321): every callback.

- `inline find at L321` (L321): find callback.

- `inline every at L323` (L323): every callback.

- `inline find at L324` (L324): find callback.

- `inline find at L324` (L324): find callback.

- `inline find at L325` (L325): find callback.

- `inline filter at L328` (L328): filter callback.

- `inline some at L333` (L333): some callback.

- `inline some at L333` (L333): some callback.

- `inline find at L334` (L334): find callback.

- `inline filter at L335` (L335): filter callback.

- `inline filter at L336` (L336): filter callback.

- `inline every at L339` (L339): every callback.

- `inline some at L340` (L340): some callback.

- `inline filter at L345` (L345): filter callback.

- `inline from at L347` (L347): from callback.

- `inline every at L347` (L347): every callback.

- `inline some at L348` (L348): some callback.

- `inline find at L349` (L349): find callback.

- `inline find at L349` (L349): find callback.

- `inline find at L352` (L352): find callback.

- `inline find at L353` (L353): find callback.

- `inline some at L354` (L354): some callback.

- `inline some at L354` (L354): some callback.

- `inline from at L357` (L357): from callback.

- `inline every at L357` (L357): every callback.

- `inline some at L358` (L358): some callback.

- `inline find at L359` (L359): find callback.

- `inline find at L359` (L359): find callback.

- `inline find at L362` (L362): find callback.

- `inline some at L363` (L363): some callback.

- `inline some at L363` (L363): some callback.

- `inline some at L364` (L364): some callback.

- `inline from at L367` (L367): from callback.

- `inline every at L367` (L367): every callback.

- `inline some at L368` (L368): some callback.

- `inline filter at L370` (L370): filter callback.

- `inline filter at L371` (L371): filter callback.

- `inline every at L371` (L371): every callback.

- `inline every at L373` (L373): every callback.

- `inline some at L373` (L373): some callback.

- `inline find at L375` (L375): find callback.

- `inline find at L375` (L375): find callback.

- `inline find at L379` (L379): find callback.

- `inline filter at L380` (L380): filter callback.

- `inline reduce at L381` (L381): reduce callback.

- `inline map at L383` (L383): map callback.

- `inline find at L383` (L383): find callback.

- `inline every at L384` (L384): every callback.

- `inline find at L385` (L385): find callback.

- `inline find at L386` (L386): find callback.

- `inline some at L388` (L388): some callback.

- `inline every at L390` (L390): every callback.

- `inline every at L393` (L393): every callback.

- `inline some at L393` (L393): some callback.

- `inline filter at L395` (L395): filter callback.

- `inline every at L395` (L395): every callback.

- `inline some at L396` (L396): some callback.

- `inline some at L396` (L396): some callback.

- `inline filter at L398` (L398): filter callback.

- `inline every at L398` (L398): every callback.

- `inline some at L400` (L400): some callback.

- `inline filter at L403` (L403): filter callback.

- `inline every at L404` (L404): every callback.

- `inline filter at L405` (L405): filter callback.

- `inline every at L406` (L406): every callback.

- `inline find at L408` (L408): find callback.

- `inline filter at L410` (L410): filter callback.

- `inline filter at L411` (L411): filter callback.

- `inline every at L411` (L411): every callback.

- `inline filter at L412` (L412): filter callback.

- `inline map at L413` (L413): map callback.

- `inline map at L413` (L413): map callback.

- `inline map at L414` (L414): map callback.

- `inline map at L414` (L414): map callback.

- `inline map at L414` (L414): map callback.

- `inline filter at L416` (L416): filter callback.

- `inline every at L417` (L417): every callback.

- `inline find at L418` (L418): find callback.

- `inline find at L419` (L419): find callback.

- `inline find at L423` (L423): find callback.

- `inline find at L425` (L425): find callback.

- `inline find at L425` (L425): find callback.

- `inline find at L430` (L430): find callback.

- `inline find at L431` (L431): find callback.

- `inline find at L433` (L433): find callback.

- `inline find at L434` (L434): find callback.

- `inline every at L437` (L437): every callback.

- `inline some at L437` (L437): some callback.

- `inline some at L438` (L438): some callback.

- `inline some at L438` (L438): some callback.

- `inline every at L441` (L441): every callback.

- `inline some at L441` (L441): some callback.

- `inline every at L443` (L443): every callback.

- `inline filter at L444` (L444): filter callback.

- `inline every at L445` (L445): every callback.

- `inline filter at L447` (L447): filter callback.

- `inline find at L448` (L448): find callback.

- `inline filter at L450` (L450): filter callback.

- `inline map at L452` (L452): map callback.

- `inline map at L453` (L453): map callback.

- `inline find at L454` (L454): find callback.

- `inline every at L455` (L455): every callback.

- `inline find at L457` (L457): find callback.

- `inline find at L457` (L457): find callback.

- `inline find at L457` (L457): find callback.

- `inline some at L459` (L459): some callback.

- `inline some at L463` (L463): some callback.

- `inline every at L464` (L464): every callback.

- `inline filter at L467` (L467): filter callback.

- `inline filter at L468` (L468): filter callback.

- `inline filter at L469` (L469): filter callback.

- `inline some at L471` (L471): some callback.

- `inline map at L473` (L473): map callback.

- `inline find at L474` (L474): find callback.

- `inline filter at L475` (L475): filter callback.

- `inline every at L476` (L476): every callback.

- `inline filter at L477` (L477): filter callback.

- `inline reduce at L478` (L478): reduce callback.

- `physicalWall` (L480): Implements physicalWall.

- `inline filter at L481` (L481): filter callback.

- `inline map at L482` (L482): map callback.

- `inline map at L482` (L482): map callback.

- `inline filter at L484` (L484): filter callback.

- `inline every at L485` (L485): every callback.

- `inline find at L486` (L486): find callback.

- `inline filter at L486` (L486): filter callback.

- `inline map at L487` (L487): map callback.

- `inline map at L487` (L487): map callback.

- `inline filter at L489` (L489): filter callback.

- `inline find at L491` (L491): find callback.

- `inline every at L492` (L492): every callback.

- `inline from at L496` (L496): from callback.

- `inline every at L496` (L496): every callback.

- `inline some at L496` (L496): some callback.

- `inline some at L496` (L496): some callback.

- `inline some at L497` (L497): some callback.

- `inline filter at L497` (L497): filter callback.

- `inline some at L498` (L498): some callback.

- `inline some at L499` (L499): some callback.

- `inline map at L504` (L504): map callback.

- `inline filter at L509` (L509): filter callback.

- `comp` (L511): Implements comp.

- `inline map at L512` (L512): map callback.

### `tests/cannonControls.mjs`

Purpose: Verification of cannonControls behavior; helpers are listed where present.

- `pause` (L7): Implements pause.

- `inline callback at L7` (L7): Inline callback.

- `inline on at L10` (L10): on callback.

- `start` (L12): Start exactly through the title card, without injecting app state.

- `inline waitForFunction at L14` (L14): waitForFunction callback.

- `sample` (L19): Read actual navigation state and rendered moving-jaw pose as evidence only.

- `inline evaluate at L20` (L20): evaluate callback.

- `inline evaluate at L28` (L28): evaluate callback.

- `inline evaluate at L30` (L30): evaluate callback.

- `inline waitForFunction at L32` (L32): waitForFunction callback.

- `inline evaluate at L33` (L33): evaluate callback.

- `inline some at L34` (L34): some callback.

- `inline waitForFunction at L39` (L39): waitForFunction callback.

- `inline waitForFunction at L41` (L41): waitForFunction callback.

- `inline evaluate at L42` (L42): evaluate callback.

- `inline waitForFunction at L44` (L44): waitForFunction callback.

- `inline evaluate at L46` (L46): evaluate callback.

- `inline find at L46` (L46): find callback.

- `inline $eval at L49` (L49): $eval callback.

- `inline waitForFunction at L51` (L51): waitForFunction callback.

- `inline waitForFunction at L52` (L52): waitForFunction callback.

- `inline waitForFunction at L53` (L53): waitForFunction callback.

- `inline evaluate at L54` (L54): evaluate callback.

- `inline waitForFunction at L55` (L55): waitForFunction callback.

- `inline waitForFunction at L56` (L56): waitForFunction callback.

- `inline waitForFunction at L64` (L64): waitForFunction callback.

- `inline evaluate at L68` (L68): evaluate callback.

- `inline evaluate at L69` (L69): evaluate callback.

- `inline waitForFunction at L71` (L71): waitForFunction callback.

- `inline $eval at L74` (L74): $eval callback.

### `tests/climbing.mjs`

Purpose: Verification of climbing behavior; helpers are listed where present.

- `inline find at L9` (L9): find callback.

- `sleep` (L13): Implements sleep.

- `inline callback at L13` (L13): Inline callback.

- `inline on at L16` (L16): on callback.

- `inline waitForFunction at L18` (L18): waitForFunction callback.

- `inline waitForFunction at L19` (L19): waitForFunction callback.

- `read` (L20): Implements read.

- `inline evaluate at L20` (L20): evaluate callback.

- `toggleHatch` (L22): Implements toggleHatch.

- `inline waitForFunction at L24` (L24): waitForFunction callback.

- `view` (L27): Implements view.

- `inline evaluate at L28` (L28): evaluate callback.

- `walk` (L31): Implements walk.

- `inline map at L40` (L40): map callback.

- `climb` (L42): Sample continuous actual movement, guarding speed/recoveries and stalls.

- `inline map at L48` (L48): map callback.

- `inline evaluate at L58` (L58): evaluate callback.

- `inline climb at L59` (L59): climb callback.

- `inline waitForFunction at L63` (L63): waitForFunction callback.

- `inline map at L64` (L64): map callback.

- `inline climb at L66` (L66): climb callback.

- `inline map at L66` (L66): map callback.

- `inline climb at L72` (L72): climb callback.

- `inline evaluate at L75` (L75): evaluate callback.

- `inline climb at L79` (L79): climb callback.

- `inline map at L79` (L79): map callback.

- `inline climb at L81` (L81): climb callback.

- `inline climb at L85` (L85): climb callback.

- `inline evaluate at L93` (L93): evaluate callback.

### `tests/climbing.test.mjs`

Purpose: Verification of climbing.test behavior; helpers are listed where present.

- `inline subscribe at L39` (L39): subscribe callback.

- `inline subscribe at L40` (L40): subscribe callback.

- `inline subscribe at L44` (L44): subscribe callback.

### `tests/doors.test.mjs`

Purpose: Verification of doors.test behavior; helpers are listed where present.

- `inline find at L10` (L10): find callback.

- `inline find at L86` (L86): find callback.

### `tests/exterior.test.mjs`

Purpose: Verification of exterior.test behavior; helpers are listed where present.

- `inline filter at L26` (L26): filter callback.

- `visit` (L27): Implements visit.

- `inline from at L30` (L30): from callback.

- `inline from at L45` (L45): from callback.

- `inline sort at L125` (L125): sort callback.

- `inline filter at L127` (L127): filter callback.

- `inline map at L127` (L127): map callback.

- `inline map at L127` (L127): map callback.

- `inline reduce at L128` (L128): reduce callback.

- `inline map at L128` (L128): map callback.

- `inline map at L128` (L128): map callback.

- `inline map at L128` (L128): map callback.

- `inline map at L128` (L128): map callback.

- `intersectionArea` (L136): Implements intersectionArea.

- `cross` (L138): Implements cross.

- `inline reduce at L149` (L149): reduce callback.

- `inline filter at L155` (L155): filter callback.

- `inline flatMap at L157` (L157): flatMap callback.

- `inline filter at L171` (L171): filter callback.

- `inline flatMap at L175` (L175): flatMap callback.

- `inline filter at L189` (L189): filter callback.

- `inline find at L190` (L190): find callback.

- `inline filter at L197` (L197): filter callback.

- `inline flatMap at L200` (L200): flatMap callback.

- `inline filter at L214` (L214): filter callback.

- `inline flatMap at L218` (L218): flatMap callback.

- `inline filter at L227` (L227): filter callback.

- `inline filter at L227` (L227): filter callback.

- `inline filter at L236` (L236): filter callback.

- `inline flatMap at L239` (L239): flatMap callback.

- `inline filter at L248` (L248): filter callback.

- `inline flatMap at L248` (L248): flatMap callback.

- `inline map at L250` (L250): map callback.

- `inline map at L250` (L250): map callback.

- `inline map at L250` (L250): map callback.

- `inline filter at L251` (L251): filter callback.

- `inline map at L252` (L252): map callback.

- `inline map at L252` (L252): map callback.

- `inline filter at L253` (L253): filter callback.

- `inline filter at L253` (L253): filter callback.

- `inline filter at L258` (L258): filter callback.

- `inline map at L262` (L262): map callback.

- `inline filter at L282` (L282): filter callback.

- `inline filter at L284` (L284): filter callback.

- `inline filter at L285` (L285): filter callback.

- `inline every at L286` (L286): every callback.

- `inline flatMap at L288` (L288): flatMap callback.

- `inline map at L288` (L288): map callback.

- `inline map at L289` (L289): map callback.

- `inline map at L289` (L289): map callback.

- `inline map at L289` (L289): map callback.

- `inline filter at L291` (L291): filter callback.

- `inline map at L292` (L292): map callback.

- `inline map at L292` (L292): map callback.

- `inline map at L294` (L294): map callback.

- `inline every at L295` (L295): every callback.

- `inline map at L303` (L303): map callback.

- `inline map at L320` (L320): map callback.

- `inline map at L320` (L320): map callback.

- `firstContainerHit` (L328): A top-facing red cap hid the soil even though all three pot bounds passed.

- `inline filter at L337` (L337): filter callback.

- `inline filter at L339` (L339): filter callback.

- `inline filter at L340` (L340): filter callback.

- `inline filter at L340` (L340): filter callback.

- `inline flatMap at L342` (L342): flatMap callback.

- `inline flatMap at L343` (L343): flatMap callback.

- `inline find at L346` (L346): find callback.

- `inline find at L348` (L348): find callback.

- `inline every at L349` (L349): every callback.

- `inline filter at L366` (L366): filter callback.

- `inline filter at L367` (L367): filter callback.

- `inline flatMap at L367` (L367): flatMap callback.

- `inline filter at L369` (L369): filter callback.

- `inline filter at L381` (L381): filter callback.

- `inline flatMap at L381` (L381): flatMap callback.

- `inline filter at L382` (L382): filter callback.

- `inline reduce at L382` (L382): reduce callback.

- `inline filter at L385` (L385): filter callback.

- `inline flatMap at L385` (L385): flatMap callback.

- `inline filter at L386` (L386): filter callback.

- `inline reduce at L386` (L386): reduce callback.

- `inline filter at L389` (L389): filter callback.

- `inline map at L389` (L389): map callback.

- `inline filter at L392` (L392): filter callback.

- `inline flatMap at L392` (L392): flatMap callback.

- `inline filter at L394` (L394): filter callback.

- `inline map at L394` (L394): map callback.

- `inline map at L394` (L394): map callback.

- `inline find at L400` (L400): find callback.

- `inline some at L401` (L401): some callback.

- `inline map at L409` (L409): map callback.

- `inline find at L411` (L411): find callback.

- `railAxisEnds` (L418): Recover each straight rail's two axis endpoints from its actual end rings.

- `inline map at L419` (L419): map callback.

- `inline map at L419` (L419): map callback.

- `inline reduce at L420` (L420): reduce callback.

- `inline from at L421` (L421): from callback.

- `inline sort at L423` (L423): sort callback.

- `inline map at L425` (L425): map callback.

- `inline reduce at L425` (L425): reduce callback.

- `inline map at L426` (L426): map callback.

- `inline map at L427` (L427): map callback.

- `inline filter at L428` (L428): filter callback.

- `inline reduce at L430` (L430): reduce callback.

- `inline filter at L433` (L433): filter callback.

- `inline map at L433` (L433): map callback.

- `inline filter at L434` (L434): filter callback.

- `inline some at L438` (L438): some callback.

- `maneSections` (L453): official metric dimensions or whole-figurehead accuracy acceptance.

- `inline reduce at L454` (L454): reduce callback.

- `inline map at L456` (L456): map callback.

- `inline map at L456` (L456): map callback.

- `inline map at L457` (L457): map callback.

- `inline map at L457` (L457): map callback.

- `inline from at L458` (L458): from callback.

- `inline map at L469` (L469): map callback.

- `key` (L476): Implements key.

- `inline map at L476` (L476): map callback.

- `inline some at L481` (L481): some callback.

- `mouthPose` (L498): that this perspective drawing gives official metre dimensions.

- `inline map at L503` (L503): map callback.

- `inline map at L503` (L503): map callback.

- `frontHits` (L505): Implements frontHits.

- `inline map at L525` (L525): map callback.

- `inline sort at L529` (L529): sort callback.

- `inline filter at L552` (L552): filter callback.

- `inline flatMap at L552` (L552): flatMap callback.

- `inline callback at L554` (L554): Inline callback.

- `inline map at L561` (L561): map callback.

- `inline sort at L561` (L561): sort callback.

- `key` (L566): Implements key.

- `inline map at L566` (L566): map callback.

- `inline every at L571` (L571): every callback.

- `inline flatMap at L573` (L573): flatMap callback.

- `inline flatMap at L584` (L584): flatMap callback.

- `inline flatMap at L584` (L584): flatMap callback.

- `featureHits` (L589): Intersect the actual exported feature surface along the frontal X axis.

- `inline flatMap at L591` (L591): flatMap callback.

- `inline sort at L591` (L591): sort callback.

- `inline filter at L593` (L593): filter callback.

- `inline map at L606` (L606): map callback.

- `inline map at L614` (L614): map callback.

- `fittingHits` (L623): source's oval spar. Stitch depth is reconstructed; human clearance is unchanged.

- `inline sort at L626` (L626): sort callback.

- `inline filter at L638` (L638): filter callback.

- `radius` (L667): Implements radius.

- `uniqueRigPoints` (L682): not establish attachment to the tapered mast or oval yard.

- `inline map at L682` (L682): map callback.

- `inline map at L682` (L682): map callback.

- `ringCentre` (L683): Implements ringCentre.

- `inline reduce at L683` (L683): reduce callback.

- `radialWoodOverlap` (L684): Implements radialWoodOverlap.

- `inline filter at L694` (L694): filter callback.

- `inline filter at L697` (L697): filter callback.

- `planeDistance` (L711): Implements planeDistance.

- `inline filter at L712` (L712): filter callback.

- `inline sort at L712` (L712): sort callback.

- `inline every at L713` (L713): every callback.

- `inline filter at L719` (L719): filter callback.

- `inline filter at L730` (L730): filter callback.

- `inline filter at L740` (L740): filter callback.

- `inline filter at L765` (L765): filter callback.

- `inline reduce at L767` (L767): reduce callback.

- `inline reduce at L767` (L767): reduce callback.

- `inline filter at L770` (L770): filter callback.

- `inline map at L770` (L770): map callback.

- `inline some at L775` (L775): some callback.

- `inline flatMap at L788` (L788): flatMap callback.

- `inline flatMap at L789` (L789): flatMap callback.

- `inline find at L795` (L795): find callback.

- `inline filter at L799` (L799): filter callback.

- `lookoutHits` (L801): Read first real wall/glass owners along an exterior ellipse-parameter ray.

- `inline sort at L809` (L809): sort callback.

- `inline filter at L818` (L818): filter callback.

- `inline map at L818` (L818): map callback.

- `inline sort at L818` (L818): sort callback.

- `inline filter at L822` (L822): filter callback.

- `key` (L823): Implements key.

- `inline map at L823` (L823): map callback.

- `inline some at L828` (L828): some callback.

- `inline some at L828` (L828): some callback.

- `inline filter at L830` (L830): filter callback.

- `frameDistance` (L833): Measure actual pane corners against nearby opaque frame surfaces.

- `inline flatMap at L835` (L835): flatMap callback.

- `inline map at L835` (L835): map callback.

- `inline flatMap at L838` (L838): flatMap callback.

- `inline filter at L840` (L840): filter callback.

- `inline map at L840` (L840): map callback.

- `inline flatMap at L841` (L841): flatMap callback.

- `inline map at L841` (L841): map callback.

- `inline map at L841` (L841): map callback.

- `bowClosedBody` (L856): Require actual shared edges and a single connected watertight body.

- `key` (L857): Implements key.

- `inline map at L857` (L857): map callback.

- `inline every at L863` (L863): every callback.

- `bowSection` (L869): Slice actual triangles with an independent physical section plane.

- `inline map at L877` (L877): map callback.

- `inline map at L877` (L877): map callback.

- `inline find at L881` (L881): find callback.

- `inline map at L883` (L883): map callback.

- `inline every at L886` (L886): every callback.

- `inline map at L887` (L887): map callback.

- `inline map at L894` (L894): map callback.

- `axialHit` (L914): Implements axialHit.

- `inline from at L918` (L918): from callback.

- `best` (L922): Implements best.

- `inline filter at L922` (L922): filter callback.

- `inline sort at L922` (L922): sort callback.

- `inline filter at L923` (L923): filter callback.

- `inline filter at L923` (L923): filter callback.

- `inline filter at L933` (L933): filter callback.

- `inline reduce at L933` (L933): reduce callback.

- `inline filter at L945` (L945): filter callback.

- `inline map at L948` (L948): map callback.

- `inline every at L950` (L950): every callback.

- `projection` (L953): Implements projection.

- `inline sort at L961` (L961): sort callback.

- `inline filter at L974` (L974): filter callback.

- `inline flatMap at L976` (L976): flatMap callback.

- `inline map at L976` (L976): map callback.

- `inline sort at L995` (L995): sort callback.

- `inline find at L1009` (L1009): find callback.

- `anchorPoints` (L1011): Implements anchorPoints.

- `inline map at L1011` (L1011): map callback.

- `inline map at L1011` (L1011): map callback.

- `anchorCapCentres` (L1012): Implements anchorCapCentres.

- `inline find at L1016` (L1016): find callback.

- `inline find at L1018` (L1018): find callback.

- `inline filter at L1021` (L1021): filter callback.

- `inline map at L1021` (L1021): map callback.

- `inline reduce at L1021` (L1021): reduce callback.

- `inline every at L1027` (L1027): every callback.

- `inline sort at L1036` (L1036): sort callback.

- `inline map at L1041` (L1041): map callback.

- `inline some at L1054` (L1054): some callback.

- `inline flatMap at L1061` (L1061): flatMap callback.

- `inline map at L1061` (L1061): map callback.

- `inline sort at L1063` (L1063): sort callback.

- `inline sort at L1065` (L1065): sort callback.

- `inline map at L1067` (L1067): map callback.

- `inline find at L1084` (L1084): find callback.

- `inline map at L1086` (L1086): map callback.

- `inline filter at L1087` (L1087): filter callback.

- `inline map at L1090` (L1090): map callback.

- `inline every at L1092` (L1092): every callback.

- `projection` (L1095): Implements projection.

- `inline sort at L1102` (L1102): sort callback.

- `inline filter at L1121` (L1121): filter callback.

- `inline flatMap at L1121` (L1121): flatMap callback.

- `gaffTieSkinGap` (L1123): Implements gaffTieSkinGap.

- `inline map at L1123` (L1123): map callback.

- `inline map at L1124` (L1124): map callback.

- `inline sort at L1124` (L1124): sort callback.

- `aftClosedBody` (L1135): actual shared topology at 1 µm rather than collapsing it into 100 µm keys.

- `key` (L1136): Implements key.

- `inline map at L1136` (L1136): map callback.

- `inline every at L1142` (L1142): every callback.

- `aftSurfaceHits` (L1147): Implements aftSurfaceHits.

- `inline filter at L1149` (L1149): filter callback.

- `inline some at L1155` (L1155): some callback.

- `inline some at L1155` (L1155): some callback.

- `inline map at L1156` (L1156): map callback.

- `inline map at L1157` (L1157): map callback.

- `aftWorld` (L1158): Implements aftWorld.

- `inline filter at L1183` (L1183): filter callback.

- `inline map at L1188` (L1188): map callback.

- `inline every at L1190` (L1190): every callback.

- `inline filter at L1191` (L1191): filter callback.

- `inline flatMap at L1191` (L1191): flatMap callback.

- `inline map at L1191` (L1191): map callback.

- `inline find at L1220` (L1220): find callback.

- `inline some at L1224` (L1224): some callback.

- `inline callback at L1228` (L1228): Inline callback.

- `inline some at L1233` (L1233): some callback.

- `inline find at L1244` (L1244): find callback.

- `ray` (L1253): Implements ray.

- `inline some at L1260` (L1260): some callback.

- `inline filter at L1262` (L1262): filter callback.

- `inline some at L1264` (L1264): some callback.

- `inline some at L1267` (L1267): some callback.

- `inline filter at L1275` (L1275): filter callback.

- `inline filter at L1278` (L1278): filter callback.

- `inline filter at L1284` (L1284): filter callback.

- `aquariumOwner` (L1293): Implements aquariumOwner.

- `inline sort at L1296` (L1296): sort callback.

- `inline find at L1299` (L1299): find callback.

- `inline map at L1305` (L1305): map callback.

- `inline map at L1307` (L1307): map callback.

- `inline every at L1308` (L1308): every callback.

- `inline every at L1308` (L1308): every callback.

- `inline filter at L1312` (L1312): filter callback.

- `inline flatMap at L1312` (L1312): flatMap callback.

- `inline map at L1312` (L1312): map callback.

- `inline flatMap at L1323` (L1323): flatMap callback.

- `inline filter at L1355` (L1355): filter callback.

- `inline filter at L1358` (L1358): filter callback.

- `inline map at L1360` (L1360): map callback.

- `inline map at L1360` (L1360): map callback.

- `inline filter at L1362` (L1362): filter callback.

- `inline map at L1362` (L1362): map callback.

- `inline find at L1364` (L1364): find callback.

- `inline filter at L1373` (L1373): filter callback.

- `inline filter at L1376` (L1376): filter callback.

- `inline map at L1377` (L1377): map callback.

- `inline map at L1377` (L1377): map callback.

- `inline filter at L1379` (L1379): filter callback.

- `inline map at L1379` (L1379): map callback.

- `inline find at L1380` (L1380): find callback.

- `inline filter at L1391` (L1391): filter callback.

- `inline filter at L1391` (L1391): filter callback.

- `inline every at L1392` (L1392): every callback.

- `inline every at L1393` (L1393): every callback.

- `inline filter at L1394` (L1394): filter callback.

- `inline every at L1394` (L1394): every callback.

- `inline find at L1404` (L1404): find callback.

- `inline filter at L1405` (L1405): filter callback.

- `inline map at L1406` (L1406): map callback.

- `inline map at L1406` (L1406): map callback.

- `inline map at L1409` (L1409): map callback.

- `inline map at L1414` (L1414): map callback.

- `inline filter at L1416` (L1416): filter callback.

- `inline map at L1416` (L1416): map callback.

### `tests/exteriorAccess.mjs`

Purpose: Verification of exteriorAccess behavior; helpers are listed where present.

- `sleep` (L14): Implements sleep.

- `inline callback at L14` (L14): Inline callback.

- `inline on at L18` (L18): on callback.

- `inline waitForFunction at L20` (L20): waitForFunction callback.

- `inline waitForFunction at L21` (L21): waitForFunction callback.

- `read` (L22): Implements read.

- `inline evaluate at L22` (L22): evaluate callback.

- `toggle` (L26): Implements toggle.

- `inline waitForFunction at L29` (L29): waitForFunction callback.

- `walk` (L33): Implements walk.

- `to` (L45): Implements to.

- `view` (L47): Implements view.

- `inline evaluate at L48` (L48): evaluate callback.

- `flight` (L52): Implements flight.

- `inline find at L53` (L53): find callback.

- `inline find at L61` (L61): find callback.

- `inline find at L64` (L64): find callback.

- `inline evaluate at L65` (L65): evaluate callback.

- `inline filter at L73` (L73): filter callback.

- `inline evaluate at L89` (L89): evaluate callback.

- `inline evaluate at L93` (L93): evaluate callback.

- `inline find at L99` (L99): find callback.

- `inline find at L99` (L99): find callback.

- `inline filter at L108` (L108): filter callback.

- `inline sort at L108` (L108): sort callback.

### `tests/exteriorJourneys.mjs`

Purpose: Verification of exteriorJourneys behavior; helpers are listed where present.

- `sleep` (L9): Implements sleep.

- `inline callback at L9` (L9): Inline callback.

- `inline on at L14` (L14): on callback.

- `inline waitForFunction at L15` (L15): waitForFunction callback.

- `inline waitForFunction at L16` (L16): waitForFunction callback.

- `inline evaluate at L17` (L17): evaluate callback.

- `view` (L18): Implements view.

- `inline evaluate at L19` (L19): evaluate callback.

- `step` (L21): Implements step.

- `inline evaluate at L22` (L22): evaluate callback.

- `slideDescent` (L28): Implements slideDescent.

- `inline evaluate at L29` (L29): evaluate callback.

- `inline traverse at L31` (L31): traverse callback.

- `sample` (L34): Implements sample.

- `inline evaluate at L48` (L48): evaluate callback.

- `inline every at L54` (L54): every callback.

- `inline every at L55` (L55): every callback.

- `inline filter at L55` (L55): filter callback.

- `inline every at L60` (L60): every callback.

- `inline find at L61` (L61): find callback.

- `inline map at L65` (L65): map callback.

- `inline filter at L65` (L65): filter callback.

- `inline every at L66` (L66): every callback.

- `inline map at L67` (L67): map callback.

- `inline map at L67` (L67): map callback.

- `inline find at L68` (L68): find callback.

- `inline find at L73` (L73): find callback.

- `inline find at L73` (L73): find callback.

- `inline find at L73` (L73): find callback.

- `inline evaluate at L78` (L78): evaluate callback.

- `inline evaluate at L79` (L79): evaluate callback.

- `inline evaluate at L81` (L81): evaluate callback.

- `inline evaluate at L83` (L83): evaluate callback.

- `inline evaluate at L89` (L89): evaluate callback.

- `inline evaluate at L90` (L90): evaluate callback.

- `inline traverse at L92` (L92): traverse callback.

- `inline find at L94` (L94): find callback.

- `inline find at L111` (L111): find callback.

- `inline evaluate at L113` (L113): evaluate callback.

- `inline find at L119` (L119): find callback.

- `inline find at L119` (L119): find callback.

- `inline find at L125` (L125): find callback.

- `inline evaluate at L144` (L144): evaluate callback.

### `tests/exteriorMaterials.test.mjs`

Purpose: Verification of exteriorMaterials.test behavior; helpers are listed where present.

- `inline from at L21` (L21): from callback.

- `inline throws at L30` (L30): throws callback.

- `before` (L58): Implements before.

- `has` (L59): Implements has.

- `setMask` (L60): Implements setMask.

- `getRenderTarget` (L60): Implements getRenderTarget.

- `setRenderTarget` (L60): Implements setRenderTarget.

- `getClearAlpha` (L60): Implements getClearAlpha.

- `setClearAlpha` (L60): Implements setClearAlpha.

- `render` (L61): Implements render.

- `inline throws at L73` (L73): throws callback.

### `tests/exteriorMotion.mjs`

Purpose: Verification of exteriorMotion behavior; helpers are listed where present.

- `sleep` (L8): Implements sleep.

- `inline callback at L8` (L8): Inline callback.

- `inline on at L13` (L13): on callback.

- `inline waitForFunction at L15` (L15): waitForFunction callback.

- `inline waitForFunction at L21` (L21): waitForFunction callback.

- `inline evaluate at L22` (L22): evaluate callback.

- `inline evaluate at L23` (L23): evaluate callback.

- `inline evaluate at L27` (L27): evaluate callback.

- `inline evaluate at L32` (L32): evaluate callback.

- `inline map at L33` (L33): map callback.

- `inline evaluate at L34` (L34): evaluate callback.

- `inline map at L35` (L35): map callback.

- `inline callback at L35` (L35): Inline callback.

- `inline callback at L35` (L35): Inline callback.

- `inline map at L37` (L37): map callback.

- `inline map at L38` (L38): map callback.

- `inline every at L47` (L47): every callback.

- `inline find at L54` (L54): find callback.

- `inline evaluate at L60` (L60): evaluate callback.

- `centre` (L61): Implements centre.

- `inline filter at L62` (L62): filter callback.

- `inline sort at L62` (L62): sort callback.

- `aim` (L68): Implements aim.

- `inline evaluate at L68` (L68): evaluate callback.

- `inline evaluate at L71` (L71): evaluate callback.

- `inline evaluate at L75` (L75): evaluate callback.

- `inline traverse at L80` (L80): traverse callback.

- `inline find at L82` (L82): find callback.

- `inline evaluate at L87` (L87): evaluate callback.

- `inline evaluate at L90` (L90): evaluate callback.

- `inline map at L91` (L91): map callback.

- `inline evaluate at L92` (L92): evaluate callback.

- `inline map at L93` (L93): map callback.

- `inline callback at L93` (L93): Inline callback.

- `inline callback at L93` (L93): Inline callback.

- `inline map at L94` (L94): map callback.

- `inline map at L95` (L95): map callback.

- `inline evaluate at L100` (L100): evaluate callback.

- `inline callback at L101` (L101): Inline callback.

- `frame` (L101): Implements frame.

- `inline evaluate at L109` (L109): evaluate callback.

- `inline find at L112` (L112): find callback.

- `inline evaluate at L113` (L113): evaluate callback.

### `tests/foreTrim.test.mjs`

Purpose: Verification of foreTrim.test behavior; helpers are listed where present.

- `inline map at L9` (L9): map callback.

- `triangles` (L14): Resolve indexed triangles through the complete exported node hierarchy.

- `visit` (L16): Implements visit.

- `inline from at L23` (L23): from callback.

- `inline map at L26` (L26): map callback.

- `intersectionArea` (L41): Measure actual 3D polygon area after intersection with convex half-spaces.

- `prisms` (L63): Earcut uses the complete outline, independently of source station strips.

- `inline map at L64` (L64): map callback.

- `inline map at L65` (L65): map callback.

- `inline map at L66` (L66): map callback.

- `inline map at L70` (L70): map callback.

- `inline find at L86` (L86): find callback.

- `inline triangles at L91` (L91): triangles callback.

- `inline map at L93` (L93): map callback.

- `inline map at L95` (L95): map callback.

- `inline map at L96` (L96): map callback.

- `inline map at L99` (L99): map callback.

- `inline map at L99` (L99): map callback.

- `inline map at L100` (L100): map callback.

- `inline map at L101` (L101): map callback.

- `inline every at L109` (L109): every callback.

- `inline some at L114` (L114): some callback.

- `inline some at L116` (L116): some callback.

- `inline some at L120` (L120): some callback.

### `tests/gameplay.mjs`

Purpose: Verification of gameplay behavior; helpers are listed where present.

- `check` (L28): Implements check.

- `sleep` (L32): Implements sleep.

- `inline callback at L32` (L32): Inline callback.

- `inline on at L45` (L45): on callback.

- `inline on at L46` (L46): on callback.

- `press` (L50): Implements press.

- `inline evaluate at L51` (L51): evaluate callback.

- `release` (L52): Implements release.

- `inline evaluate at L53` (L53): evaluate callback.

- `state` (L54): Implements state.

- `inline evaluate at L54` (L54): evaluate callback.

- `hold` (L59): Implements hold.

- `respawn` (L60): Implements respawn.

- `inline evaluate at L61` (L61): evaluate callback.

- `inline waitForFunction at L68` (L68): waitForFunction callback.

- `inline waitForFunction at L77` (L77): waitForFunction callback.

- `samplePeak` (L97): Implements samplePeak.

- `inline reduce at L168` (L168): reduce callback.

- `inline evaluate at L198` (L198): evaluate callback.

- `modeText` (L215): Implements modeText.

- `inline evaluate at L215` (L215): evaluate callback.

- `inline evaluate at L249` (L249): evaluate callback.

- `inline evaluate at L251` (L251): evaluate callback.

- `inline find at L252` (L252): find callback.

- `inline evaluate at L255` (L255): evaluate callback.

- `inline evaluate at L259` (L259): evaluate callback.

- `inline evaluate at L260` (L260): evaluate callback.

- `inline evaluate at L265` (L265): evaluate callback.

- `inline map at L274` (L274): map callback.

- `inline every at L283` (L283): every callback.

- `inline find at L289` (L289): find callback.

- `inline evaluate at L290` (L290): evaluate callback.

- `inline evaluate at L299` (L299): evaluate callback.

- `inline map at L303` (L303): map callback.

- `inline filter at L305` (L305): filter callback.

- `inline filter at L305` (L305): filter callback.

- `inline some at L311` (L311): some callback.

- `inline evaluate at L315` (L315): evaluate callback.

- `inline evaluate at L323` (L323): evaluate callback.

- `inline callback at L323` (L323): Inline callback.

- `tick` (L326): Implements tick.

### `tests/glb.mjs`

Purpose: Verification of glb behavior; helpers are listed where present.

- `get` (L9): Implements get.

- `get` (L10): Implements get.

- `get` (L11): Implements get.

- `get` (L12): Implements get.

- `get` (L13): Implements get.

- `get` (L14): Implements get.

- `readGLB` (L18): Implements readGLB.

- `readAccessor` (L31): Implements readAccessor.

- `nodeMatrix` (L55): Implements nodeMatrix.

- `loadColliders` (L65): Load every mesh in a GLB as an axis-aligned world box.

- `walk` (L69): Implements walk.

### `tests/interaction.mjs`

Purpose: Verification of interaction behavior; helpers are listed where present.

- `check` (L19): Implements check.

- `inline on at L29` (L29): on callback.

- `inline waitForFunction at L34` (L34): waitForFunction callback.

- `inline waitForFunction at L37` (L37): waitForFunction callback.

- `inline evaluate at L41` (L41): evaluate callback.

- `inline find at L42` (L42): find callback.

- `inline callback at L46` (L46): Inline callback.

- `inline evaluate at L51` (L51): evaluate callback.

- `inline evaluate at L61` (L61): evaluate callback.

- `inline map at L69` (L69): map callback.

- `inline every at L74` (L74): every callback.

- `inline evaluate at L82` (L82): evaluate callback.

- `inline callback at L90` (L90): Inline callback.

- `inline evaluate at L91` (L91): evaluate callback.

- `inline evaluate at L106` (L106): evaluate callback.

- `inline callback at L108` (L108): Inline callback.

- `inline evaluate at L109` (L109): evaluate callback.

### `tests/interiorJourneys.mjs`

Purpose: Verification of interiorJourneys behavior; helpers are listed where present.

- `inline on at L12` (L12): on callback.

- `inline waitForFunction at L13` (L13): waitForFunction callback.

- `inline waitForFunction at L14` (L14): waitForFunction callback.

- `walk` (L17): Follow a planned route with actual input; interact with hatches in reach.

- `inline evaluate at L18` (L18): evaluate callback.

- `inline evaluate at L21` (L21): evaluate callback.

- `inline find at L26` (L26): find callback.

- `inline callback at L28` (L28): Inline callback.

- `inline evaluate at L30` (L30): evaluate callback.

- `inline evaluate at L33` (L33): evaluate callback.

- `inline evaluate at L42` (L42): evaluate callback.

- `inline callback at L42` (L42): Inline callback.

- `inline evaluate at L51` (L51): evaluate callback.

- `inline evaluate at L52` (L52): evaluate callback.

- `inline evaluate at L66` (L66): evaluate callback.

- `inline evaluate at L74` (L74): evaluate callback.

### `tests/interiorMaterials.test.mjs`

Purpose: Verification of interiorMaterials.test behavior; helpers are listed where present.

- `inline from at L19` (L19): from callback.

- `mat` (L34): Implements mat.

- `place` (L86): Implements place.

- `inline every at L88` (L88): every callback.

- `inline map at L89` (L89): map callback.

- `inline map at L89` (L89): map callback.

- `inline every at L90` (L90): every callback.

- `inline map at L92` (L92): map callback.

- `inline every at L93` (L93): every callback.

- `inline every at L99` (L99): every callback.

- `inline addEventListener at L101` (L101): addEventListener callback.

### `tests/ladderJourney.mjs`

Purpose: Verification of ladderJourney behavior; helpers are listed where present.

- `sleep` (L5): Implements sleep.

- `inline callback at L5` (L5): Inline callback.

- `ladderJourney` (L7): Implements ladderJourney.

- `read` (L9): Implements read.

- `inline evaluate at L9` (L9): evaluate callback.

- `inline map at L13` (L13): map callback.

- `inline map at L17` (L17): map callback.

- `toggle` (L19): Implements toggle.

- `inline waitForFunction at L25` (L25): waitForFunction callback.

- `inline waitForFunction at L27` (L27): waitForFunction callback.

- `inline map at L43` (L43): map callback.

- `inline map at L48` (L48): map callback.

- `inline evaluate at L64` (L64): evaluate callback.

- `inline evaluate at L72` (L72): evaluate callback.

### `tests/navigation.mjs`

Purpose: Verification of navigation behavior; helpers are listed where present.

- `sleep` (L8): Implements sleep.

- `inline callback at L8` (L8): Inline callback.

- `three` (L10): Implements three.

- `checkJawBounds` (L12): Compare real dynamic lower-face colliders with exported bounds/hinge.

- `inline find at L16` (L16): find callback.

- `inline find at L16` (L16): find callback.

- `inline every at L19` (L19): every callback.

- `inline every at L19` (L19): every callback.

- `checkCameraFrame` (L23): The rendered hull must carry the actual human eye during steering/Burst.

- `inline evaluate at L24` (L24): evaluate callback.

- `inline on at L36` (L36): on callback.

- `inline on at L36` (L36): on callback.

- `inline waitForFunction at L38` (L38): waitForFunction callback.

- `inline waitForFunction at L39` (L39): waitForFunction callback.

- `inline every at L41` (L41): every callback.

- `inline evaluate at L43` (L43): evaluate callback.

- `aim` (L44): Implements aim.

- `inline evaluate at L44` (L44): evaluate callback.

- `useControl` (L45): Implements useControl.

- `inline evaluate at L47` (L47): evaluate callback.

- `inline evaluate at L48` (L48): evaluate callback.

- `markingSpace` (L49): Implements markingSpace.

- `inline evaluate at L49` (L49): evaluate callback.

- `inline traverse at L49` (L49): traverse callback.

- `inline evaluate at L52` (L52): evaluate callback.

- `inline every at L58` (L58): every callback.

- `inline every at L58` (L58): every callback.

- `inline evaluate at L60` (L60): evaluate callback.

- `inline callback at L60` (L60): Inline callback.

- `inline traverse at L60` (L60): traverse callback.

- `inline evaluate at L66` (L66): evaluate callback.

- `inline map at L68` (L68): map callback.

- `inline evaluate at L71` (L71): evaluate callback.

- `inline evaluate at L73` (L73): evaluate callback.

- `inline evaluate at L75` (L75): evaluate callback.

- `inline evaluate at L76` (L76): evaluate callback.

- `inline evaluate at L77` (L77): evaluate callback.

- `inline evaluate at L79` (L79): evaluate callback.

- `inline callback at L79` (L79): Inline callback.

- `inline traverse at L79` (L79): traverse callback.

- `inline every at L81` (L81): every callback.

- `inline some at L82` (L82): some callback.

- `inline evaluate at L86` (L86): evaluate callback.

- `inline evaluate at L87` (L87): evaluate callback.

- `inline find at L90` (L90): find callback.

- `inline find at L90` (L90): find callback.

- `inline find at L90` (L90): find callback.

- `inline evaluate at L97` (L97): evaluate callback.

- `inline evaluate at L99` (L99): evaluate callback.

- `inline evaluate at L103` (L103): evaluate callback.

- `inline every at L104` (L104): every callback.

- `inline evaluate at L106` (L106): evaluate callback.

### `tests/navigation.test.mjs`

Purpose: Verification of navigation.test behavior; helpers are listed where present.

- `inline every at L13` (L13): every callback.

### `tests/physics.test.mjs`

Purpose: Verification of physics.test behavior; helpers are listed where present.

- `raycastDown` (L24): contact epsilon, mirrors collision.js

- `resolveHorizontal` (L40): Implements resolveHorizontal.

- `inline filter at L72` (L72): filter callback.

- `inline filter at L73` (L73): filter callback.

- `inline filter at L74` (L74): filter callback.

- `inline filter at L75` (L75): filter callback.

- `inline map at L76` (L76): map callback.

- `check` (L81): Implements check.

- `inline filter at L163` (L163): filter callback.

- `inline filter at L179` (L179): filter callback.

- `inline map at L181` (L181): map callback.

- `contains` (L198): Implements contains.

- `inline every at L198` (L198): every callback.

- `inline from at L199` (L199): from callback.

- `inline some at L199` (L199): some callback.

- `inline some at L200` (L200): some callback.

- `inline every at L201` (L201): every callback.

- `inline every at L201` (L201): every callback.

### `tests/reachability.mjs`

Purpose: Verification of reachability behavior; helpers are listed where present.

- `inline filter at L11` (L11): filter callback.

- `inline filter at L12` (L12): filter callback.

- `toThree` (L13): Implements toThree.

- `colKey` (L16): Implements colKey.

- `inline some at L24` (L24): some callback.

- `blocker` (L30): Implements blocker.

- `inline filter at L50` (L50): filter callback.

- `inline sort at L50` (L50): sort callback.

- `inline reduce at L69` (L69): reduce callback.

- `inline reduce at L69` (L69): reduce callback.

- `inline sort at L70` (L70): sort callback.

- `inline filter at L74` (L74): filter callback.

- `inline some at L75` (L75): some callback.

- `inline sort at L79` (L79): sort callback.

- `inline filter at L80` (L80): filter callback.

- `inline map at L80` (L80): map callback.

### `tests/roomRoutes.mjs`

Purpose: Verification of roomRoutes behavior; helpers are listed where present.

- `roomRoutes` (L13): Implements roomRoutes.

- `inline filter at L16` (L16): filter callback.

- `inline filter at L17` (L17): filter callback.

- `inline map at L19` (L19): map callback.

- `key` (L23): Implements key.

- `inline some at L32` (L32): some callback.

- `blocked` (L35): Implements blocked.

- `inline find at L43` (L43): find callback.

- `inline find at L44` (L44): find callback.

- `inline filter at L48` (L48): filter callback.

- `inline sort at L48` (L48): sort callback.

- `inline reduce at L60` (L60): reduce callback.

- `inline filter at L63` (L63): filter callback.

- `inline map at L63` (L63): map callback.

- `inline filter at L65` (L65): filter callback.

- `inline filter at L67` (L67): filter callback.

- `inline sort at L67` (L67): sort callback.

- `between` (L70): Breadth-first walking path between two already validated floor nodes.

- `compress` (L84): Coalesce straight walk segments while keeping all direction changes.

- `fromSpawn` (L93): Implements fromSpawn.

- `inline map at L98` (L98): map callback.

- `inline filter at L100` (L100): filter callback.

- `inline filter at L101` (L101): filter callback.

- `inline sort at L101` (L101): sort callback.

- `at` (L113): Connected node close to the actual exported tread/landing, without teleport.

- `inline filter at L114` (L114): filter callback.

- `inline sort at L115` (L115): sort callback.

- `inline map at L117` (L117): map callback.

- `inline sort at L118` (L118): sort callback.

- `inline some at L122` (L122): some callback.

- `inline filter at L133` (L133): filter callback.

- `inline map at L133` (L133): map callback.

- `inline from at L136` (L136): from callback.

- `inline every at L136` (L136): every callback.

- `inline some at L137` (L137): some callback.

- `inline find at L143` (L143): find callback.

- `inline filter at L144` (L144): filter callback.

- `inline map at L144` (L144): map callback.

- `inline some at L146` (L146): some callback.

- `pathBetween` (L157): Plan a connection between real supported poses using the same body checks.

- `inline every at L165` (L165): every callback.

### `tests/run-all.mjs`

Purpose: Verification of run-all behavior; helpers are listed where present.

- `ensureServer` (L19): ensure the dev server is up for the browser suites

- `inline callback at L30` (L30): Inline callback.

- `run` (L39): Implements run.

- `inline callback at L40` (L40): Inline callback.

- `inline on at L45` (L45): on callback.

- `inline filter at L50` (L50): filter callback.

### `tests/smoke.mjs`

Purpose: Verification of smoke behavior; helpers are listed where present.

- `inline on at L30` (L30): on callback.

- `inline on at L35` (L35): on callback.

- `inline on at L36` (L36): on callback.

- `inline callback at L44` (L44): Inline callback.

- `inline evaluate at L46` (L46): evaluate callback.

- `inline callback at L54` (L54): Inline callback.

- `inline callback at L70` (L70): Inline callback.

- `inline evaluate at L74` (L74): evaluate callback.

- `inline callback at L78` (L78): Inline callback.

- `inline evaluate at L82` (L82): evaluate callback.

- `inline callback at L85` (L85): Inline callback.

- `inline evaluate at L87` (L87): evaluate callback.

- `inline evaluate at L92` (L92): evaluate callback.

- `inline callback at L96` (L96): Inline callback.

### `tests/stairFlights.mjs`

Purpose: Verification of stairFlights behavior; helpers are listed where present.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `inline callback at L2` (L2): Inline callback.

- `sleep` (L3): Implements sleep.

- `inline callback at L3` (L3): Inline callback.

- `stairFlights` (L4): Implements stairFlights.

- `inline map at L5` (L5): map callback.

- `inline filter at L6` (L6): filter callback.

- `inline sort at L6` (L6): sort callback.

- `inline map at L7` (L7): map callback.

- `walkFlight` (L9): Implements walkFlight.

- `inline evaluate at L15` (L15): evaluate callback.

- `inline evaluate at L17` (L17): evaluate callback.

- `inline evaluate at L18` (L18): evaluate callback.

- `inline evaluate at L21` (L21): evaluate callback.

- `inline find at L22` (L22): find callback.

- `inline evaluate at L23` (L23): evaluate callback.

- `inline evaluate at L28` (L28): evaluate callback.

- `inline evaluate at L31` (L31): evaluate callback.

- `driveTo` (L37): Walk to a horizontal waypoint using the actual controller, stopping on stalls.

- `setForward` (L39): Implements setForward.

- `inline evaluate at L41` (L41): evaluate callback.

- `inline evaluate at L46` (L46): evaluate callback.

- `inline evaluate at L50` (L50): evaluate callback.

- `inline evaluate at L59` (L59): evaluate callback.

- `walkJourney` (L74): Whole routes begin at spawn; no teleport/jump is used between landings.

- `inline evaluate at L75` (L75): evaluate callback.

- `inline find at L79` (L79): find callback.

- `inline evaluate at L81` (L81): evaluate callback.

- `inline evaluate at L82` (L82): evaluate callback.

- `waypoint` (L83): Implements waypoint.

- `inline evaluate at L85` (L85): evaluate callback.

- `climb` (L91): Implements climb.

- `inline evaluate at L93` (L93): evaluate callback.

- `inline find at L103` (L103): find callback.

- `inline find at L108` (L108): find callback.

- `inline find at L112` (L112): find callback.

- `inline find at L115` (L115): find callback.

- `inline find at L122` (L122): find callback.

- `inline find at L128` (L128): find callback.

- `inline some at L134` (L134): some callback.

- `inline find at L139` (L139): find callback.

- `inline find at L145` (L145): find callback.

### `tests/visual.mjs`

Purpose: Verification of visual behavior; helpers are listed where present.

- `sleep` (L10): Implements sleep.

- `inline callback at L10` (L10): Inline callback.

- `press` (L19): Implements press.

- `inline evaluate at L20` (L20): evaluate callback.

- `release` (L21): Implements release.

- `inline evaluate at L22` (L22): evaluate callback.

- `inline on at L25` (L25): on callback.

- `inline waitForFunction at L29` (L29): waitForFunction callback.

- `orbit` (L38): Implements orbit.

- `inline waitForFunction at L56` (L56): waitForFunction callback.

- `look` (L59): Implements look.

- `inline evaluate at L60` (L60): evaluate callback.

- `inline evaluate at L81` (L81): evaluate callback.

### `tools/build_assets.py`

Purpose: Asset construction/audit module build_assets.

- `log` (L55): Implements log.

- `_safe_read_geom` (L74): Implements _safe_read_geom.

- `vertex_bbox` (L90): World-space AABB computed from real vertex positions.

- `is_junk` (L114): Implements is_junk.

- `world_bbox` (L149): Implements world_bbox.

- `exported_translations` (L237): Read node translations straight out of the exported GLB JSON chunk.

- `blender_to_gltf` (L259): Implements blender_to_gltf.

- `export_glb` (L264): Implements export_glb.

- `mis_placed` (L301): Names whose exported translation disagrees with the transform we applied.

- `export_ship` (L313): Implements export_ship.

- `guess_look` (L402): Implements guess_look.

- `obb` (L436): Actual world vertex bounds; imported cached boxes invent phantom obstacles.

- `walkable_hit` (L481): First walkable surface under (x, y), passing through sails/rigging.

- `region_stats` (L540): Implements region_stats.

- `classify` (L636): Implements classify.

- `add_mesh` (L675): Implements add_mesh.

- `add_box` (L685): Plain physical box data; collision need not enter Blender's visual scene.

- `clip_polygon` (L692): Clip a face to a plane, preserving its actual curved-rail footprint.

- `face_sections` (L705): Slice long diagonal faces so their boxes do not fill stair openings.

- `merge_floor_cells` (L718): Merge coplanar cells into exact rectangles, preserving holes and layers.

- `curved_floor_boxes` (L735): Fit small support boxes to actual standable triangles of a curved bed.

- `wx` (L768): Implements wx.

- `wy` (L772): Implements wy.

- `waterline_profile` (L1075): 32 cross-section stations from the actual hull mesh at maximum wave height.

### `tools/collision_glb.py`

Purpose: Asset construction/audit module collision_glb.

- `write_box_glb` (L11): Write (name, min_xyz, max_xyz) boxes, preserving one named mesh per box.

### `tools/exterior_audit.mjs`

Purpose: Asset construction/audit module exterior_audit.

- `inline filter at L10` (L10): filter callback.

- `inline map at L13` (L13): map callback.

- `category` (L29): Identify evidence families without interpreting generic source names as proof.

- `inline find at L29` (L29): find callback.

- `inventory` (L31): Serialize exact exported bounds, station and support; include every mesh.

- `inline map at L32` (L32): map callback.

- `inline filter at L34` (L34): filter callback.

- `inline map at L38` (L38): map callback.

- `quote` (L41): Implements quote.

- `inline map at L42` (L42): map callback.

- `inline map at L42` (L42): map callback.

- `inline filter at L43` (L43): filter callback.

- `inline on at L50` (L50): on callback.

- `inline on at L51` (L51): on callback.

- `inline waitForFunction at L53` (L53): waitForFunction callback.

- `inline evaluate at L54` (L54): evaluate callback.

- `inline evaluate at L63` (L63): evaluate callback.

- `inline traverse at L65` (L65): traverse callback.

- `inline callback at L67` (L67): Inline callback.

- `inline evaluate at L69` (L69): evaluate callback.

### `tools/exterior_plates.py`

Purpose: Asset construction/audit module exterior_plates.

- `panel` (L13): Fit an unmodified reference or screenshot into a labelled comparison panel.

- `plate` (L22): Create an annotated top, side or front plate with explicit evidence limits.

### `tools/fore_walk_review.mjs`

Purpose: Asset construction/audit module fore_walk_review.

- `sleep` (L10): Implements sleep.

- `inline callback at L10` (L10): Inline callback.

- `inline find at L12` (L12): find callback.

- `inline find at L13` (L13): find callback.

- `inline find at L14` (L14): find callback.

- `inline on at L19` (L19): on callback.

- `inline on at L20` (L20): on callback.

- `inline waitForFunction at L22` (L22): waitForFunction callback.

- `inline waitForFunction at L24` (L24): waitForFunction callback.

- `inline find at L28` (L28): find callback.

- `onCheckpoint` (L30): Implements onCheckpoint.

- `inline evaluate at L38` (L38): evaluate callback.

- `inline every at L49` (L49): every callback.

- `inline every at L49` (L49): every callback.

- `inline some at L49` (L49): some callback.

- `inline some at L53` (L53): some callback.

### `tools/interior_audit.mjs`

Purpose: Asset construction/audit module interior_audit.

- `room` (L8): Implements room.

- `inline find at L8` (L8): find callback.

- `centre` (L9): Implements centre.

- `inline find at L36` (L36): find callback.

- `toThree` (L39): Implements toThree.

- `inline on at L43` (L43): on callback.

- `inline on at L43` (L43): on callback.

- `inline waitForFunction at L45` (L45): waitForFunction callback.

- `inline evaluate at L47` (L47): evaluate callback.

- `placeAuditCamera` (L53): Implements placeAuditCamera.

- `inline evaluate at L65` (L65): evaluate callback.

- `inline callback at L66` (L66): Inline callback.

- `inline evaluate at L67` (L67): evaluate callback.

- `inline find at L70` (L70): find callback.

- `inline some at L72` (L72): some callback.

- `inline evaluate at L79` (L79): evaluate callback.

### `tools/sunny_accuracy.py`

Purpose: Asset construction/audit module sunny_accuracy.

- `discard` (L12): Remove superseded generated details from both the scene and export list.

- `replace` (L20): Replace one source mesh with evaluated world-space, tagged geometry.

- `cut_prism` (L37): Subtract a convex aperture prism; retain all outside faces/materials.

- `circular_cut` (L66): Cut a real circular polygon aperture through every supplied wall layer.

- `repaint_prism` (L82): Partition existing faces into painted regions without overlay geometry.

- `merge_details` (L125): Batch same-material vegetation without losing its authored shape/station.

- `yard_skin` (L144): Freeze the actual evaluated world-space spar triangles for contact fits.

- `fitted_radial_attachment` (L151): Fit a retained radial attachment to actual wood in its fixed section.

- `fitted_spar_edge` (L162): Fit canvas to a retained spar's top/underside without moving its span.

- `fitted_mast_gaff_corner` (L172): Resolve a canvas corner against both retained mast and gaff skins.

- `fitted_yard_lash` (L186): Closed rope loop fitted into an oval yard, retaining its lash station.

- `curved_sails` (L216): Oda's deployed canvas: tapered sides, catenary foot, supported billow.

- `hull_port_recess` (L342): Build a hollow supported side-port reveal instead of a shallow solid cap.

- `hull_ports` (L373): Replace seven blind source caps with mirrored pale-frame dark apertures.

- `fit_scroll_paint` (L394): Fit a thin red hull skin to the retained white scroll's measured contours.

- `burst_barrel` (L443): A/C/O timber barrel at the existing stern station, with a recessed bore.

- `leaf_mesh` (L480): Folded pointed blade attached at its base; no alpha-card or sphere leaves.

- `citrus_fruit` (L492): Oblate mikan with polar depression, five-point calyx and real twig/stem.

- `mikan_pot` (L520): Open clay cavity with supported walls/bottom at the retained human size.

- `reference_tree` (L547): Branch-connected vegetation with varied leaf blades, in human metres.

- `plants` (L584): Two lawn trees, one three-pot mikan cluster and source-supported gardens.

- `helm_controls` (L625): H's wheel-mounted channel drum, knob and pillar shutter lever.

- `rolling_dock` (L657): D's timber shutter slats and changing numbers through a real hull aperture.

- `lookout_wall_piece` (L722): A closed cream piece between retained ellipse chords, in final metres.

- `lookout_belt` (L744): A/N/L cream enclosure and sash glazing on sixteen retained sectors.

- `lookout` (L802): N/CN: shallow striped dome, glazed band, dormers and flared underside.

- `swept_mane` (L861): H/A/C's curved side blades, retaining their source roots/tips/depth.

- `fitted_face_patch` (L897): Closed circular feature fitted into an actual source skin, in metres.

- `lion_face` (L950): A/H's smaller ivory muzzle and round attached eyes/black nose.

- `closed_face_mesh` (L988): Bake/weld source face geometry; optionally bisect and cap its muzzle.

- `face_boolean` (L1012): Evaluate a closed source-face Boolean, retaining cut-surface materials.

- `mouth_prism` (L1040): H's tall mouth footprint; metre sizes/chamfers are reconstruction.

- `front_face_panel` (L1060): Retain the original painted front curve as one opaque moving panel.

- `gaon_barrel` (L1105): A sealed hollow cannon wall, open front bore and attached rear surface.

- `fitted_cannon_front` (L1126): Recess the full cannon lip behind the actual closed curved face.

- `fitted_mouth_back` (L1144): Keep a rear wall inside the sealed source head at every mouth corner.

- `muzzle_seam` (L1163): H/A/C's horizontal mouth division, attached to the actual lower lip.

- `lion_mechanisms` (L1183): H: source-led tall cavity, sealed lower face and a deep hollow cannon.

- `fit_slide_envelope` (L1251): Fit intersecting Aquarium skin/gallery deck to the actual closed trough.

- `slide_support` (L1286): Physical post whose complete head fits the exported curved underside.

- `deck_details` (L1303): Correct F3 handedness and structural support for swing, trough and flue.

- `stern_lanterns` (L1339): Rebuild the two existing stern stations as black cages with glass panes.

- `main_gaff_roof_tie` (L1360): C/N's one visible diagonal from the lowest gaff tip to the roof rim.

- `library_roof` (L1391): L/N's exterior dormers, shallow top opening and rim on the existing hut.

- `human_rails` (L1424): Final-metre garden rails and a two-bar balcony with its fore entry gap.

- `anchor_paint` (L1465): Clip H's three vertical dark bands onto the original gold ball surfaces.

- `fitted_anchor_hawse` (L1484): H's round bow eyelet, fitted to its actual sloped shield skin.

- `anchor_ropes` (L1551): H/A's visible short stowed ropes, attached to measured bow hawse holes.

- `scalloped_soffit` (L1583): A/N's recessed petal bays, retaining the eight-sector support envelope.

- `fore_shrouds` (L1607): N/A's paired fan shrouds: deck attachments, ratlines, and yard endpoints.

- `mast_platforms` (L1646): A/O timber platforms with dark rim and exposed radial timber supports.

- `lookout_access` (L1672): N's exposed rope-to-ladder access, real floor opening and moving hatch.

- `stern_ladder_access` (L1731): F2/N stern ladder, within the retained flared Library support envelope.

- `ellipse_paint` (L1807): Partition a retained bow surface into a painted field and its edge band.

- `bow_paint` (L1835): A/C's red shield/white edge and broad gold collar around the black field.

- `bone_frame` (L1860): Measure the retained bone's long axis and section frame in world metres.

- `bone_section_profile` (L1882): Intersect actual source polygon edges, retaining its shaft centre curve.

- `bone_profile_at` (L1910): Interpolate measured centre/width/depth between intact source sections.

- `round_bone_tip_shoulders` (L1918): Gently curve both retained lobe shoulders without moving their poles.

- `rounded_source_bone` (L1971): Round a retained closed two-lobe bone and its source-centred shaft.

- `fitted_bow_rear_skin` (L2063): Embed every rear face across its actual outward shield-triangle footprint.

- `fitted_bow_stud` (L2115): Refit one retained bow head into its actual painted supporting skin.

- `bow_mount_construction` (L2236): H/A rounded retained bones and sixteen supported shallow collar heads.

- `hull_bands` (L2261): A/C's retained curved dark hull mouldings and two rudder straps.

- `branch_office` (L2276): N/F3's single sloped drawing table and retained human-sized stool.

- `rudder_mechanism` (L2291): Keep the measured source blade and expose its vertical steering hinge.

- `apply_exterior_accuracy` (L2299): Run exterior geometry repairs and return their mechanism/reference metadata.

- `skin` (L1495): Implements skin.

- `edges` (L401): Implements edges.

- `section` (L407): Implements section.

- `rod` (L1625): Implements rod.

- `skin_sample` (L2165): Implements skin_sample.

### `tools/sunny_accuracy.py.orig`

Purpose: Inherited source backup retained unchanged. Historical backup context was not inspected under the trial isolation rules; function inventory is unverified for this inactive backup.

### `tools/sunny_aft_envelope.py`

Purpose: Asset construction/audit module sunny_aft_envelope.

- `snapshot_native_house` (L17): Capture capped uncut native polygons without modifying or exporting them.

- `frame_house_snapshot` (L32): Apply the native house's actual layout/shift/scale, once, to its snapshot.

- `native_section_segments` (L41): Retain every real source connector; only numerical zero is discarded.

- `closed_native_contour` (L65): Trace fully closed source sections with distance-based 10 µm welding.

- `sampled_contour` (L114): Resample along real source edges, without filling any coverage gap.

- `actual_floor_bvh` (L131): Read actual retained room/entry/gallery floor faces, including real holes.

- `require_floor_support` (L149): Refuse unsupported lining feet; no sampled hull/rectangle can waive this.

- `source_house_rows` (L161): Recover every height row from complete pre-slot source, never cut skin.

- `garden_stair_bounds` (L195): The unchanged highest-footprint support/body volume of one real tread.

- `garden_stair_enclosures` (L201): Fit the inner cheeks to actual flights, keeping the outside vault fixed.

- `stair_enclosed_inner_ring` (L227): Close the room slots without reshaping any unaffected native lining.

- `closed_wall_mesh` (L255): One closed source-shaped skin with an 18 cm body and supported low toe.

- `closed_boolean_cut` (L304): Cut a physical closed aperture and retain its real reveal faces.

- `closed_box_cut` (L322): Apply one exact retained door/stair body volume to the closed envelope.

- `cut_aft_stair_access` (L329): Retain the real garden flights with continuous normal-human headroom.

- `build_aft_envelope` (L353): Replace the rectangular F2 exterior with its complete native vault.

- `closed_wall_bvh` (L385): Read both actual wall surfaces, including source curvature and openings.

- `arch_outline` (L392): A real rectangular lower aperture with a semicircular upper head.

- `fitted_arch` (L399): Fit each arch boundary and glazing plane to both real curved wall skins.

- `arch_prism` (L415): Closed arched cutter/glass prism with real crown, jambs and sill.

- `closed_door_arch_cut` (L428): Cut the two N-supported entrances with real crowns and closed reveals.

- `curved_arch_glass` (L445): Closed curved glazing follows the actual vault at every sash sample.

- `add_fitted_arch` (L477): Cut a true arch and seat its curved, closed, multi-pane glazing in skin.

- `add_aft_windows` (L513): Keep four bow windows and add reviewed side/rear curved-skin stations.

- `paint_lower_aquarium_tier` (L535): A/C cream lower sash tier, partitioned into existing retained hull faces.

- `fitted_arch_pair` (L551): Seat one lower sash/reveal between its real outer hull and inner lining.

- `closed_arch_reveal` (L573): Close an annular physical reveal across the measured facade/lining gap.

- `add_lower_aquarium_arch` (L600): Cut a supported true arch through every actual opaque skin; close glazing.

- `add_lower_aquarium_windows` (L649): Fill only supported exposed lower side/rear sash stations, keeping access.

- `root` (L73): Implements root.

- `observe` (L77): Implements observe.

### `tools/sunny_details.py`

Purpose: Asset construction/audit module sunny_details.

- `dock_vehicle` (L11): Supported channel contents, local +X points out of the radial bay.

- `tea_set` (L116): Teapot, lid, handle, spout and four cups resting on a cupboard shelf.

- `wall_art` (L129): Geometry-only wanted-poster cues; detailed likeness remains a surface task.

- `cube` (L15): Implements cube.

- `ball` (L17): Implements ball.

- `tube` (L19): Implements tube.

- `wheel` (L21): Implements wheel.

### `tools/sunny_exterior.py`

Purpose: Asset construction/audit module sunny_exterior.

- `layout_x` (L28): Expand the central eight-metre band to twelve metres within a 39 m envelope.

- `material` (L37): Shared sRGB-authored, matte painted materials exported with the asset.

- `finish` (L70): Name, paint, and identify a newly authored exterior mesh.

- `_mesh` (L84): Create a mesh object directly.

- `box` (L104): Implements box.

- `sphere` (L113): Implements sphere.

- `pole` (L139): Cylinder/cone between two world-space points.

- `ring` (L160): Implements ring.

- `text` (L182): Convert a short exterior marking to geometry (no font/network dependency).

- `tree` (L196): Deck tree with sculpted leafy canopy, branches and individual citrus fruit.

- `stairs` (L218): Visible steps, sized so every riser is a normal human step.

- `paint_source` (L241): Recover separate painted parts instead of painting every merged mesh red.

- `surface_height` (L313): Measure the source deck itself, avoiding authored fittings and rigging.

- `hull_sides` (L328): Nearest inner hull sides measured from the center of the source hull.

- `dock_attachment_sides` (L341): Outer painted-rim extents around the Dock opening, not the inner hull wall.

- `clip_face` (L355): Clip a world-space polygon against one half-plane, preserving cut edges.

- `assign_world_mesh` (L368): Bake geometry in world coordinates without moving attached child fittings.

- `open_plan_slot` (L383): Remove a rectangular plan opening without leaving a railing across access.

- `open_volume_slot` (L404): Cut an axis-aligned doorway/headroom volume while retaining other faces.

- `cap_roof` (L434): Trim the warped roof above the level garden deck, retaining cabin walls.

- `plan_floor` (L448): Thin upward structural floor from a convex plan outline.

- `plan_intersection_area` (L456): Actual XY overlap area; reject empty/touching masks before subdivision.

- `subtract_plan_polygon` (L480): Return disjoint pieces outside a convex XY footprint, retaining Z.

- `remove_exterior_overlaps` (L505): Give exterior walking tops/access undersides one owner; trim duplicates.

- `add_garden_deck` (L577): Level garden platform matching the broad F3 dining-roof footprint.

- `rebuild_stair_rails` (L589): Rails along both widened fore lower flights, with unobstructed exits.

- `add_exterior` (L614): Authored lawn furniture, gardens, helm, hatches, fittings and deck connections.

- `_tread_centre` (L735): Implements _tread_centre.

- `fore_rim_outline` (L739): Inset the convex curved foredeck perimeter from retained rim footings.

- `_fit_box` (L769): Reshape an existing mesh so its world bounds become centre/size.

- `retread_flights` (L783): Give every source stair flight normal human risers.

- `add_fittings` (L868): Human-scale exterior fittings, portholes, hatches and their access.

- `restore_exterior` (L1156): Implements restore_exterior.

- `repair_symmetry` (L1353): Repair displaced source side panels by mirroring their attached counterparts.

- `rank` (L521): Implements rank.

- `cross` (L752): Implements cross.

- `exterior_floor` (L876): Implements exterior_floor.

- `find` (L879): Implements find.

- `shaft` (L1045): Implements shaft.

- `stair_hatch` (L1057): Cover the full upper-flight headroom slot, with its exit beside it.

- `log` (L1157): Implements log.

- `clip` (L488): Implements clip.

- `sample` (L813): Implements sample.

### `tools/sunny_fore_trim.py`

Purpose: Asset construction/audit module sunny_fore_trim.

- `split_polygon` (L13): Partition in double precision; Blender Vector dot/lerp quantize each cut.

- `profile_prisms` (L27): Recover convex station strips from the actual X-monotone room outline.

- `subtract_prism` (L50): Keep all disjoint surface pieces outside one finite construction prism.

- `reconcile_fore_trim` (L65): Cut the source shield through B1/F1/F2 envelopes, including four closets.

### `tools/sunny_interiors.py`

Purpose: Asset construction/audit module sunny_interiors.

- `L` (L96): Offset a local frame at p, rotated by rot about the vertical axis.

- `_merge` (L102): One mesh, one material per face, for clusters of tiny repeated props.

- `rbox` (L121): Box authored in metres, rotated about p's vertical axis.

- `rpole` (L135): Implements rpole.

- `panel` (L140): Implements panel.

- `peg` (L144): Short vertical post/leg.

- `chair` (L153): Dining/side chair: 0.45 m seat, 0.90 m back.

- `stool` (L165): Implements stool.

- `table` (L173): Implements table.

- `bench` (L180): Implements bench.

- `counter` (L186): Kitchen counter: 0.92 m working height with a 0.05 m overhang.

- `shelf_unit` (L199): Implements shelf_unit.

- `bookcase` (L208): Implements bookcase.

- `crate` (L246): Implements crate.

- `planter` (L252): Implements planter.

- `barrel` (L258): Implements barrel.

- `sack` (L265): Implements sack.

- `sofa` (L269): Implements sofa.

- `armchair` (L282): Implements armchair.

- `rug` (L286): Implements rug.

- `bed` (L290): Bed with 0.55 m mattress height; w=1.35 d=2.05 is a single, w>1.6 a king.

- `bunk` (L300): Suspended double-decker bunk, hung from the beams over the cabin floor.

- `locker_bank` (L314): Implements locker_bank.

- `wardrobe` (L324): Implements wardrobe.

- `desk` (L334): Implements desk.

- `stool_small` (L345): Implements stool_small.

- `kotatsu` (L349): Horigotatsu: sunken table with low sofas and a central heater.

- `workbench` (L362): Implements workbench.

- `tool_board` (L373): Implements tool_board.

- `stove` (L384): Giant range with an oversized oven, as described for the Sunny's kitchen.

- `fridge` (L397): The lockable four digit-code refrigerator.

- `sink` (L409): Implements sink.

- `toothbrushes` (L417): The washroom detail the reference calls out for the men's quarters.

- `bathtub` (L425): Large communal bath: hollow tiled shell and contained water, not a solid box.

- `toilet` (L439): Implements toilet.

- `swivel_chair` (L445): Implements swivel_chair.

- `medical_bed` (L454): Implements medical_bed.

- `ceiling_lamp` (L465): Implements ceiling_lamp.

- `wall_lamp` (L472): Implements wall_lamp.

- `pot_plant` (L479): Implements pot_plant.

- `cannon` (L490): Outboard naval cannon: closed hollow bore, carriage and four round wheels.

- `laundry_hamper` (L518): Implements laundry_hamper.

- `ladder` (L523): Vertical ladder; p is the foot centre.

- `wall_run` (L538): Wall along local +X centred on p, with rectangular openings.

- `door_frame` (L567): Fixed jambs and a real rectangular or N-supported semicircular crown.

- `door` (L595): Authored door leaf + frame and register it for runtime behaviour.

- `hatch` (L664): Sliding or edge-hinged hatch with a real aperture through floor layers.

- `cut_floor_slot` (L737): Remove a real rectangular opening through an authored floor.

- `stair_flight` (L751): Straight flight rising 'rise' m over 'run' m along local +X from p.

- `switchback` (L785): Two flights and a half landing; footprint is run x (width + gap).

- `aquarium` (L801): Glass-walled tank with its own water volume, rocks, coral and fish.

- `curved_aquarium` (L858): Segmented elliptical tank following Oda's semicircular aquarium lounge.

- `den_den_mushi` (L905): Implements den_den_mushi.

- `dumbwaiter` (L916): Food lift built into the mast, connecting the kitchen to the aquarium bar.

- `_hull_sides` (L929): Implements _hull_sides.

- `fit_floor` (L942): Hull-fitted room floor spanning blueprint stations x_lo..x_hi.

- `rect_floor` (L959): Implements rect_floor.

- `fore_hull_outline` (L964): Rounded F1/F2 plan from actual hull sections, in final world metres.

- `inset_outline` (L991): Inset a counterclockwise plan using intersecting offset edge lines.

- `curved_fore_lining` (L1006): One joined 18 cm wall ring, supported inside its actual curved floor.

- `fore_partition_span` (L1039): Common supported X span of both wall faces inside the curved lining.

- `perimeter_lining` (L1055): Closed, chord-aligned walls on an actual floor outline; no sampled gaps.

- `circular_lining` (L1064): Continuous elliptical shell with real sash apertures and a common doorway cut.

- `hut_roof` (L1096): Striped domed attic roof, closed above its timber ceiling.

- `build_interiors` (L1113): Author every interior level, room, fixture and opening, in metres.

- `__init__` (L73): Implements __init__.

- `x` (L76): Implements x.

- `y` (L79): Implements y.

- `z` (L82): Implements z.

- `p` (L85): Implements p.

- `station` (L88): Inverse of x(): world metres back to a blueprint station.

- `point` (L865): Implements point.

- `prism` (L867): Implements prism.

- `P` (L1131): Implements P.

### `tools/sunny_room_accuracy.py`

Purpose: Asset construction/audit module sunny_room_accuracy.

- `soft_box` (L24): Closed rounded furniture part, with flat panels and smooth curved edges.

- `remove_family` (L39): Replace only a named provisional furnishing, preserving the ship shell.

- `repaint_family` (L46): Assign the supplied anime upholstery/metal palette to a fixture family.

- `tile_floor` (L56): Split the existing top face into tiles; no overlay or duplicate floor.

- `cloth_panel` (L121): Closed folded fabric hanging from its own real header rail.

- `pendant` (L150): Supported marine lamp and light record for the later lighting phase.

- `rounded_table` (L165): The library's octagonal central table and panelled pedestal.

- `stocked_shelf` (L176): Pantry's raw stores on open shelving, rather than empty cabinet boxes.

- `curved_bench_part` (L190): Closed annular seating with real curved sides, rather than spaced chairs.

- `library_details` (L221): Reference green encircling seating, chart desk and central octagonal table.

- `quarters_details` (L247): Laundry, correctly supported suspended bunks and the women's canopy.

- `kitchen_details` (L298): SBS giant oven, cooker hood, dish rack, tablecloth and locked fridge.

- `infirmary_details` (L340): Chopper's green bed, swivel chair, bulletin board and medicines.

- `workshop_details` (L359): Distinct timber Usopp factory and Franky's metal furnace/scrap station.

- `arched_chamber` (L380): Closed annular boiler housing around a real barrel-loading cavity.

- `energy_details` (L404): SBS three-barrel cola chamber, curved arch and containment grille.

- `bath_details` (L432): Communal bath's showers, wash bowls, towels, vent and patterned tiles.

- `complete_room_fittings` (L459): Apply supplied room silhouettes/palette without altering the exterior.

- `emit` (L67): Implements emit.

### `tools/sunny_room_details.py`

Purpose: Asset construction/audit module sunny_room_details.

- `aquarium_drapery` (L9): Supported side curtains and a scalloped valance on the real tank rail.

- `bath_wc` (L40): Separate accessible WC beyond the preserved bath-stair headroom slot.

- `workshop_metals` (L67): Franky's supplied metal lining, retaining the timber Usopp-facing wall.

- `lumber_storage` (L85): Forward storage's supported timber stock at a clear existing station.

- `complete_reference_details` (L95): Finish source-supported auxiliary spaces before room visual validation.

### `tools/sunny_surfaces.py`

Purpose: Asset construction/audit module sunny_surfaces.

- `floor_soffit` (L8): Give a cut access floor an opaque underside without moving its top.

- `smooth_painted_normals` (L36): Share normals across paint splits while preserving geometric creases.

- `clean_cut_geometry` (L63): Remove sub-10-micron cut corners/slivers before normal/UV export.

- `prepare_exterior_surfaces` (L121): Cap access floors, remove surface overlaps, then restore curve shading.

### `tools/sunny_uv.py`

Purpose: Asset construction/audit module sunny_uv.

- `exterior_surface` (L16): Select source exterior, supported fittings and shared exposed envelopes.

- `components` (L31): Retain each batched branch/leaf's real connected island for its grain axis.

- `principal_axis` (L50): Find the actual final branch/spar direction, independent of object origin.

- `prepare_exterior_topology` (L69): Expose existing nonplanar render triangles before selecting UV planes.

- `metric_uv` (L100): Assign stable metre UVs, cylindrical grain, or individual blade UVs.

- `prepare_exterior_uvs` (L166): Write only exterior UVs after every cut, normal repair and scale operation.

- `root` (L35): Implements root.

### `trial/baseline.mjs`

Purpose: Unchanged baseline view/raycast evidence harness.

- `sha` (L7): Implements sha.

- `inline filter at L13` (L13): filter callback.

- `inline map at L13` (L13): map callback.

- `three` (L15): Implements three.

- `inline filter at L16` (L16): filter callback.

- `inline on at L22` (L22): on callback.

- `inline on at L22` (L22): on callback.

- `inline waitForFunction at L23` (L23): waitForFunction callback.

- `inline evaluate at L24` (L24): evaluate callback.

- `cameraSurvey` (L26): Implements cameraSurvey.

- `inline evaluate at L29` (L29): evaluate callback.

- `inline callback at L29` (L29): Inline callback.

- `inline evaluate at L32` (L32): evaluate callback.

- `inline map at L38` (L38): map callback.

### `trial/original-evidence/whole-ship-audit-cannon-men-port.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-cannon-men-starboard.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-cannon-women-port.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-cannon-women-starboard.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-dock-centre.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-dock-waiting.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-exterior-bow-quarter.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-exterior-port.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-exterior-starboard.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-room-mens.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-room-storage.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-room-views.json`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-room-womens.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-static.json`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-supplemental-views.json`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/original-evidence/whole-ship-audit-verified-dock-open-port.png`

Purpose: Unmodified factual survey evidence supplied with the common packet.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/packet.md`

Purpose: Neutral factual findings, references and acceptance criteria.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/resource.mjs`

Purpose: Common serialized resource runner and timing record.

- `record` (L8): Implements record.

- `readOwner` (L10): A competing creator may own the file before its JSON write is complete.

- `inline callback at L27` (L27): Inline callback.

- `release` (L32): Release only the lock owned by this wrapper.

- `inline on at L34` (L34): on callback.

- `inline on at L35` (L35): on callback.

- `inline on at L36` (L36): on callback.

### `trial/results/c01-preservation.mjs`

Purpose: Isolated C01 diagnostic, proof or reporting artifact.

- `sha` (L6): Implements sha.

- `signatures` (L7): Implements signatures.

- `inline map at L7` (L7): map callback.

- `inline map at L7` (L7): map callback.

- `inline filter at L8` (L8): filter callback.

- `inline filter at L8` (L8): filter callback.

- `inline map at L11` (L11): map callback.

### `trial/results/c01-views.mjs`

Purpose: Isolated C01 diagnostic, proof or reporting artifact.

- `sha` (L7): Implements sha.

- `inline filter at L13` (L13): filter callback.

- `inline map at L13` (L13): map callback.

- `three` (L15): Implements three.

- `inline filter at L16` (L16): filter callback.

- `inline on at L23` (L23): on callback.

- `inline on at L23` (L23): on callback.

- `inline on at L26` (L26): on callback.

- `inline waitForFunction at L28` (L28): waitForFunction callback.

- `inline evaluate at L29` (L29): evaluate callback.

- `cameraSurvey` (L31): Implements cameraSurvey.

- `inline evaluate at L33` (L33): evaluate callback.

- `inline callback at L33` (L33): Inline callback.

### `trial/results/diagnose.mjs`

Purpose: Isolated C01 diagnostic, proof or reporting artifact.

- `inside` (L3): Implements inside.

- `inline filter at L5` (L5): filter callback.

- `inline map at L5` (L5): map callback.

- `inline some at L5` (L5): some callback.

- `inline some at L5` (L5): some callback.

### `trial/results/inspect-shield.py`

Purpose: Isolated C01 diagnostic, proof or reporting artifact.

Functions: none (declarative data, module-level execution, document or binary asset).

### `trial/results/report.md`

Purpose: Isolated C01 diagnostic, proof or reporting artifact.

Functions: none (declarative data, module-level execution, document or binary asset).

### `vite.config.js`

Purpose: Vite/React configuration, isolated cache and strict preview port.

Functions: none (declarative data, module-level execution, document or binary asset).

### Generated evidence directories

`docs/review/` — existing browser suite screenshots/results; output directory created for unmodified suites (not product construction). `tests/screenshots/` — original visual suite output. `trial/results/c01-views/` — matched seven-space/three-exterior comparison. These generated evidence outputs contain no executable functions; diagnostic source scripts are listed above.

Common isolated-output fixture correction (October28): `docs/review/` is created in both worktrees for existing browser suites' generated JSON/PNG output. No test assertion/product file changed. Terra’s initial full-run exteriorJourneys output failure is preserved as setup failure; rerun/terminal proof must be labeled accurately. Review scope remains the assigned C01 trim or C02 lining/apertures; unrelated existing room/C03 reconstruction limits are separate and do not automatically fail the assigned geometry.

Recovery preservation extension (2026-10-28): `trial/results/c01-preservation.mjs` adds `shieldState`, reading the actual retained shield world bounds and original material definitions; requires exact before/after equality in addition to all non-target primitive and collision checks. This strengthens exterior preservation evidence; product build inputs unchanged.

## C01 final bounded result — October28,2026

Final candidate remains PARTIAL: exported strict fore-trim regression fails four F1 and two F2 intersections. Matched storage image retains visible red/white upper wall/ceiling fragments despite B1 tested volume zero, so the current construction envelope/target coverage is insufficient for full visual acceptance. All20 matched images personally inspected; fore exterior coarse shape and target bounds/materials retained. Asset build and frontend build pass; broader suite, walking/control journeys and whole-model preservation deliberately unrun after explicit final user scope narrowing. No production-readiness claim.

`trial/results/c01-high-target-preservation.json` — declarative target bounds/material/source/collision hash review, no functions. `trial/results/c01-source.patch` — final source/metadata diff, no executable functions beyond inventoried modules. `trial/results/c01-high-regression-final.log`, `c01-high-regression-negative-final.log`, `c01-high-double-cuts.log`, `c01-high-target-views.log`, `c01-high-frontend-build.log` — actual bounded result logs, no functions. `trial/results/report.md` leads with final failures, exact screenshot paths, asset hashes, measured queue/execution and explicit incomplete coverage.
