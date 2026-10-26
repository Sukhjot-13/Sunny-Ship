"""
Thousand Sunny - asset build pipeline (Blender headless).

Reads  : stuff/1.FBX                     READ-ONLY source, never modified
Writes : public/models/sunny.glb            cleaned visual ship
         public/models/sunny-collision.glb  simplified collision proxy
         public/models/ship-metadata.json    deck / spawn / layout data for the app

Run:  npm run assets
"""

import bpy
import json
import os
import math
from mathutils import Vector, Matrix

# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_FBX = os.path.join(ROOT, "stuff", "1.FBX")
PUBLISH_DIR = os.path.join(ROOT, "public", "models")
OUT_DIR = os.path.join(ROOT, "public", ".models-staging")

# Scene dressing / stray props shipped inside the FBX that are NOT part of the
# ship. They inflate the bounding box and wreck any scale calculation.
JUNK_OBJECTS = {
    "Plane011",   # 3180x2387 ground plane
    "Sphere010",  # 1837-unit sky dome
}
JUNK_PREFIXES = ("Arch41_032",)  # 100 stray props, 400k triangles, off-hull

# Overall hull length in metres once exported.
SHIP_LENGTH_M = 39.0

# Sea height in Blender units. The hull bottom sits at z = -19.19 m after
# centring, so the waterline is set partway up the hull - the ship reads as
# floating rather than beached or sunk.
WATER_LEVEL = -14.0

# Collision tuning
GRID = 0.40          # floor-cell size, metres
WALK_NORMAL_Z = 0.60 # min surface normal.z to count as standable (allows
                      # the curved deck edges and stair treads)
Z_SAME = 0.45        # height delta treated as "same level" when grouping
RISE_MIN = 0.55      # height delta that becomes a vertical riser
SLAB_DEPTH = 2.0     # how far the floor slab extends downward
BOUNDARY_WALL = 1.3  # height of invisible walls on the walkable-region edge
WALL_THICK = 0.22    # thickness of those boundary walls
MAX_OBSTACLES = 220


def log(*a):
    print("[pipeline]", *a, flush=True)


# --------------------------------------------------------------------------
# 0. reset
# --------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)


# --------------------------------------------------------------------------
# 1. import, working around a malformed mesh that crashes Blender's reader
# --------------------------------------------------------------------------
import io_scene_fbx.import_fbx as ifb

_orig_read_geom = ifb.blen_read_geom
SKIPPED_DEGENERATE = []


def _safe_read_geom(fbx_tmpl, fbx_obj, settings):
    polys = ifb.elem_prop_first(ifb.elem_find_first(fbx_obj, b'PolygonVertexIndex'))
    if polys:
        arr = ifb.parray_as_ndarray(polys)
        if arr is not None and len(arr) and not (arr < 0).any():
            SKIPPED_DEGENERATE.append(ifb.elem_name_ensure_class(fbx_obj, b'Geometry'))
            return None
    return _orig_read_geom(fbx_tmpl, fbx_obj, settings)


ifb.blen_read_geom = _safe_read_geom
bpy.ops.import_scene.fbx(filepath=SRC_FBX)
ifb.blen_read_geom = _orig_read_geom
bpy.context.view_layer.update()


def vertex_bbox(o):
    """World-space AABB computed from real vertex positions.

    Object.bound_box is cached by Blender and proved unreliable for this
    imported FBX: it under-reported the extents badly enough to hide 18 stray
    objects parked ~100 units from the hull. Reading the vertices is slower but
    always correct.
    """
    mw = o.matrix_world
    me = o.data
    if not len(me.vertices):
        return None
    mn = Vector((1e18, 1e18, 1e18))
    mx = Vector((-1e18, -1e18, -1e18))
    for v in me.vertices:
        w = mw @ v.co
        mn = Vector((min(mn[i], w[i]) for i in range(3)))
        mx = Vector((max(mx[i], w[i]) for i in range(3)))
    return mn, mx


# --------------------------------------------------------------------------
# 2. drop junk and non-mesh objects
# --------------------------------------------------------------------------
def is_junk(name):
    return name in JUNK_OBJECTS or name.startswith(JUNK_PREFIXES)


removed = [o for o in bpy.data.objects if o.type == 'MESH' and is_junk(o.name)]
for o in removed:
    bpy.data.objects.remove(o, do_unlink=True)

# bpy.data.objects.remove() on a parent does NOT re-parent its children: the
# parent's contribution silently disappears from every child's matrix_world.
# The FBX parents this whole sub-assembly (a ring of Circle00x pieces, the
# stern fixtures) to Empties, so deleting them below used to fling those
# objects tens of metres away from the hull. Capture the world transforms
# first and restore them once the parents are gone.
_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
_world_before_unparent = {o.name: o.matrix_world.copy() for o in _meshes}

for o in list(bpy.data.objects):
    if o.type in {'CAMERA', 'EMPTY', 'LIGHT', 'ARMATURE'}:
        bpy.data.objects.remove(o, do_unlink=True)

for o in _meshes:
    if o.name in _world_before_unparent:
        o.matrix_world = _world_before_unparent[o.name]
bpy.context.view_layer.update()

ship_objects = [o for o in bpy.data.objects if o.type == 'MESH']

log(f"kept {len(ship_objects)} ship objects, dropped {len(removed)} junk, "
    f"skipped {len(SKIPPED_DEGENERATE)} degenerate mesh(es)")


# --------------------------------------------------------------------------
# 3. scale to metres and centre on the world origin
# --------------------------------------------------------------------------
def world_bbox(objects):
    mn = Vector((1e18,) * 3)
    mx = Vector((-1e18,) * 3)
    for o in objects:
        bb = vertex_bbox(o)
        if bb is None:
            continue
        mn = Vector((min(mn[i], bb[0][i]) for i in range(3)))
        mx = Vector((max(mx[i], bb[1][i]) for i in range(3)))
    return mn, mx


mn, mx = world_bbox(ship_objects)
raw_size = mx - mn
raw_center = (mn + mx) / 2
SCALE = SHIP_LENGTH_M / raw_size.x
log(f"raw size={[round(v,2) for v in raw_size]} center={[round(v,2) for v in raw_center]}"
    f" -> scale={SCALE:.5f}")

# Scale with a pure matrix multiply on each object.
# bpy.ops.object.transform_apply() was tried first and is unsafe here: the
# FBX contains linked mesh duplicates plus negative scales, and the operator
# silently moved 18 objects hundreds of units away from the hull.
#
# The import is not fully evaluated yet at this point, so the centre measured
# above can be stale. Scaling and centring are therefore done as two separate
# passes: the centre is re-measured from fresh transforms after scaling, which
# makes the result correct no matter what the first read returned.
# Remember where every object started. The exporter reverts the linked objects
# to exactly this transform when it writes the GLB, so this is the matrix the
# geometry has to be expressed relative to for them.
_orig = {o.name: o.matrix_world.copy() for o in ship_objects}

