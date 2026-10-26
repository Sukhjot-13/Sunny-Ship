# Neutral trial architecture

Current production source/assets at baseline; no previous repair prototypes/algorithms supplied. `trial/packet.md` records the original findings, references, coordinate convention, constraints and criteria. `trial/original-evidence/` contains selected original survey screenshots/data only. `AGENTS.md` mirrors shared project instructions. `tests/*.mjs` and three audit tools only replace hardcoded localhost5173 strings with the common optional base URL; all assertions unchanged. `vite.config.js` adds per-workspace cache and strict explicit port. The new trial resource wrapper serializes heavy jobs and records queue/execution times; inventory its functions when added. Update this inventory for all candidate modifications/functions.

## Environment Variables

`SUNNY_BASE_URL`: optional isolated preview base URL in browser/test/audit scripts; defaultlocalhost5173. `SUNNY_PORT`: strict Vite port, default5173. Existing `URL` remains supported by legacy gameplay/interaction/interior journey tests. Existing `ROOM_FILTER` can narrow focused interior journeys but MUST be unset for full npm test. Shared dependencies are read-only and Vite cache is workspace-local.

`trial/resource.mjs` — common heavy-job lock, `record` appends queue/execution events; `release` removes only its own lock; top-level waits for live owners and starts the exact child command; signal/exit handlers stop child and release lock. `trial/baseline.mjs` — `sha` verifies every served model matches local input, `three` converts original poses, browser `cameraSurvey` selects only the main camera, top-level saves current unchanged views and exact named-lining ray intersections. Appearance only; no player or geometry changes. All outputs under `trial/results/`.

Common harness correction: audit/navigation/baseline inspection imports now read the actual `/.vite-cache/deps/@react-three_fiber.js` instance after cache relocation. The obsolete `/node_modules/.vite/deps/` URL loaded a second module instance and could not find the canvas root. This corrects inspection plumbing identically in both candidates; product code and assertions remain unchanged.

`tools/sunny_accuracy.py` — `rolling_dock` cuts intersecting B1 lining chords on both sides to the shutter aperture; affected lining uses face-based collision.

`tests/dockApertures.test.mjs` — `walk` reads transformed exported B1 triangles; top-level checks a grid through both apertures against visual triangles and lining collision boxes. `tests/run-all.mjs` includes this regression with the existing suites. `rolling_dock` skips empty evaluated bounds and removes fully consumed segments before downstream material processing.

`trial/c02-views.mjs` — verifies served hashes, walks to real Dock controls, selects channel 2 and opens the shutters, then captures fixed port/starboard survey views and records state/errors.

`docs/suggestions.md` — dated follow-up improvements; no functions.
