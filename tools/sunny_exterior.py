"""Reference-led exterior restoration, in the imported ship's metre coordinates.

Coordinates below precede the height correction (Blender Z-up). Source: Oda's
Volume 46 SBS deck plans and the anime exterior linked in docs/exterior-reference.md.
Small fittings are artistic reconstructions; only length/overall height are sourced
dimensions. This module never changes the original FBX.
"""
import math
import json
import os
import bpy
from mathutils import Vector, Matrix

with open(os.path.join(os.path.dirname(__file__),'..','src','config','exteriorConfig.json')) as f:
    EXTERIOR_CONFIG = json.load(f)

PALETTE = {
    'timber': '#c48d52', 'deck': '#dfb878', 'darkwood': '#684329',
    'red': '#b91d25', 'white': '#fff5df', 'cream': '#f4dfae',
    'gold': '#e6b62f', 'mane': '#e87824', 'lion': '#f8ec4d',
    'black': '#262c32', 'glass': '#76bbcf', 'grass': '#5c9845',
    'leaf': '#3f8438', 'leaflight': '#68a745', 'orange': '#ff9d25',
    'rope': '#c7b58b', 'soil': '#493326', 'pink': '#f89aae',
    'tankwater': '#2f7f9e', 'brass': '#c9a227', 'linen': '#e7dfc9', 'blue': '#386fa0',
}


def layout_x(x):
    """Expand the central eight-metre band to twelve metres within a 39 m envelope."""
    if x < -5.5:
        return -19.5+(x+19.5)*(12/14)
    if x <= 2.5:
        return -7.5+(x+5.5)*1.5
    return 4.5+(x-2.5)*(15/17)


def material(key):
    """Shared sRGB-authored, matte painted materials exported with the asset."""
    name = 'Sunny_' + key
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    h = PALETTE[key].lstrip('#')
    srgb = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    color = (*linear, 1)
    mat.diffuse_color = color
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.78 if key not in ('glass', 'tankwater') else 0.18
    bsdf.inputs['Metallic'].default_value = 0.18 if key == 'gold' else 0
    if key in ('glass', 'tankwater'):
        alpha = 0.42 if key == 'glass' else 0.72
        bsdf.inputs['Alpha'].default_value = alpha
        color = (color[0], color[1], color[2], alpha)
        mat.diffuse_color = color
        try:
            mat.blend_method = 'BLEND'
        except Exception:
            pass
        try:
            mat.surface_render_method = 'BLENDED'
        except Exception:
            pass
    return mat


def finish(obj, name, key, walkable=False, obstacle=False):
    """Name, paint, and identify a newly authored exterior mesh."""
    obj.name = 'Sunny_' + name
    obj.data.materials.clear()
    obj.data.materials.append(material(key))
    obj['sunny_authored'] = True
    obj['sunny_feature'] = name.split('_')[0]
    obj['sunny_walkable'] = walkable
    obj['sunny_obstacle'] = obstacle
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) <= 4 and key not in ('deck', 'timber')
    return obj


def _mesh(name, verts, faces, position=None):
    """Create a mesh object directly.

    Authoring thousands of small props through `bpy.ops` is quadratic: every
    operator call forces a full depsgraph re-evaluation of a scene that now holds
    several thousand objects, so a furnished ship takes minutes per hundred
    pieces. Building the meshes directly is the same geometry at a fraction of
    the cost, and keeps the exported GLB small.
    """
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if position is not None:
        ob.location = position
    return ob


