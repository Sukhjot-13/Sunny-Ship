# C02 Terra candidate — 2026-10-26

This is an isolated candidate, not a merged repair. The predecessor worked under a user-reported Light setting, then was interrupted at 19:26 UTC; this continuation is GPT-6.1 Terra, reasoning effort HIGH, beginning at approximately 19:26 UTC. No token usage was exposed. The prior attempt and HIGH intervals are recorded separately in `resource-events.jsonl`.

The candidate cuts the B1 lining with the existing shutter polygon, retaining surrounding faces and building affected collision from those faces. Fully consumed segments are removed, and empty evaluated bounds skipped. This does not reconstruct the complete R14 rotating water channels, which is separate C03 scope. Full shell/rim containment, actual bay connection, visual fidelity, walking/access and returns remain unverified until the remaining checks finish; sampling alone cannot establish these.

The relevant supplied reference personally inspected was `stuff/images/Thousand_Sunny_pg.192-193.webp`. The original real open-port view is `trial/original-evidence/whole-ship-audit-verified-dock-open-port.png`; baseline port and starboard lining hit records and fixed closed-shutter survey views are in `trial/results/common-baseline/receipt.json` and `dock-{port,starboard}-outside.png`. The old starboard observation was static only.

## Results and evidence

- Predecessor `terra-c02-assets`: failed exit 1 after 58.447 s, due to an empty object returning no bounds (`trial/results/c02-assets.log`).
- HIGH `terra-c02-high-assets`: failed exit 1 after 84.587 s, queue 4.508 s, due to downstream material averaging of an empty mesh (`trial/results/c02-high-assets.log`).
- HIGH `terra-c02-high-assets-retry`: exit 0, execution 220.654 s, queue 0.001 s. Coherently published the visual model, collision model, metadata and editable master (`trial/results/c02-high-assets-retry.log`).
- `node tests/dockApertures.test.mjs`: 149 visual triangle and lining collision box probes per side passed (`trial/results/c02-apertures.log`). Before rebuilding, the same regression failed against the old lining. Its sampling is not a continuous mathematical proof or a check of other obstacles.
- Static collision centre rays from each side to the centre had no collision boxes of any name (`trial/results/c02-centre-collision.log`); this excludes dynamic objects and is not a full-path or player test.
- `npm run build` via wrapper: exit 0, execution 2.214 s, queue 150.127 s (`trial/results/c02-high-build.log`).
- Full `npm test` started at 19:41:40 UTC after 625.668 s queue; see `c02-high-test.log` and `resource-events.jsonl` for definitive state. The first view wrapper exited before starting with a transient empty lock-file JSON parse (`c02-high-views.log`); the survey is requeued as `terra-c02-high-views-retry` (`c02-high-views-retry.log`). No completion, walking, return or open-view pass is claimed while pending.
- `git diff --check`, Python compile and JS syntax checks passed; fresh scans cover the new `obj_bounds`, empty-segment handling, regression registration and Environment Variables section.

SHA-256:

- `public/models/sunny.glb`: `f8c1b02c09cadecd3e11163dff46227c5b067001a92ecc184003026d65c83243`
- `public/models/sunny-collision.glb`: `86dc8b4218cd28efeaf55a0b6e59eaf685231a26bf1311ff069f2905c1bb73da`
- `public/models/ship-metadata.json`: `373e505c0191209459aec1b0de2aff15a5fa3ca040a3764f7ff301eb407bcff0`
- `assets/sunny-master.blend`: `0c693396eba129770c2feaca55ae40a3420e1b1ac6637396b5da8902adf19d6b`

Preview port 8172 was started for this worktree. All three HTTP-served asset hashes match the local files (`trial/results/c02-http-hashes.log`); the queued view script independently checks them again. Resource queue and execution records are in `trial/results/resource-events.jsonl`. No ranking or usage score is inferred.

## High recovery — 2026-10-28

Recovery started approximately 20:10 UTC after the two-day account-usage-limit interruption; neither earlier phase was uninterrupted, and the predecessor was user-reported Light, not High. The completed asset rebuild was retained. No token usage is exposed.

