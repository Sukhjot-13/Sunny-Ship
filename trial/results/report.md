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
- Full `npm test` and real-control open-view survey are queued; see `resource-events.jsonl` for definitive state and logs `c02-high-test.log` and `c02-high-views.log`. No completion, walking, return or open-view pass is claimed while pending.
- `git diff --check`, Python compile and JS syntax checks passed; fresh scans cover the new `obj_bounds`, empty-segment handling, regression registration and Environment Variables section.

SHA-256:

- `public/models/sunny.glb`: `f8c1b02c09cadecd3e11163dff46227c5b067001a92ecc184003026d65c83243`
- `public/models/sunny-collision.glb`: `86dc8b4218cd28efeaf55a0b6e59eaf685231a26bf1311ff069f2905c1bb73da`
- `public/models/ship-metadata.json`: `373e505c0191209459aec1b0de2aff15a5fa3ca040a3764f7ff301eb407bcff0`
- `assets/sunny-master.blend`: `0c693396eba129770c2feaca55ae40a3420e1b1ac6637396b5da8902adf19d6b`

Preview port 8172 was started for this worktree. All three HTTP-served asset hashes match the local files (`trial/results/c02-http-hashes.log`); the queued view script independently checks them again. Resource queue and execution records are in `trial/results/resource-events.jsonl`. No ranking or usage score is inferred.