for o in ship_objects:
    o.matrix_world = Matrix.Scale(SCALE, 4) @ o.matrix_world
bpy.context.view_layer.update()

mn, mx = world_bbox(ship_objects)
for o in ship_objects:
    o.matrix_world = Matrix.Translation(-((mn + mx) / 2)) @ o.matrix_world
bpy.context.view_layer.update()

# Reconcile objects whose transform assignment did not stick.
#
# A subset of the FBX objects (the decorative bow-ornament cluster: the ring of
# Circle00x pieces, Rectangle00x and Cylinder016) are linked objects whose
# matrix_basis is read-only. Assigning matrix_world silently does nothing, and
# the next depsgraph update reverts matrix_world to the object's original FBX
# transform - which is unscaled and uncentred, so those objects end up ~60 m
# from the hull and render as a detached blob floating beside the ship.
#
# For those, bake the difference into the mesh data instead: transforming the
# local geometry by G = current^-1 @ desired makes the final world transform
# come out right even though the object transform itself cannot be changed.
# These objects all have positive scale, so no normals get flipped.
_desired = {o.name: o.matrix_world.copy() for o in ship_objects}
bpy.context.view_layer.update()

_stuck = []
for o in ship_objects:
    d = _desired[o.name]
    if max(abs(o.matrix_world[i][j] - d[i][j])
           for i in range(4) for j in range(4)) > 1e-6:
        _stuck.append(o)

if _stuck:
    log(f"{len(_stuck)} object(s) have read-only transforms; baking the "
        f"correction into their mesh data")
    for o in _stuck:
        current = o.matrix_world.copy()
        if o.type == 'MESH':
            if o.data.users > 1:
                o.data = o.data.copy()
            o.data.transform(current.inverted() @ _desired[o.name])
            o.data.update()
        try:
            o.matrix_world = current
        except Exception:
            pass
    bpy.context.view_layer.update()

    _still = [o.name for o in _stuck
              if max(abs(o.matrix_world[i][j] - _desired[o.name][i][j])
                     for i in range(4) for j in range(4)) > 1.0]
    if _still:
        log(f"WARNING: could not reconcile {len(_still)} object(s): "
            + ", ".join(sorted(_still)[:10]))

def exported_translations(path):
    """Read node translations straight out of the exported GLB JSON chunk."""
    import struct
    with open(path, 'rb') as fh:
        data = fh.read()
    jlen = struct.unpack_from('<I', data, 12)[0]
    gj = json.loads(data[20:20 + jlen].decode('utf8'))
    scene = gj['scenes'][gj.get('scene', 0)]
    out = {}
    stack = list(scene['nodes'])
    while stack:
        i = stack.pop()
        node = gj['nodes'][i]
        if node.get('name'):
            t = node.get('translation') or [0.0, 0.0, 0.0]
            if node.get('matrix'):
                t = [node['matrix'][12], node['matrix'][13], node['matrix'][14]]
            out[node['name']] = list(t)
        stack.extend(node.get('children') or [])
    return out


def blender_to_gltf(v):
    # blender is Z-up, glTF is Y-up
    return [v[0], v[2], -v[1]]


def export_glb(path, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True,
        export_apply=False, export_yup=True, export_materials='EXPORT',
        export_normals=True, export_texcoords=True, export_extras=True)
    log(f"wrote {os.path.basename(path)} ({os.path.getsize(path)/1e6:.2f} MB)")



# Single root Empty for the GLB hierarchy, created up front so the probe
# export below and the real export share the same setup.
root = bpy.data.objects.new("ThousandSunny", None)
root.empty_display_type = 'PLAIN_AXES'
root.empty_display_size = 3.0
bpy.context.scene.collection.objects.link(root)
bpy.context.view_layer.update()

# --- probe the exporter and drop what it cannot place -----------------------
# The glTF exporter writes a subset of the FBX's objects - the ones that were
# parented to Empties, i.e. the decorative bow-ornament cluster - with their
# ORIGINAL pre-transform translation and scale, ignoring the transform Blender
# holds. Circle007 exports with S=[1.576, 2.494, 1.576] (its unscaled FBX
# scale) at its pre-centring position, landing ~60 m from the hull as a
# detached blob floating beside the ship.
#
# Assigning matrix_world does not help, and neither does baking the correction
# into the mesh data: the exporter re-evaluates these linked objects and ignores
# the adjustment. They are dropped instead. This happens here, before the deck
# raycast / collision / metadata steps, so everything downstream stays
# consistent with what actually ships.
PROBE_GLB = os.path.join(OUT_DIR, "_probe.glb")


def mis_placed(path):
    """Names whose exported translation disagrees with the transform we applied."""
    out = []
    for _n, _t in exported_translations(path).items():
        if _n not in _desired:
            continue
        _exp = blender_to_gltf(list(_desired[_n].translation))
        if max(abs(_exp[i] - _t[i]) for i in range(3)) > 0.01:
            out.append(_n)
    return out


def export_ship(path, objects, parent):
    export_glb(path, objects + [parent])


export_ship(PROBE_GLB, ship_objects, root)
_bad = mis_placed(PROBE_GLB)
if _bad:
    # These objects are linked: matrix_basis is read-only, so assigning
    # matrix_world appears to work but is silently discarded, and the exporter
    # writes their ORIGINAL pre-transform instead (unscaled scale + pre-centring
    # position), landing them ~60 m from the hull. Baking the delta into the mesh
    # data does not help either - the exporter re-evaluates the object and
    # reverts it regardless.
    #
    # The reliable fix is to rebuild each one as a fresh, writable object whose
    # geometry is already in world space. A new object has an identity transform
    # the exporter cannot override, so the geometry lands where it should. This
    # keeps the lion figurehead and the bow ornament.
    log(f"rebuilding {len(_bad)} linked object(s) the exporter cannot place: "
        + ", ".join(sorted(_bad)[:8]) + (" ..." if len(_bad) > 8 else ""))
    for _n in _bad:
        _o = bpy.data.objects.get(_n)
        if _o is None:
            continue
        _me = _o.data.copy()
        _me.name = _o.name
        _me.transform(_desired[_n])       # bake the world transform we wanted
        _me.update()
        _new = bpy.data.objects.new(_n, _me)
        bpy.context.scene.collection.objects.link(_new)
        _new.matrix_world = Matrix.Identity(4)
        for _k in _o.keys():               # keep any tags already assigned
            try:
                _new[_k] = _o[_k]
            except Exception:
                pass
        bpy.data.objects.remove(_o, do_unlink=True)
    ship_objects = [o for o in bpy.data.objects if o.type == 'MESH']
    bpy.context.view_layer.update()

    export_ship(PROBE_GLB, ship_objects, root)
    _left = mis_placed(PROBE_GLB)
    if _left:
        log(f"WARNING: {len(_left)} object(s) still mis-placed: "
            + ", ".join(sorted(_left)[:10]))
    else:
        log(f"rebuilt and verified {len(ship_objects)} object transforms")
