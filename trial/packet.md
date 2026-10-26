# Neutral common audit packet — isolated model trial

Repair ONLY your assigned finding. This packet is the same for both participants. General ship work is stopped; isolated candidates will not be merged automatically. No prior prototype/helper/repair algorithm is provided. Do not inspect the original project, other participant, excluded historical docs/chats, or Git paths outside normal candidate Git operations. Read-only shared node_modules is the sole dependency exception; no installs/shared dependency mutation.

## Original audit findings

| ID | Reference expectation | Original factual observation | Required outcome |
|---|---|---|---|
| **C01 / P1** | Fore F1/F2 cabins, closets and B1 storage. R06/R07/R09/R16/R17 show continuous usable room interiors, without exterior red hull ornament inside. | Large red/white exterior fragments cross cream/timber room walls and ceiling/floor edges. [Women's room](review/whole-ship-audit-room-womens.png), [storage](review/whole-ship-audit-room-storage.png), [women's cannon](review/whole-ship-audit-cannon-women-starboard.png), B(mens). Exterior source trim family including `Circle038.001` is present at these stations; the mesh inventory preserves bounds. A/S. | Reconcile exterior ornament and interior shell ownership/cuts. Do not hide it with paint or shrink the player. Breaks enclosure and reference room silhouette. |
| **C02 / P1** | Both external Dock mouths. R14 p193 shows an open rolling shutter exposing a water-bearing internal launch channel. | After real channel-2 selection and full shutter opening (`shutter=1`), the [port aperture](review/whole-ship-audit-verified-dock-open-port.png) exposes timber lining. Exact center rays hit `Sunny_InteriorWall_B1_73_seg0` on port and `Sunny_InteriorWall_B1_199_seg0` on starboard. See `dockApertures` in [static evidence](review/whole-ship-audit-static.json). Port opening seen live; starboard obstruction confirmed statically, not with a second live open photo. A/S/F. | Cut/rebuild both actual launch paths through all lining layers and connect them to the selected bay. An animated shutter currently suggests access that the underlying construction does not provide. |

## Coordinates, source and constraints

Bow is negative Blender X, stern positive X, starboard positive Blender Y, port negative Blender Y. Exported Three frame is [X,Z,-Y]. The intentional2.2 ship enlargement,1.7m ordinary eye/body, ordinary speeds, original FBX, useful supported source geometry, source color/artwork, exterior/water and partial current interior finishes, Cannon/X panel and legacy controls must be preserved. Do not hide surfaces, paint over defects, weaken assertions/tolerances, shrink the player or substitute labels for construction. Current interior finish/light code is not fully verified; historical exterior19/19 is not current baseline certification.

`tools/build_assets.py` is the existing coherent visual/collision/metadata/editable-master pipeline. Blender executable: `/Applications/Blender.app/Contents/MacOS/Blender`. Original FBX: `stuff/1.FBX`; required assets: `public/models/{sunny.glb,sunny-collision.glb,ship-metadata.json}`, `assets/sunny-master.blend`. All25 supplied reference images are under `stuff/images/`. Personally inspect relevant references and actual before/after renders. Read the existing production source afresh and choose your own repair.

Both candidates start from the same Git baseline. A common disclosed harness changes ONLY preview/test base URLs and Vite cache location to isolate ports/shared dependencies. Use your assigned SUNNY_PORT and SUNNY_BASE_URL (and URL for legacy tests). Vite is strict-port; confirm HTTP model hashes against your own disk before browser proof. Full `npm test` retains all20 suites; no test weakening. Browser/render/Blender/full-test commands MUST use the shared heavy-resource wrapper `node trial/resource.mjs <label> -- <command> <args...>`. Lightweight source analysis/unit checks and separate Vite servers may run concurrently. Queue time is recorded separately; no score penalty for waiting. Never stop another participant's work or unrelated processes.

## Acceptance/reporting (common)

Implement a genuine repair across all targets in your own worktree; rebuild required assets coherently there; inspect matched before/after/references; prove actual visual/physical correspondence and applicable continuous ordinary access/returns/controls. Run meaningful independent geometry/collision checks, existing appropriate full suite and production build where feasible. Add regression coverage for the defect without weakening old tests. Current canonical era bed/Dock4–6 ambiguity must not be silently redesigned. C02 is aperture/lining, not full C03 Dock reconstruction; report real dependency/remaining scope. C01 covers men's/women's cabins, all four cannon closets and forward store; no unrelated furnishing redesign.

Document modified files/all functions in your local `docs/architecture.md`, maintain Environment Variables section, date suggestions, fresh-scan changes. Save commands/logs/results/current screenshots under `trial/results/`, include exact relevant screenshot paths in `trial/results/report.md`, list changed asset hashes and known failures/limits, commit your candidate locally if possible (configured identity only; no remote). Commit/diff is separate from independent coordinator acceptance. Do not claim all ship construction complete. Record task start, heavy-job execution/queue time, known model/reasoning settings and usage only if exposed. Do not self-assign numeric benchmark percentages. Final report distinguishes resolved/partial/unverified and reports actual tests.

