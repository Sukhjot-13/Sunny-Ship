# C01 final bounded experimental result — PARTIAL / acceptance FAIL

Recovery model GPT-6.1 Sol, explicitly High. Final source and coherent assets are retained in this isolated candidate; no push, merge, production release, or original C01 closure. Initial Light interval is retained and is not attributed to High. Token usage is not exposed; no token or benchmark percentage is invented.

## Actual outcome

The candidate cuts intruding source shield polygons through construction-derived B1/F1/F2 envelopes, preserving source paint/material slots and existing room linings. The double-precision correction reduces boundary artifacts, but **C01 is not resolved**. Strict20µm exported regression still fails at F1/F2. Personally reviewed matched storage view also still shows conspicuous red/white fragments at its upper wall/ceiling edge, even though the tested B1 envelope reports zero. This proves that envelope zero alone is insufficient visual acceptance and that the existing test coverage misses part of the visible storage boundary/source family. No further repair or tolerance change was made after the user's bounded-comparison instruction.

| Targeted check | Actual result |
|---|---|
| Coherent Blender assets/master publication | PASS, exit0 |
| Final exported fore trim regression | FAIL: B1 zero; F1 four hits /0.000002843342907650442m²; F2 two hits /0.0000009173214757390309m² |
| Baseline negative control | Expected FAIL: B1/F1/F2=148/397/1109 hits;21.179819789252317/21.421282176076723/68.43455850332428m² |
| Matched7-space +3 fore-exterior capture | PASS capture/served hashes; zero page/shader errors; **visual C01 acceptance incomplete** |
| Target shield world extents and material definitions | Exact before/after match |
| Collision bytes and original FBX hash | Exact baseline match |
| Runtime/config/artwork/source files (`src`, `public/artwork`, `stuff`) | No Git changes |
| Frontend production build | PASS,650 modules, Vite1.79s (wrapper2.238s) |
| Full21-suite aggregate / ordinary-body journeys and control returns | NOT RUN on final candidate under explicit final user scope override; no production-readiness claim |
| Prepared whole-model preservation suite | NOT RUN under explicit final scope override |

## Personal visual review

All20 matched images below were personally inspected, alongside relevant supplied R01,R05,R06,R07,R09,R16,R17. The men's ceiling red triangle and women's large wall crossing disappear in their matched poses. Women's cannon port ceiling tip and starboard broad wall fragment disappear in these poses. Men's cannon closet views already look clear at these downward-looking poses; they do not certify all wall/ceiling edges. Storage's large lower red/white patch disappears, but upper red/white fragments remain visibly unchanged. A separate dark low triangle remains; its ownership was not diagnosed in this bounded pass. Three matched fore-exterior poses retain their coarse red/white ornament silhouette; this is not full exterior certification. Source-supported hidden trim thickness is not established. Existing partial furnishings/era choices were not redesigned.

| View | Before | After |
|---|---|---|
| mens | `trial/results/c01-views/before-mens.png` | `trial/results/c01-views/after-mens.png` |
| womens | `trial/results/c01-views/before-womens.png` | `trial/results/c01-views/after-womens.png` |
| storage | `trial/results/c01-views/before-storage.png` | `trial/results/c01-views/after-storage.png` |
| cannon-men-port | `trial/results/c01-views/before-cannon-men-port.png` | `trial/results/c01-views/after-cannon-men-port.png` |
| cannon-men-starboard | `trial/results/c01-views/before-cannon-men-starboard.png` | `trial/results/c01-views/after-cannon-men-starboard.png` |
| cannon-women-port | `trial/results/c01-views/before-cannon-women-port.png` | `trial/results/c01-views/after-cannon-women-port.png` |
| cannon-women-starboard | `trial/results/c01-views/before-cannon-women-starboard.png` | `trial/results/c01-views/after-cannon-women-starboard.png` |
| exterior-bow-port | `trial/results/c01-views/before-exterior-bow-port.png` | `trial/results/c01-views/after-exterior-bow-port.png` |
| exterior-bow-starboard | `trial/results/c01-views/before-exterior-bow-starboard.png` | `trial/results/c01-views/after-exterior-bow-starboard.png` |
| exterior-profile | `trial/results/c01-views/before-exterior-profile.png` | `trial/results/c01-views/after-exterior-profile.png` |

`trial/results/c01-views/receipt.json` records exact poses and served/disk SHA256 equality for all3 HTTP assets at `http://localhost:8171/`. Before views use explicit interception of saved unmodified baseline GLBs/metadata. After views load the verified final HTTP assets. Only the primary camera is placed; no geometry/materials are hidden. These are Inspect-camera views, not ordinary walking proof.