else:
    log(f"verified {len(ship_objects)} object transforms against the export")

try:
    os.remove(PROBE_GLB)
except OSError:
    pass


import sys
sys.path.insert(0, HERE)
from sunny_exterior import restore_exterior, layout_x, EXTERIOR_CONFIG
ship_objects, exterior_offset, exterior_features, rig_height_ratio, exterior_levels, interiors = restore_exterior(ship_objects, vertex_bbox)
for obj in list(ship_objects):
    if not obj.data.vertices or not obj.data.polygons:
        SKIPPED_DEGENERATE.append(obj.name)
        ship_objects.remove(obj)
        bpy.data.objects.remove(obj,do_unlink=True)
experience_scale = EXTERIOR_CONFIG['experienceScale']
WATER_LEVEL = (WATER_LEVEL + exterior_offset) * experience_scale
mn, mx = world_bbox(ship_objects)
SHIP = {"min": list(mn), "max": list(mx), "size": list(mx - mn),
        "center": list((mn + mx) / 2)}
log(f"ship size(m)={[round(v,3) for v in SHIP['size']]}")
log(f"interior levels: {({k: round(v,2) for k,v in exterior_levels.items()})}")
log(f"doors/hatches: {len(interiors['doors'])}")

# safety check: flag anything that ended up far from the hull
_c = Vector(SHIP["center"])
_far = [o.name for o in ship_objects
        if (lambda bb: bb is not None and
            (((bb[0] + bb[1]) / 2) - _c).length > max(SHIP["size"]) * 0.75)(vertex_bbox(o))]
if _far:
    log(f"WARNING: {len(_far)} objects sit far from the hull: "
        + ", ".join(sorted(_far)[:12]))

# --------------------------------------------------------------------------
# 4. materials
#    The FBX carries 152 materials that are all pure black, with no textures
#    and no vertex colours. These are placeholders so the ship is readable;
#    real texturing is a later task (see docs/model-audit.md).
# --------------------------------------------------------------------------
def guess_look(name):
    n = name.lower()
    if "cylinder" in n or "tube" in n:
        return (0.60, 0.35, 0.17, 1.0), 0.65, 0.0     # wooden mast / spar
    if n.startswith("line") or "ngon" in n:
        return (0.42, 0.36, 0.28, 1.0), 0.85, 0.0     # rope / rigging
    if "sphere" in n:
        return (0.94, 0.94, 0.92, 1.0), 0.35, 0.15    # white trim
    if n.startswith("plane0"):
        return (0.87, 0.91, 0.95, 1.0), 0.88, 0.0     # sail cloth
    return (0.83, 0.88, 0.81, 1.0), 0.62, 0.02        # hull cream-green