def box(name, position, dimensions, key, walkable=False, obstacle=False):
    hx, hy, hz = dimensions[0] / 2, dimensions[1] / 2, dimensions[2] / 2
    verts = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
             (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return finish(_mesh(name, verts, faces, position), name, key, walkable, obstacle)


def sphere(name, position, scale, key, segments=14, rings=8):
    verts, faces = [], []
    verts.append((0, 0, -1))
    for r in range(1, rings):
        phi = math.pi * r / rings
        for s in range(segments):
            th = math.tau * s / segments
            verts.append((math.sin(phi) * math.cos(th), math.sin(phi) * math.sin(th),
                          -math.cos(phi)))
    verts.append((0, 0, 1))
    top = len(verts) - 1
    for s in range(segments):
        faces.append((0, 1 + (s + 1) % segments, 1 + s))
    for r in range(rings - 2):
        for s in range(segments):
            a = 1 + r * segments + s
            b = 1 + r * segments + (s + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    base = 1 + (rings - 2) * segments
    for s in range(segments):
        faces.append((top, base + s, base + (s + 1) % segments))
    obj = _mesh(name, verts, faces, position)
    obj.scale = scale
    return finish(obj, name, key)


def pole(name, start, end, radius, key, radius2=None, sides=10):
    """Cylinder/cone between two world-space points."""
    a, b = Vector(start), Vector(end)
    d = b - a
    length = d.length
    r2 = radius if radius2 is None else radius2
    verts, faces = [], []
    for z, r in ((-length / 2, radius), (length / 2, r2)):
        for i in range(sides):
            t = math.tau * i / sides
            verts.append((r * math.cos(t), r * math.sin(t), z))
    for i in range(sides):
        j = (i + 1) % sides
        faces.append((i, j, sides + j, sides + i))
    faces.append(tuple(range(sides - 1, -1, -1)))
    faces.append(tuple(range(sides, 2 * sides)))
    obj = _mesh(name, verts, faces, (a + b) / 2)
    obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, key)


def ring(name, position, radius, tube, key, axis='Z', major=20, minor=7):
    verts, faces = [], []
    for i in range(major):
        u = math.tau * i / major
        for j in range(minor):
            v = math.tau * j / minor
            r = radius + tube * math.cos(v)
            verts.append((r * math.cos(u), r * math.sin(u), tube * math.sin(v)))
    for i in range(major):
        for j in range(minor):
            a = i * minor + j
            b = i * minor + (j + 1) % minor
            faces.append((a, b, ((i + 1) % major) * minor + (j + 1) % minor,
                          ((i + 1) % major) * minor + j))
    obj = _mesh(name, verts, faces, position)
    if axis == 'X':
        obj.rotation_euler.y = math.pi / 2
    if axis == 'Y':
        obj.rotation_euler.x = math.pi / 2
    return finish(obj, name, key)


def text(name, body, position, size, key, rotation):
    """Convert a short exterior marking to geometry (no font/network dependency)."""
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body, curve.align_x, curve.size, curve.extrude = body, 'CENTER', size, 0.015
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location, obj.rotation_euler = position, rotation
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return finish(obj, name, key)


def tree(name, x, y, z, citrus=False):
    """Deck tree with sculpted leafy canopy, branches and individual citrus fruit."""
    if citrus:
        pole(name+'_pot', (x,y,z), (x,y,z+0.65), 0.65, 'red', radius2=0.85)
        ring(name+'_rim', (x,y,z+0.65), 0.83, 0.075, 'white')
        pole(name+'_soil', (x,y,z+0.63), (x,y,z+0.66), 0.75, 'soil')
        z += 0.65
    pole(name+'_trunk', (x,y,z), (x+0.12,y,z+2.45), 0.16, 'darkwood', radius2=0.095)
    for i in range(5):
        a = i * math.tau / 5
        bx, by = x+math.cos(a)*0.72, y+math.sin(a)*0.72
        pole(name+'_branch'+str(i), (x,y,z+1.3), (bx,by,z+2.3), 0.075, 'darkwood', radius2=0.025)
        sphere(name+'_leaves'+str(i), (bx,by,z+2.5), (0.95,0.88,0.86), 'leaflight' if i%2 else 'leaf')
        if citrus:
            for j in range(3):
                t = a + j*1.8
                sphere(name+'_fruit'+str(i)+'_'+str(j),
                    (bx+0.7*math.cos(t), by+0.7*math.sin(t), z+2.15+j*0.1), (0.12,)*3, 'orange')
    sphere(name+'_crown', (x,y,z+2.95), (1.05,1,0.85), 'leaflight')



def stairs(name, start, end, width, steps=None, rise_target=0.185):
    """Visible steps, sized so every riser is a normal human step.

    The flight is authored in pre-enlargement coordinates, so the step count is
    derived from the *final* rise: rise x experienceScale / rise_target. Passing
    an explicit count overrides it, which the source-derived flights do.
    """
    a, b = Vector(start), Vector(end)
    scale = EXTERIOR_CONFIG['experienceScale']
    if steps is None:
        steps = max(2, int(round(abs(b.z-a.z)*scale/rise_target)))
    dx = (b.x-a.x)/steps
    for i in range(steps):
        z = a.z + (b.z-a.z)*(i+1)/steps
        box(name+'_tread'+str(i), (a.x+dx*(i+0.5),a.y,z-0.10), (abs(dx)+0.025,width,0.2), 'deck', walkable=True)
    for side in (-1,1):
        y = a.y + side*width/2
        pole(name+'_handrail', (a.x,y,a.z+1.0), (b.x,y,b.z+1.0), 0.045, 'white')
        for t in (0,0.25,0.5,0.75,1):
            p = a.lerp(b,t)
            pole(name+'_post', (p.x,y,p.z), (p.x,y,p.z+1.0), 0.04, 'white')


def paint_source(objects):
    """Recover separate painted parts instead of painting every merged mesh red."""
    for obj in objects:
        obj.data = obj.data.copy()
        obj.data.materials.clear()
        slots = list(PALETTE)
        for key in slots:
            obj.data.materials.append(material(key))
        name = obj.name.split('.')[0]
        for face in obj.data.polygons:
            c = obj.matrix_world @ face.center
            n = (obj.matrix_world.to_3x3().inverted().transposed() @ face.normal).normalized()
            key = 'timber'
            if name in ('Plane004','Plane005','Plane008','Plane009','Plane010'):
                key = 'white'
            elif name in ('Plane006','Plane007') or (name.startswith('Box') and len(face.vertices)==4 and len(obj.data.polygons)<20):
                key = 'rope'
            elif name in ('Cylinder003','Cylinder007','Cylinder004','Cylinder010','Cylinder011','Cylinder013','Cylinder014'):
                key = 'darkwood'
            elif name in ('Box002','Box003'):
                key = 'white'
            elif name in ('Line004','Line007'):
                key = 'white'
            elif name in ('Tube005','Tube009'):
                key = 'red'
            elif name == 'Circle002':
                key = 'black'
            elif name.startswith('Circle'):
                key = 'gold'
            elif name.startswith('Rectangle') and name in ('Rectangle002','Rectangle003','Rectangle004','Rectangle005','Rectangle006','Rectangle007','Rectangle008'):
                key = 'mane'
            elif name in ('Sphere001',):
                key = 'lion'
            elif name == 'Sphere002':
                key = 'cream'
            elif name == 'Sphere005':
                key = 'black'
            elif name in ('Sphere006','Sphere009'):
                key = 'gold'
            elif name in ('Cylinder001','Cylinder027'):
                key = 'cream' if abs(n.z)<0.8 else 'deck'
            elif name == 'Cylinder002':
                key = 'red' if int((math.atan2(c.y-0.55,c.x-12.6)+math.pi)*6/math.pi)%2 else 'gold'
                if c.z < -1.25:
                    key = 'cream'
            elif name in ('Cylinder006','Cylinder005'):
                # The lookout has a striped dome, cream window band and
                # cream underside. Face-centre height mispainted long roof
                # polygons cream and put the stripes on the underside.
                key = 'cream'
                if name=='Cylinder006' and n.z>.15:
                    key = 'red' if int((math.atan2(c.y-0.52,c.x+4.45)+math.pi)*6/math.pi)%2 else 'gold'
            elif name in ('Tube006','Tube007','Cylinder008','Cylinder012','Cylinder056'):
                key = 'black' if name.startswith('Cylinder') else 'white'
            elif name in ('对象001','对象002','对象003'):
                key = 'red' if abs(n.z)<0.65 else 'deck'
            elif name.startswith('Rectangle'):
                key = 'white'
            elif name.startswith('NGon'):
                key = 'black'
            elif name in ('Line002','Line006'):
                key = 'deck' if n.z>0.65 else 'timber'
            elif name in ('Box118','Box119','Box121'):
                key = 'timber'
            elif name.startswith('Tube'):
                key = 'white'
            if name == 'Line002' and n.z>0.85 and -5.2<c.x<1.8 and -6.4<c.y<6.5 and -7.65<c.z<-7.3:
                key = 'grass'
            face.material_index = slots.index(key)
        obj['sunny_authored'] = True


def surface_height(objects, x, y, ceiling):
    """Measure the source deck itself, avoiding authored fittings and rigging."""
    levels=[]
    for obj in objects:
        if obj.name != 'Line002':
            continue
        inv=obj.matrix_world.inverted()
        hit,loc,nor,_=obj.ray_cast(inv@Vector((x,y,ceiling)),inv.to_3x3()@Vector((0,0,-1)))
        if hit:
            levels.append((obj.matrix_world@loc).z)
    if not levels:
        raise RuntimeError('Missing source deck support')
    return max(levels)


def hull_sides(objects,x,z):
    """Nearest inner hull sides measured from the center of the source hull."""
    hull=next(o for o in objects if o.name=='Line002')
    inv=hull.matrix_world.inverted()
    sides=[]
    for direction in (-1,1):
        hit,loc,_,_=hull.ray_cast(inv@Vector((x,0.585,z)),inv.to_3x3()@Vector((0,direction,0)))
        if not hit:
            return None
        sides.append((hull.matrix_world@loc).y-direction*0.18)
    return sides


def dock_attachment_sides(objects,x,z):
    """Outer painted-rim extents around the Dock opening, not the inner hull wall."""
    result=[]
    for name,direction in (('Tube005',-1),('Tube009',1)):
        obj=next(o for o in objects if o.name==name)
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        local=[p.y for p in points if abs(p.x-x)<2.5 and abs(p.z-z)<2.5]
        if not local:raise RuntimeError('Missing painted Soldier Dock rim')
        result.append(min(local) if direction<0 else max(local))
    return result




def clip_face(points,axis,edge,above):
    """Clip a world-space polygon against one half-plane, preserving cut edges."""
    out=[]
    for a,b in zip(points,points[1:]+points[:1]):
        inside_a=(a[axis]>=edge) if above else (a[axis]<=edge)
        inside_b=(b[axis]>=edge) if above else (b[axis]<=edge)
        if inside_a:
            out.append(a)
        if inside_a!=inside_b:
            out.append(a.lerp(b,(edge-a[axis])/(b[axis]-a[axis])))
    return out


def assign_world_mesh(obj, mesh):
    """Bake geometry in world coordinates without moving attached child fittings."""
    if obj.children:
        bpy.context.view_layer.update()
    children = [(child, child.matrix_world.copy()) for child in obj.children]
    obj.data = mesh
    obj.matrix_world = Matrix.Identity(4)
    if children:
        bpy.context.view_layer.update()
    for child, world in children:
        child.matrix_world = world
    if children:
        bpy.context.view_layer.update()


def open_plan_slot(obj,xlo,xhi,ylo,yhi):
    """Remove a rectangular plan opening without leaving a railing across access."""
    verts=[];faces=[];materials=[]
    for face in obj.data.polygons:
        points=[obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
        left=clip_face(points,0,xlo,False)
        right=clip_face(points,0,xhi,True)
        middle=clip_face(clip_face(points,0,xlo,True),0,xhi,False)
        for polygon in (left,right,clip_face(middle,1,ylo,False),clip_face(middle,1,yhi,True)):
            if len(polygon)>=3:
                faces.append(tuple(range(len(verts),len(verts)+len(polygon))))
                verts.extend(polygon);materials.append(face.material_index)
    old=obj.data
    mesh=bpy.data.meshes.new(old.name+'_access');mesh.from_pydata(verts,[],faces);mesh.update()
    for mat in old.materials:
        mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,materials):
        face.material_index=index
    assign_world_mesh(obj, mesh)


def open_volume_slot(obj, xlo, xhi, ylo, yhi, zlo, zhi):
    """Cut an axis-aligned doorway/headroom volume while retaining other faces."""
    if obj is None:
        return
    verts, faces, materials = [], [], []
    for face in obj.data.polygons:
        remaining = [obj.matrix_world @ obj.data.vertices[i].co for i in face.vertices]
        outside = []
        for axis, edge, above in ((0,xlo,True),(0,xhi,False),(1,ylo,True),(1,yhi,False),(2,zlo,True),(2,zhi,False)):
            part = clip_face(remaining, axis, edge, not above)
            if len(part) >= 3:
                outside.append(part)
            remaining = clip_face(remaining, axis, edge, above)
            if len(remaining) < 3:
                break
        for polygon in outside:
            faces.append(tuple(range(len(verts), len(verts) + len(polygon))))
            verts.extend(polygon)
            materials.append(face.material_index)
    old = obj.data
    mesh = bpy.data.meshes.new(old.name + '_opening')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for mat in old.materials:
        mesh.materials.append(mat)
    for face, index in zip(mesh.polygons, materials):
        face.material_index = index
    assign_world_mesh(obj, mesh)


def cap_roof(obj,height):
    """Trim the warped roof above the level garden deck, retaining cabin walls."""
    old=obj.data;verts=[];faces=[];materials=[]
    for face in old.polygons:
        points=clip_face([obj.matrix_world@old.vertices[i].co for i in face.vertices],2,height,False)
        if len(points)>=3:
            faces.append(tuple(range(len(verts),len(verts)+len(points))))
            verts.extend(points);materials.append(face.material_index)
    mesh=bpy.data.meshes.new('DiningRoof_capped');mesh.from_pydata(verts,[],faces);mesh.update()
    for mat in old.materials:mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,materials):face.material_index=index
    assign_world_mesh(obj, mesh)


def plan_floor(name,outline,z):
    """Thin upward structural floor from a convex plan outline."""
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([(x,y,z) for x,y in outline],[],[tuple(range(len(outline)))])
    mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj)
    return finish(obj,name,'deck',walkable=True)


def plan_intersection_area(points, outline):
    """Actual XY overlap area; reject empty/touching masks before subdivision."""
    if len(points)<3 or len(outline)<3:
        return 0.0
    if min(max(p.x for p in points),max(p.x for p in outline))-max(min(p.x for p in points),min(p.x for p in outline))<=1e-9:
        return 0.0
    if min(max(p.y for p in points),max(p.y for p in outline))-max(min(p.y for p in points),min(p.y for p in outline))<=1e-9:
        return 0.0
    area=sum(a.x*b.y-b.x*a.y for a,b in zip(outline,outline[1:]+outline[:1]))
    sign=1 if area>=0 else -1
    polygon=points
    for a,b in zip(outline,outline[1:]+outline[:1]):
        result=[]
        for p,q in zip(polygon,polygon[1:]+polygon[:1]):
            dp=sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))
            dq=sign*((b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x))
            ip,iq=dp>=0,dq>=0
            if ip:result.append(p)
            if ip!=iq:result.append(p.lerp(q,dp/(dp-dq)))
        polygon=result
        if len(polygon)<3:return 0.0
    return abs(sum(a.x*b.y-b.x*a.y for a,b in zip(polygon,polygon[1:]+polygon[:1])))*.5


