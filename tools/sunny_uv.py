"""Final-metre exterior UVs; room furniture and normalized sail paint stay paused."""
import math
import re
import bpy
from mathutils import Vector, Matrix

FEATURES = re.compile(r'^(?:AftEntryDeck|AftF2|Anchor|AquariumDoorApproach|AquariumLadder|AquariumWindow|CoupDeBurst|DiningWindow|Dock1|DockNumber|DockSlat|ForedeckSupport|ForeF[12]|ForeLanding|ForeUpperLanding|ForeStair|AftStair|ForePortRail|ForeStarRail|ForeUpperRail|ForeDoorApproach|ForeStarboardDoorApproach|WomensDoorApproach|Gaon|GardenDeck|GardenStair|Helm|HullPort\d+|InteriorMainMast|KitchenChimney|Lantern|Lawn|LawnSidewalk-?1|LibraryRoof|LionEye|LionSmile|LogPose|Lookout|MastPlatform|Mikan\d+|Paddle|PopGreens|RobinGarden|SailTie|ShadeTree|Slide|SoldierDock|SternAccess|SternBalcony|Swing|Usopp)$')
OPENINGS = {'ForeDoor', 'ForeDoorStarboard', 'ForeToiletDoor1', 'ForeToiletDoor-1',
            'AquariumDoor', 'AquariumPassageDoor', 'DiningEntrance', 'KitchenEntrance',
            'PantryOutsideDoor', 'SickOutsideDoor', 'LibraryDoor', 'SternAccessDoor',
            'AquariumHatch', 'CrowNestHatch', 'KitchenHatch', 'SoldierDockHatch'}
MASTS = {'Cylinder003', 'Cylinder004', 'Cylinder007', 'Cylinder010',
         'Cylinder011', 'Cylinder013', 'Cylinder014', 'Sunny_InteriorMainMast'}


def exterior_surface(obj):
    """Select source exterior, supported fittings and shared exposed envelopes."""
    if obj.get('sunny_sail_uv'):
        return False
    if not obj.name.startswith('Sunny_') or FEATURES.fullmatch(obj.get('sunny_feature', '')):
        return True
    if obj.get('sunny_feature') in OPENINGS:
        return True
    if any(obj.name.startswith('Sunny_'+prefix) for prefix in
           ('Library_lining', 'Bath_lining', 'InteriorFloor_F3_library')):
        return True
    return any(obj.name.startswith('Sunny_'+prefix+id_+'_')
               for prefix in ('Door_', 'Hatch_') for id_ in OPENINGS)