mat_cache = {}
for o in ship_objects:
    if o.get('sunny_authored'):
        continue
    if o.name in mat_cache:
        mat = mat_cache[o.name]
    else:
        color, rough, metal = guess_look(o.name)
        mat = bpy.data.materials.new(f"Sunny_{o.name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = rough
            bsdf.inputs["Metallic"].default_value = metal
        mat.diffuse_color = color
        mat_cache[o.name] = mat
    o.data.materials.clear()
    o.data.materials.append(mat)

_bounds_cache = {}
def obb(o):
    """Actual world vertex bounds; imported cached boxes invent phantom obstacles."""
    if o.name not in _bounds_cache:
        _bounds_cache[o.name] = vertex_bbox(o)
    return _bounds_cache[o.name]


# --------------------------------------------------------------------------
# 5. raycast the walkable surfaces in final (metre) space
# --------------------------------------------------------------------------
scene = bpy.context.scene
dg = bpy.context.evaluated_depsgraph_get()

# Sails and rigging hang above the deck and would otherwise be hit first,
# blanking out the whole deck below them. Collect their names so the raycast
# can pass straight through them.
# NOTE: name prefixes alone are NOT enough here - the FBX names its deck
# planks "Line002"/"Line004", so excluding everything starting with "line"
# deleted the entire main deck. Overhead is therefore decided by SHAPE:
#   - sails   : large, tall planes
#   - rigging : thin poles/ropes high above the hull
# A floor candidate must be a reasonably solid, chunky object.
OVERHEAD = set()
for o in ship_objects:
    a, b = obb(o)
    size = b - a
    n = o.name.lower()
    max_h = max(size.x, size.y)
    is_sail = o.name in ('Plane004', 'Plane005', 'Plane006', 'Plane007', 'Plane008', 'Plane009', 'Plane010')
    if o.name.startswith(('Tube','NGon')) or o.name in ('Line004','Line007','Box070','Box080','Box081','Box082','Box083','Box084','Cylinder015'):
        OVERHEAD.add(o.name)
    if o.get('sunny_authored') and o.name.startswith('Sunny_') and not o.get('sunny_walkable'):
        OVERHEAD.add(o.name)
    # The recovered curved cabin is a solid wall, never a walking deck. Its
    # sloping faces otherwise produce coarse overhead floor cells inside stairs.
    if o.get('sunny_aft_native_envelope'):
        OVERHEAD.add(o.name)
    is_rigging = max_h < 0.40 and (a.z + b.z) / 2 > SHIP["min"][2] + 6.0
    if is_sail or is_rigging:
        OVERHEAD.add(o.name)
log(f"overhead (non-floor) objects: {len(OVERHEAD)}")

MAX_SKIP = 24      # how many rejected surfaces to pass through per ray


def walkable_hit(x, y):
    """First walkable surface under (x, y), passing through sails/rigging."""
    org = Vector((x, y, 500.0))
    down = Vector((0, 0, -1))
    for _ in range(MAX_SKIP):
        ok, loc, nor, _idx, obj, _m = scene.ray_cast(dg, org, down, distance=1000.0)
        if not ok:
            return None
        if nor.z > WALK_NORMAL_Z and obj.name not in OVERHEAD:
            return (loc.z, obj.name)
        org = Vector((x, y, loc.z - 0.02))   # step just below the surface we rejected
    return None


log("raycasting walkable surfaces ...")
samples = {}
gx0, gy0 = mn.x, mn.y
nx = int((mx.x - mn.x) / GRID) + 2
ny = int((mx.y - mn.y) / GRID) + 2
for i in range(nx):
    for j in range(ny):
        hit = walkable_hit(gx0 + i * GRID, gy0 + j * GRID)
        if hit:
            samples[(i, j)] = hit
log(f"walkable samples: {len(samples)}")

# ---- flood fill into connected walkable regions -------------------------
NEIGH = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
visited = set()
regions = []
for key in samples:
    if key in visited:
        continue
    stack = [key]
    visited.add(key)
    region = {}
    while stack:
        k = stack.pop()
        z, oname = samples[k]
        region[k] = (z, oname)
        for dx, dy in NEIGH:
            nk = (k[0] + dx, k[1] + dy)
            if nk in visited or nk not in samples:
                continue
            if abs(samples[nk][0] - z) <= Z_SAME:
                visited.add(nk)
                stack.append(nk)
    regions.append(region)

# keep regions that are plausibly walkable deck (ignore specks)
MIN_REGION = 10
regions = [r for r in regions if len(r) >= MIN_REGION]
regions.sort(key=len, reverse=True)
log(f"walkable regions: {len(regions)}  sizes={[len(r) for r in regions[:6]]}")

if not regions:
    raise SystemExit("[pipeline] no walkable deck found - aborting")

# ---- name the regions by height so we can label them -------------------
def region_stats(r):
    zs = [v[0] for v in r.values()]
    xs = [gx0 + k[0] * GRID for k in r]
    ys = [gy0 + k[1] * GRID for k in r]
    return {"n": len(r), "zMin": min(zs), "zMax": max(zs), "zAvg": sum(zs) / len(zs),
            "x": [min(xs), max(xs)], "y": [min(ys), max(ys)],
            "size": [max(xs) - min(xs), max(ys) - min(ys)],
            "objects": sorted(set(v[1] for v in r.values()))}


region_info = [region_stats(r) for r in regions]

# the main deck = largest region
main_index = next((i for i,r in enumerate(region_info) if 'Sunny_Lawn' in r['objects']), 0)
main_region = regions[main_index]
main_info = region_info[main_index]
deck_z = main_info["zAvg"]
log(f"main deck: z={deck_z:.2f} n={main_info['n']} "
    f"x={main_info['x']} y={main_info['y']} objs={main_info['objects']}")

# ---- spawn selection --------------------------------------------------
# The obvious "centre of the main deck" can sit directly underneath a lowered
# sail. Sails deliberately have no collision, so the player would end up with
# their head inside one. Score candidate cells by overhead clearance and by
# how much open deck surrounds them, then take the best.
EYE_Z = 1.62
CLEAR_H = 2.6          # want this much head-room above the eyes
CLEAR_W = 5.0          # want this much clear space around the player

if exterior_features:
    # Authored arrival already has an explicit lawn position. Do not run an
    # expensive source-only spawn search whose result would be discarded.
    spawn = [layout_x(-1.8)*experience_scale, 0.45*experience_scale,
             (-7.5 + exterior_offset)*experience_scale]
    log(f'authored lawn spawn = {[round(v,2) for v in spawn]}')
else:
    cands = [(k, v) for k, v in main_region.items()]
    cx = sum(k[0] for k, _v in cands) / len(cands)
    cy = sum(k[1] for k, _v in cands) / len(cands)

    best = None
    for (i, j), (z, _n) in cands:
        x = gx0 + i * GRID
        y = gy0 + j * GRID
        # head-room: nearest sail above eye level
        clear = False
        for dz in [CLEAR_H, CLEAR_H * 0.6]:
            ok, loc, nor, _ix, obj, _m = scene.ray_cast(
                dg, Vector((x, y, z + EYE_Z)), Vector((0, 0, 1)), distance=dz)
            if not ok or obj.name not in OVERHEAD:
                clear = True
                break
        if not clear:
            continue
        # open space: ray out in eight directions, at body and head height
        space = 0.0
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0.7, 0.7), (-0.7, 0.7),
                       (0.7, -0.7), (-0.7, -0.7)):
            d = Vector((dx, dy, 0)).normalized()
            for hgt in (0.5, 1.4):
                ok, loc, _n2, _i2, obj2, _m2 = scene.ray_cast(
                    dg, Vector((x, y, z + hgt)), d, distance=CLEAR_W)
                space += CLEAR_W if not ok else (loc - Vector((x, y, z + hgt))).length
        # prefer open spots, then central ones
        centrality = -((i - cx) ** 2 + (j - cy) ** 2) ** 0.5 * 0.12
        score = space + centrality
        if best is None or score > best[0]:
            best = (score, x, y, z)

    if best is None:
        sxs = [gx0 + k[0] * GRID for k, _v in cands]
        sys_ = [gy0 + k[1] * GRID for k, _v in cands]
        spawn = [sum(sxs) / len(sxs), sum(sys_) / len(sys_), deck_z]
        log("WARNING: no clear spawn found, using region centre")
    else:
        spawn = [best[1], best[2], best[3]]
    log(f"spawn = {[round(v,2) for v in spawn]} (head-room checked)")


# Semantic tags, written onto every object as a custom property so the web app
# can choose a material without hardcoded names.
#
# Two lessons from the source file shaped this:
#  1. FBX names are NOT semantic. Its deck planks are called "Line002",
#     "Line004", "Line007", so a "line" name prefix cannot mean rope - that
#     mis-tagged the entire main deck.
#  2. The 3ds Max scene used "sphere"/"circle"/"box" prefixes for hundreds of
#     unrelated parts, so names cannot be trusted for materials either.
# The one thing that IS reliable is geometry: the downward raycast recorded
# which objects a player can actually stand on, so those are the deck.
WALK_NAMES = {name for (_i, _j), (_z, name) in samples.items()}
MIN_WALK_Z = min(z for z, _ in samples.values())
# Anything whose centre sits below the main deck is hull, not deck joinery.
MAIN_DECK_Z = main_info["zAvg"]


def classify(o, a, b):
    size = b - a
    ctr = (a + b) / 2
    n = o.name.lower()
    smin = min(size.x, size.y, size.z)
    smax = max(size.x, size.y, size.z)

    if o.name in ('Plane006', 'Plane007'):
        return 'rigging'
    if o.name in ('Plane004', 'Plane005', 'Plane008', 'Plane009', 'Plane010'):
        return 'sail' if o.name not in ('Plane009','Plane010') else 'flag'
    if o.name.startswith('Sunny_'):
        return 'deck' if o.get('sunny_walkable') else 'detail'
    # 1. the surfaces the player walks on are deck
    if o.name in WALK_NAMES:
        return "deck"
    # 2. sails are the only Plane* objects and they are large
    # 3. tall slender spars are masts
    if size.z > 6.0 and max(size.x, size.y) < 3.0:
        return "mast"
    # 4. rope: genuinely thin, and not a walking surface
    if smin < 0.45 and smax < 8.0:
        return "rigging"
    # 5. round trim / cannon balls / decorative spheres
    if "sphere" in n or "circle" in n:
        return "trim"
    # 6. everything else is ship structure (hull sides, bulwarks, cabins,
    #    barrels). The Sunny's superstructure is cream/white with green
    #    shading, so it gets the hull material; only the surfaces a player can
    #    actually stand on get deck planking. Trying to separate "hull" from
    #    "deck furniture" per object proved unreliable - the hull is made of a
    #    handful of very large meshes whose bounding boxes cover most of the
    #    ship.
    return "hull"