def subtract_plan_polygon(points, outline):
    """Return disjoint pieces outside a convex XY footprint, retaining Z."""
    if plan_intersection_area(points,outline)<=1e-10:
        return [points]
    remaining, outside = points, []
    area = sum(a.x*b.y-b.x*a.y for a,b in zip(outline,outline[1:]+outline[:1]))
    sign = 1 if area >= 0 else -1
    for a,b in zip(outline,outline[1:]+outline[:1]):
        def clip(poly, inside):
            result=[]
            for p,q in zip(poly,poly[1:]+poly[:1]):
                dp=sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))
                dq=sign*((b.x-a.x)*(q.y-a.y)-(b.y-a.y)*(q.x-a.x))
                ip=(dp>=0) if inside else (dp<=0)
                iq=(dq>=0) if inside else (dq<=0)
                if ip: result.append(p)
                if ip != iq: result.append(p.lerp(q,dp/(dp-dq)))
            return result
        part=clip(remaining,False)
        if len(part)>=3: outside.append(part)
        remaining=clip(remaining,True)
        if len(remaining)<3: break
    return outside


def remove_exterior_overlaps(objects, vertex_bbox):
    """Give exterior walking tops/access undersides one owner; trim duplicates.

    Stair treads take precedence over landings, then lawn and authored bridges.
    Only horizontal faces within 4 mm of those planes are clipped. Walls,
    supports, railings, apertures and all non-overlapping floor pieces remain.
    """
    patterns=('ForeUpperLanding','ForeLanding','Lawn','GardenDeck','AftEntryDeck',
              'ForedeckSupport','LawnSidewalk','ForeDoorApproach',
              'ForeStarboardDoorApproach','AquariumDoorApproach','WomensDoorApproach',
              'GardenStair_lowerLanding','GardenStair_upperLanding','SternBalcony_floor',
              'SternBalcony_access','InteriorFloor_F3_library','SternAccess_floor','SternAccess_neck',
              'InteriorFloor_F3_bath','Library_ceiling',
              'InteriorFloor_F1_fore','InteriorFloor_F2_fore','ForeF1_ceiling','ForeF2_ceiling',
              'InteriorFloor_F2_service','InteriorFloor_F2_aft',
              'AquariumFloor_entry','AquariumFloor_shell')
    def rank(obj):
        if obj.get('sunny_stair'): return 0
        name=obj.name.removeprefix('Sunny_').split('.')[0]
        for i,p in enumerate(patterns):
            if name==p or (p=='LawnSidewalk' and name.startswith(p)): return i+1
        return 999
    ordered=sorted(objects,key=lambda o:(rank(o),o.name))
    priority={o.name:i for i,o in enumerate(ordered)}
    buckets={}
    for obj in ordered:
        if rank(obj)==999: continue
        obj.data.calc_loop_triangles()
        for tri in obj.data.loop_triangles:
            p=[obj.matrix_world@obj.data.vertices[i].co for i in tri.vertices]
            if max(v.z for v in p)-min(v.z for v in p)>.0001: continue
            z=sum(v.z for v in p)/3
            if obj.get('sunny_stair'):
                # Some imported treads have reversed winding. Their actual
                # top still owns the landing seam, independent of the normal.
                if abs(z-vertex_bbox(obj)[1].z)>.0001: continue
            elif (p[1]-p[0]).cross(p[2]-p[0]).z<=.000001 and not obj.get('sunny_visual_floor_thickness'): continue
            bounds=(min(v.x for v in p),max(v.x for v in p),min(v.y for v in p),max(v.y for v in p))
            buckets.setdefault(round(z/.01),[]).append((obj.name,z,bounds,p))
    total=0
    for obj in ordered:
        old=obj.data;verts=[];faces=[];indices=[];changed=0
        for face in old.polygons:
            points=[obj.matrix_world@old.vertices[i].co for i in face.vertices]
            pieces=[points]
            if max(v.z for v in points)-min(v.z for v in points)<.0001:
                z=sum(v.z for v in points)/len(points)
                bounds=(min(v.x for v in points),max(v.x for v in points),min(v.y for v in points),max(v.y for v in points))
                bucket=round(z/.01)
                for owner,height,box2,outline in (m for k in (bucket-1,bucket,bucket+1) for m in buckets.get(k,[])):
                    if priority[owner]>=priority[obj.name] or abs(z-height)>.004: continue
                    if min(bounds[1],box2[1])-max(bounds[0],box2[0])<=.000001: continue
                    if min(bounds[3],box2[3])-max(bounds[2],box2[2])<=.000001: continue
                    pieces=[q for p in pieces for q in subtract_plan_polygon(p,outline)]
                if pieces!=[points]: changed+=1
            for p in pieces:
                if len(p)<3: continue
                area=sum(((p[i]-p[0]).cross(p[i+1]-p[0]) for i in range(1,len(p)-1)),Vector())
                if area.length<.0000001: continue
                faces.append(tuple(range(len(verts),len(verts)+len(p))))
                verts.extend(p);indices.append(face.material_index)
        if not changed: continue
        mesh=bpy.data.meshes.new(old.name+'_single_surface');mesh.from_pydata(verts,[],faces);mesh.update()
        for mat in old.materials: mesh.materials.append(mat)
        for face,index in zip(mesh.polygons,indices): face.material_index=index
        assign_world_mesh(obj, mesh)
        obj['sunny_removed_overlap_faces']=changed
        total+=changed
    bpy.context.view_layer.update()
    return total


def add_garden_deck():
    """Level garden platform matching the broad F3 dining-roof footprint."""
    outline=[]
    for x,y,a in ((9.22,6.75,0),(4.5,6.75,math.pi/2),(4.5,-5.62,math.pi),(9.22,-5.62,3*math.pi/2)):
        for i in range(5):
            angle=a+i*math.pi/8
            outline.append((x+0.5*math.cos(angle),y+0.5*math.sin(angle)))
    obj=plan_floor('GardenDeck',outline,-2.42)
    for y in (-6.0,7.17):open_plan_slot(obj,3.0,7.4,y-0.85,y+0.85)
    return obj


def rebuild_stair_rails(objects,vertex_bbox):
    """Rails along both widened fore lower flights, with unobstructed exits."""
    before=set(bpy.data.objects)
    for low,high,label in ((85,103,'ForeStarRail'),(104,117,'ForePortRail'),(52,69,'ForeUpperRail')):
        treads=[o for o in objects if o.get('sunny_stair') and o.name.startswith('Box') and low<=int(o.name[3:].split('.')[0])<=high]
        treads.sort(key=lambda o:vertex_bbox(o)[1].z)
        # Open transfer zone: lower rails end before the landing, upper rails
        # start after the first two treads. This leaves room to turn into it.
        treads=treads[2:] if low==52 else treads[:-2]
        for side in (0,1):
            path=[]
            for index,obj in enumerate(treads):
                lo,hi=vertex_bbox(obj)
                x=(lo.x+hi.x)/2
                y=(lo.y+0.03) if side==0 else (hi.y-0.03)
                p=(x,y,hi.z+0.98);path.append(p)
                if index%3==0 or index==len(treads)-1:
                    post=pole(label+'_post',(x,y,hi.z),p,0.025,'white')
                    post['sunny_rail']=True;post['sunny_obstacle']=True
            for a,b in zip(path,path[1:]):
                rail=pole(label+'_handrail',a,b,0.032,'white')
                rail['sunny_rail']=True;rail['sunny_obstacle']=True
    return [o for o in bpy.data.objects if o not in before and o.type=='MESH']


