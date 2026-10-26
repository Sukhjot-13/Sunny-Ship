# Thousand Sunny — Interactive 3D Experience

**Long-term plan and Phase 1 build log.**

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` decision / caveat

---

## 1. Goals

Turn `stuff/1.FBX` (a 3D model of the Thousand Sunny) into a long-term,
browser-based interactive 3D experience that runs directly in the browser.

### Phase 1 (current) — success condition
Open the site → see a good-looking Thousand Sunny → click Explore → spawn on
the main deck → smoothly walk / run / jump around the deck **without falling
through it or walking through major objects**.

### Future phases (not built now, structure must allow them)
Detailed interiors · opening doors · interactive cannons · helm controls ·
animated sails · ocean & ship motion · rooms · day/night · weather · sounds ·
improved materials & textures · additional detailed geometry.

---

## 2. Confirmed decisions (agreed with Sukhjot)

| # | Decision | Choice | Note |
|---|----------|--------|------|
| 1 | Ship length | **39 m**, uniform scale, true model proportions | Model H/L is 0.98; the requested "56 m tall / 39 m long" is not reachable with a uniform scale. Proportions preserved, no distortion. |
| 2 | Player height | **1.75 m** realistic human, 1.62 m eye height | |
| 3 | Materials | **Procedural PBR in code** | 152 source materials are all pure black, with no textures and no vertex colours — nothing to preserve. Anime-accurate palette, procedural detail. |
| 4 | Ocean | **Stylised GLSL shader ocean** | Gerstner waves, sun specular, foam, fresnel sky. Ship and deck walking stay the priority. |
| 5 | Camera modes | Explore / Inspect (V), Fly mode, 1st/3rd person toggle | |

**Dimensions after the decision:** length 39 m · beam 23.7 m · height 38.4 m.

---

## 3. Rules for this project

- `stuff/` is **read-only**. Sukhjot drops source models/data there. Nothing
  built by me goes into it.
- The source `1.FBX` is **never modified**.
- Everything I create lives under `src/`, `public/`, `tools/`, `docs/`,
  `tests/`.
- Project docs live in `docs/`, never at the repo root.

---

## 4. Asset pipeline

`stuff/1.FBX` → `tools/build_assets.py` (Blender headless) → `public/models/`

```
stuff/1.FBX   (READ-ONLY source, FBX 7400 binary, 23 MB)
      │
      ▼
tools/build_assets.py
      ├── safe import (skips 1 malformed/degenerate mesh)
      ├── drop 102 junk objects (ground plane, sky dome, 100 stray props)
      ├── scale to 39 m length, centre on origin, bake transforms
      ├── assign placeholder materials + semantic tags (sunny_part)
      ├── raycast walkable surfaces → deck regions
      ├── build collision proxy (heightfield floors + hull + obstacle boxes)
      └── export
              │
              ▼
public/models/
      ├── sunny.glb             visual ship   (~7.4 MB)
      ├── sunny-collision.glb   collision     (~0.5 MB)
      └── ship-metadata.json    deck / spawn / layout for the app
