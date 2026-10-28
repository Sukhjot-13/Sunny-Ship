# Sol vs Terra — the two assigned ship repairs

Reviewed October28,2026. **My practical pick for the next tightly scoped task is Terra at High.** Its two lining obstructions are visibly removed and its sampled geometry/collision check passes. Sol improves the fore rooms but still leaves visible storage trim and fails its strict check. Both candidates remain partial and unmerged. This is a judgment about these outputs, not a universal model ranking.

| Assigned work / evidence | GPT-6.1 Sol — C01 | GPT-6.1 Terra — C02 |
|---|---|---|
| Target correction | **Partial / failed acceptance.** Men's ceiling triangle, large women's intrusion and women's closet trim improve. Upper storage red/white fragments remain visibly present. | **Both lining obstructions corrected in the inspected views.** Complete rim/shell containment and travel through the mouths remain **unverified**. |
| Scoped test, independently rerun | **Fail:** B1 zero; F1 four and F2 two residual intersections at unchanged20µm tolerance. Zero B1 test result misses visible upper storage trim. | **Pass:**149 visual/collision lining samples per side. Finite sampling does not prove every edge or moving collision. |
| Negative baseline | Fails as expected:148/397/1109 intersecting triangles across B1/F1/F2. | Fails as expected on original lining. |
| Visual/control proof |20 matched before/after images: seven affected spaces and three fore-exterior poses; correct served hashes, zero capture errors. Views are camera inspection, not walking proof. |Matched baseline-open and candidate-open views on both sides; real helm approach/channel2/shutter1 controls, matching served hashes, no capture errors. |
| Reference fidelity |**Partial:** broad bow silhouette appears retained; storage is visibly unfinished. Men's closet angles already looked clear, so they cannot certify every edge. |**Partial:** openings reveal the interior, as required; unfinished-looking edges remain. Pre-existing C03 water-channel/Dock reconstruction is separate and is not counted as a C02 failure. |
| Preservation / regressions |Target shield bounds/materials, original FBX and collision bytes retained; runtime/material/control source unchanged. No exhaustive regression claim. |Localized lining cut and face-based collision; runtime/material/control source and FBX unchanged. Complete containment/access correspondence unverified. |
| Maintainability / honesty |Larger clipping helper plus independent regression; its envelope coverage misses visible upper trim. Candidly reports failure and limits. |Short existing-cut integration plus negative-tested sampling; candidly limits its claim to measured/visible lining clearance. |
| Frontend build |Pass. |Pass. |
| Overall task output |**Incomplete C01.** |**More convincing core correction; incomplete C02 validation.** |

I personally reviewed all20 Sol images through labeled matched sheets, both Terra before/after pairs, the relevant supplied references, scoped source changes and test receipts. I independently reran both candidate checks and their negative controls: [reviewer results](review/model-comparison-20261026/reviewer-targeted-tests.json). Neither implementation was silently fixed by the reviewer. The unchanged low dark storage protrusion is unattributed and distinct from the plainly visible remaining upper red/white trim. No production-ready or whole-ship completion claim is made.

## See the outputs

- Sol: [cabins](review/model-comparison-20261026/sol/comparison-1.jpg), [remaining storage / men's port closet](review/model-comparison-20261026/sol/comparison-2.jpg), [two closets](review/model-comparison-20261026/sol/comparison-3.jpg), [women's starboard / bow](review/model-comparison-20261026/sol/comparison-4.jpg), [other exterior poses](review/model-comparison-20261026/sol/comparison-5.jpg). Before is left; after is right.
- Terra: [both matched open apertures](review/model-comparison-20261026/terra/comparison.jpg). Before is left; after is right.
- [Sol final scoped report](review/model-comparison-20261026/sol/report.md) · [Sol capture/hash receipt](review/model-comparison-20261026/sol/views/receipt.json) · [failed final trim check](review/model-comparison-20261026/sol/c01-high-regression-final.log).
- [Terra final scoped report](review/model-comparison-20261026/terra/report.md) · [candidate controls/hash receipt](review/model-comparison-20261026/terra/c02-views.json) · [baseline controls/hash receipt](review/model-comparison-20261026/terra/c02-baseline-open-views.json).