## Exact executed commands and retained logs

All commands run in `/Users/sukhjot/.codex/worktrees/sol-c01-trial/test`. Heavy jobs use the same revision2 serialized wrapper; no source edits occurred during the final correction build.

```sh
SUNNY_PORT=8171 SUNNY_BASE_URL=http://localhost:8171/ URL=http://localhost:8171/ node trial/resource.mjs c01-high-double-cuts -- /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 --python tools/build_assets.py
node tests/foreTrim.test.mjs
node tests/foreTrim.test.mjs trial/results/before-sunny.glb
SUNNY_PORT=8171 SUNNY_BASE_URL=http://localhost:8171/ URL=http://localhost:8171/ node trial/resource.mjs c01-high-target-views -- caffeinate -i node trial/results/c01-views.mjs
SUNNY_PORT=8171 SUNNY_BASE_URL=http://localhost:8171/ URL=http://localhost:8171/ node trial/resource.mjs c01-high-frontend-build -- caffeinate -i npm run build
git diff --check
```

Logs: `trial/results/c01-high-double-cuts.log`, `c01-high-regression-final.log`, `c01-high-regression-negative-final.log`, `c01-high-target-views.log`, `c01-high-frontend-build.log`. The targeted extent/material/collision/source review is saved as `trial/results/c01-high-target-preservation.json`; it is a narrow target review, not the unrun whole-model `c01-preservation.mjs`. Original initial failed numerical check and interrupted build logs remain intact. `tests/run-all.mjs` retains every original20 suite unchanged and adds the new21st suite; its registration does not imply aggregate execution.

## Measured intervals and attribution

- Initial diagnostic start approximately2026-10-26 19:18UTC; initial implementation began approximately19:23UTC in user-reported Light interval. Explicit High continuation first clock19:27:51UTC.
- The first inherited `c01-assets` attempt has no terminal event and is not counted as completed. Previous High recovery publication completed2026-10-26T19:41:40.038Z:526.797s execution,156.129s queue,exit0.
- This recovery first clock2026-10-28T20:11:31Z. The approximately two-day account-usage pause is excluded from active/build timing and is not uninterrupted High work.
- Final precision correction queued2026-10-28T20:12:30.287Z; acquired20:26:04.446Z; finished20:29:44.389Z. **219.943s execution;814.159s queue**. Owned `caffeinate -i -w18668` prevented idle sleep; no duplicate/restarted live build.
- Target views20:30:38.640Z–20:31:14.645Z:36.005s execution;0.001s queue.
- Frontend build20:31:15.046Z–20:31:17.284Z:2.238s execution;3.006s queue.
- Exact common baseline and candidate queue/execution events remain in `trial/results/resource-events.jsonl`. No aggregate source-work/token metric is available.

## Final asset/source hashes

| Path | SHA256 |
|---|---|
| `public/models/sunny.glb` | `da8b042505486825ffd7392216b0185804c0623d7449ac731900fdf80ac479ae` |
| `public/models/sunny-collision.glb` | `59fe62724ce2d727237c4ebf1f32c0f65fd56464b8c201c1c2a9ae96bd2d4907` |
| `public/models/ship-metadata.json` | `3a5fd4c757a6a36f7c52eca77f244fd71dbcde128ec36dc8e5225333c97d3783` |
| `assets/sunny-master.blend` | `5314eb506eeae3c8ac8562664fd14ae73465235171ab78a6854b0dc9c69083c0` |
| `stuff/1.FBX` | `8a770f19926e304cce1839fde4797fc1d98db5a49814f7b049e5a83be69cec10` |

## Delivery and limits

Product source changes: `tools/sunny_fore_trim.py`; construction envelope receipts in `sunny_interiors.py`, `sunny_exterior.py`, `build_assets.py`; regenerated visual/metadata/master; new `tests/foreTrim.test.mjs` and aggregate registration. Common revision2 `trial/resource.mjs` is a coordinator harness correction, not a participant product repair. Architecture/function/env inventory and dated suggestions are maintained.

Final source-and-metadata patch: `trial/results/c01-source.patch`; binary assets and complete evidence are in the local candidate commit. Patch intentionally excludes binary assets; it is not a standalone complete build-artifact delivery. Commit identity is configured Git identity; no remote operation. Preview remains isolated on strict8171 for coordinator review. No C02/general ship work, further repair rounds, whole-ship tours, or production certification. Remaining C01 visual/strict-geometric failures are substantive unresolved acceptance, not hidden by build/capture PASS.

---

## Retained earlier chronological record (superseded by final status above)

# C01 isolated Sol candidate

Assigned model: GPT-6.1 Sol (parent assigned); usage/reasoning counters are not exposed locally. Candidate worktree only; no remote publication or production changes.

