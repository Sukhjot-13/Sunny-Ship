# Exterior materials and water — October 23, 2026

The current pass makes the Thousand Sunny’s existing exterior materials read as timber, paint, metal, glass, cloth, rope and vegetation. The ship’s shape, colours, 2.2 scale, collision, body dimensions and controls are preserved. C01 construction and interior textures remain paused; the completed C01 plan is saved in the [whole-ship report](whole-ship-blueprint-audit.md).

![Current exterior](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/bow-quarter.png)

| Surface | Current change | Close view |
|---|---|---|
| Timber and painted boards | Metre-scale plank joints, warped grain, pores, knots and separate roughness/relief | [Deck](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/deck-close.png) |
| Metal, iron and painted trim | Separate physical responses and surface variation; source colours retained | [Bow fittings](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/anchor.png) |
| Glass and roof | Reflective glazing and a separate roof finish | [Library exterior](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/glass-close.png) |
| Sails and rope | Physical canvas weave, sewn panels/hems, fibres; original artwork and wind deformation | [Canvas and rigging](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/rigging.png) |
| Plants | Bark, leaf veins, fruit pores, soil and ceramic finishes | [Garden close view](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/plant-close.png) |
| Ocean | Live ship reflection, filtered ripples, dielectric reflections, sun highlights and restrained foam | [Water at bow](/Users/sukhjot/codes/test/docs/review/exterior-realism-materials-v5/water-bow.png) |

All 26 v4 exterior images were individually inspected; v5 retains the same surface maps/artwork with optimized reflection updates. Four key v5 full-resolution views and all 26 views across four labelled contact sheets have been inspected with no new appearance regression. The final appearance capture reports no browser/shader errors and 57.66 fps at 1440×900 on Apple M3 Pro with ANGLE Metal, compared with 59.81 fps for the matched baseline. The photographed stationary deck region has no pixels changing by more than 4/255 over five seconds. The separate full suite verifies real grounded walking and controls.

The reflection uses a 512px target updated every fourth frame; the water shader distorts it with the existing waves and uses the sky farther out. Water absorption is an analytical deep-ocean approximation. The pass retains the authored stylized geometry and all paused construction discrepancies. It does not establish completion of the whole ship audit.

**Complete verification passed: 19/19 suites and production build, both exit 0.** The [terminal receipt](/Users/sukhjot/codes/test/docs/review/exterior-realism-full-20261023T111223Z/status.json) finished October 23 at 08:16 EDT with all 79 frozen inputs unchanged. It includes all 27 tour destinations and lawn return, six stair round trips, both ladders, real navigation/Burst/Gaon controls, cannon UI and motion checks. The previous browser-frame/startup failures are retained separately in the receipt history. No verification process remains active.

The final actual movement test measured 43.95 fps in the Library-window view, with 0% visible change in the stopped deck, plant and glass regions after five seconds. These measurements and the 57.66 fps appearance capture are context-specific. Current movement/cannon/visual screenshots are preserved under the terminal run’s `evidence` folder; some legacy visual Explore frames include the capture-mouse overlay, so the v5 and normal grounded-movement photographs are the primary appearance evidence.

The [appearance receipt](/Users/sukhjot/codes/test/docs/review/exterior-realism-verification.json) records exact image hashes, measured context, review findings and verification status. The [saved baseline](/Users/sukhjot/codes/test/docs/review/exterior-realism-baseline/inputs.json) identifies rollback copies. The [whole-ship report](whole-ship-blueprint-audit.md) remains the sole active queue.