```

Run with: `npm run assets`

---

## 5. Model audit findings (see `docs/model-audit.md` for detail)

- **Format:** FBX 7400 binary, 2019/2020 vintage, Z-up, authored in 3ds Max.
- **Import defect:** one Geometry node has loop indices but no polygon-end
  markers. Blender's importer crashes on it. Worked around at runtime; the
  source file is untouched.
- **Contents:** 365 mesh objects / 533,026 triangles total.
  - 2 scene-dressing objects (a 3180×2387 ground plane, a 1837-unit sky dome)
  - 100 stray `Arch41_032_*` props, 400,590 triangles, positioned 300–550
    units off the hull
  - **263 real ship objects, 131,954 triangles** — one connected cluster
- **Materials:** 152, all black (149 are exactly RGB 0,0,0). No textures, no
  vertex colours, no UVs on 44 meshes.
- **Animation:** 385 actions, all with **zero keyframes** — no usable animation.
- **Hierarchy:** flat, 197 root objects, no meaningful parenting.
- **Names:** generic 3ds Max defaults (`Box042`, `Circle038`,
  `Arch41_032_obj_102`, some CJK names) — not semantic.
- **Deck:** found by raycasting. Main deck at z ≈ −7.21 m after scaling,
  ~5.8 × 13.1 m, plus 9 smaller walkable regions (upper decks, cabins).

---

## 6. Phase 1 build checklist

### Foundation
- [x] Inspect the FBX (format, scale, hierarchy, materials, animation, UVs)
- [x] Scaffold Vite + React + R3F project outside `stuff/`
- [x] Install three, @react-three/fiber, @react-three/drei, @react-three/rapier, zustand
- [x] Blender asset pipeline: clean import → 39 m GLB + collision + metadata

### Rendering & visuals
- [x] Procedural PBR materials (anime-accurate palette)
- [x] Lighting: sun + fill + hemisphere, soft shadows
- [x] Sky / environment lighting + tone mapping (ACESFilmic)
- [x] Texture filtering (anisotropy), anti-aliasing
- [x] Camera settings (sensible FOV, near/far tuned for a 39 m ship)

### Ocean & wind
- [x] GLSL ocean: Gerstner waves, sun specular, fresnel, foam at the hull
- [x] Ship bobs/rocks with the waves
- [x] Wind system driving sail deformation

### Player
- [x] First-person controller: WASD, mouse look, Shift run, Space jump
- [x] Pointer lock on click; Esc releases
- [x] Gravity + ground detection
- [x] Collision against the proxy (no fall-through, no clipping masts)
- [x] Smooth acceleration/feel (not a floating camera)
- [x] Spawn standing on the main deck

### Cameras
- [x] Explore mode (first/third person walking)
- [x] Inspect mode (orbit the whole ship)
- [x] Fly mode (Blender-style free flight)
- [x] 1st / 3rd person toggle
- [x] Position preserved when returning from Inspect → Explore

### UI
- [x] Title screen: THOUSAND SUNNY / Click to Explore + control list
- [x] Subtle HUD once exploring
- [x] Mode indicators (Explore/Inspect, Walk/Fly, 1st/3rd)

### Verification & docs
- [x] `npm run build` passes
- [x] Player spawns on deck, cannot fall through
- [x] All modes functional
- [x] `docs/architecture.md` — file/function inventory + env vars
- [x] `docs/model-audit.md` — model findings + materials needing Blender work
- [x] Tests — single runner `npm test` (5 suites, 65 assertions)

---

## 7. Materials needing real Blender work later

The source has no texture data at all, so every surface is a code-generated
placeholder. These are the ones an artist should replace with proper textures:

| Material | Current placeholder | What it needs |
|----------|--------------------|---------------|
| Hull planking | procedural plank seams | Painted-wood texture, weathered edges, waterline staining |
| Deck planking | procedural plank rows | Worn deck timber, caulking, knots |
| Sails | procedural canvas + stripe | Canvas weave texture, patched panels, weathering |
| Gold fittings / lion | flat gold metal | Brushed gold, sculpted detail pass |
| Figurehead & carvings | tinted hull material | Sculpted normals, painted detail |
| Railings / cannon | coral painted hull | Iron/wood distinction, chipped paint |

Full list with per-node detail in `docs/model-audit.md`.

---

## 8. Risks & caveats

- The source model has **no textures and no usable animation**, so "improve the
  existing materials" means authoring new ones. Documented above.
- 44 meshes have **no UVs** — anything needing a UV-mapped texture later will
  need unwrapping in Blender first.
- The FBX is **flat and unparented**, so node names are generic; the pipeline
  tags them semantically via `sunny_part` custom properties instead.
- Collision is a **simplified proxy**, not the visual mesh, to keep
  performance good. Fine for deck walking; revisit for interiors.

---

## 9. Build log

- **Inspection** — FBX crashes Blender's importer; wrote a safe-import
  monkeypatch. Wrote a minimal FBX binary parser for raw structure. Found the
  junk geometry, black materials and zero-keyframe animations.
- **Live Blender** — connected to the open Blender instance over MCP and
  imported the ship so changes are visible in real time.
- **Correction** — an early "recentre" step used a bounding box that included
  the junk geometry and slid parts apart, which looked like detached ship
  parts. On a clean import all 263 ship parts form **one connected cluster**.
  Fixed; the ship was never broken.
- **Decisions** — confirmed 39 m length / 1.75 m player / procedural PBR /
  stylised ocean.
- **Pipeline** — now producing a clean 39 m ship GLB, a collision proxy, and
  metadata. Fixed a bug where obstacle colliders were never generated.- **Physics** — replaced a naive capsule sweep with axis-separated resolution so
  the player slides along walls instead of sticking. Fixed three feel bugs:
  contact epsilon made the player collide with the floor it was standing on,
  step-up reset horizontal movement every frame, and the void guard captured
  the post-move position so falling never triggered a respawn.
- **Deck** — `Line002` was being classified as rigging; it is actually the main
  deck. Reclassified by shape and size.
- **Materials** — the hull and deck are each merged into a few very large
  meshes, so a single material now blends hull and deck per fragment using
  world normal and the waterline. Warm planking, cream-green hull.
- **Asset pipeline correctness** — three real bugs found and fixed while
  writing `tests/assets.test.mjs`:
  1. The bbox was measured before a depsgraph update, so the centre was stale
     by ~50 units and the ship was never actually centred. Scaling and
     centring are now two separate passes.
  2. `bpy.data.objects.remove()` on an FBX parent Empty silently drops that
     parent's contribution from every child's `matrix_world`. World matrices
     are now captured before the Empties are deleted and restored after.
  3. Re-parenting to a fresh root Empty dropped the old parent chain, so world
     transforms are captured and restored around that too.
  Also removed `src/systems/sails.jsx`, an unreferenced duplicate of
  `src/systems/sails.js`.
- **Verification** — added `tests/assets.test.mjs` and a single runner
  (`npm test`) that starts the dev server if needed and runs all five suites.
  Two of my own harness bugs are worth recording because they produced very
  convincing nonsense: `THREE.Vector3` has no numeric index properties, so
  `v[0]` is `undefined` and `Math.min(Infinity, undefined)` is `NaN`; and
  comparing quaternions/scales across the Blender↔glTF axis change by
  permuting components is wrong, because it is a frame conjugation. Blender's
  evaluated bbox and three.js's own `Box3` were used as ground truth instead.
- **Phase 1 complete** — `npm test` is green: 24 asset + 11 physics + 30
  gameplay assertions, plus deck reachability and screenshot capture, at 60 fps.
- **Session fixes (user-reported)** —
  - *Stuck on "Click to Orbit"*: Inspect mode showed a full-screen overlay that
    swallowed pointer events, and Inspect never requests pointer lock, so nothing
    could ever dismiss it and OrbitControls could not orbit. Inspect now shows a
    passive hint; `tests/interaction.mjs` locks the behaviour in.
  - *Ship broken / parts floating*: 28 linked objects were exported with their
    original pre-transform by the glTF exporter, putting the lion figurehead and
    bow ornament 60 m from the hull. Fixed by rebuilding them as fresh objects with
    world-space geometry. All 263 objects now export in place, and the GLB's own
    bounds match Blender's measured hull exactly.
  - *Colours*: repainted to the reference scheme — crimson hull with white trim,
    tan timber decks and lower hull, white painted trim, darker masts, warm canvas.
  - *Falling into the sea*: the fall guard only fired near the waterline, 7 m below
    the deck. Added a ledge guard that returns the player to the deck after a 1.6 m
    drop with nothing to land on.
  - *Still open*: only ~24% of walkable deck cells are reachable because the deck
    levels are not joined by stair colliders. `STEP_HEIGHT` was raised 0.55 → 0.8,
    which made almost no difference, so the blocker is connectivity, not step size.