## Timing

- Read-only diagnosis began approximately 2026-10-26 19:18 UTC (first source read; exact tool wall time unavailable).
- First explicit local clock sample: 19:22:07 UTC. Gate remained closed through reference/source diagnosis.
- Common gate release received before 19:23:10 UTC; implementation/evidence preparation began 19:23 UTC.
- Heavy queue and execution intervals: exact timestamps and milliseconds in `trial/results/resource-events.jsonl`; reported separately from implementation elapsed time.

## Scope and reference diagnosis

Personally inspected R05/F2, R06/F1, R07/B1, R09/SBS quarters, R16/anime boys and R17/anime girls. These establish usable enclosed room silhouettes and adjacent cannon closets; none establishes concealed metric trim thickness. Existing room construction dimensions remain reconstruction. Supplied original women's view plainly shows a red shield cutting across the room. Lightweight original published-triangle scan (`source-intersections-before.txt`, `diagnose.mjs`) finds Circle038.001 vertices inside F1/F2 and B1; other reported source objects include actual retained stairs/hull and are not blanket trim targets.

Common coordinator baseline: ten static suites and build pass; current matched ten-view images and receipt under `common-baseline/`; zero page/shader errors and all three served hashes matched original inputs. Baseline outside views show CLOSED shutters and do not certify current browser journeys. Original assets are preserved under `before-{sunny,collision}.glb` and `before-metadata.json` for candidate comparisons.

No completion claim yet. Implementation, regression checks, visual comparison and applicable normal-body journeys are pending.

## Model-setting interval correction

The initial participant was reported by the user as Light and interrupted at approximately 19:26 UTC. This continuation is GPT-6.1 Sol with reasoning_effort=high, first observed clock 19:27:51 UTC; exact coordinator dispatch time is separate. Earlier implementation/build inputs remain attributed to the initial interval. The inherited c01-assets build was preserved without restart.

### Interrupted build and recovery

The inherited `c01-assets` attempt began at 19:25:11.428 UTC (4.506 seconds queued), stopped with its last line at walkable-surface raycasting, and has no terminal resource event. The resumed agent checked only its two known PIDs 31356/31386: neither existed. Staging was empty and all published assets/master retained baseline timestamps. No successful publication or completed execution duration is claimed. A new `c01-high-assets-recovery` job was therefore queued at 19:30:17.112 UTC under the common wrapper. This is recovery after confirmed termination, not a duplicated live job. Initial and recovery logs are preserved.

### Fresh scan so far

New regression syntax and aggregate registration were checked; `git diff --check` passed. Existing 20 suites are retained unchanged except adding the new 21st regression to the authoritative suite list. No source build inputs were changed while either Blender attempt was live. A resumed-agent filesystem write restriction was resolved through reviewed escalation scoped to the authorized Sol worktree.

## October28 High recovery

Recovery start observed2026-10-28T20:11:31Z, GPT-6.1 Sol at explicitly assigned High. Approximately two-day gap after account usage limit is excluded from active execution; the initial Light work remains retained/attributed separately. No token counter exposed. The preserved recovery asset job completed2026-10-26T19:41:40.038Z, exit0,526.797s execution plus156.129s queue. It was not rerun merely to resume.

First independent exported regression found B1 zero, F1 five tiny residuals totaling0.000006749997m² and F2 twenty totaling0.000012477802m² (`c01-high-regression-initial.log`). Negative baseline detects148/397/1109 intersecting triangles and21.179819789/21.421282176/68.434558503m² (`c01-high-regression-negative.log`). Source diagnosis found repeated Blender single-precision Vector clipping cancellation at dense construction stations. Corrected source clipping to double tuple arithmetic; unchanged20µm test tolerance, unchanged true construction outlines. Rebuild required for this actual source correction.

Recovery source review additionally confirms all original20 suite entries unchanged, no existing suite assertions altered, no runtime/controller/config changes. Existing `PLAYER_HEIGHT_M=1.75`, `EYE_HEIGHT_M=1.7`, radius0.34 remain baseline. The empty `docs/review/` output directory was created because original browser suites write there; this is evidence scaffolding, no product logic. Relevant recovery personal reference inspection: R01,R05,R06,R07,R09,R16,R17. The packet's all25 reference register describes coordinator inspection; this recovery claims only these seven relevant images personally re-inspected.

The required architecture appendix now inventories146 tracked/current-added files and1971 named/inline functions, with one explicitly unverified inactive inherited `.orig` backup because historical context is excluded by trial rules. `SUNNY_CDP` and `NAV_DEBUG` inherited audit/test variables are included in the Environment Variables section.
