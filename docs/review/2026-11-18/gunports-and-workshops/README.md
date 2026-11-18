# Fore gunports and aft workshop floor

R09 shows a side cannon station in each of the four fore closets. The model now connects each retained barrel to an opening through the actual lining, hull and bow shield. The upper barrels sit 1.27 m aft of their previous positions, inside the same closets and clear of the stowed anchors. The steel sleeves follow the local skin and have a 0.176 m clear radius. The two upper stations and the sleeve dimensions are reconstructed from the actual hull.

Four low timber and enamelled steel covers enclose the two exposed pairs of above-floor hull-port fittings in aft B1. Each cover follows the nearby wall, floor and actual hardware. All fourteen existing external hull ports retain their deep reveals and ring geometry.

- 100 exported-mesh rays check clearance and sleeve contact across all four openings. The underlying metal sleeves are closed meshes.
- All four closets were reached through their normal doors with the walking controller and followed by an uninterrupted return to the lawn. [Closet journey](verification/closet-journey.json)
- The checkpoint preserves the geometry, materials, normals, UVs and poses of 8,046 other meshes. The collision changes are limited to the two relocated cannons and four new covers. [Preservation fixture](../../../../tests/fixtures/fore-gunport-delta.json)
- The 121 asset checks, exterior geometry, fore trim and 1:2.2 reference export checks passed. [Rendered views](final/) · [Applied asset hashes](verification/live-receipt.json)
