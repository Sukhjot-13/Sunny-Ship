# Relative scale audit — OPEN, November 16, 2026

The user requires visual fidelity to the supplied images at the working magnification and a coherent return to normal reference scale. Only those supplied images establish design. Earlier project choices and code comments do not establish canonical relative proportions. The configured39m/56m targets are not printed blueprint measurements.

## Confirmed implementation finding

`restore_exterior` in `tools/sunny_exterior.py` applies `experienceScale=2.2` to the preceding ship structure, then runs `retread_flights`, `build_interiors`, `add_fittings` and `apply_exterior_accuracy` in final working metres. Much later furniture, doors, plants, guards and instruments therefore use separately chosen dimensions. Some facade doors now use actual storey ratios; others retain fixed dimensions. This is a mixed-scale authoring pipeline and remains open, even when all body/door/UV/scale tests pass.

The controller retains1.75m height/1.70m eyes and3.4m/s speed. These are runtime choices, recorded separately from reference geometry. The generator’s ordinary.45m chair-seat setting becomes approximately.205m in the uniformly reversed inspection copy. That arithmetic demonstrates why a perfect1/2.2 export cannot by itself certify a correctly proportioned normal-scale furnishing. It does not establish a canonical metre size absent from the supplied drawing.

## Required direct validation

- Compare each exterior fitting to its surrounding hull/storey in matched source and model views: fore/aft entrances, Library entry and guard, helm/wheel/mast, rail spacing/height, lawn/garden vegetation/pots/beds, slide/swing, lookout/roof/lanterns and rigging fan/deck span.
- Record source image landmarks/visible ratios with perspective or occlusion uncertainty. Confirm them across applicable supplied plan/perspective/anime images; avoid substituting generic human dimensions or inherited metadata as authority.
- Reconcile all conflicting relative sizes in the editable working geometry. Distinguish an intentional runtime/controller choice from reference-accurate visual geometry. Keep the scale reversal uniform and verify all actual meshes after the geometry is coherent.
- After exterior acceptance, do the same for every room: furniture versus door/storey, fixtures, tanks and bench, suspended bunks, service spaces and connections. Existing1x furnishing sizes are unverified, not automatically approved by previous choices.

The recent R09/R13 passes prove topology, physical construction/access and the specifically inspected facade forms. The garden candidate proves improved foliage/planting construction and its current walking routes. None closes the whole-ship relative-scale finding. Reconcile these ratios before claiming full reference fidelity or whole exterior/room acceptance.

Current next exterior issues include the transverse fore-shroud plane (`rigging-reference-audit.md`) and broad shallow lawn shade crowns (`garden-reference-audit.md`). Their final sizes/placements must participate in this relative audit rather than inheriting unverified metre choices.

## First direct source-relative discrepancy: R09 paired fore ports

A read-only local-image analysis identified each disconnected outer/inner ink circle at thresholds140 and180 in the supplied1553×1200 reference. Outer window boxes are approximately[388,222..421,254/255] and[458,220..487,251], giving centre separation68px and mean outer width32px: separation/outer diameter approximately2.1. Inner circle widths are19px and17px, giving clear-circle/outer width approximately.56. Threshold100 partially disconnects one outer contour and is retained as weaker evidence, not averaged into the complete outlines. Exact component boxes/counts are archived in `review/2026-11-16/garden-reference/r09-source-port-components.json`.

The current model uses4m centre spacing and approximately1.11m outer diameter (ratio3.6), with approximately1m clear pane (ratio.90). Those model/source ratios conflict despite passing prior topology and UV tests. Reconcile the same-panel centre spacing and broad annular rim directly with the supplied image; final absolute size relative to the whole fore storey still needs the wider perspective audit. This is evidence of a required correction, not whole-ship scale closure.