def add_exterior(fore_z,dock_sides):
    """Authored lawn furniture, gardens, helm, hatches, fittings and deck connections."""
    before = set(bpy.data.objects)
    # Broad open lawn between the foremast stairwell and the aft aquarium facade.
    # Built as a frame plus fill pieces: the reference puts the Soldier Dock
    # System hatch on the lawn, so the opening has to be a real hole, not a lid
    # painted on solid grass. `Sunny_Lawn` itself still spans the full lawn so
    # the asset audit can measure the lawn length from it.
    box('Lawn', (-1.55,0.52,-7.55), (7.1,11.4,0.10), 'grass', walkable=True)
    for side in (-1,1):
        box('Lawn_edging', (-1.55,0.52+side*5.75,-7.48), (7.25,0.1,0.12), 'deck')
    tree('ShadeTree_port', 0.0, 4.35, -7.48)
    tree('ShadeTree_starboard', 0.0, -3.35, -7.48)
    # The swing hangs from the port tree; it is an exterior interaction anchor.
    pole('Swing_branch', (0,4.35,-5.45), (-1.8,4.35,-5.1), 0.10,'darkwood')
    for x in (-1.65,-0.8):
        pole('Swing_rope', (x,4.35,-5.15), (x,4.35,-6.9), 0.024,'rope')
    box('Swing_seat', (-1.225,4.35,-6.86), (1.02,0.4,0.10),'deck')
    # Slide descends along the starboard side from the dining-room level to the lawn.
    verts=[]
    for i in range(19):
        t=i/18
        x=2.65-t*4.15
        z=-5.2-2.25*(t*t*(3-2*t))
        verts.extend([(x,-4.85,z),(x,-3.95,z)])
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(18)]
    me=bpy.data.meshes.new('Slide'); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new('Slide',me); bpy.context.scene.collection.objects.link(ob)
    finish(ob,'Slide_chute','gold')
    for side in (-4.88,-3.92):
        for i in range(18):
            a=verts[2*i]; b=verts[2*i+2]
            pole('Slide_side', (a[0],side,a[2]+0.13),(b[0],side,b[2]+0.13),0.085,'red')
    # Three inherited mikan trees, Robin's flowers and post-timeskip Pop Greens.
    for i,(x,y) in enumerate(((8.25,-3.9),(6.2,4.9),(8.25,4.9))):
        tree('Mikan'+str(i),x,y,-2.42,citrus=True)
    # The kitchen flue is ship structure and scales with the hull; the Usopp
    # factory bench, gardens, helm, navigation instruments, hatches, portholes
    # and doors are human objects and are authored at true size after the
    # enlargement by `add_fittings`.
    pole('KitchenChimney',(9.65,-3.0,-2.42),(9.65,-3.0,0.2),0.28,'black')
    ring('KitchenChimney_cap',(9.65,-3.0,0.2),0.35,0.06,'black')
    # Retain the source's actual fore/aft stair flights. Adding parallel flights
    # at the hull corners duplicated them and climbed beyond the foredeck.
    # Inset the rear flights inside the hull. Slots through the dining roof
    # provide head clearance; upper platforms turn inward onto the garden.
    for y in (-6.0,7.17):
        inward=-1 if y>0 else 1
        box('GardenStair_lowerLanding',(3.4,y,-5.36),(1.5,1.65,0.2),'deck',walkable=True)
        stairs('GardenStair',(3.4,y,-5.26),(6.8,y,-2.42),1.35,18)
        box('GardenStair_upperLanding',(7.25,y+inward*0.9,-2.52),(0.9,3.2,0.2),'deck',walkable=True)
    add_garden_deck()
    box('ForeUpperLanding',(-8.2,1.41,fore_z-0.10),(1.3,2.3,0.20),'deck',walkable=True)
    # The curved fore flights share a broad cross-landing rather than ending
    # against the transverse guardrail. The upper flight opens onto this strip.
    box('ForeLanding',(-6.22,0.585,-5.72),(1.15,6.8,0.20),'deck',walkable=True)
    # Walk around the circular stern room on its exterior balcony.
    verts=[]
    for i in range(49):
        a=math.tau*i/48
        for r in (3.0,3.85):
            verts.append((12.6+r*math.cos(a),0.55+r*math.sin(a),-2.32))
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(48)]
    me=bpy.data.meshes.new('SternBalcony'); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new('SternBalcony',me); bpy.context.scene.collection.objects.link(ob)
    finish(ob,'SternBalcony_floor','white',walkable=True)
    ring('SternBalcony_rail',(12.6,0.55,-1.32),3.8,0.045,'white')
    for i in range(24):
        a=math.tau*i/24
        x,y=12.6+3.8*math.cos(a),0.55+3.8*math.sin(a)
        pole('SternBalcony_post',(x,y,-2.32),(x,y,-1.32),0.04,'white')
    box('SternBalcony_access',(9.0,0.55,-2.42),(1.5,1.5,0.2),'deck',walkable=True)
    # Soldier Dock entrance discs: timber shutters, black rims, red channel number.
    for direction,y in ((-1,dock_sides[0]-0.06),(1,dock_sides[1]+0.06)):
        pole('Dock1_shutter',(-0.35,y,-9.95),(-0.35,y+direction*0.08,-9.95),1.45,'white')
        ring('Dock1_rim',(-0.35,y+(-0.10 if y<0 else 0.10),-9.95),1.52,0.16,'black','Y')
        text('Dock1_number','1',(-0.35,y+(-0.16 if y<0 else 0.16),-10.9),1.8,'red',(math.pi/2,0,math.pi if y>0 else 0))
    # Lion face: ivory muzzle, black pupils, white eye rims, little smile.
    for y in (-0.215,1.485):
        sphere('LionEye_white',(-18.67,y,-2.55),(0.14,0.30,0.34),'white')
        sphere('LionEye_pupil',(-18.80,y,-2.55),(0.05,0.18,0.22),'black')
    smile=[]
    for i in range(17):
        t=-1+2*i/16
        y=0.615+t*0.66
        z=-4.40+0.38*t*t
        # Follow the front ellipsoid of the original ivory muzzle.
        x=-18.76-0.59*math.sqrt(max(0.0,1-((y-0.615)/1.21)**2-((z+3.785)/1.0)**2))-0.025
        smile.append((max(x, -19.43),y,z))
    for a,b in zip(smile,smile[1:]):
        pole('LionSmile',a,b,0.026,'black')
    # Stern Coup de Burst vent face rather than an empty red tube.
    pole('CoupDeBurst_vent',(15.0,0.57,-8.1),(15.1,0.57,-8.1),1.75,'black')
    for i in range(7):
        y=0.57-1.25+i*0.42
        pole('CoupDeBurst_grille',(15.13,y,-9.25),(15.13,y,-6.95),0.055,'black')
    additions=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    for obj in additions:
        if obj.get('sunny_feature') in ('Helm','LogPose','SoldierDock'):
            obj.location.z += fore_z+2.0
        if obj.get('sunny_feature') in ('RobinGarden','PopGreens'):
            obj.location.z -= 0.045
        if 'Stair_tread' in obj.name:
            obj['sunny_stair'] = True
    return additions


# --------------------------------------------------------------------------
# human-scale pass: authored in real metres on the enlarged ship
# --------------------------------------------------------------------------
from sunny_interiors import (  # noqa: E402  (needs bpy state from the pipeline)
    CENTRE_Y, LEVEL_B1, LEVEL_F1, LEVEL_F2A, LEVEL_F2F, LEVEL_F3G, Frame,
    build_interiors, chair, hatch, open_plan_slot, rbox, switchback, rpole,
    sink, stair_flight, table, stool, workbench, planter, pot_plant, ladder,
    toilet, wall_run, door, inset_outline,
)

FLIGHT_GROUPS = (('aft port', 8, 28), ('aft starboard', 29, 49), ('fore upper', 52, 69),
                 ('fore lower starboard', 85, 103), ('fore lower port', 104, 117))


def _tread_centre(bb):
    return Vector(((bb[0].x + bb[1].x) / 2, (bb[0].y + bb[1].y) / 2, bb[0].z + bb[1].z))


def fore_rim_outline(obj, height):
    """Inset the convex curved foredeck perimeter from retained rim footings.

    Gaps between source guard pieces prevent continuous section rays. Actual
    coplanar footing vertices establish the plan without a guessed metric arc.
    """
    points = sorted({(round(p.x, 6), round(p.y, 6))
                     for v in obj.data.vertices
                     for p in (obj.matrix_world @ v.co,)
                     if abs(p.z-height) < .003})
    if len(points) < 16:
        raise RuntimeError('foredeck rim has no complete sourced footing')

    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

    chains = []
    for ordered in (points, reversed(points)):
        chain = []
        for p in ordered:
            while len(chain) > 1 and cross(chain[-2], chain[-1], p) <= 1e-8:
                chain.pop()
            chain.append(p)
        chains.append(chain[:-1])
    outline = chains[0]+chains[1]
    if len(outline) < 12:
        raise RuntimeError('foredeck lost its curved source perimeter')
    return inset_outline(outline, .12)


def _fit_box(obj, centre, size, bb):
    """Reshape an existing mesh so its world bounds become centre/size."""
    old_centre = (bb[0] + bb[1]) / 2
    old_size = bb[1] - bb[0]
    inv = obj.matrix_world.inverted()
    for vertex in obj.data.vertices:
        p = obj.matrix_world @ vertex.co
        q = Vector((centre.x + (p.x - old_centre.x) * size[0] / max(old_size.x, 1e-6),
                    centre.y + (p.y - old_centre.y) * size[1] / max(old_size.y, 1e-6),
                    centre.z + (p.z - old_centre.z) * size[2] / max(old_size.z, 1e-6)))
        vertex.co = inv @ q
    obj.data.update()


