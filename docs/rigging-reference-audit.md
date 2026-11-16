# Fore shroud source audit — November 16, 2026

R09 frontal fore-facade drawing places the ratline fans outside the cabin/scroll edges. R01 anime exterior and R13 whole-ship overview show their lower fan width running along the ship side. Current `fore_shrouds` puts all six lower points at exactly `mx+1.65` in Blender X and varies Blender Y from `my+side*3.6` to `my+side*8.35`. This makes two transverse curtains directly in front of the cabin doors; actual current `fore-facade.png` shows the obstruction. Passing deck-contact tests did not verify this source-plane interpretation.

Next: compare front/side projections to the supplied images, then fit both lower fans along the actual outboard deck strips (vary longitudinal X, keep each side’s Y near its real deck edge). Retain/freshly fit all upper ends to the actual mast skin, real ratlines, measured floor contact and the lookout rope/ladder path. Proposed metre stations remain reconstruction, not source dimensions. Both source front and broadside views, attachment rays and normal access must verify the correction. Do not simply hide the grids or move unsupported feet into empty space.

The separate lowered/gathered sail state is supported by R01. Keep all imported unlabelled rigging under review; metadata labels and old accepted tests alone do not establish canonical paths.