# --------------------------------------------------------------------------
# 6. build the collision proxy
# --------------------------------------------------------------------------
def add_mesh(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def add_box(name, loc, scale):
    """Plain physical box data; collision need not enter Blender's visual scene."""
    low=tuple(loc[k]-scale[k]/2 for k in range(3))
    high=tuple(loc[k]+scale[k]/2 for k in range(3))
    return (name,low,high)


def clip_polygon(points, axis, edge, above):
    """Clip a face to a plane, preserving its actual curved-rail footprint."""
    out=[]
    for a,b in zip(points,points[1:]+points[:1]):
        inside_a=(a[axis]>=edge) if above else (a[axis]<=edge)
        inside_b=(b[axis]>=edge) if above else (b[axis]<=edge)
        if inside_a:
            out.append(a)
        if inside_a != inside_b:
            out.append(a.lerp(b,(edge-a[axis])/(b[axis]-a[axis])))
    return out


def face_sections(points):
    """Slice long diagonal faces so their boxes do not fill stair openings."""
    axis=0 if max(p.x for p in points)-min(p.x for p in points)>max(p.y for p in points)-min(p.y for p in points) else 1
    lo=min(p[axis] for p in points)
    hi=max(p[axis] for p in points)
    count=max(1,math.ceil((hi-lo)/0.15))
    for i in range(count):
        poly=clip_polygon(points,axis,lo+(hi-lo)*i/count,True)
        poly=clip_polygon(poly,axis,lo+(hi-lo)*(i+1)/count,False) if poly else []
        if len(poly)>=3:
            yield poly


def merge_floor_cells(cells):
    """Merge coplanar cells into exact rectangles, preserving holes and layers."""
    layers={}
    for i,j,z,depth in cells:
        layers.setdefault((round(z,4),round(depth,4)),set()).add((i,j))
    for (z,depth),remaining in layers.items():
        for i,j in sorted(remaining):
            if (i,j) not in remaining:continue
            width=1
            while (i+width,j) in remaining:width+=1
            height=1
            while all((x,j+height) in remaining for x in range(i,i+width)):height+=1
            for x in range(i,i+width):
                for y in range(j,j+height):remaining.remove((x,y))
            yield i,j,width,height,z,depth


def curved_floor_boxes(obj, spacing=0.10, thickness=0.06):
    """Fit small support boxes to actual standable triangles of a curved bed."""
    cells = {}
    obj.data.calc_loop_triangles()
    for triangle in obj.data.loop_triangles:
        points = [obj.matrix_world @ obj.data.vertices[i].co for i in triangle.vertices]
        normal = (points[1]-points[0]).cross(points[2]-points[0])
        if normal.length < 1e-7 or normal.normalized().z <= WALK_NORMAL_Z:
            continue
        low_x, high_x = min(p.x for p in points), max(p.x for p in points)
        low_y, high_y = min(p.y for p in points), max(p.y for p in points)
        for i in range(math.floor((low_x-gx0)/spacing), math.floor((high_x-gx0)/spacing)+1):
            for j in range(math.floor((low_y-gy0)/spacing), math.floor((high_y-gy0)/spacing)+1):
                x, y = gx0+i*spacing, gy0+j*spacing
                poly = points
                for axis, edge, above in ((0,x,True),(0,x+spacing,False),(1,y,True),(1,y+spacing,False)):
                    poly = clip_polygon(poly,axis,edge,above) if poly else []
                if len(poly) < 3:
                    continue
                lo = Vector(tuple(min(p[k] for p in poly) for k in range(3)))
                hi = Vector(tuple(max(p[k] for p in poly) for k in range(3)))
                if hi.x-lo.x < 1e-6 or hi.y-lo.y < 1e-6:
                    continue
                previous = cells.get((i,j))
                if previous:
                    lo = Vector(tuple(min(lo[k],previous[0][k]) for k in range(3)))
                    hi = Vector(tuple(max(hi[k],previous[1][k]) for k in range(3)))
                cells[(i,j)] = (lo,hi)
    for n, (_key, (lo,hi)) in enumerate(sorted(cells.items())):
        lo.z -= thickness
        yield add_box(f'COLL_FloorCurved_{obj.name}_{n}',(lo+hi)/2,hi-lo)


def wx(i):
    return gx0 + i * GRID


def wy(j):
    return gy0 + j * GRID


colliders = []
HULL_DROP = -60.0     # deep water
CELL_T = 0.60         # thickness of a floor cell. Its TOP is the walk height,
                      # and it is thick enough that falling through is impossible.

# Collect lower authored surfaces before creating proxy objects; adding boxes
# during these raycasts repeatedly invalidates Blender's evaluation cache.
detail_samples = []
stair_objects = [o for o in ship_objects if o.get('sunny_stair')]
stair_names = {o.name for o in stair_objects}
curved_floor_objects = [o for o in ship_objects if o.name == 'Sunny_Slide_chute']
curved_floor_names = {o.name for o in curved_floor_objects}
stair_columns = set()
for o in ship_objects:
    slot = o.get('sunny_access_slot')
    if slot:
        # A real ladder/hatch opening must not be refilled by walking edge guards.
        for i in range(max(0,int((slot[0]-gx0)/GRID)),min(nx,int((slot[1]-gx0)/GRID)+2)):
            for j in range(max(0,int((slot[2]-gy0)/GRID)),min(ny,int((slot[3]-gy0)/GRID)+2)):
                stair_columns.add((i,j))
    if not o.get('sunny_walkable') or o.name in curved_floor_names:
        continue
    a,b = obb(o)
    if o.get('sunny_stair') or o.get('sunny_dynamic'):
        for i in range(max(0,int((a.x-gx0)/GRID)),min(nx,int((b.x-gx0)/GRID)+2)):
            for j in range(max(0,int((a.y-gy0)/GRID)),min(ny,int((b.y-gy0)/GRID)+2)):
                stair_columns.add((i,j))
        continue
    inv = o.matrix_world.inverted()
    for i in range(max(0,int((a.x-gx0)/GRID)),min(nx,int((b.x-gx0)/GRID)+2)):
        for j in range(max(0,int((a.y-gy0)/GRID)),min(ny,int((b.y-gy0)/GRID)+2)):
            org = Vector((wx(i)+GRID/2,wy(j)+GRID/2,500))
            hit,loc,nor,_ = o.ray_cast(inv@org, inv.to_3x3()@Vector((0,0,-1)))
            if not hit:
                continue
            world_loc = o.matrix_world@loc
            existing = samples.get((i,j))
            if existing and abs(existing[0]-world_loc.z)<0.12:
                continue
            detail_samples.append((i,j,world_loc.z,0.18 if (o.name.startswith(('Sunny_InteriorFloor','Sunny_AquariumFloor')) or 'ceiling' in o.name or o.name == 'Sunny_ForedeckSupport') else CELL_T))
log(f'authored floor layers: {len(detail_samples)}')

# --- 6a. one floor cell per walkable sample ----------------------------
# Per-cell boxes (rather than one rectangle per region) are essential: the
# deck regions are L-shaped and scattered, so a bounding-box slab would cover
# most of the ship and overlap other regions. A cell also gives exact ground
# height for free, because a floor's bounding-box top IS its surface.
floor_cells=[]
fore_height=exterior_levels['foredeck']
for (i,j),(z,oname) in sorted(samples.items()):
    if oname not in stair_names and oname not in curved_floor_names:
        floor_cells.append((i,j,z,0.18 if abs(z-fore_height)<0.1 else CELL_T))
floor_cells.extend(detail_samples)
floor_rectangles=list(merge_floor_cells(floor_cells))
for n,(i,j,width,height,z,depth) in enumerate(floor_rectangles):
    colliders.append(add_box(f'COLL_Floor_{n}',
        (wx(i)+width*GRID/2,wy(j)+height*GRID/2,z-depth/2),
        (width*GRID,height*GRID,depth)))
log(f'coplanar floor merge: {len(floor_cells)} cells -> {len(floor_rectangles)} rectangles')

curved_floors = [box for obj in curved_floor_objects for box in curved_floor_boxes(obj)]
colliders.extend(curved_floors)
log(f'actual curved-bed floor contact: {len(curved_floors)} boxes')

# Thin exact tread boxes preserve short steps that a 40 cm terrain grid aliases.
# They also avoid the 60 cm floor skirt hanging beneath each visible tread.
for n,o in enumerate(stair_objects):
    a,b=obb(o)
    colliders.append(add_box(f'COLL_FloorStair_{n}',(a+b)/2,b-a))

# --- 6b. containment walls around the walkable area ---------------------
# Emitted per boundary cell, merged into straight runs to keep the count low.
wall_count = 0
detail_columns = {(i,j) for i,j,_z,_depth in detail_samples} | stair_columns
for (i, j), (z, _oname) in samples.items():
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if (i + dx, j + dy) in samples or (i + dx,j + dy) in detail_columns:
            continue
        if dx:
            cx = wx(i) + GRID / 2 + dx * (GRID / 2 + WALL_THICK / 2)
            cy = wy(j) + GRID / 2
            sx, sy = WALL_THICK, GRID
        else:
            cx = wx(i) + GRID / 2
            cy = wy(j) + GRID / 2 + dy * (GRID / 2 + WALL_THICK / 2)
            sx, sy = GRID, WALL_THICK
        colliders.append(add_box(
            f"COLL_Wall_{wall_count}",
            (cx, cy, z + BOUNDARY_WALL / 2 - CELL_T / 2),
            (sx, sy, CELL_T + BOUNDARY_WALL)))
        wall_count += 1

# --- 6b2. safety hull: sits BELOW every deck so it only catches falls ---
hull_top = min(z for z, _ in samples.values()) - 0.4
hull_bottom = max(HULL_DROP, SHIP["min"][2] - 14.0)
if hull_top - hull_bottom > 0.5:
    colliders.append(add_box(
        "COLL_Hull",
        (SHIP["center"][0], SHIP["center"][1], (hull_top + hull_bottom) / 2),
        (SHIP["size"][0] * 0.97, SHIP["size"][1] - 1.2, hull_top - hull_bottom)))


# --- 6c. deck obstacles ------------------------------------------------
# Sails and rigging are deliberately EXCLUDED: they hang far above and below
# the deck line, so their bounding boxes would drop invisible walls across the
# walking area. Cabin walls and masts use their full-height surface faces so
# collision-enabled flight respects them without filling their open interiors.
# Other small fittings use deck-relative boxes.
OBSTACLE_HEIGHT = 2.4
count = 0
for o in ship_objects:
    a, b = obb(o)
    size = b - a
    tag = classify(o, a, b)
    if o.get('sunny_stair') or o.get('sunny_dynamic'):
        continue
    if o.name.startswith('Sunny_') and not o.get('sunny_obstacle'):
        continue
    if tag in ("sail", "rigging"):
        continue
    # Hanging lanterns have broad imported bounds below their visible bodies.
    # They are decorative overhead fittings, not solid deck obstructions.
    if o.name.startswith('NGon'):
        continue
    shell = o.name.startswith(('Sunny_ForeF1_shell','Sunny_ForeF2_shell','Sunny_AftF2_shell','Sunny_Aquarium_shell','Sunny_Library_lining','Sunny_Bath_lining','Sunny_RoomPartition_aqua_fwd','Sunny_RoomPartition_DiningEntrance','Sunny_RoomPartition_KitchenEntrance','Sunny_RoomPartition_bar','Sunny_RoomPartition_womens'))
    if o.name in ('Box080','Box081','Box070','Box084','Cylinder002','Cylinder003','Cylinder007','Cylinder015','Tube008.001','Line006','对象001','对象002','对象003') or o.get('sunny_rail') or shell:
        # Curved stair railings and the round cabin need their individual faces;
        # a single axis-aligned box fills the open stair passage beside them.
        for face in o.data.polygons:
            points=[o.matrix_world@o.data.vertices[i].co for i in face.vertices]
            normal=o.matrix_world.to_3x3()@face.normal
            if abs(normal.z)>0.65 and o.name != 'Cylinder002' and not o.get('sunny_aft_native_envelope'):
                continue
            for piece,poly in enumerate(face_sections(points)):
                lo=Vector(tuple(min(p[k] for p in poly) for k in range(3)))
                hi=Vector(tuple(max(p[k] for p in poly) for k in range(3)))
                if hi.z-lo.z<0.12:
                    continue
                dims=hi-lo
                colliders.append(add_box(f'COLL_Rail_{o.name}_{face.index}_{piece}',(lo+hi)/2,
                    (max(dims.x,0.045),max(dims.y,0.045),dims.z)))
        continue
    if o.get('sunny_obstacle'):
        # Authored partitions remain solid on lower levels even when a higher
        # floor occludes the terrain sample. Do not cap walls to an unrelated deck.
        colliders.append(add_box('COLL_Solid_'+o.name,(a+b)/2,
            (max(size.x,0.05),max(size.y,0.05),max(size.z,0.05))))
        continue
    if max(size.x, size.y) > 6.0 or max(size.x, size.y) < 0.15 or size.z < 0.20:
        continue

    # which walkable cells does this object's footprint actually stand on?
    touched = []
    for (i, j), (z, _n) in samples.items():
        cx = wx(i) + GRID / 2
        cy = wy(j) + GRID / 2
        if cx < a.x - 0.25 or cx > b.x + 0.25:
            continue
        if cy < a.y - 0.25 or cy > b.y + 0.25:
            continue
        if b.z > z + 0.25 and a.z < z + OBSTACLE_HEIGHT:
            touched.append(z)

    if not touched:
        continue
    obj_deck_z = min(touched)
    z_lo = max(a.z, obj_deck_z - 0.35)
    z_hi = min(b.z, obj_deck_z + OBSTACLE_HEIGHT)
    if z_hi <= z_lo + 0.02:
        continue
    colliders.append(add_box(
        f"COLL_Obj_{count}",
        ((a.x + b.x) / 2, (a.y + b.y) / 2, (z_lo + z_hi) / 2),
        (max(size.x, 0.08), max(size.y, 0.08), z_hi - z_lo)))
    count += 1
    if count >= MAX_OBSTACLES:
        break

log(f"collision proxy: {len(colliders)} meshes "
    f"({len(samples)} floor cells, {wall_count} walls, 1 hull, {count} obstacles)")

# Collision remains plain data until the deterministic GLB writer. Instantiating
# tens of thousands of unused Blender objects made scene evaluation quadratic.

# --------------------------------------------------------------------------
# 7. semantic grouping, sail/mast tagging, root node
# --------------------------------------------------------------------------
# "Plane005"/"Plane007" etc. are the sails: very tall, very thin, high up.
# They get exported as separate nodes so the app can animate them in the wind.
groups = {}
for o in ship_objects:
    a, b = obb(o)
    groups.setdefault(classify(o, a, b), []).append(o.name)
log("part groups: " + ", ".join(f"{k}={len(v)}" for k, v in sorted(groups.items())))

# Attach clean custom props so the web app can find parts without hardcoding.
for o in ship_objects:
    a, b = obb(o)
    o["sunny_part"] = classify(o, a, b)
    o["sunny_deck_z"] = round(deck_z, 4)

for o in ship_objects:
    o.data.name = o.name

# Clean single-root hierarchy for the GLB.
#
# Assigning o.parent in Blender leaves matrix_basis untouched, so re-parenting
# to a fresh identity Empty SILENTLY DROPS the original FBX parent chain. The
# old FBX root carries a large translation, which put every node tens of metres
# away from the hull in the export (ship read as 102 m across instead of 25 m).
# Capture the true world transforms first and restore them afterwards.
_world_before_reparent = {o.name: o.matrix_world.copy() for o in ship_objects}
for o in ship_objects:
    if not (o.parent and (o.parent.get('sunny_door') or o.parent.get('sunny_hatch'))):
        o.parent = root
    o.matrix_parent_inverse = Matrix.Identity(4)
bpy.context.view_layer.update()
for o in ship_objects:
    o.matrix_world = _world_before_reparent[o.name]
bpy.context.view_layer.update()

_mn2, _mx2 = world_bbox(ship_objects)
log(f"post-reparent size(m)={[round(v,3) for v in (_mx2 - _mn2)]}")

# --------------------------------------------------------------------------
# 8. export
# --------------------------------------------------------------------------
os.makedirs(OUT_DIR, exist_ok=True)


SHIP_GLB = os.path.join(OUT_DIR, "sunny.glb")


# Keep the editable Blender scene alongside the web assets. Collection names
# give a useful master hierarchy without changing transforms or exported nodes.
master_collection = bpy.data.collections.new('Thousand Sunny master')
scene.collection.children.link(master_collection)
exterior_collection = bpy.data.collections.new('Exterior')
interior_collection = bpy.data.collections.new('Interior')
interactive_collection = bpy.data.collections.new('Interactive mechanisms')
for collection in (exterior_collection,interior_collection,interactive_collection):
    master_collection.children.link(collection)
interior_prefixes=('Sunny_Quarters','Sunny_Womens','Sunny_WWash','Sunny_Wash_',
    'Sunny_Kitchen_','Sunny_Dining_','Sunny_Sick_','Sunny_Pantry_','Sunny_Energy_',
    'Sunny_Store_','Sunny_Factory_','Sunny_Weapons_','Sunny_Aquarium_',
    'Sunny_Library_','Sunny_Bath_','Sunny_RoomLamp_','Sunny_InteriorFloor_',
    'Sunny_RoomPartition_','Sunny_Dock_','Sunny_Vehicle')
for obj in ship_objects:
    moving=any(obj.get(key) for key in ('sunny_door','sunny_hatch','sunny_rudder','sunny_dock_shutter','sunny_jaw','sunny_mane'))
    target=interactive_collection if moving else interior_collection if obj.name.startswith(interior_prefixes) else exterior_collection
    target.objects.link(obj)
    for collection in list(obj.users_collection):
        if collection!=target:collection.objects.unlink(obj)
bpy.context.view_layer.update()
master_staging=os.path.join(OUT_DIR,'sunny-master.blend')
bpy.ops.wm.save_as_mainfile(filepath=master_staging,compress=True)
log('saved editable sunny-master.blend')

export_glb(SHIP_GLB, ship_objects + [root])

# --- verify the export against Blender, and repair what it mis-places ------
# The glTF exporter writes a subset of the FBX's objects - the ones that were
# parented to Empties, i.e. the decorative bow-ornament cluster - with their
# ORIGINAL pre-transform translation and scale, ignoring the transform Blender
# holds. Circle007 exports with S=[1.576, 2.494, 1.576] (its unscaled FBX
# scale) at its pre-centring position, landing ~60 m from the hull as a
# detached blob floating beside the ship.
#
# Compare against the matrices captured during the transform pass (_desired),
# NOT against the live matrix_world: the exporter's own evaluation reverts
# these linked objects, so reading them afterwards shows the same wrong values
# and hides the problem.
#
# The repair is to bake the difference into the mesh data, G = current^-1 @
# desired, so the final world transform comes out right even though the object
# transform itself cannot be changed. These objects all have positive scale, so
# no normals are flipped (which is what makes a blanket bake unsafe here).
_bad = []
for _n, _t in exported_translations(SHIP_GLB).items():
    _o = bpy.data.objects.get(_n)
    if _o is None or _n not in _desired:
        continue
    _exp = blender_to_gltf(list(_desired[_n].translation))
    if max(abs(_exp[i] - _t[i]) for i in range(3)) > 0.01:
        _bad.append(_n)

# All collision entries are axis-aligned boxes, so no generic visual-mesh
# export/evaluation is needed. Convert Blender bounds to Three Y-up explicitly.
from collision_glb import write_box_glb
collision_boxes=[]
for name,low,high in colliders:
    collision_boxes.append((name,(low[0],low[2],-high[1]),(high[0],high[2],-low[1])))
collision_path=os.path.join(OUT_DIR,"sunny-collision.glb")
write_box_glb(collision_path,collision_boxes)
log(f"wrote sunny-collision.glb ({os.path.getsize(collision_path)/1e6:.2f} MB)")

# --------------------------------------------------------------------------
# 9. metadata for the app
# --------------------------------------------------------------------------
def waterline_profile(objects,height):
    """32 cross-section stations from the actual hull mesh at maximum wave height."""
    hull=next(o for o in objects if o.name=='Line002')
    segments=[]
    for face in hull.data.polygons:
        points=[hull.matrix_world@hull.data.vertices[i].co for i in face.vertices]
        hits=[]
        for a,b in zip(points,points[1:]+points[:1]):
            if (a.z-height)*(b.z-height)<0:
                hits.append(a.lerp(b,(height-a.z)/(b.z-a.z)))
        if len(hits)>=2:
            segments.append((hits[0],hits[1]))
    left=min(min(a.x,b.x) for a,b in segments)
    right=max(max(a.x,b.x) for a,b in segments)
    profile=[]
    for i in range(32):
        x=left+(right-left)*(i+0.001)/31.002
        values=[a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x) for a,b in segments
                if min(a.x,b.x)<=x<=max(a.x,b.x) and abs(b.x-a.x)>0.0001]
        if values:
            profile.append([x,min(values)-0.35,max(values)+0.35])
    return profile