def retread_flights(objects, vertex_bbox, rise_target=0.185):
    """Give every source stair flight normal human risers.

    The source flights were authored for a 39 m ship and are enlarged with it,
    so their risers would grow with the hull. Each flight is re-spaced along its
    own curved centreline so every step is `rise_target` tall, adding treads when
    a flight needs more of them. Names are preserved (new treads get Blender's
    `.001` suffix) so the stair audit keeps identifying the same flights.
    """
    from mathutils import Matrix  # local: already imported at module scope
    report = []
    for label, lo, hi in FLIGHT_GROUPS:
        treads = [o for o in objects if o.get('sunny_stair') and o.name.startswith('Box')
                  and o.name[3:].split('.')[0].isdigit()
                  and lo <= int(o.name[3:].split('.')[0]) <= hi]
        treads.sort(key=lambda o: vertex_bbox(o)[1].z)
        if len(treads) < 3:
            continue
        boxes = [vertex_bbox(o) for o in treads]
        pts = [_tread_centre(b) for b in boxes]
        cum = [0.0]
        for i in range(1, len(pts)):
            cum.append(cum[-1] + (pts[i] - pts[i - 1]).length)
        total = cum[-1]
        if total < 1e-6:
            continue
        bottom, top = boxes[0][1].z, boxes[-1][1].z
        rise = top - bottom
        n = max(len(treads), int(round(rise / rise_target)))

        def sample(frac):
            want = frac * total
            for i in range(1, len(cum)):
                if cum[i] >= want or i == len(cum) - 1:
                    span = cum[i] - cum[i - 1]
                    t = 0.0 if span < 1e-9 else (want - cum[i - 1]) / span
                    t = max(0.0, min(1.0, t))
                    return pts[i - 1].lerp(pts[i], t)
            return pts[-1]

        while len(treads) < n:
            clone = treads[len(treads) % len(treads)].copy()
            clone.data = treads[len(treads) % len(treads)].data.copy()
            bpy.context.scene.collection.objects.link(clone)
            treads.append(clone)
        for o in treads[n:]:
            objects.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
        del treads[n:]
        thickness = 0.17
        for i, obj in enumerate(treads):
            frac = (i + 1) / n
            centre = sample(frac)
            bb = vertex_bbox(obj)
            width = min(bb[1].y - bb[0].y, 2.60)
            depth = max(0.34, (total / n))
            centre.z = bottom + rise * frac - thickness / 2
            _fit_box(obj, centre, (depth, width, thickness), bb)
            obj['sunny_stair'] = True
            obj['sunny_walkable'] = True
        report.append((label, len(treads), round(rise / n, 3)))
    for suffix in ('', '.001'):
        garden = [o for o in objects if o.name.startswith('Sunny_GardenStair_tread') and
                  ('.' in o.name) == bool(suffix)]
        garden.sort(key=lambda o: vertex_bbox(o)[1].z)
        if not garden:
            continue
        first, last = vertex_bbox(garden[0]), vertex_bbox(garden[-1])
        start = Vector(((first[0].x+first[1].x)/2,(first[0].y+first[1].y)/2,first[1].z))
        end = Vector(((last[0].x+last[1].x)/2,(last[0].y+last[1].y)/2,last[1].z))
        rise=end.z-start.z
        n=max(2,math.ceil(rise/rise_target))
        width=2.6
        for obj in garden:
            objects.remove(obj)
            bpy.data.objects.remove(obj,do_unlink=True)
        for i in range(n+1):
            t=i/n
            c=start.lerp(end,t)
            obj=box('GardenStair_tread%d%s'%(i,suffix),(c.x,c.y,c.z-0.085),
                    ((end.x-start.x)/n+0.04,width,0.17),'deck',walkable=True)
            obj['sunny_stair']=True
    return report