## Speed and tokens — what was actually measured

| Measured work | Sol | Terra |
|---|---:|---:|
| Latest successful asset rebuild |219.943s (3m39.94s) |220.654s (3m40.65s) |
| Recorded completed asset executions |746.740s (12m26.74s), two successful builds; initial abandoned job has unknown duration |363.688s (6m3.69s), including58.447s and84.587s failed attempts |
| Latest rebuild resource wait |814.159s |0.001s |
| Final frontend build execution / wait |2.238s /3.006s |2.345s /150.121s |
| Final matched capture execution |36.005s |33.573s candidate +32.835s baseline; actual controls in both |
| Per-model tokens / active inference time |**Unavailable** |**Unavailable** |

Terra reached the more convincing assigned correction with fewer recorded build seconds, but the latest rebuild durations are effectively equal. These are program/build timings, not model thinking speed. C01 and C02 differ in difficulty, queues are excluded from execution, and the account-usage pause between October26 and28 is excluded. The initial participants were user-reported **Light**; fresh continuations and recovery explicitly used **High** for both exact model IDs. This was not a pure High-from-start experiment. No token estimates or account-wide usage percentages substitute for unavailable agent counters.

I overexpanded earlier verification. Common baseline checks and the stopped857.694s broad run are **evaluator overhead**, not model task speed. The broad run had browser/output-directory errors and was stopped in suite16/21; it is not a clean aggregate pass. No further broad tests or repairs were run after the scope correction. Details are retained in [the chronology](review/model-comparison-20261026/progress-history.md) and [the stop receipt](review/model-comparison-20261026/terra-full-run-user-priority-stop.json).

## Recovery points and fairness

- Original local baseline: `9fd7a1b74837e3d6d1b03cefdfbaee22d141ef3a`; original audit/docs checkpoint: `af9ab4d5d74319563afecff96bab679453461a39`. No remote/push/merge.
- Sol candidate: `1a62f963fb326815617ffaa3be7e4470a5d531bf`, `/Users/sukhjot/.codex/worktrees/sol-c01-trial/test`; [source/metadata patch](review/model-comparison-20261026/sol/source-metadata.patch).
- Terra candidate: `610e313b3ddd7969419607a1df18c4fe03d40a47`, `/Users/sukhjot/.codex/worktrees/terra-c02-trial/test`; [source/metadata patch](review/model-comparison-20261026/terra/source-metadata.patch). Published binary assets remain recoverable in each candidate commit/worktree; source patches require rebuilding.
- [Exact asset/patch hashes and timing records](review/model-comparison-20261026/final-manifest.json) · [model/effort provenance](review/model-comparison-20261026/participants.json) · [final original-input check](review/model-comparison-20261026/original-inputs-final.json). All113 original input hashes remain unchanged.
- Both started from identical sanitized product/context trees, separate ports/caches and shared read-only dependencies. The old pre-solved C01 prototype/checklist/history was excluded from both packets. Original documentation was checkpointed separately; participants were prohibited from other refs/original paths. Reviewer prior C01 knowledge means review was not blinded.
- Shared cache-import, lock-read and output-directory scaffolding faults were corrected symmetrically and disclosed; no assertion/tolerance weakened. Participant build failures, usage interruption and evaluator setup faults are distinguished in retained records.

**Next-use recommendation:** use Terra at High for the next small, clearly bounded section with visual review. Do not merge either candidate as a complete repair now. Sol showed useful independent testing and honest reporting, but this C01 output needs further work that was expressly stopped for this comparison. Original C01/C02 remain unclosed; general repairs/textures stay paused.