## 2. Reference register — all 25 images personally inspected

All filenames below are exact local names in `stuff/images/`. These images are the authority for comparisons in this report. No remembered wiki assertion is substituted for a supplied image. The local `Mini_Merry_II.html` is supplementary saved context, not a 26th image.

| ID | Exact filename | What it establishes |
|---|---|---|
| R01 | `Thousand_Sunny_Infobox.webp` | Anime exterior colors, hull ornaments, lion profile, roofs, furled sails and rigging. |
| R02 | `Thousand_Sunny_Digitally_Colored_Manga.webp` | Colored exterior profile/ornament, spherical lion impression, timber hull, stern barrel and roof details. |
| R03 | `Thousand_Sunny_pg.26.webp` | SBS p26 introduction and deployed-sail overall view. |
| R04 | `Thousand_Sunny_pg.46.webp` | F3 plan: helm/lawn/foremast, port swing, starboard slide, garden/branch-office/observation relationships. |
| R05 | `Thousand_Sunny_pg.66.webp` | F2 plan: fore women's cabin; port dining, starboard Kitchen; infirmary/pantry behind; stern ladder structure. |
| R06 | `Thousand_Sunny_pg.86.webp` | F1 plan: fore men's cabin, aft surrounding Aquarium, rear passage/Energy connection. |
| R07 | `Thousand_Sunny_pg.126.webp` | B1 plan: fore stores, radial Dock, Franky on port/Usopp on starboard, stern access. |
| R08 | `Thousand_Sunny%27s_Figurehead%2C_Helm%2C_and_Anchors.webp` | SBS p146: face/Gaon/mane, anchor rope storage, integrated channel dial/knob/lever. |
| R09 | `Thousand_Sunny%27s_Men_and_Woman_Quarters.webp` | SBS pp186–187: suspended wooden bunks, low sunken-table seating, six lockers, weapon display/posters; women's beds/vanity/wardrobe/seating; entrance wash fittings; fore toilets. |
| R10 | `Thousand_Sunny%27s_Kitchen%2C_Dining_Room%2C_and_Sick_Bay.webp` | SBS pp188–189: open Kitchen/bar/Dining relationship, mast food lift, giant oven, locked fridge, pantry and clinic. |
| R11 | `Thousand_Sunny%27s_Aquarium_Bar.webp` | SBS pp190–191: curved surrounding tank, drapery, seating/table at mast, wine storage, overhead rear tank, balcony doors and Energy route. |
| R12 | `Thousand_Sunny%27s_Library%2C_Workrooms%2C_and_Bathhouse.webp` | SBS pp194–195: alternating Library windows/books, curved rotating bench, survey desk, bath/entry/WC; detailed workshops and gym fixtures. |
| R13 | `Thousand_Sunny%27s_Crow%27s_Nest_and_Survey_Room.webp` | SBS pp196–197: rope-to-ladder access, rear loudspeaker, hatch types, stern observation/garden connections, gaff movement. |
| R14 | `Thousand_Sunny_pg.192-193.webp` | Dock rotation, enclosed launch channels/water/rolling shutters, waiting room/capstan, three-barrel Energy chamber; channels 0–3 vehicles. |
| R15 | `Usopp%27s_Garden_of_Pop_Greens.webp` | Later garden arrangement, flower bed, mikan trees and Usopp's planting/branch-office relationship. |
| R16 | `Thousand_sunny_boys_room.webp` | Anime bunks, blue low cushions/rug, lockers, crossed axe/sword, timber interior and warm lamps. |
| R17 | `Thousand_sunny_girls_room.webp` | Anime paired beds, ornate vanity, four-door wardrobe, two rounded red seats/small table, clock/pictures/rug. |
| R18 | `Thousand_sunny_kitchen.webp` | Anime open bar/arched ceiling, mast location, table/chairs, long green wall bench, oven/rack/hood. |
| R19 | `Thousand_sunny_sick_bay.webp` | Anime clinic bed/desk/swivel chair/board/cabinet composition, arched porthole door, gray floor tiles. |
| R20 | `Thousand_sunny_aquarium_bar.webp` | Anime wraparound burgundy seating, central circular mast table/chairs, rich drapery, tank life and light. |
| R21 | `Thousand_sunny_library.webp` | Anime alternating full-height books/windows, curved green seating, octagonal table/shell chairs, sloped aft survey desk, ladder. |
| R22 | `Thousand_sunny_bathroom.webp` | Anime bath/wood entrance/lattice partition, curved striped wall, oval floor motifs, bath fixtures/WC entry. |
| R23 | `Thousand_sunny_usopp_factory.webp` | Anime timber workshop, cloth sign, patterned padded work surface, drafting board, varied junk/tool containers. |
| R24 | `Sunnyworkroom.webp` | Anime Franky metal walls/floor/rivets, angled drawing desk, drawers, furnace, tools and large varied scrap bin. |
| R25 | `Thousand_sunny_crows_nest.webp` | Anime telescope, low perimeter bench, weights/locker, bars, towel and circular hatch. |