def add_fittings(objects, vertex_bbox, frame, interiors):
    """Human-scale exterior fittings, portholes, hatches and their access."""
    f = frame
    levels = interiors['levels']
    cy=f.y(CENTRE_Y)
    extent=EXTERIOR_CONFIG['experienceScale']/2.0
    report = {}

    def exterior_floor(name, outline, height):
        return plan_floor(name,[(x*extent,y*extent) for x,y in outline],height)

    def find(name):
        # interior floors were authored a moment ago, so look at the whole scene
        return bpy.data.objects.get(name) or bpy.data.objects.get('Sunny_' + name)

    # Deck strips bridge source gaps exposed by experience enlargement.
    for side in (-1,1):
        z = -12.44 if side < 0 else 10.36
        y0,y1 = ((12.1,15.0) if side < 0 else (-13.2,-10.0))
        exterior_floor('LawnSidewalk%d'%side,[(-13.7,y0),(9.4,y0),(9.4,y1),(-13.7,y1)],levels['F1'])
    exterior_floor('ForeDoorApproach',[(-16.0,7.0),(-12.5,7.0),(-12.5,9.4),(-16.0,9.4)],levels['F1'])
    exterior_floor('ForeStarboardDoorApproach',[(-16,-7.4),(-12.5,-7.4),(-12.5,-5.1),(-16,-5.1)],levels['F1'])
    plan_floor('AquariumDoorApproach',[(7.0,-0.05),(9.5,-0.05),(9.5,2.4),(7.0,2.4)],levels['F1'])
    exterior_floor('WomensDoorApproach',[(-19,-7.3),(-14.7,-7.3),(-14.7,-5.4),(-19,-5.4)],levels['F2F'])
    exterior_floor('AftEntryDeck',[(8.9,-14.9),(12.4,-14.9),(12.4,15),(8.9,15)],levels['F2A'])
    bpy.context.view_layer.update()
    # Body clearance over the last exterior treads: the aquarium's corner wall
    # must end below their standing footprint, before the player reaches the
    # upper tread. Leaving only a centre-line gap produced an actual WASD stall.
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Sunny_Aquarium_shell'):
            for y0,y1 in ((10.7,15.1),(-15.1,-12.3)):
                open_volume_slot(obj,7.75*extent,12.45*extent,y0*extent,y1*extent,levels['F2A']-.9,levels['F2A']+2.2)
    for obj in objects:
        if obj.name in ('对象001','对象002','对象003','Tube008.001'):
            # The recovered closed house already has the exact standing
            # volume of every garden tread cut from it. This older lower-
            # flight box also reaches into the room-facing cheek, below the
            # upper stair, and would erase its enclosure after construction.
            if obj.get('sunny_aft_native_envelope'):
                continue
            for y0,y1 in ((10.7,14),(-15.1,-12.3)):
                open_volume_slot(obj,8.9*extent,12.45*extent,y0*extent,y1*extent,levels['F2A']-.15,levels['F2A']+2.2)

    # ---- forward helm, Log Pose and Soldier Dock controls ---------------
    foredeck = vertex_bbox(find('Sunny_ForeUpperLanding'))[1].z
    helm_outline = fore_rim_outline(find('Line006'), foredeck)
    plan_floor('ForedeckSupport', helm_outline, foredeck)
    report['helmOutline'] = dict(outline=helm_outline,
        reference='F3 rounded helm plan; retained Line006 rim footings in reconstructed metres')
    helm = (f.x(-11.55), f.y(CENTRE_Y), foredeck)
    box('Helm_deckplate', (helm[0], helm[1], foredeck + 0.06), (1.9, 1.9, 0.12), 'deck')
    pole('Helm_pedestal', (helm[0], helm[1], foredeck),
         (helm[0], helm[1], foredeck + 1.12), 0.19, 'darkwood')
    ring('Helm_wheel', (helm[0] + 0.10, helm[1], foredeck + 1.12), 0.62, 0.072, 'darkwood', 'X')
    pole('Helm_hub', (helm[0] - 0.06, helm[1], foredeck + 1.12),
         (helm[0] + 0.30, helm[1], foredeck + 1.12), 0.12, 'gold')
    for i in range(8):
        a = i * math.tau / 8
        pole('Helm_spoke', (helm[0] + 0.10, helm[1], foredeck + 1.12),
             (helm[0] + 0.10, helm[1] + math.sin(a) * 0.78, foredeck + 1.12 + math.cos(a) * 0.78),
             0.033, 'darkwood')
    for a in (0.0, math.pi):
        rbox('Helm_hubcap', (helm[0] + 0.10, helm[1], foredeck + 1.12), 0.0,
             (0.16, 0.62, 0.62), 'darkwood', (0, 0, 0))
    # bench beside the wheel, exactly as the reference describes
    rbox('Helm_bench', (helm[0] + 0.1, helm[1] - 2.4, foredeck), 0.0, (1.9, 0.46, 0.08), 'timber',
         (0, 0, 0.46), obstacle=True)
    for dx in (-0.75, 0.75):
        rbox('Helm_benchleg', (helm[0] + 0.1, helm[1] - 2.4, foredeck), 0.0, (0.09, 0.42, 0.44),
             'darkwood', (dx, 0, 0.22))
    # Log Pose on its pillar directly behind the helm
    lp = (helm[0] + 1.55, helm[1], foredeck)
    pole('LogPose_stand', (lp[0], lp[1], lp[2]), (lp[0], lp[1], lp[2] + 0.86), 0.15, 'white')
    sphere('LogPose_globe', (lp[0], lp[1], lp[2] + 1.16), (0.28, 0.28, 0.30), 'glass')
    ring('LogPose_rim', (lp[0], lp[1], lp[2] + 1.16), 0.29, 0.035, 'gold', 'X')
    for i in range(3):
        z=lp[2]+1.10+i*.06
        pole('LogPose_needle%d'%i,(lp[0],lp[1]-.22,z),(lp[0],lp[1]+.22,z),.014,('red','gold','blue')[i])
    # H retains a curved timber enclosure behind the wheel/pillar. The source
    # railing had enlarged to almost three metres tall, while its spare pole
    # duplicated the new Log Pose stand. Keep the actual curved rail shape at
    # human height and leave its open bow-facing entrance/control approaches.
    guard = find('Box122')
    ga, gb = vertex_bbox(guard)
    scale = 1.05/(gb.z-ga.z)
    anchor = Vector((ga.x, (ga.y+gb.y)/2, ga.z))
    destination = Vector((lp[0]+.60, lp[1], foredeck-.012))
    guard.matrix_world = (Matrix.Translation(destination) @ Matrix.Scale(scale,4) @
                          Matrix.Translation(-anchor) @ guard.matrix_world)
    finish(guard, 'Helm_guard', 'timber', obstacle=True)
    for face in guard.data.polygons:
        face.material_index = 0
    guard['sunny_rail'] = True
    guard['sunny_source_feature'] = 'Box122'
    spare = find('Cylinder044')
    for child in list(spare.children):
        world = child.matrix_world.copy()
        child.parent = None
        child.matrix_world = world
    if spare in objects:
        objects.remove(spare)
    bpy.data.objects.remove(spare, do_unlink=True)
    bpy.context.view_layer.update()
    # Soldier Dock knob and Coup de Burst lever on the wheel itself
    console = (helm[0] - 0.60, helm[1] + 1.95, foredeck)
    rbox('SoldierDock_console', console, 0.0, (0.62, 0.58, 1.02), 'white', (0, 0, 0.51), obstacle=True)
    ring('SoldierDock_selector', (console[0], console[1] - 0.32, console[2] + 0.86), 0.22, 0.05, 'gold', 'Y')
    for i in range(7):
        a = i * math.tau / 7
        sphere('SoldierDock_dial%d' % i,
               (console[0] + 0.22 * math.cos(a), console[1] - 0.34, console[2] + 0.86 + 0.22 * math.sin(a)),
               (0.035, 0.02, 0.035), 'black')
    rbox('SoldierDock_lever_base', (console[0] - 0.36, console[1], console[2] + 1.06), 0.0,
         (0.34, 0.34, 0.12), 'red')
    pole('SoldierDock_lever', (console[0] - 0.36, console[1], console[2] + 1.10),
         (console[0] - 0.52, console[1], console[2] + 1.46), 0.036, 'black')
    sphere('SoldierDock_knob', (console[0] - 0.52, console[1], console[2] + 1.46), (0.075,) * 3, 'red')
    report['helm'] = foredeck

    # ---- observation deck: Usopp branch office and the two gardens -------
    garden = levels['F3G']
    planter('Usopp_bench', (f.x(6.6), f.y(2.9), garden), 0.0, 1.9, 0.55, 0.46)
    for name, x, y, flower in (('RobinGarden', 5.0, -4.4, 'pink'), ('PopGreens', 5.0, 4.6, 'mane')):
        box(name + '_planter', (f.x(x), f.y(y), garden + 0.28), (2.35, 1.05, 0.56), 'white', obstacle=True)
        box(name + '_soil', (f.x(x), f.y(y), garden + 0.57), (2.20, 0.92, 0.07), 'soil')
        for i in range(7):
            px = f.x(x) - 0.95 + i * 0.31
            pole(name + '_stem', (px, f.y(y), garden + 0.58), (px, f.y(y), garden + 1.12), 0.024, 'leaf')
            sphere(name + '_leaf', (px, f.y(y) + 0.1, garden + 0.82), (0.12, 0.20, 0.06), 'leaflight')
            sphere(name + '_flower', (px, f.y(y), garden + 1.18), (0.14, 0.14, 0.10), flower)
    for i, yv in enumerate((-3.0, 3.0)):
        rbox('Garden_rail%d' % i, (f.x(4.4), f.y(yv), garden), 0.0, (0.06, 0.06, 1.0), 'white',
             (0, 0, 0.5), obstacle=True)
    # Usopp factory branch office: drawing board and a stool
    rbox('Usopp_office_board', (f.x(4.35), f.y(0.2), garden + 1.5), 0.0, (0.05, 1.8, 1.1), 'cream')
    for dy in (-.72,.72):
        rbox('Usopp_office_board_leg',(f.x(4.35),f.y(.2),garden),0,(.07,.07,1.0),'darkwood',(0,dy,.50))
        rbox('Usopp_office_board_foot',(f.x(4.35),f.y(.2),garden),0,(.42,.16,.06),'darkwood',(0,dy,.03))
    for i in range(3):
        rbox('Usopp_office_drawing%d' % i, (f.x(4.42), f.y(-0.4 + i * 0.6), garden + 1.5), 0.0,
             (0.02, 0.5, 0.7), 'white')
    stool('Usopp_office_stool', (f.x(5.0), f.y(0.2), garden))
    workbench('Garden_workbench', (f.x(7.8), f.y(4.8), garden), math.pi / 2, 2.4, 0.8, 0.88)

    # N/A show arched sash windows on these facades; round hull ports belong
    # lower/on the painted side panels and are built separately.
    for feature,x,level,ys,radius,trim in (
        ('AquariumWindow',8.65,levels['F1'],(cy-8.0,cy-3.2,cy+3.2,cy+8.0),.60,'white'),
        ('DiningWindow',12.3,levels['F2A'],(cy-8.8,cy-1.7,cy+1.7,cy+8.8),.55,'gold')):
        if feature == 'DiningWindow':
            continue  # source-shaped F2 arches are cut with closed reveals below
        for y in ys:
            bottom=level+.95;spring=bottom+1.15;top=spring+radius
            for obj in list(bpy.data.objects):
                if obj.type=='MESH' and (obj.name.startswith(('Sunny_RoomPartition_aqua_fwd','Sunny_RoomPartition_DiningEntrance','Sunny_RoomPartition_KitchenEntrance','Sunny_AftF2_shell','Sunny_Aquarium_shell')) or obj.name in ('Tube008.001','对象001','对象002','对象003','Line002')):
                    open_volume_slot(obj,x-.8,x+.8,y-radius,y+radius,bottom,top)
            arch=[Vector((x-.10,y+radius*math.cos(i*math.pi/24),spring+radius*math.sin(i*math.pi/24))) for i in range(25)]
            for p,q in zip(arch,arch[1:]):pole(feature+'_frame',p,q,.055,trim)
            for direction in (-1,1):pole(feature+'_jamb',(x-.10,y+direction*radius,bottom),(x-.10,y+direction*radius,spring),.055,trim)
            pole(feature+'_sill',(x-.10,y-radius,bottom),(x-.10,y+radius,bottom),.055,trim)
            glass=[Vector((x+.01,y-radius,bottom)),Vector((x+.01,y+radius,bottom))]+[Vector((x+.01,p.y,p.z)) for p in arch]
            ob=finish(_mesh(feature+'_glass',glass,[tuple(range(len(glass)))]),feature+'_glass','glass',obstacle=True)
            ob['sunny_window_arch']=True
            pole(feature+'_mullion',(x-.08,y,bottom),(x-.08,y,top),.028,'black')
            for h in (.50,1.05):pole(feature+'_crossbar',(x-.08,y-radius,bottom+h),(x-.08,y+radius,bottom+h),.026,'black')
            # Retain solid cream corners above the arch instead of a square
            # hole leaking daylight around the curved frame.
            verts=[];faces=[]
            for p,q in zip(arch,arch[1:]):
                k=len(verts);verts.extend([(x-.03,p.y,p.z),(x-.03,q.y,q.z),(x-.03,q.y,top),(x-.03,p.y,top)]);faces.append(tuple(range(k,k+4)))
            ob=_mesh(feature+'_wall_corners',verts,faces);finish(ob,feature+'_wall_corners','cream')

    from sunny_aft_envelope import add_aft_windows
    add_aft_windows(objects,frame,interiors)

    # ---- hatches, with a real opening beneath each one ------------------
    def shaft(x0, x1, y0, y1, z0, z1):
        # Every overlapping source/authored deck must have the same headroom hole.
        for obj in list(bpy.data.objects):
            if obj.type != 'MESH' or obj.get('sunny_stair'):
                continue
            if obj.get('sunny_walkable') or 'ceiling' in obj.name or obj.name in ('Line002','Line006','对象001','对象002','对象003'):
                if obj.get('sunny_aft_native_envelope'):
                    from sunny_aft_envelope import closed_box_cut
                    closed_box_cut(obj,(x0,x1,y0,y1,z0,z1))
                else:
                    open_volume_slot(obj, x0,x1,y0,y1,z0,z1)

    def stair_hatch(id_, x0, x1, y, z, width, rooms, slide_sign=1):
        """Cover the full upper-flight headroom slot, with its exit beside it."""
        return hatch(id_, ((x0+x1)/2,y,z), 0, (x1-x0,width),
                     rooms=rooms, slide_sign=slide_sign)

    b1 = levels['B1']
    # The exported floor proxy has a 0.60 m underside; include it, a standing
    # body and tread/radius overlap when locating the lower headroom boundary.
    hatch_headroom = 2.70
    hx, hy = -5.6, 8.8
    run, width, gap = 4.6, 1.40, 1.50
    sep = width + gap
    dock_headroom_end = hx + hatch_headroom*run/((levels['F1']-b1)/2) + .45
    shaft(hx-1.5, dock_headroom_end, hy-width/2-0.12, hy+width/2+0.12, levels['F1']-2.2, levels['F1']+0.2)
    switchback('SoldierDockStair', (hx, hy+sep, b1), 0.0, levels['F1']-b1, run,width,gap)
    stair_hatch('SoldierDockHatch',hx-.15,dock_headroom_end,hy,levels['F1'],1.40,
                ('F1','Soldier Dock System'))

    # The reference places these outside under the foremast stairwells, reached
    # from the lawn. The preceding F2 side boxes floated beside the landing.
    # Keep fixtures human-sized; only the exposed shell/entry station changes.
    for side in (-1,1):
        tx, ty, floor = -15.9, side*3.70, levels['F1']
        wall_run('ForeToilet_front',(tx+.80,ty,floor),math.pi/2,1.70,2.10)
        wall_run('ForeToilet_inner',(tx,ty-side*.85,floor),0,1.60,2.10)
        wall_run('ForeToilet_wall',(tx,ty+side*.85,floor),0,1.60,2.10,
                 openings=((.20,1.10,2.10),),key='cream',thickness=.14)
        wall_run('ForeToilet_back',(tx-.80,ty,floor),math.pi/2,1.70,2.10)
        rbox('ForeToilet_ceiling',(tx,ty,floor+2.10),0,(1.60,1.70,.12),'cream',obstacle=True)
        rbox('ForeToilet_floor',(tx,ty,floor),0,(1.60,1.70,.12),'deck',(0,0,-.06),walkable=True)
        door('ForeToiletDoor%d'%side,(tx+.20,ty+side*.85,floor),0,1.10,2.10,'swing',side,
             rooms=('Fore Toilet','Lawn'),key='white')
        toilet('ForeToilet%d'%side,(tx-.42,ty+.40,floor),math.pi/2)
        sink('ForeToilet_sink%d'%side,(tx-.42,ty-.42,floor),math.pi/2)
        interiors['rooms'].append(dict(level='F1',name='Fore '+('Port' if side<0 else 'Starboard')+' Toilet',x=(tx-.80,tx+.80),y=(ty-.85,ty+.85)))

    # N: small sealed, framed ladder hatch in the exposed fore gallery.
    # Its exact metre/lateral offsets are reconstructed within the retained
    # gallery, rather than stretching a stair cover into the galley footprint.
    ax, ay = 11.55, f.y(CENTRE_Y)-8.8
    shaft(ax-.70,ax+.70,ay-.675,ay+.675,levels['F1']+.02,levels['F2A']+.20)
    hatch('AquariumHatch',(ax,ay,levels['F2A']),0,(1.40,1.35),
          rooms=('Aft Gallery','Aquarium Bar'),mode='lift',grille=True)
    for side in (-1,1):
        pole('AquariumLadder_rail%d'%side,(ax-.48,ay+side*.30,levels['F1']+.02),
             (ax-.48,ay+side*.30,levels['F2A']-.08),.035,'black',sides=10)
    count=math.ceil((levels['F2A']-levels['F1'])/.30)
    for i in range(count+1):
        z=levels['F1']+(levels['F2A']-levels['F1'])*i/count
        pole('AquariumLadder_rung%d'%i,(ax-.48,ay-.30,z),(ax-.48,ay+.30,z),.025,'darkwood',sides=10)
    interiors['exteriorClimbs']=[dict(id='aquarium-ladder',label='Aquarium gallery ladder',hatch='AquariumHatch',
        points=[[ax,ay,levels['F1']],[ax,ay,levels['F2A']],[ax,ay+1.60,levels['F2A']]],
        reference='N: small sealed fore-gallery hatch; metre and lateral clearances reconstructed')]

    # F2's small stern ladder connection is authored against the measured
    # Library support in sunny_accuracy.stern_ladder_access(). No invented
    # central-garden stairwell/cut remains in the regenerated decks.

    # Canon hatch in the men's cabin connects directly to fore storage.
    sp=(-18.5,-4.5,b1)
    shaft(sp[0]-1.5,sp[0]+6.1,-8.25,-6.55,levels['F1']-2.2,levels['F1']+.2)
    switchback('StorageStair',sp,0,levels['F1']-b1,4.6,1.4,1.5)
    hatch('StorageHatch',(-17.7,-7.4,levels['F1']),0,(1.5,1.4),rooms=("Men's Quarters",'Storage Room'),slide_sign=-1)

    # Energy room descent at the back of the aquarium service passage.
    ep=(22.4,f.y(CENTRE_Y)+3.0,b1)
    er=levels['F1']-b1
    erun=er/0.185*0.30
    shaft(ep[0]-0.65,ep[0]+0.65,ep[1]-erun-1.6,ep[1]+0.2,levels['F1']-2.2,levels['F1']+0.2)
    stair_flight('EnergyStair',ep,-math.pi/2,er,erun,1.1,rails=(False,False))
    rbox('EnergyStair_exit',(ep[0],ep[1]-erun-0.5,levels['F1']),0,(1.1,1.2,0.12),'deck',(0,0,-0.06),walkable=True)
    # The enlarged upper fore flight crosses the previously authored cabin
    # frontage. Preserve its treads and cut their standing/headroom envelope
    # through that frontage and ceiling, so exterior walking remains continuous.
    bpy.context.view_layer.update()
    upper=[o for o in bpy.data.objects if o.type=='MESH' and o.get('sunny_stair')
           and o.name.startswith('Box') and o.name[3:].split('.')[0].isdigit()
           and 52<=int(o.name[3:].split('.')[0])<=69]
    blockers=[o for o in bpy.data.objects if o.type=='MESH' and
              o.name.startswith(('Sunny_ForeF2_shell','Sunny_ForeF2_ceiling','Sunny_RoomPartition_womens'))]
    for tread in upper:
        a,b=vertex_bbox(tread)
        for wall in blockers:
            open_volume_slot(wall,a.x-.05,b.x+.05,a.y-.05,b.y+.05,b.z-.18,b.z+2.0)
    from sunny_interiors import DOORS
    for spec in DOORS:
        if spec['kind'] != 'door':
            continue
        x,y,z=spec['pos']
        dx,dy=((spec['width']+0.1)/2,0.75) if abs(math.cos(spec['rot']))>0.5 else (0.75,(spec['width']+0.1)/2)
        for obj in objects:
            if obj.name in ('Line002','Line006','Tube008.001','Cylinder002','对象001','对象002','对象003'):
                if obj.get('sunny_aft_native_envelope'):
                    continue  # fixed door apertures were closed-cut in build_interiors
                open_volume_slot(obj,x-dx,x+dx,y-dy,y+dy,z-0.15,z+spec['height']+0.12)
    report['hatches'] = ['SoldierDockHatch', 'AquariumHatch', 'KitchenHatch', 'StorageHatch']
    return report


