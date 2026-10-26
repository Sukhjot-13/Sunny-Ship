# Neutral trial architecture

Current production source/assets at baseline; no previous repair prototypes/algorithms supplied. `trial/packet.md` records the original findings, references, coordinate convention, constraints and criteria. `trial/original-evidence/` contains selected original survey screenshots/data only. `AGENTS.md` mirrors shared project instructions. `tests/*.mjs` and three audit tools only replace hardcoded localhost5173 strings with the common optional base URL; all assertions unchanged. `vite.config.js` adds per-workspace cache and strict explicit port. The new trial resource wrapper serializes heavy jobs and records queue/execution times; inventory its functions when added. Update this inventory for all candidate modifications/functions.

## Environment Variables

`SUNNY_BASE_URL`: optional isolated preview base URL in browser/test/audit scripts; defaultlocalhost5173. `SUNNY_PORT`: strict Vite port, default5173. Existing `URL` remains supported by legacy gameplay/interaction/interior journey tests. Existing `ROOM_FILTER` can narrow focused interior journeys but MUST be unset for full npm test. Shared dependencies are read-only and Vite cache is workspace-local.

`trial/resource.mjs` — common heavy-job lock, `record` appends queue/execution events; `release` removes only its own lock; top-level waits for live owners and starts the exact child command; signal/exit handlers stop child and release lock. `trial/baseline.mjs` — `sha` verifies every served model matches local input, `three` converts original poses, browser `cameraSurvey` selects only the main camera, top-level saves current unchanged views and exact named-lining ray intersections. Appearance only; no player or geometry changes. All outputs under `trial/results/`.