A fresh negative control ran the new regression against the common baseline asset files copied from commit `9e8274d`, without changing this checkout. It failed as intended at `visual lining blocks -1 at -7,0` (`c02-recovery-baseline-negative.log`). The candidate regression passed 149 visual and collision lining samples per side in the recovery full-run log. This is sampled clearance, not proof of every surface, the rim, or the whole route.

The first recovery survey (`c02-recovery-views.log`) failed to launch sandboxed Chromium after 0.777 s; the escalated retry (`c02-recovery-views-retry.log`) reached actual helm walking, channel 2 selection and `shutter > .98` before failing to capture because optional camera controls were null (34.600 s, 0.001 s queue). The survey harness was guarded and syntax checked; its queued attempt was cancelled on the user's urgency instruction before starting.

The unfiltered full test (`c02-recovery-full-test.log`) is **incomplete**, not a pass: stopped at user direction in suite 16/21 with SIGTERM after 857.694 s execution and 30.024 s queue. Before termination, gameplay lost its Chromium frame, and cannon controls and exterior journeys failed to write because `docs/review` was absent; the output directory was subsequently created. Neither those failures nor unrun suites were retried under the urgency instruction. Soldier Dock stair/hatch ordinary descent and return passed within suite 15. The SIGTERM caused an additional browser session error in suite 16, which is not a completed test outcome. Full aggregate production readiness is not established. Input hashes taken during this run are in `c02-recovery-frozen-inputs-before.log`.

R07 and R14 were personally inspected in recovery. R14 depicts a water-bearing enclosed launch channel; the existing compact rotating bays and outer circulation ring do not by themselves establish that end-to-end channel. This is a separate C03 construction dependency, not proof that the sampled C02 lining cut failed. Actual end-to-end launch and water continuity remain unverified. The earlier center collision rays and the regression filter cannot establish all other shell/rim obstructions, full containment, or dynamic physical correspondence.

### Final scoped evidence

- Actual controls and both fixed survey poses passed on the candidate: `c02-final-views.log`, `c02-views.json`, `c02-open-port.png`, `c02-open-starboard.png`; channel 2, `dockOpen=true`, `shutter=1`. Served SHA-256 matched all three candidate files listed above. Queue 120.102 s, execution 33.573 s.
- The same controls and poses passed in a separate replay of common baseline `9e8274d`: `c02-baseline-open-views.log`, `c02-baseline-open-views.json`, `c02-baseline-open-port.png`, `c02-baseline-open-starboard.png`. Queue 37.534 s, execution 32.835 s. Served and local baseline hashes matched: visual `986080f794d8c99b074c48a01942a01e98d882a45a54b6a5a68e09ad4999397c`; collision `59fe62724ce2d727237c4ebf1f32c0f65fd56464b8c201c1c2a9ae96bd2d4907`; metadata `f8b75353c28b19b1e67db702b9ad3863520e28aa4af73da305ca589dbcc62394`.
- I inspected all four images. Both baseline open shutters expose solid timber; both candidate views look through to the existing interior. The port rim is visible, but the open views expose unfinished-looking edges and a green ceiling, and do not establish complete shell/rim containment or physical travel through the actual opening. The measured lining rays do not cover all collision or moving geometry. C02 lining obstruction is reduced and sampled lining clearance passes on both sides; complete C02 containment and physical path correspondence remain **unverified**, so this is a partial candidate, not a verified complete repair.
- The final `npm run build` passed (`c02-final-build.log`): queue 150.121 s, execution 2.345 s. Existing application controls and other code were not changed; diff only changes generated B1 lining cut and corresponding coherent assets plus regression and trial documentation. Preservation beyond the logged passing tests and inspected views remains unverified.
- `git diff --check`, Python compile and survey JavaScript syntax check passed. `c02-recovery-full-test.log` is the stopped broad run, with its exact errors and unfinished suites, not a clean aggregate. The previously listed `c02-high-test.log` was also interrupted without a terminal summary. The user narrowed final work to the targeted evidence; no broad retries were performed.

The separate C03 water-bearing launch-channel construction remains outside this candidate. It is not claimed complete or used as the sole reason for the C02 containment limitation above. The before and after survey poses are fixed camera inspection after real control use; they are not ordinary player movement through the mouth. No token usage or benchmark percentage is available. Queue and execution times are separately recorded in `resource-events.jsonl`; the October 26 and October 28 work intervals have an account-usage-limit gap and must not be added as continuous elapsed work.