def components(mesh):
    """Retain each batched branch/leaf's real connected island for its grain axis."""
    parent = list(range(len(mesh.vertices)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for edge in mesh.edges:
        a, b = (root(i) for i in edge.vertices)
        parent[b] = a
    groups = {}
    for i in range(len(parent)):
        groups.setdefault(root(i), []).append(i)
    return list(groups.values())


def principal_axis(points):
    """Find the actual final branch/spar direction, independent of object origin."""
    centre = sum(points, Vector())/len(points)
    covariance = Matrix(((0., 0., 0.), (0., 0., 0.), (0., 0., 0.)))
    for p in points:
        d = p-centre
        for i in range(3):
            for j in range(3): covariance[i][j] += d[i]*d[j]
    axis = Vector((1., .71, .43)).normalized()
    for _ in range(24):
        step = covariance@axis
        if step.length < 1e-10: break
        axis = step.normalized()
    if axis[max(range(3), key=lambda i: abs(axis[i]))] < 0: axis.negate()
    radial = axis.cross(Vector((0, 0, 1)))
    if radial.length < .01: radial = axis.cross(Vector((0, 1, 0)))
    return centre, axis, radial.normalized()


def prepare_exterior_topology(objects):
    """Expose existing nonplanar render triangles before selecting UV planes."""
    count = 0
    for obj in objects:
        if not exterior_surface(obj): continue
        old = obj.data
        bad = set()
        for face in old.polygons:
            if len(face.vertices) <= 3: continue
            origin = obj.matrix_world@old.vertices[face.vertices[0]].co
            normal = (obj.matrix_world.to_3x3().inverted().transposed()@face.normal).normalized()
            if any(abs((obj.matrix_world@old.vertices[i].co-origin).dot(normal)) > .001 for i in face.vertices):
                bad.add(face.index)
        if not bad: continue
        old.calc_loop_triangles()
        triangles = {}
        for t in old.loop_triangles: triangles.setdefault(t.polygon_index, []).append(tuple(t.vertices))
        faces, colours, smooth = [], [], []
        for face in old.polygons:
            pieces = triangles[face.index] if face.index in bad else [tuple(face.vertices)]
            faces.extend(pieces);colours.extend([face.material_index]*len(pieces));smooth.extend([face.use_smooth]*len(pieces))
        mesh = bpy.data.meshes.new(old.name+'_uv_triangles')
        mesh.from_pydata([v.co for v in old.vertices], [], faces);mesh.update()
        for mat in old.materials: mesh.materials.append(mat)
        for face, colour, shading in zip(mesh.polygons, colours, smooth):
            face.material_index = colour;face.use_smooth = shading
        obj.data = mesh
        count += len(bad)
    return count


def metric_uv(obj):
    """Assign stable metre UVs, cylindrical grain, or individual blade UVs."""
    mesh = obj.data
    if not mesh.vertices or not mesh.polygons:
        return
    points = [obj.matrix_world@v.co for v in mesh.vertices]
    name = obj.name
    used = {mesh.materials[f.material_index].name for f in mesh.polygons}
    leaf = bool(re.search(r'_lea(?:f|ves)', name)) and used <= {'Sunny_leaf', 'Sunny_leaflight'}
    cylinder = name in MASTS or bool(re.search(r'_(?:branch|twig|trunk|rung|rope|ladder_rail)', name))
    boards = (name in {'Line002', 'Line006', 'Box118', 'Box119', 'Box121', 'Line012'} or
              bool(re.search(r'(?:Deck|Landing|Sidewalk|Approach|Balcony_(?:floor|access)|SternAccess_(?:floor|neck)|InteriorFloor)', name)))
    tree = bool(re.search(r'(?:Mikan|ShadeTree|Swing_branch)', name))
    uv = mesh.uv_layers.get('SunnyUV') or mesh.uv_layers.new(name='SunnyUV')
    # GLTF preserves UV-layer order even when another layer is active for
    # render. Remove the selected exterior's obsolete FBX layers so SunnyUV
    # is the actual TEXCOORD_0 sampled by all material maps.
    for layer in list(mesh.uv_layers):
        if layer.name != 'SunnyUV': mesh.uv_layers.remove(layer)
    uv = mesh.uv_layers['SunnyUV']
    mesh.uv_layers.active = uv
    uv.active_render = True
    islands = components(mesh) if leaf or cylinder else [list(range(len(points)))]
    frames, membership = [], {}
    for group in islands:
        centre, axis, radial = principal_axis([points[i] for i in group])
        second = axis.cross(radial).normalized()
        radius = sum((points[i]-centre-axis*(points[i]-centre).dot(axis)).length for i in group)/len(group)
        frames.append((centre, axis, radial, second, max(radius, .001), group))
        for i in group: membership[i] = len(frames)-1
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for face in mesh.polygons:
        centre, axis, radial, second, radius, group = frames[membership[face.vertices[0]]]
        normal = (normal_matrix@face.normal).normalized()
        coords = []
        for index in face.vertices:
            p, delta = points[index], points[index]-centre
            if leaf and len(group) == 5:
                base, tip = points[group[0]], points[group[2]]
                along = (tip-base).normalized()
                across = (points[group[1]]-points[group[3]]).normalized()
                length = (tip-base).length
                width = (points[group[1]]-points[group[3]]).length
                pair = ((p-base).dot(along)/length, .5+(p-base).dot(across)/width)
            elif cylinder and abs(normal.dot(axis)) < .85:
                pair = (delta.dot(axis), radius*math.atan2(delta.dot(second), delta.dot(radial)))
            elif cylinder:
                pair = (delta.dot(radial), delta.dot(second))
            elif boards or (not name.startswith('Sunny_') and not name.startswith('Rectangle')):
                # Continuous projections across source paint/material splits.
                pair = (p.x, p.y) if abs(normal.z) > .7 else (p.x, p.z) if abs(normal.y) > abs(normal.x) else (p.y, p.z)
            else:
                along = axis-normal*axis.dot(normal)
                if along.length < .01: along = radial-normal*radial.dot(normal)
                along.normalize()
                pair = (delta.dot(along), delta.dot(normal.cross(along)))
            coords.append(pair)
        if cylinder and abs(normal.dot(axis)) < .85 and max(v for _, v in coords)-min(v for _, v in coords) > math.pi*radius:
            coords = [(u, v+math.tau*radius if v < 0 else v) for u, v in coords]
        for index, pair in zip(face.loop_indices, coords): uv.data[index].uv = pair
    obj['sunny_uv_space'] = 'leaf' if leaf else 'metres'
    obj['sunny_uv_kind'] = 'leaf' if leaf else 'cylinder' if cylinder else 'planar'
    obj['sunny_wood_kind'] = 'bark' if tree and cylinder else 'boards' if boards else 'grain'
    mesh.update()


def prepare_exterior_uvs(objects):
    """Write only exterior UVs after every cut, normal repair and scale operation."""
    count = 0
    for obj in objects:
        if exterior_surface(obj):
            metric_uv(obj)
            count += 1
    return count