ocean_profile=waterline_profile(ship_objects,WATER_LEVEL+0.7)
meta = {
    "source": "stuff/1.FBX",
    "units": "metres",
    # NOTE: the metadata is written in BLENDER coordinates (Z-up) to match how
    # the pipeline measured it. The app converts to three.js Y-up on load.
    "axis": "blender-z-up",
    "hull": SHIP,
    "waterLevel": WATER_LEVEL,
    "oceanHullProfile": ocean_profile,
    "interiors": {"finishedRooms":False,"dockCentre":interiors['dockCentre'],"dockSolids":interiors['dockSolids'],"levels":{k:round(v,3) for k,v in interiors['levels'].items()},
        "lights":interiors.get('lights', []),
        "foreEnclosures":interiors['foreEnclosures'],
        "aftEnclosures":interiors.get('aftEnclosures', []),
        "aquariumWindows":interiors.get('aquariumWindows', []),
        "aquariumSidePaintBounds":interiors.get('aquariumSidePaintBounds'),
        "rooms":[{k:(round(v,2) if isinstance(v,float) else ([round(q,2) for q in v] if isinstance(v,(list,tuple)) else v))
                  for k,v in room.items()} for room in interiors['rooms']],
        "doors":[{k:(v) for k,v in d.items()} for d in interiors['doors']],
        "doorCount":len(interiors['doors']),
        "partitions":len([o for o in ship_objects if o.name.startswith('Sunny_RoomPartition')]),
        "furniture":len([o for o in ship_objects if o.get('sunny_obstacle') and o.name.startswith('Sunny_')])},
    "exterior": {"version": "post-timeskip", "heightM": 56*experience_scale,
                 "referenceLengthM": 39, "referenceHeightM": 56,
                 "experienceScale": experience_scale,
                 "heightOffset": exterior_offset, "rigHeightRatio": rig_height_ratio,
                 "lawnLengthM": 10.65*experience_scale,
                 "features": exterior_features,
                 "mechanisms": interiors.get('exteriorMechanisms', {}),
                 "reference": "docs/exterior-reference.md",
                 "landmarks": {name:[round(v,3) for v in point] for name,point in
                    {"lawn": [layout_x(-1.8)*experience_scale,0.45*experience_scale,interiors['levels']['F1']],
                     "foredeck": [layout_x(-11.55)*experience_scale,0.585*experience_scale,exterior_levels['foredeck']],
                     "aft deck": [layout_x(3.4)*experience_scale,2.0*experience_scale,interiors['levels']['F2A']],
                     "garden": [layout_x(5.7)*experience_scale,2.0*experience_scale,interiors['levels']['F3G']],
                     "stern balcony": [layout_x(12.6)*experience_scale,4.0*experience_scale,interiors['levels']['F3L']],
                     "men's quarters": [layout_x(-9.0)*experience_scale,0.585*experience_scale,interiors['levels']['F1']],
                     "aquarium bar": [12.4,0.585*experience_scale,interiors['levels']['F1']],
                     "library": [layout_x(12.6)*experience_scale-2.0,0.585*experience_scale,interiors['levels']['F3L']],
                     "soldier dock": [layout_x(-2.2)*experience_scale,0.585*experience_scale,interiors['levels']['B1']]}.items()}},
    "deck": {
        "height": deck_z,
        "regionCount": len(regions),
        "main": {k: main_info[k] for k in ("n", "zAvg", "zMin", "zMax", "x", "y", "size", "objects")},
        "regions": [{k: i[k] for k in ("n", "zAvg", "zMin", "zMax", "x", "y", "size")}
                    for i in region_info[:12]],
    },
    "spawn": {"position": spawn,
              "note": "feet at deck height; eye height added at runtime"},
    "parts": {k: sorted(v) for k, v in groups.items()},
    "collision": {"floorRegions": len(regions), "obstacles": count,
                  "boundaryWall": BOUNDARY_WALL, "detailFloorCells": len(detail_samples), "floorColliderBoxes":len(floor_rectangles)+len(stair_objects),
                  "floorSlabDepth": CELL_T},
    "counts": {"shipObjects": len(ship_objects),
               "removedJunkObjects": len(removed),
               "skippedDegenerateMeshes": len(SKIPPED_DEGENERATE)},
}
with open(os.path.join(OUT_DIR, "ship-metadata.json"), "w") as f:
    json.dump(meta, f, indent=2)
log("wrote ship-metadata.json")
log("DONE")

# Publish the completed generation only after all exports and metadata succeed.
os.makedirs(PUBLISH_DIR, exist_ok=True)
for name in ('sunny.glb','sunny-collision.glb','ship-metadata.json'):
    os.replace(os.path.join(OUT_DIR,name), os.path.join(PUBLISH_DIR,name))
master_dir=os.path.join(ROOT,'assets')
os.makedirs(master_dir,exist_ok=True)
os.replace(master_staging,os.path.join(master_dir,'sunny-master.blend'))
log('published completed asset generation and editable master')
