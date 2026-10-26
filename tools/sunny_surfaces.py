"""Exterior surface preparation after aperture/paint/overlap authoring."""
import math
import bpy
from mathutils import Vector
from sunny_exterior import assign_world_mesh, material, remove_exterior_overlaps


def floor_soffit(obj, thickness=.12):
    """Give a cut access floor an opaque underside without moving its top."""
    old = obj.data
    verts = [obj.matrix_world @ v.co for v in old.vertices]
    count = len(verts)
    verts += [p-Vector((0, 0, thickness)) for p in verts]
    faces, indices, edges = [], [], {}
    for face in old.polygons:
        ids = list(face.vertices)
        faces.append(tuple(ids)); indices.append(face.material_index)
        faces.append(tuple(i+count for i in reversed(ids))); indices.append(len(old.materials))
        for i, j in zip(ids, ids[1:]+ids[:1]):
            p, q = tuple(round(v, 5) for v in verts[i]), tuple(round(v, 5) for v in verts[j])
            key = tuple(sorted((p, q)))
            edges.setdefault(key, []).append((i, j))
    for group in edges.values():
        if len(group) == 1:
            i, j = group[0]
            faces.append((i, i+count, j+count, j)); indices.append(len(old.materials))
    mesh = bpy.data.meshes.new(old.name+'_soffit')
    mesh.from_pydata(verts, [], faces); mesh.update()
    for mat in old.materials: mesh.materials.append(mat)
    mesh.materials.append(material('cream'))
    for face, index in zip(mesh.polygons, indices): face.material_index = index
    assign_world_mesh(obj, mesh)
    obj['sunny_visual_floor_thickness'] = thickness


def smooth_painted_normals(obj, crease_degrees=40):
    """Share normals across paint splits while preserving geometric creases."""
    mesh = obj.data
    to_world = obj.matrix_world.to_3x3().inverted().transposed()
    to_local = obj.matrix_world.to_3x3().transposed()
    positions = [tuple(round(v, 5) for v in vertex.co) for vertex in mesh.vertices]
    groups, normals = {}, []
    for face in mesh.polygons:
        normal = (to_world @ face.normal).normalized()
        normals.append(normal)
        direction = tuple(round(v, 6) for v in normal)
        for index in face.vertices:
            groups.setdefault(positions[index], {})[direction] = normal
        face.use_smooth = True
    cutoff = math.cos(math.radians(crease_degrees))
    loops = [None]*len(mesh.loops)
    for face in mesh.polygons:
        normal = normals[face.index]
        for index in face.loop_indices:
            candidates = groups[positions[mesh.loops[index].vertex_index]].values()
            average = sum((n for n in candidates if n.dot(normal) >= cutoff), Vector())
            loops[index] = tuple((to_local @ average.normalized()).normalized())
    mesh.normals_split_custom_set(loops)
    mesh.update()
    obj['sunny_smooth_paint_normals'] = crease_degrees


def clean_cut_geometry(objects, epsilon=.00001):
    """Remove sub-10-micron cut corners/slivers before normal/UV export.

    Source and clipped exterior meshes only. Retain meaningful boundaries,
    materials, transforms and winding; the read-only FBX is never changed.
    """
    total = 0
    for obj in objects:
        if obj.get('sunny_aft_native_envelope'):
            # Exact Boolean cuts already weld and verify this closed shell.
            # Independent per-face sliver removal would reopen its boundaries.
            continue
        if obj.name.startswith('Sunny_') and not obj.get('sunny_removed_overlap_faces'):
            continue
        old = obj.data
        points = [obj.matrix_world @ v.co for v in old.vertices]
        faces, indices, smooth, changed = [], [], [], 0
        for face in old.polygons:
            ids = []
            for index in face.vertices:
                if not ids or (points[index]-points[ids[-1]]).length > epsilon:
                    ids.append(index)
            if len(ids)>1 and (points[ids[0]]-points[ids[-1]]).length <= epsilon:
                ids.pop()
            again = True
            while again and len(ids)>=3:
                again = False
                for i, index in enumerate(ids):
                    a, p, b = points[ids[i-1]], points[index], points[ids[(i+1)%len(ids)]]
                    edge = b-a
                    if edge.length <= epsilon:
                        ids.pop(i); again=True; break
                    along = (p-a).dot(edge)/edge.length_squared
                    if 0 <= along <= 1 and (p-a).cross(edge).length/edge.length <= epsilon:
                        ids.pop(i); again=True; break
            if len(ids)<3:
                changed += 1
                continue
            area = sum(((points[ids[i]]-points[ids[0]]).cross(points[ids[i+1]]-points[ids[0]])
                        for i in range(1,len(ids)-1)), Vector()).length
            longest = max((points[a]-points[b]).length for a,b in zip(ids,ids[1:]+ids[:1]))
            if area/max(longest,epsilon) <= epsilon:
                changed += 1
                continue
            if ids != list(face.vertices): changed += 1
            faces.append(tuple(ids)); indices.append(face.material_index); smooth.append(face.use_smooth)
        if not changed: continue
        mesh = bpy.data.meshes.new(old.name+'_clean_cuts')
        mesh.from_pydata([v.co for v in old.vertices], [], faces); mesh.update()
        for mat in old.materials: mesh.materials.append(mat)
        for face, index, shading in zip(mesh.polygons,indices,smooth):
            face.material_index=index; face.use_smooth=shading
        obj.data=mesh
        obj['sunny_cleaned_cut_faces']=changed
        total += changed
    return total


def prepare_exterior_surfaces(objects, vertex_bbox):
    """Cap access floors, remove surface overlaps, then restore curve shading."""
    floors = {'Sunny_InteriorFloor_F3_library', 'Sunny_AftEntryDeck',
              'Sunny_SternAccess_floor', 'Sunny_SternAccess_neck'}
    curved = ('Sunny_Lion', 'Sunny_Gaon', 'Sunny_Anchor', 'Sunny_Lookout',
              'Sunny_CoupDeBurst', 'Sunny_MastPlatform')
    for obj in objects:
        if obj.name in floors:
            floor_soffit(obj)
        elif obj.name in {'Sunny_Library_ceiling', 'Sunny_InteriorFloor_F3_bath',
                          'Sunny_ForeF1_ceiling', 'Sunny_ForeF2_ceiling', 'Sunny_ForedeckSupport'}:
            # Match the physical slab while preserving the real Bath stair slot.
            # Ownership below partitions both floor tops and opaque undersides.
            floor_soffit(obj, .18)
    bpy.context.view_layer.update()
    removed = remove_exterior_overlaps(objects, vertex_bbox)
    from sunny_uv import prepare_exterior_topology, prepare_exterior_uvs
    print('[pipeline]   existing nonplanar UV faces triangulated:', prepare_exterior_topology(objects))
    print('[pipeline]   microscopic cut faces cleaned:', clean_cut_geometry(objects))
    for obj in objects:
        if not obj.name.startswith('Sunny_') or obj.name.startswith(curved):
            smooth_painted_normals(obj)
    print('[pipeline]   exterior UV surfaces:', prepare_exterior_uvs(objects))
    return removed