def restore_exterior(objects, vertex_bbox):
    def log(*args):
        print(*args,flush=True)
    """Paint source, add the deck, then lift the rig to the sourced 56 m height.

    Only coordinates above 2 m in the original model are lengthened. Decks,
    doors, hull, trees and player scale retain their metre dimensions. All
    meshes then receive the same translation, and the waterline moves with them.
    """
    objects = repair_symmetry(objects)
    aft_snapshot = None
    # The port lower flight clips the round cabin wall in the source. Move its
    # treads outward; replacement rails below follow their widened edges.
    for obj in objects:
        number=int(obj.name[3:]) if obj.name.startswith('Box') and obj.name[3:].isdigit() else -1
        if 104<=number<=117:
            inv=obj.matrix_world.inverted()
            for vertex in obj.data.vertices:
                p=obj.matrix_world@vertex.co
                p.y-=0.45
                vertex.co=inv@p
            obj.data.update()
    for obj in list(objects):
        if obj.name in ('Box080','Box081','Box082','Box083','Rectangle017','Rectangle018','Rectangle019','Rectangle020','Rectangle021','Rectangle022','Cylinder028','Cylinder030','Cylinder031','Cylinder032','Cylinder033','Cylinder034','Line014','Line015','Rectangle031','Cylinder042','Rectangle028','Rectangle030','Cylinder041','Rectangle027','Rectangle016','Rectangle023','Rectangle024','Rectangle025','Rectangle026','Rectangle033','Rectangle034','Rectangle036','Cylinder046','Cylinder048','Cylinder049'):
            objects.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    bpy.context.view_layer.update()
    log('[pipeline]   painting source ...')
    paint_source(objects)
    fore_z = surface_height(objects,-11.15,0.55,-3.0)
    for obj in objects:
        if obj.name.startswith('Box') and obj.name[3:].isdigit():
            number=int(obj.name[3:])
            lo,hi=vertex_bbox(obj)
            if (8<=number<=49 or 52<=number<=69 or 85<=number<=117) and hi.z-lo.z<0.2:
                obj['sunny_stair'] = True
                obj['sunny_walkable'] = True
                obj['sunny_feature'] = 'AftStair' if number<=49 else 'ForeStair'
    # Both curved lower flights must meet the same middle deck. Their source
    # top treads stop below it, leaving the port transfer trapped at a railing.
    for low,high in ((85,103),(104,117)):
        group=[o for o in objects if o.get('sunny_stair') and low<=int(o.name[3:].split('.')[0])<=high]
        heights=[vertex_bbox(o)[1].z for o in group];bottom,top=min(heights),max(heights)
        for obj in group:
            rise=(-5.62-top)*(vertex_bbox(obj)[1].z-bottom)/(top-bottom)
            inv=obj.matrix_world.inverted()
            for vertex in obj.data.vertices:
                p=obj.matrix_world@vertex.co;p.z+=rise;vertex.co=inv@p
            obj.data.update()
    # The first central upper treads are now beneath the shared middle platform.
    for obj in list(objects):
        if obj.get('sunny_stair') and 52<=int(obj.name[3:])<=69 and vertex_bbox(obj)[1].z<-5.62:
            objects.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    # Give every flight generous walking width without changing its rise/run.
    for obj in objects:
        if obj.get('sunny_stair'):
            lo,hi=vertex_bbox(obj);mid=(lo.y+hi.y)/2
            number=int(obj.name[3:])
            width=1.65 if number<=49 else 1.45
            ratio=width/(hi.y-lo.y)
            inv=obj.matrix_world.inverted()
            for vertex in obj.data.vertices:
                p=obj.matrix_world@vertex.co;p.y=mid+(p.y-mid)*ratio;vertex.co=inv@p
            obj.data.update()
    # Open the central rail for the lower-to-upper forward stair transfer.
    for obj in objects:
        if obj.name in ('Box070','Box084'):
            open_plan_slot(obj,-50,50,-2.8,2.45)
        if obj.name=='Line006':
            open_plan_slot(obj,-8.7,-5.5,0.28,2.54)
            open_plan_slot(obj,-8.9,-7.4,2.30,3.5)
        if obj.name=='对象003':
            cap_roof(obj,-2.42)
            from sunny_aft_envelope import snapshot_native_house
            aft_snapshot = snapshot_native_house(obj)
            for y in (-6.0,7.17):
                open_plan_slot(obj,3.0,7.4,y-0.85,y+0.85)
    dock_sides=dock_attachment_sides(objects,-0.35,-9.95)
    if not dock_sides:raise RuntimeError('Missing Soldier Dock hull attachment')
    log('[pipeline]   authoring exterior ...')
    additions = add_exterior(fore_z,dock_sides)
    objects = objects + additions
    bpy.context.view_layer.update()
    # Open the central lawn to human-scale walking space. Redistribute the
    # longitudinal layout inside the existing overall length, preserving width.
    # Unlike enlarging the avatar's world, this leaves doors, chairs, and trees
    # at their original metre dimensions (all non-structural authored features
    # move together as rigid clusters).
    clusters = {}
    structural = {'Lawn','ForeStair','ForePortRail','ForeStarRail','ForeUpperRail','ForeLanding','ForeUpperLanding','AftStair','GardenStair','GardenDeck','SternBalcony','Slide','InteriorFloor','InteriorWall','RoomPartition','AquariumFloor'}
    for obj in additions:
        feature = obj.get('sunny_feature')
        if feature not in structural:
            clusters.setdefault(feature,[]).append(obj)
    shifts = {}
    for feature, members in clusters.items():
        lo=min(vertex_bbox(o)[0].x for o in members)
        hi=max(vertex_bbox(o)[1].x for o in members)
        mid=(lo+hi)/2
        shifts[feature]=layout_x(mid)-mid
    for obj in objects:
        feature=obj.get('sunny_feature')
        rigid_shift=shifts.get(feature)
        if obj.name in ('Cylinder003','Cylinder007'):
            a,b=vertex_bbox(obj)
            mid=(a.x+b.x)/2
            rigid_shift=layout_x(mid)-mid
        inv=obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            p=obj.matrix_world@vertex.co
            p.x=p.x+rigid_shift if rigid_shift is not None else layout_x(p.x)
            vertex.co=inv@p
        obj.data.update()
    bpy.context.view_layer.update()
    bottom = min(vertex_bbox(o)[0].z for o in objects)
    top = max(vertex_bbox(o)[1].z for o in objects)
    pivot = 2.0
    height = EXTERIOR_CONFIG['referenceHeightM']
    ratio = (bottom+height-pivot)/(top-pivot)
    shift = bottom+height/2
    for obj in objects:
        inv = obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            p = obj.matrix_world @ vertex.co
            if p.z>pivot:
                p.z=pivot+(p.z-pivot)*ratio
            p.z -= shift
            vertex.co = inv @ p
        obj.data.update()
    bpy.context.view_layer.update()
    # Explicitly user-authorized uniform enlargement for an anime-scale feel.
    # Human eye height, body capsule and walk speed are deliberately unchanged.
    scale = EXTERIOR_CONFIG['experienceScale']
    for obj in objects:
        inv=obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            vertex.co=inv@((obj.matrix_world@vertex.co)*scale)
        obj.data.update()
    # ------------------------------------------------------------------
    # Human-scale authoring pass.
    #
    # Everything above is ship structure and enlarges with the hull. Everything
    # below is written in real metres on the ALREADY enlarged ship, so a door,
    # chair, counter or instrument is the size a person actually uses no matter
    # what experienceScale is. This replaces the old approach of enlarging
    # everything and then dividing selected clusters back down, which silently
    # scaled every unlisted object.
    log('[pipeline]   retreading stair flights ...')
    before=set(objects)
    retread_flights(objects,vertex_bbox)
    log('[pipeline]   building furnished interiors ...')
    interiors=build_interiors(objects,vertex_bbox,shift,aft_snapshot=aft_snapshot)
    log(f'[pipeline]   interiors: {len(interiors["rooms"])} rooms, {len(interiors["doors"])} openings')
    log('[pipeline]   human-scale fittings ...')
    add_fittings(objects,vertex_bbox,Frame(shift),interiors)
    # add_fittings registers the deck hatches after build_interiors snapshotted
    # the opening list, so re-read the registry here.
    from sunny_interiors import DOORS as _openings
    interiors['doors']=list(_openings)
    log('[pipeline]   stair rails ...')
    rebuild_stair_rails(objects,vertex_bbox)
    objects=objects+[o for o in bpy.data.objects
                     if o not in before and o.type=='MESH']
    bpy.context.view_layer.update()
    from sunny_accuracy import apply_exterior_accuracy
    objects, interiors['exteriorMechanisms'] = apply_exterior_accuracy(objects, vertex_bbox, Frame(shift), interiors)
    from sunny_room_accuracy import complete_room_fittings
    log('[pipeline]   SBS interior construction ...')
    objects = complete_room_fittings(objects, Frame(shift), interiors)
    # Exterior lookout access registers its hatch after the earlier snapshot.
    interiors['doors']=list(_openings)
    muzzle = next(o for o in objects if o.name == 'Sphere002')
    mi = muzzle.matrix_world.inverted()
    for obj in objects:
        if obj.name.startswith('Sunny_LionSmile'):
            inv = obj.matrix_world.inverted()
            for vertex in obj.data.vertices:
                p = obj.matrix_world @ vertex.co
                hit, loc, _, _ = muzzle.ray_cast(mi @ Vector((-60,p.y,p.z)), mi.to_3x3() @ Vector((1,0,0)))
                if hit:
                    p.x = (muzzle.matrix_world @ loc).x - 0.025
                    vertex.co = inv @ p
            obj.data.update()
    bpy.context.view_layer.update()
    from sunny_fore_trim import reconcile_fore_trim
    log(f'[pipeline]   fore shield construction cuts: {reconcile_fore_trim(objects,interiors)}')
    from sunny_surfaces import prepare_exterior_surfaces
    log(f'[pipeline]   exterior coplanar faces trimmed: {prepare_exterior_surfaces(objects,vertex_bbox)}')
    bpy.context.view_layer.update()
    levels=dict(interiors['levels'])
    levels['foredeck']=vertex_bbox(next(o for o in objects if o.name=='Sunny_ForeUpperLanding'))[1].z
    return (objects, -shift,
            sorted({o.get('sunny_feature') for o in objects if o.get('sunny_feature')}),
            ratio, levels, interiors)




def repair_symmetry(objects):
    """Repair displaced source side panels by mirroring their attached counterparts.

    Tube009 is 10.6 m higher than Tube005 in the supplied FBX; Line007 is 2.3 m
    lower than Line004; Box119 is 4.9 m lower than Box118. These errors must be
    corrected before measuring scale. Mirror world vertices and reverse winding.
    """
    by_name = {o.name:o for o in objects}
    center_y = 0.585
    for src_name, dst_name in [('Tube005','Tube009'),('Line004','Line007'),('Box118','Box119')]:
        src, dst = by_name[src_name], by_name[dst_name]
        verts=[]
        for v in src.data.vertices:
            p=src.matrix_world@v.co
            verts.append((p.x,2*center_y-p.y,p.z))
        faces=[tuple(reversed(p.vertices)) for p in src.data.polygons]
        me=bpy.data.meshes.new(dst_name+'_repaired'); me.from_pydata(verts,[],faces); me.update()
        dst.data=me
        dst.matrix_world=Matrix.Identity(4)
    # Rectangle004 is the intact radial side petal in the FBX. Rectangle006
    # turns into the depth axis. Mirror the intact one onto the malformed side.
    # Copying in the opposite direction duplicates the malformed petal.
    petals={o.name.split('.')[0]:o for o in objects}
    src,dst=petals.get('Rectangle004'),petals.get('Rectangle006')
    face=petals.get('Sphere001')
    if src and dst and face:
        ys=[(face.matrix_world@v.co).y for v in face.data.vertices]
        axis=(min(ys)+max(ys))/2
        verts=[]
        for v in src.data.vertices:
            p=src.matrix_world@v.co;verts.append((p.x,2*axis-p.y,p.z))
        me=bpy.data.meshes.new(dst.name+'_radial');me.from_pydata(verts,[],[tuple(reversed(p.vertices)) for p in src.data.polygons]);me.update()
        dst.data=me;dst.matrix_world=Matrix.Identity(4)
    # Original eye placeholders are unpainted projecting cylinders. Replace them
    # with face-aligned eyes, avoiding a second pair behind the corrected eyes.
    for name in ('Cylinder016.001','Cylinder018.001'):
        obj=by_name.get(name)
        if obj:
            objects.remove(obj)
            bpy.data.objects.remove(obj,do_unlink=True)
    bpy.context.view_layer.update()
    return objects
