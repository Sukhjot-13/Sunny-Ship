"""Exterior-only reference repairs in final metres; interiors are left paused."""
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from sunny_exterior import (_mesh, finish, material, box, pole, ring, sphere,
                            text, clip_face, open_volume_slot, assign_world_mesh, EXTERIOR_CONFIG)


def discard(objects, predicate):
    """Remove superseded generated details from both the scene and export list."""
    for obj in list(objects):
        if predicate(obj):
            objects.remove(obj)
            bpy.data.objects.remove(obj, do_unlink=True)


def replace(obj, verts, faces, key, uv=None):
    """Replace one source mesh with evaluated world-space, tagged geometry."""
    mesh = bpy.data.meshes.new(obj.name+'_reference')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    mesh.materials.append(material(key))
    if uv:
        layer = mesh.uv_layers.new(name='ReferenceUV')
        for face in mesh.polygons:
            for loop in face.loop_indices:
                layer.data[loop].uv = uv[mesh.loops[loop].vertex_index]
    assign_world_mesh(obj, mesh)
    obj['sunny_authored'] = True
    for face in mesh.polygons:
        face.use_smooth = True


def cut_prism(obj, planes):
    """Subtract a convex aperture prism; retain all outside faces/materials."""
    verts, faces, indices = [], [], []
    for face in obj.data.polygons:
        remaining = [obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
        for normal, offset in planes:
            inside, outside = [], []
            for p, q in zip(remaining, remaining[1:]+remaining[:1]):
                a, b = normal.dot(p)-offset, normal.dot(q)-offset
                (inside if a >= 0 else outside).append(p)
                if (a >= 0) != (b >= 0):
                    cross = p.lerp(q, a/(a-b))
                    inside.append(cross); outside.append(cross)
            if len(outside) >= 3:
                faces.append(tuple(range(len(verts), len(verts)+len(outside))))
                verts.extend(outside); indices.append(face.material_index)
            remaining = inside
            if len(remaining) < 3:
                break
    old = obj.data
    mesh = bpy.data.meshes.new(old.name+'_aperture')
    mesh.from_pydata(verts, [], faces); mesh.update()
    for mat in old.materials:
        mesh.materials.append(mat)
    for face, index in zip(mesh.polygons, indices):
        face.material_index = index
    assign_world_mesh(obj, mesh)


def circular_cut(obj, centre, radius, axis, low, high, sides=24):
    """Cut a real circular polygon aperture through every supplied wall layer."""
    c = Vector(centre)
    cross = [i for i in range(3) if i != axis]
    planes = []
    for i in range(sides):
        a = (i+.5)*math.tau/sides
        n = Vector((0, 0, 0))
        n[cross[0]], n[cross[1]] = -math.cos(a), -math.sin(a)
        planes.append((n, n.dot(c)-radius*math.cos(math.pi/sides)))
    for sign, edge in ((1, low), (-1, high)):
        n = Vector((0, 0, 0)); n[axis] = sign
        planes.append((n, sign*edge))
    cut_prism(obj, planes)


def repaint_prism(obj, planes, key, source=None):
    """Partition existing faces into painted regions without overlay geometry."""
    old = obj.data
    mats = list(old.materials)
    paint = material(key)
    if paint not in mats:
        mats.append(paint)
    paint_index = mats.index(paint)
    verts, faces, indices = [], [], []
    for face in old.polygons:
        remaining = [obj.matrix_world @ old.vertices[i].co for i in face.vertices]
        pieces = []
        if source is None or old.materials[face.material_index].name == 'Sunny_'+source:
            for normal, offset in planes:
                inside, outside = [], []
                for p, q in zip(remaining, remaining[1:]+remaining[:1]):
                    a, b = normal.dot(p)-offset, normal.dot(q)-offset
                    (inside if a >= 0 else outside).append(p)
                    if (a >= 0) != (b >= 0):
                        cross = p.lerp(q, a/(a-b))
                        inside.append(cross); outside.append(cross)
                if len(outside) >= 3:
                    pieces.append((outside, face.material_index))
                remaining = inside
                if len(remaining) < 3:
                    break
            if len(remaining) >= 3:
                pieces.append((remaining, paint_index))
        else:
            pieces.append((remaining, face.material_index))
        for polygon, index in pieces:
            faces.append(tuple(range(len(verts), len(verts)+len(polygon))))
            verts.extend(polygon); indices.append(index)
    mesh = bpy.data.meshes.new(old.name+'_paint')
    mesh.from_pydata(verts, [], faces); mesh.update()
    for mat in mats:
        mesh.materials.append(mat)
    for face, index in zip(mesh.polygons, indices):
        face.material_index = index
        face.use_smooth = True
    assign_world_mesh(obj, mesh)


def merge_details(prefix, suffixes):
    """Batch same-material vegetation without losing its authored shape/station."""
    bpy.context.view_layer.update()
    for suffix in suffixes:
        members = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Sunny_'+prefix+suffix)]
        by_material = {}
        for obj in members:
            by_material.setdefault(obj.data.materials[0].name, []).append(obj)
        for key, group in by_material.items():
            verts, faces = [], []
            for obj in group:
                offset = len(verts)
                verts += [obj.matrix_world@v.co for v in obj.data.vertices]
                faces += [tuple(offset+i for i in f.vertices) for f in obj.data.polygons]
            for obj in group:
                bpy.data.objects.remove(obj, do_unlink=True)
            finish(_mesh(prefix+suffix+'_batch', verts, faces), prefix+suffix+'_batch_'+key, key.removeprefix('Sunny_'))


def yard_skin(yard):
    """Freeze the actual evaluated world-space spar triangles for contact fits."""
    points = [yard.matrix_world @ v.co for v in yard.data.vertices]
    return BVHTree.FromPolygons(points, [tuple(f.vertices)
                                        for f in yard.data.polygons])


def fitted_radial_attachment(surface, origin, direction, embed=.020):
    """Fit a retained radial attachment to actual wood in its fixed section."""
    origin, direction = Vector(origin), Vector(direction).normalized()
    point, _, _, _ = surface.ray_cast(origin+direction*10, -direction, 20)
    if point is None:
        raise RuntimeError('Rig attachment loses its actual wood support')
    # Radial embedding preserves the ray's section station. Hidden knots and
    # the small overlap are reconstruction choices.
    return point-direction*embed


def fitted_spar_edge(surface, x, y, height, above, embed=.010):
    """Fit canvas to a retained spar's top/underside without moving its span."""
    direction = Vector((0, 0, -1 if above else 1))
    point, _, _, _ = surface.ray_cast(Vector((x, y, height))-direction*4,
                                       direction, 8)
    if point is None:
        raise RuntimeError('Gaff canvas edge loses its actual spar support')
    return point.z+direction.z*embed


def fitted_mast_gaff_corner(mast_surface, spar_surface, mx, my, edge, above):
    """Resolve a canvas corner against both retained mast and gaff skins."""
    height = edge[0]
    for _ in range(8):
        point = fitted_radial_attachment(mast_surface, (mx,my,height),
                                          (1,0,0), .010)
        guess = edge[0]+(edge[1]-edge[0])*(point.x-mx)/(edge[2]-mx)
        height = fitted_spar_edge(spar_surface, point.x, my, guess, above)
    # One final mast query uses the settled gaff height; mast taper makes the
    # fixed-point correction tiny without replacing either source structure.
    point = fitted_radial_attachment(mast_surface, (mx,my,height), (1,0,0), .010)
    return point.x, height


def fitted_yard_lash(name, surface, centre, station, tube=.033):
    """Closed rope loop fitted into an oval yard, retaining its lash station."""
    origin = Vector((centre.x, station, centre.z))
    samples, verts, faces = [], [], []
    segments, sides = 64, 8
    for i in range(segments):
        angle = i*math.tau/segments
        direction = Vector((math.cos(angle), 0, math.sin(angle)))
        point, normal, _, _ = surface.ray_cast(origin+direction*10,
                                               -direction, 20)
        if point is None:
            raise RuntimeError(name+' must touch its actual yard skin')
        if normal.dot(direction) < 0:
            normal.negate()
        samples.append(point+normal.normalized()*tube*.5)
    axis = Vector((0, 1, 0))
    for i, point in enumerate(samples):
        tangent = (samples[(i+1)%segments]-samples[(i-1)%segments]).normalized()
        radial = axis.cross(tangent).normalized()
        for j in range(sides):
            angle = j*math.tau/sides
            verts.append(point+tube*(math.cos(angle)*radial+math.sin(angle)*axis))
    for i in range(segments):
        for j in range(sides):
            a, b = i*sides+j, i*sides+(j+1)%sides
            c, d = ((i+1)%segments)*sides+(j+1)%sides, ((i+1)%segments)*sides+j
            faces.append((a, b, c, d))
    return finish(_mesh(name, verts, faces), name, 'rope')


def curved_sails(objects, bounds):
    """Oda's deployed canvas: tapered sides, catenary foot, supported billow."""
    # These two inherited spars define the full transverse envelope. Centre
    # their evaluated geometry, rather than recentering deck/room metadata.
    for name in ('Cylinder004','Cylinder010'):
        yard=next(o for o in objects if o.name==name)
        a,b=bounds(yard);dy=(a.y+b.y)/2
        verts=[yard.matrix_world@v.co for v in yard.data.vertices]
        for p in verts:p.y-=dy
        replace(yard,verts,[tuple(f.vertices) for f in yard.data.polygons],'darkwood')
    for name in ('Plane004', 'Plane005'):
        obj = next(o for o in objects if o.name == name)
        a, b = bounds(obj)
        mast = next(o for o in objects if o.name == ('Cylinder003' if name == 'Plane004' else 'Cylinder007'))
        ma, mb = bounds(mast)
        cx, cy = (ma.x+mb.x)/2, (ma.y+mb.y)/2
        yard = next(o for o in objects if o.name == ('Cylinder004' if name == 'Plane004' else 'Cylinder010'))
        ya,yb=bounds(yard)
        bpy.context.view_layer.update()
        surface = yard_skin(yard)
        cy=(ya.y+yb.y)/2
        width = min(b.y-a.y, yb.y-ya.y-.32)
        height = b.z-a.z
        verts, faces, uvs = [], [], []
        nx, ny = 36, 28
        # O's exposed fore contour bows out gently; its upper-main leech draws
        # inward. Retain all four corners/head/foot and the deployed state.
        # Opposite-side symmetry and normalized strength are reconstructed
        # from the perspective drawing, rather than surveyed metre outlines.
        leech_bend = .020 if name == 'Plane004' else -.035
        heads = []
        for i in range(nx+1):
            y = cy+(i/nx-.5)*width
            point, _, _, _ = surface.ray_cast(Vector((cx, y, ya.z-4)),
                                              Vector((0, 0, 1)), 10)
            if point is None:
                raise RuntimeError(name+' head edge loses its yard support')
            # Small sewn-edge embedding is reconstructed; avoid the source's
            # 36–38 cm visible burial while maintaining positive contact.
            heads.append(point.z+.010)
        for j in range(ny+1):
            v = j/ny
            for i in range(nx+1):
                u = i/nx
                foot = .075*height*math.sin(math.pi*u)
                bottom = a.z+.075*height-foot
                z = bottom+(heads[i]-bottom)*v
                y = cy+(u-.5)*width*(.87+.13*v)
                y += (2*u-1)*width*leech_bend*math.sin(math.pi*v)
                x = cx-math.sin(math.pi*u)*math.sin(math.pi*v)*height*.17
                verts.append((x, y, z)); uvs.append((u, v))
        for j in range(ny):
            for i in range(nx):
                k = j*(nx+1)+i
                faces.append((k, k+1, k+nx+2, k+nx+1))
        replace(obj, verts, faces, 'white', uvs)
        obj['sunny_sail_uv'] = True
        obj['sunny_canvas_state'] = 'deployed, O; A/C are partially gathered variants'
        obj['sunny_leech_reference'] = 'O exposed free contours; mirrored side/strength reconstructed'
        for i in range(13):
            y = cy+(i/12-.5)*width
            fitted_yard_lash('SailTie_'+name+str(i), surface, (ya+yb)/2, y)
    # N shows three longitudinal gaffs and two striped panels. The source's
    # middle spar erroneously spans the ship transversely; rebuild all three
    # edge spars with common mast attachment and retain the stern endpoint.
    obj = next(o for o in objects if o.name == 'Plane008')
    a, b = bounds(obj)
    ma, mb = bounds(next(o for o in objects if o.name == 'Cylinder007'))
    mx, my = (ma.x+mb.x)/2, (ma.y+mb.y)/2
    verts, faces, uvs = [], [], []
    # Keep the user-approved source envelope; the far gaff establishes +X.
    lower=bounds(next(o for o in objects if o.name=='Cylinder013'))
    upper=bounds(next(o for o in objects if o.name=='Cylinder014'))
    middle=bounds(next(o for o in objects if o.name=='Cylinder011'))
    edges = ((lower[0].z+.32,lower[1].z-.32,lower[1].x),
             ((middle[0].z+middle[1].z)/2,(lower[1].z+upper[1].z)/2,(lower[1].x+upper[1].x)/2),
             (upper[0].z+.32,upper[1].z-.32,upper[1].x))
    for source, (z0,z1,end_x) in zip(('Cylinder013','Cylinder011','Cylinder014'), edges):
        old = next(o for o in objects if o.name == source)
        temp = pole('Gaff_temp', (mx,my,z0), (end_x,my,z1), .32, 'darkwood', sides=16)
        bpy.context.view_layer.update()
        vv=[temp.matrix_world@v.co for v in temp.data.vertices]
        for p in vv:p.x=min(p.x,end_x)
        replace(old, vv, [tuple(f.vertices) for f in temp.data.polygons], 'darkwood')
        bpy.data.objects.remove(temp,do_unlink=True)
    spar_surfaces = [yard_skin(next(o for o in objects if o.name == source))
                     for source in ('Cylinder013', 'Cylinder011', 'Cylinder014')]
    mast_surface = yard_skin(next(o for o in objects if o.name == 'Cylinder007'))
    for panel, (bottom, top) in enumerate(zip(edges, edges[1:])):
        offset = len(verts)
        foot_root, _ = fitted_mast_gaff_corner(mast_surface, spar_surfaces[panel],
                                               mx, my, bottom, True)
        head_root, _ = fitted_mast_gaff_corner(mast_surface, spar_surfaces[panel+1],
                                               mx, my, top, False)
        # Stay 0.1mm inside retained clipped spar endpoints, avoiding an exact
        # boundary ray while keeping the complete source spar envelope.
        foot_end, head_end = bottom[2]-.0001, top[2]-.0001
        feet, heads = [], []
        for i in range(25):
            u = i/24
            x0 = foot_root+u*(foot_end-foot_root)
            x1 = head_root+u*(head_end-head_root)
            z0 = bottom[0]+(bottom[1]-bottom[0])*(x0-mx)/(bottom[2]-mx)
            z1 = top[0]+(top[1]-top[0])*(x1-mx)/(top[2]-mx)
            feet.append(fitted_spar_edge(spar_surfaces[panel], x0, my, z0, True))
            heads.append(fitted_spar_edge(spar_surfaces[panel+1], x1, my, z1, False))
        for j in range(25):
            v = j/24
            root_height = feet[0]+(heads[0]-feet[0])*v
            root_x = fitted_radial_attachment(mast_surface, (mx,my,root_height),
                                               (1,0,0), .010).x
            for i in range(25):
                u = i/24
                span = ((1-v)*foot_end+v*head_end)-root_x
                x = root_x+u*span
                z = feet[i]+(heads[i]-feet[i])*v
                y = my-2.3*math.sin(math.pi*u)*math.sin(math.pi*v)
                verts.append((x, y, z)); uvs.append((u, v))
        for j in range(24):
            for i in range(24):
                k = offset+j*25+i
                faces.append((k, k+1, k+26, k+25))
    replace(obj, verts, faces, 'red', uvs)
    obj['sunny_sail_uv'] = True; obj['sunny_canvas_panels'] = 2


def hull_port_recess(name, centre, radius, direction, depth=.95):
    """Build a hollow supported side-port reveal instead of a shallow solid cap."""
    x, y, z = centre
    front, back = y+direction*.01, y-direction*depth
    count = 48
    inner, outer = radius-.075, radius+.025
    verts = [(x+r*math.cos(i*math.tau/count), yy,
              z+r*math.sin(i*math.tau/count))
             for yy, r in ((front, outer), (back, outer),
                           (front, inner), (back, inner)) for i in range(count)]
    faces = []
    for i in range(count):
        j = (i+1)%count
        faces.extend(((i, j, count+j, count+i),
                      (2*count+j, 2*count+i, 3*count+i, 3*count+j),
                      (j, i, 2*count+i, 2*count+j),
                      (count+i, count+j, 3*count+j, 3*count+i)))
    if direction < 0:
        faces = [tuple(reversed(face)) for face in faces]
    bore = finish(_mesh(name, verts, faces), name, 'black')
    bore['sunny_port_recess'] = True
    bore['sunny_port_centre'] = list(centre)
    bore['sunny_port_radius'] = inner
    bore['sunny_port_depth'] = depth
    # The dark rear remains behind the reveal. Complete cannon assemblies and
    # their room-side connections are audited during the following room phase.
    pole(name+'_rear', (x, back-direction*.025, z),
         (x, back+direction*.005, z), inner, 'black', sides=count)
    return bore


def hull_ports(objects, bounds, cy):
    """Replace seven blind source caps with mirrored pale-frame dark apertures."""
    sources = [o for o in objects if o.name in {'Cylinder%03d'%i for i in range(20, 27)}]
    stations = []
    for obj in sources:
        a, b = bounds(obj)
        stations.append(((a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2, min(b.x-a.x, b.z-a.z)*.40))
    discard(objects, lambda o: o in sources)
    for index, (x, y, z, radius) in enumerate(stations):
        for side, yy in (('port', y), ('starboard', 2*cy-y)):
            direction = -1 if yy < cy else 1
            for obj in objects:
                if obj.name in ('Tube005', 'Tube009', 'Line004', 'Line007', 'Line002', 'Box118', 'Box119', 'Box121'):
                    circular_cut(obj, (x, yy, z), radius, 1, yy-1.2, yy+1.2)
            hull_port_recess('HullPort%d_%s_bore'%(index, side),
                             (x, yy, z), radius, direction)
            ring('HullPort%d_%s_frame'%(index, side), (x, yy+direction*.04, z), radius+.055, .14, 'white', 'Y', 32, 8)
            ring('HullPort%d_%s_inner'%(index, side), (x, yy+direction*.055, z), radius-.075, .035, 'black', 'Y', 32, 6)
    return len(stations)*2


def fit_scroll_paint(objects, bounds):
    """Fit a thin red hull skin to the retained white scroll's measured contours."""
    for panel_name,trim_name in (('Tube005','Line004'),('Tube009','Line007')):
        panel = next(o for o in objects if o.name == panel_name)
        trim = next(o for o in objects if o.name == trim_name)
        ta,tb = bounds(trim);pa,pb = bounds(panel)
        side = -1 if (pa.y+pb.y)/2 < .585*EXTERIOR_CONFIG['experienceScale'] else 1
        def edges(obj):
            result=[]
            for face in obj.data.polygons:
                points=[obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
                result+=list(zip(points,points[1:]+points[:1]))
            return result
        def section(lines,x):
            points=[p.lerp(q,(x-p.x)/(q.x-p.x)) for p,q in lines
                    if abs(q.x-p.x)>1e-8 and min(p.x,q.x)<=x<=max(p.x,q.x)]
            if not points:
                raise RuntimeError('Missing measured scroll section at '+str(x))
            low,high=min(p.z for p in points),max(p.z for p in points)
            lower=max((p for p in points if p.z<=low+.04),key=lambda p:side*p.y)
            upper=max((p for p in points if p.z>=high-.04),key=lambda p:side*p.y)
            return low,high,lower.y,upper.y
        trim_edges,panel_edges=edges(trim),edges(panel)
        count = 128
        x0,x1 = max(pa.x,ta.x)+.01,min(pb.x,tb.x)-.01
        step = (x1-x0)/count
        verts,faces,uvs=[],[],[]
        for i in range(count+1):
            x=x0+i*step
            wl,wh,yl,yh=section(trim_edges,x)
            pl,ph,_,_=section(panel_edges,x)
            low,high=max(pl,wl+.55),min(ph,wh-.45)
            if high<=low:
                raise RuntimeError('Scroll skin has no paint field at '+str(x))
            for inset,z in ((0,low),(0,high),(.10,low),(.10,high)):
                t=(z-wl)/max(wh-wl,1e-6)
                y=yl+(yh-yl)*t-side*(.12+inset)
                verts.append((x,y,z));uvs.append((x,z))
        for i in range(count):
            a,b=i*4,(i+1)*4
            faces.extend([(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),
                          (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)])
        faces.extend([(0,1,3,2),(count*4,count*4+2,count*4+3,count*4+1)])
        if side>0:faces=[tuple(reversed(face)) for face in faces]
        replace(panel,verts,faces,'red',uvs)
        panel['sunny_scroll_border']=trim_name
        panel['sunny_scroll_skin_m']=.10


def burst_barrel(objects, bounds):
    """A/C/O timber barrel at the existing stern station, with a recessed bore."""
    old = next(o for o in objects if o.name == 'Cylinder027')
    a, b = bounds(old)
    cy, cz = (a.y+b.y)/2, (a.z+b.z)/2
    radius = min(b.y-a.y, b.z-a.z)/2
    verts, faces = [], []
    profile = [(a.x, radius*.88), (a.x+(b.x-a.x)*.32, radius), (b.x, radius*.94)]
    n = 48
    for x, r in profile:
        for i in range(n):
            t = i*math.tau/n
            verts.append((x, cy+r*math.cos(t), cz+r*math.sin(t)))
    for j in range(len(profile)-1):
        for i in range(n):
            k = j*n+i; q = j*n+(i+1)%n
            faces.append((k, q, q+n, k+n))
    # Front stave annulus; the centre remains genuinely open.
    start = len(verts)
    for i in range(n):
        t = i*math.tau/n
        verts.append((b.x, cy+radius*.63*math.cos(t), cz+radius*.63*math.sin(t)))
        faces.append((2*n+i, 2*n+(i+1)%n, start+(i+1)%n, start+i))
    replace(old, verts, faces, 'timber')
    discard(objects, lambda o: o.name.startswith('Sunny_CoupDeBurst_'))
    ring('CoupDeBurst_rim', (b.x+.04, cy, cz), radius*.64, .15, 'darkwood', 'X', 48, 8)
    for x, r in ((profile[0][0]+.5, radius*.91), (b.x-.8, radius*.95)):
        ring('CoupDeBurst_hoop', (x, cy, cz), r, .19, 'black', 'X', 48, 8)
    pole('CoupDeBurst_bore', (b.x-3.0, cy, cz), (b.x-2.94, cy, cz), radius*.62, 'black', sides=48)
    for i in range(24):
        t = i*math.tau/24
        for (x0, r0), (x1, r1) in zip(profile, profile[1:]):
            pole('CoupDeBurst_stave', (x0, cy+(r0+.012)*math.cos(t), cz+(r0+.012)*math.sin(t)),
                 (x1, cy+(r1+.012)*math.cos(t), cz+(r1+.012)*math.sin(t)), .024, 'darkwood')
    return {'outlet': [b.x+.1, cy, cz], 'radius': radius*.62}


def leaf_mesh(name, centre, direction, length, width, key='leaf'):
    """Folded pointed blade attached at its base; no alpha-card or sphere leaves."""
    p, d = Vector(centre), Vector(direction).normalized()
    lateral = d.cross(Vector((0, 0, 1)))
    if lateral.length < .01:
        lateral = Vector((1, 0, 0))
    lateral.normalize()
    mid = p+d*length*.52
    verts = [p, mid+lateral*width/2, p+d*length, mid-lateral*width/2, mid+Vector((0, 0, width*.16))]
    return finish(_mesh(name, verts, [(0,1,4),(1,2,4),(2,3,4),(3,0,4)]), name, key)


def citrus_fruit(name, p, radius, branch):
    """Oblate mikan with polar depression, five-point calyx and real twig/stem."""
    verts, faces = [], []
    rings, segments = 14, 24
    for j in range(rings+1):
        t = math.pi*j/rings
        rho = radius*math.sin(t)
        z = radius*.78*math.cos(t)
        if t < math.pi/2:
            z -= radius*.15*math.exp(-(rho/(radius*.24))**2)
        for i in range(segments):
            a = i*math.tau/segments
            verts.append((p[0]+rho*math.cos(a), p[1]+rho*math.sin(a), p[2]+z))
    for j in range(rings):
        for i in range(segments):
            k = j*segments+i; q = j*segments+(i+1)%segments
            faces.append((k,q,q+segments,k+segments))
    finish(_mesh(name, verts, faces), name, 'orange')
    top = (p[0], p[1], p[2]+radius*.66)
    stem = (p[0], p[1], top[2]+.055)
    pole(name+'_stem', top, stem, .009, 'darkwood')
    pole(name+'_twig', stem, branch, .009, 'darkwood', radius2=.015)
    for i in range(5):
        a = i*math.tau/5
        leaf_mesh(name+'_calyx', top, (math.cos(a), math.sin(a), .08), radius*.29, radius*.17)
    leaf_mesh(name+'_leaf', stem, (.6,.35,.4), .12, .044)


def mikan_pot(name, p):
    """Open clay cavity with supported walls/bottom at the retained human size."""
    x, y, z = p
    # Retain the old outer cone, lip height and soil station. The inner wall
    # and six-centimetre bottom are reconstructed container thicknesses.
    profile = ((.40, 0.0), (.56, .60), (.51, .60), (.35, .06))
    n = 24
    verts, faces = [], []
    for radius, height in profile:
        for i in range(n):
            angle = i * math.tau / n
            verts.append((x + radius * math.cos(angle),
                          y + radius * math.sin(angle), z + height))
    for j in range(len(profile) - 1):
        for i in range(n):
            q = (i + 1) % n
            faces.append((j*n+i, j*n+q, (j+1)*n+q, (j+1)*n+i))
    # Close the clay base and cavity floor, leaving only an annulus at the
    # top; no polygon covers the soil or crosses the open mouth.
    faces.append(tuple(range(n - 1, -1, -1)))
    faces.append(tuple(range(3*n, 4*n)))
    obj = finish(_mesh(name, verts, faces), name, 'red', obstacle=True)
    for face in obj.data.polygons:
        face.use_smooth = abs(face.normal.z) < .8
    return obj


def reference_tree(name, p, citrus=False, seed=0):
    """Branch-connected vegetation with varied leaf blades, in human metres."""
    rng = random.Random(seed)
    x, y, floor = p
    z = floor
    if citrus:
        mikan_pot(name+'_pot', (x,y,z))
        ring(name+'_rim', (x,y,z+.60), .55, .045, 'white', major=32)
        pole(name+'_soil', (x,y,z+.555), (x,y,z+.57), .50, 'soil', sides=24)
        z += .57
    height, spread = (2.1, .92) if citrus else (4.9, 2.6)
    trunk = pole(name+'_trunk', (x,y,z), (x+.09,y,z+height*.83), .105 if citrus else .24, 'darkwood', radius2=.055 if citrus else .12, sides=14)
    trunk['sunny_obstacle'] = True
    for i in range(8):
        a = i*math.tau/8+.19*(seed%3)
        end = Vector((x+spread*math.cos(a), y+spread*math.sin(a), z+height*(.69+.13*(i%3))))
        root = Vector((x+.05, y, z+height*(.40+.045*i)))
        pole(name+'_branch', root, end, .041 if citrus else .10, 'darkwood', radius2=.018 if citrus else .025)
        for j in range(5 if citrus else 12):
            angle = a+(j-1)*.63
            start = root.lerp(end,.38+.62*j/(4 if citrus else 11))
            tip = start+Vector((math.cos(angle)*spread*.36, math.sin(angle)*spread*.36, (.12+.14*(j%2))))
            pole(name+'_twig', start, tip, .015 if citrus else .022, 'darkwood', radius2=.008)
            for k in range(7 if citrus else 11):
                v = k/(6 if citrus else 10)
                base = start.lerp(tip,v)
                theta = angle+(1 if k%2 else -1)*(1.0+rng.random()*.4)
                leaf_mesh(name+'_leaves', base, (math.cos(theta), math.sin(theta), rng.uniform(-.12,.48)),
                          rng.uniform(.19,.29) if citrus else rng.uniform(.45,.67), .10 if citrus else .27,
                          'leaflight' if k%3==0 else 'leaf')
            if citrus and j in (2,4):
                fruit = tip+Vector((.04*math.cos(angle), .04*math.sin(angle), -.13))
                citrus_fruit(name+'_fruit%d_%d'%(i,j), fruit, rng.uniform(.065,.085), tip)
    merge_details(name, ('_leaves','_branch','_twig'))
    return trunk


def plants(objects, bounds, frame, levels):
    """Two lawn trees, one three-pot mikan cluster and source-supported gardens."""
    trunks = [o for o in objects if o.name.startswith('Sunny_ShadeTree') and '_trunk' in o.name]
    lawn = levels['F1']
    stations = [(sum((bounds(o)[i] for i in (0,1)),Vector())/2) for o in trunks]
    discard(objects, lambda o: o.name.startswith(('Sunny_Mikan','Sunny_ShadeTree','Sunny_RobinGarden','Sunny_PopGreens')))
    for i, p in enumerate(stations):
        side = 'starboard' if p.y > frame.y(.585) else 'port'
        reference_tree('ShadeTree_'+side, (p.x,p.y,lawn), seed=i+3)
    garden, cy = levels['F3G'], frame.y(.585)
    for i, (x,y) in enumerate(((21.2,cy-4.0),(22.3,cy-5.2),(20.9,cy-6.4))):
        reference_tree('Mikan%d'%i, (x,y,garden), citrus=True, seed=11+i)
    for name, y, flowers in (('RobinGarden', frame.y(4.4), True), ('PopGreens', frame.y(-4.4), False)):
        x = frame.x(5.15)
        box(name+'_planter', (x,y,garden+.25), (2.35,1.05,.50), 'white', obstacle=True)
        box(name+'_soil', (x,y,garden+.48), (2.19,.90,.04), 'soil')
        for i in range(7):
            px, py = x-.91+i*.30, y+(.14 if i%2 else -.14)
            h = .30+.09*(i%3)
            pole(name+'_stem', (px,py,garden+.50), (px,py,garden+.50+h), .015, 'leaf')
            leaf_mesh(name+'_leaf', (px,py,garden+.62), (.8,1 if i%2 else -1,.3), .24, .12)
            head = (px,py,garden+.50+h)
            if flowers:
                sphere(name+'_flower_centre',head,(.034,.034,.025),'gold')
                for k in range(5+i%3):
                    a = k*math.tau/(5+i%3)
                    sphere(name+'_petal',(head[0]+.062*math.cos(a),head[1]+.062*math.sin(a),head[2]),(.063,.038,.02),'pink' if i%2 else 'white')
            elif i%3 == 0:
                for k in range(6):
                    a = k*math.tau/6
                    leaf_mesh(name+'_rosette',head,(math.cos(a),math.sin(a),.4),.26,.13,'leaflight')
            elif i%3 == 1:
                pole(name+'_trumpet',head,(head[0],head[1],head[2]+.19),.035,'leaflight',radius2=.14,sides=12)
                ring(name+'_lip',(head[0],head[1],head[2]+.19),.14,.024,'leaf')
            else:
                sphere(name+'_pod',head,(.095,.095,.12),'leaflight')
                for k in range(4):
                    a = k*math.tau/4
                    leaf_mesh(name+'_pod_blade',head,(math.cos(a),math.sin(a),.9),.22,.08)


def helm_controls(objects, bounds):
    """H's wheel-mounted channel drum, knob and pillar shutter lever."""
    base = next(o for o in objects if o.name == 'Sunny_Helm_pedestal')
    a,b = bounds(base); x,y,z = (a.x+b.x)/2,(a.y+b.y)/2,a.z
    discard(objects, lambda o: o.name.startswith(('Sunny_Helm_wheel','Sunny_Helm_hub','Sunny_Helm_spoke','Sunny_SoldierDock_')))
    centre = (x+.10,y,z+1.12)
    ring('Helm_wheel', centre, .62, .066, 'darkwood', 'X', 48, 8)
    for i in range(8):
        t = i*math.tau/8
        pole('Helm_spoke', centre, (centre[0],y+math.sin(t)*.80,z+1.12+math.cos(t)*.80), .034,'darkwood',sides=12)
        sphere('Helm_grip',(centre[0],y+math.sin(t)*.78,z+1.12+math.cos(t)*.78),(.045,.049,.09),'darkwood')
    pole('Helm_hub',(x-.02,y,z+1.12),(x+.22,y,z+1.12),.10,'gold',sides=20)
    pole('SoldierDock_drum',(x+.13,y,z+1.12),(x+.19,y,z+1.12),.46,'darkwood',sides=48)
    ring('SoldierDock_selector',(x+.235,y,z+1.12),.33,.029,'gold','X',48,8)
    for i in range(7):
        t = math.pi/2-i*math.tau/7
        # Text is applied to the visible aft face of the inner drum.
        text('SoldierDock_dial%d'%i,str(i),(x+.25,y+.30*math.cos(t),z+1.12+.30*math.sin(t)-.052),.13,'white',(math.pi/2,0,math.pi/2))
    pole('SoldierDock_pointer',(x+.275,y,z+1.18),(x+.275,y,z+1.39),.018,'gold')
    knob = (x+.27,y+.40,z+1.52)
    pole('SoldierDock_knob_stem',(x+.19,y+.40,z+1.52),knob,.025,'black')
    sphere('SoldierDock_knob',knob,(.065,)*3,'gold')
    lever = (x+.25,y,z+.50)
    pole('SoldierDock_lever_base',(x+.10,y,z+.22),lever,.048,'black')
    pole('SoldierDock_lever',lever,(x+.38,y,z+.70),.028,'darkwood')
    sphere('SoldierDock_lever_grip',(x+.38,y,z+.70),(.048,)*3,'darkwood')
    # F3/N support one small drawing station; remove the invented extra benches.
    discard(objects,lambda o:o.name.startswith(('Sunny_Usopp_bench','Sunny_Garden_workbench','Sunny_Garden_rail')))
    return {'helm':[x+.82,y-1.0,z], 'selector':[x+.90,y+.72,z], 'lever':[x+1.20,y,z],
            'log':[x+1.45,y+.55,z], 'targets':{'helm':list(centre),'selector':list(knob),'lever':[x+.38,y,z+.70],'log':[x+1.55,y,z+1.16]}}


def rolling_dock(objects,bounds,cy):
    """D's timber shutter slats and changing numbers through a real hull aperture."""
    originals=[o for o in objects if o.name.startswith('Sunny_Dock1_shutter')]
    stations=[(bounds(o)[0]+bounds(o)[1])/2 for o in originals]
    discard(objects,lambda o:o.name.startswith(('Sunny_Dock1_','Sunny_DockNumber','Sunny_Paddle')))
    result=[]
    radius=7.8
    for p in stations:
        direction=-1 if p.y<cy else 1
        side='port' if direction<0 else 'starboard'
        x,y,z=p
        # One aperture axis across both outer panels and their hull lining.
        for obj in objects:
            if obj.name in ('Tube005','Tube009','Line004','Line007','Line002','Box118','Box119','Box121'):
                # The imported red/white scroll has inner skins almost six
                # metres behind its outer face. A shallow cut left their old
                # oval protruding around the new circular dock opening.
                lo, hi = bounds(obj)
                depth = (y-3.0, y+3.0) if obj.name == 'Line002' else (lo.y-.01, hi.y+.01)
                circular_cut(obj,p,radius,1,*depth,32)
        ring('Dock1_rim',(x,y+direction*.09,z),radius+.28,.59,'black','Y',64,10)
        ring('Dock1_reveal',(x,y-direction*.18,z),radius-.08,.16,'darkwood','Y',64,8)
        count=32
        step=2*radius/count
        for j in range(count):
            zz=z-radius+step*(j+.5)
            width=2*math.sqrt(max(0,radius*radius-(zz-z)**2))
            obj=box('Dock1_shutter' if j==0 else 'DockSlat_%s_%d'%(side,j),(x,y,zz),(width,.17,step-.012),'timber')
            obj['sunny_dynamic']=True;obj['sunny_dock_shutter']=side;obj['sunny_roll_top']=z+radius;obj['sunny_roll_radius']=.43;obj['sunny_roll_travel']=2*radius+.7
            obj['sunny_roll_centre']=[x,y,zz]
        for channel in range(7):
            num=text('DockNumber_temp',str(channel),(x,y+direction*.102,z-radius*.50),radius*1.15,'red',(math.pi/2,0,math.pi if direction>0 else 0))
            bpy.context.view_layer.update()
            for j in range(count):
                lo=z-radius+j*step;hi=lo+step
                verts,faces=[],[]
                for face in num.data.polygons:
                    poly=[num.matrix_world@num.data.vertices[i].co for i in face.vertices]
                    poly=clip_face(clip_face(poly,2,lo,True),2,hi,False)
                    if len(poly)<3:continue
                    offset=len(verts);verts+=poly;faces.append(tuple(range(offset,len(verts))))
                if faces:
                    obj=finish(_mesh('DockNumber',verts,faces),'DockNumber_%s_%d_%d'%(side,channel,j),'red')
                    obj['sunny_dynamic']=True;obj['sunny_dock_shutter']=side;obj['sunny_dock_digit']=channel;obj['sunny_roll_top']=z+radius;obj['sunny_roll_radius']=.43;obj['sunny_roll_travel']=2*radius+.7
                    obj['sunny_roll_centre']=[x,y,z-radius+step*(j+.5)]
            bpy.data.objects.remove(num,do_unlink=True)
        # Channel 0 has paired transverse paddle wheels (B1/D). Exact RPM and
        # deployment actuator dimensions are simulation choices, not Oda data.
        pivot=(x,y+direction*1.20,z)
        ob=pole('Paddle_axle_'+side,(x,y-direction*.6,z),pivot,.18,'black')
        ob['sunny_paddle']=side;ob['sunny_pivot']=list(pivot);ob['sunny_dynamic']=True
        for yy in (pivot[1]-.34,pivot[1]+.34):
            ob=ring('Paddle_ring_'+side,(x,yy,z),radius*.76,.12,'darkwood','Y',48,8)
            ob['sunny_paddle']=side;ob['sunny_pivot']=list(pivot);ob['sunny_dynamic']=True
        for j in range(8):
            t=j*math.tau/8
            tip=(x+math.sin(t)*radius*.80,pivot[1],z+math.cos(t)*radius*.80)
            ob=pole('Paddle_spoke_'+side,pivot,tip,.075,'darkwood')
            ob['sunny_paddle']=side;ob['sunny_pivot']=list(pivot);ob['sunny_dynamic']=True
            ob=box('Paddle_blade_'+side,tip,(1.3,.92,.25),'deck');ob.rotation_euler.y=t
            ob['sunny_paddle']=side;ob['sunny_pivot']=list(pivot);ob['sunny_dynamic']=True
        result.append({'side':side,'centre':list(p),'radius':radius,'rollRadius':.43,'slats':count})
    return result


def lookout_wall_piece(name, outer, inner, low, high, sector, kind):
    """A closed cream piece between retained ellipse chords, in final metres.

    The sixteen stations are retained reconstruction; they do not assert a
    hidden canonical pane count. Explicit thickness closes the sill/header
    and piers, while face-section collision preserves the hollow room.
    """
    if high <= low or len(outer) != 2 or len(inner) != 2:
        raise RuntimeError('invalid lookout wall piece '+name)
    footprint = (outer[0], outer[1], inner[1], inner[0])
    verts = [(p.x, p.y, z) for z in (low, high) for p in footprint]
    faces = [(3, 2, 1, 0), (4, 5, 6, 7),
             (0, 1, 5, 4), (1, 2, 6, 5),
             (2, 3, 7, 6), (3, 0, 4, 7)]
    obj = finish(_mesh(name, verts, faces), name, 'cream', obstacle=True)
    obj['sunny_rail'] = True
    obj['sunny_lookout_wall'] = True
    obj['sunny_lookout_sector'] = sector
    obj['sunny_lookout_wall_kind'] = kind
    return obj


def lookout_belt(cx, cy, rx, ry, floor, top):
    """A/N/L cream enclosure and sash glazing on sixteen retained sectors.

    Eight alternate glazing bays, eighteen-centimetre wall thickness and
    relative sill/header heights are reconstruction within the existing
    envelope. No roof, floor, hatch, climb or material settings move.
    """
    height = top-floor
    low, high = floor+height*.18, top-height*.14
    outer_rx, outer_ry = rx*.975, ry*.975
    inner_rx, inner_ry = outer_rx-.18, outer_ry-.18
    if min(inner_rx, inner_ry) <= 0 or height <= 1.75:
        raise RuntimeError('lookout belt cannot retain its human-height enclosure')
    for i in range(16):
        t0, t1 = i*math.tau/16, (i+1)*math.tau/16
        outer = [Vector((cx+outer_rx*math.cos(t), cy+outer_ry*math.sin(t)))
                 for t in (t0, t1)]
        inner = [Vector((cx+inner_rx*math.cos(t), cy+inner_ry*math.sin(t)))
                 for t in (t0, t1)]
        if i % 2:
            lookout_wall_piece('Lookout_wall_%d_pier'%i, outer, inner,
                               floor, top, i, 'pier')
            continue
        lookout_wall_piece('Lookout_wall_%d_sill'%i, outer, inner,
                           floor, low, i, 'sill')
        lookout_wall_piece('Lookout_wall_%d_header'%i, outer, inner,
                           high, top, i, 'header')
        for side, interval in (('left', (0., .08)), ('right', (.92, 1.))):
            edges = [outer[0].lerp(outer[1], u) for u in interval]
            backs = [inner[0].lerp(inner[1], u) for u in interval]
            lookout_wall_piece('Lookout_wall_%d_%s'%(i, side), edges, backs,
                               low, high, i, 'jamb')
        tangent = outer[1]-outer[0]
        outward = Vector((tangent.y, -tangent.x)).normalized()
        # Glass embeds eight millimetres into sill/header and one percent
        # into each jamb. Its plane is recessed into the actual wall depth.
        pane_ends = [outer[0].lerp(outer[1], u)-outward*.028 for u in (.07, .93)]
        verts = [(p.x, p.y, z) for z, order in
                 ((low-.008, pane_ends), (high+.008, list(reversed(pane_ends))))
                 for p in order]
        pane = finish(_mesh('Lookout_pane', verts, [(0, 1, 2, 3)]),
                      'Lookout_pane%d'%i, 'glass', obstacle=True)
        pane['sunny_rail'] = True
        pane['sunny_lookout_window'] = True
        pane['sunny_lookout_sector'] = i
        left, right = pane_ends
        mid = (left+right)/2
        pole('Lookout_sash_mullion%d'%i, (mid.x, mid.y, low),
             (mid.x, mid.y, high), .028, 'darkwood')
        for row in (1, 2):
            z = low+(high-low)*row/3
            pole('Lookout_crossbar%d_%d'%(i, row), (left.x, left.y, z),
                 (right.x, right.y, z), .028, 'darkwood')
        for side, p in enumerate(pane_ends):
            pole('Lookout_sash_jamb%d_%d'%(i, side), (p.x, p.y, low),
                 (p.x, p.y, high), .035, 'cream')


def lookout(objects,bounds):
    """N/CN: shallow striped dome, glazed band, dormers and flared underside."""
    dome=next(o for o in objects if o.name=='Cylinder006')
    a,b=bounds(dome);cx,cy=(a.x+b.x)/2,(a.y+b.y)/2
    rx,ry=(b.x-a.x)/2,(b.y-a.y)/2
    floor=a.z;band_top=floor+2.2
    # Access uses the original source datum, not the new raised glass sill.
    dome['sunny_lookout_floor'] = floor
    dome['sunny_lookout_belt_top'] = band_top
    dome['sunny_lookout_belt_sectors'] = 16
    discard(objects,lambda o:o.name.startswith('Box') and o.name[3:].split('.')[0].isdigit() and 138<=int(o.name[3:].split('.')[0])<=146)
    verts,faces,keys=[],[],[]
    n=64
    profile=((rx,ry,band_top),(rx*.98,ry*.98,band_top+.25),(rx*.82,ry*.82,band_top+1.60),(rx*.44,ry*.44,band_top+2.67),(.25,.22,band_top+3.08))
    for r1,r2,z in profile:
        for i in range(n):
            t=i*math.tau/n;verts.append((cx+r1*math.cos(t),cy+r2*math.sin(t),z))
    for j in range(len(profile)-1):
        for i in range(n):
            faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i));keys.append('red' if (i//8)%2 else 'gold')
    replace(dome,verts,faces,'red')
    dome.data.materials.append(material('gold'))
    for f,key in zip(dome.data.polygons,keys):f.material_index=0 if key=='red' else 1
    for z in (floor+.07,band_top-.04):
        # Elliptical trim and glazed facets follow the actual inherited radius.
        for i in range(32):
            t0=i*math.tau/32;t1=(i+1)*math.tau/32
            pole('Lookout_band',(cx+rx*math.cos(t0),cy+ry*math.sin(t0),z),(cx+rx*math.cos(t1),cy+ry*math.sin(t1),z),.105,'cream')
    lookout_belt(cx, cy, rx, ry, floor, band_top)
    # Four arched dormers shown around the roof in N; transparent panes.
    for i in range(4):
        t=i*math.pi/2
        radial=Vector((math.cos(t),math.sin(t),0));lateral=Vector((-math.sin(t),math.cos(t),0))
        centre=Vector((cx+rx*.965*math.cos(t),cy+ry*.965*math.sin(t),band_top+.62))
        axis=0 if i%2==0 else 1
        circular_cut(dome,centre+Vector((0,0,.25)),.76,axis,centre[axis]-1.50,centre[axis]+1.50,24)
        arch=[]
        for j in range(17):
            u=j*math.pi/16
            arch.append(centre+lateral*(.72*math.cos(u))+Vector((0,0,.90*math.sin(u))))
        for p,q in zip(arch,arch[1:]):pole('Lookout_dormer_arch',p,q,.075,'cream')
        pane=arch+[centre-lateral*.72-Vector((0,0,.38)),centre+lateral*.72-Vector((0,0,.38))]
        finish(_mesh('Lookout_dormer_pane',pane,[tuple(range(len(pane)))]),'Lookout_dormer_pane%d'%i,'glass')
        pole('Lookout_dormer_bar',centre-Vector((0,0,.35)),centre+Vector((0,0,.85)),.035,'darkwood')
    peak=band_top+3.08
    pole('Lookout_flagpole',(cx,cy,peak-.15),(cx,cy,40.5),.085,'darkwood')
    flag=next(o for o in objects if o.name=='Plane009')
    verts=[];uv=[]
    for j in range(7):
        for i in range(17):
            u,v=i/16,j/6;verts.append((cx-3.8*u,cy+.08*u*math.sin(u*math.pi*2),36.8+3.3*v));uv.append((u,v))
    faces=[(j*17+i,j*17+i+1,(j+1)*17+i+1,(j+1)*17+i) for j in range(6) for i in range(16)]
    replace(flag,verts,faces,'black',uv);flag['sunny_sail_uv']=True;flag['sunny_flag_edge']=0
    # A rear mounted horn, directly bracketed to the window-band underside.
    pole('Lookout_speaker_bracket',(cx+rx*.65,cy,floor-.12),(cx+rx*.65+.38,cy,floor-.30),.075,'black')
    pole('Lookout_loudspeaker',(cx+rx*.65+.38,cy,floor-.30),(cx+rx*.65+.90,cy,floor-.30),.11,'cream',radius2=.30,sides=20)
    pole('Lookout_speaker_throat',(cx+rx*.65+.905,cy,floor-.30),(cx+rx*.65+.91,cy,floor-.30),.24,'black',sides=20)


def swept_mane(objects, bounds):
    """H/A/C's curved side blades, retaining their source roots/tips/depth.

    The front SBS drawing and both supplied coloured views show an inward
    curved edge on each side blade. The existing blades are nearly straight.
    This smooth transverse shear preserves each closed source volume, root,
    radial tip, longitudinal station and the seven-petal mechanism. The
    normalized bend strengths are reconstruction choices, not survey sizes.
    """
    head = next(o for o in objects if o.name.split('.')[0] == 'Sphere001')
    a, b = bounds(head)
    centre = Vector(((a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2))
    radius = (b.y-a.y)/2
    strengths = {'Rectangle003': .18, 'Rectangle008': .18,
                 'Rectangle004': .26, 'Rectangle006': .26,
                 'Rectangle005': .26, 'Rectangle007': .26}
    for obj in objects:
        name = obj.name.split('.')[0]
        if name not in strengths:
            continue
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        tip = max(points, key=lambda p: math.hypot(p.y-centre.y,
                                                 p.z-centre.z))
        radial = Vector((0, tip.y-centre.y, tip.z-centre.z)).normalized()
        transverse = Vector((0, -radial.z, radial.y))
        stations = [(p-centre).dot(radial) for p in points]
        low, high = min(stations), max(stations)
        bend = math.copysign(strengths[name]*radius, -radial.y)
        for point, station in zip(points, stations):
            t = max(0.0, min(1.0, (station-low)/(high-low)))
            point += transverse * (bend*math.sin(math.pi*t)**2)
        replace(obj, points, [tuple(p.vertices) for p in obj.data.polygons],
                'mane')
        obj['sunny_reference_mane'] = 'H/A/C swept side blade; retained endpoints'


def fitted_face_patch(surface, name, centre_y, centre_z, radius,
                      lift, bulge, embed, key):
    """Closed circular feature fitted into an actual source skin, in metres."""
    bpy.context.view_layer.update()
    inverse = surface.matrix_world.inverted()
    direction = inverse.to_3x3() @ Vector((1, 0, 0))
    count, rings = 64, 8
    samples = [(centre_y, centre_z, 0)]
    for ring_index in range(1, rings+1):
        fraction = ring_index/rings
        for i in range(count):
            angle = i*math.tau/count
            samples.append((centre_y+radius*fraction*math.cos(angle),
                            centre_z+radius*fraction*math.sin(angle), fraction))
    front, rear = [], []
    for y, z, fraction in samples:
        hit, point, _, _ = surface.ray_cast(inverse @ Vector((-100, y, z)),
                                           direction)
        if not hit:
            raise RuntimeError(name+' loses its actual '+surface.name+' support')
        x = (surface.matrix_world @ point).x
        front.append((x-lift-bulge*(1-fraction*fraction), y, z))
        rear.append((x+embed, y, z))
    faces = [(0, 1+(i+1)%count, 1+i) for i in range(count)]
    for ring_index in range(rings-1):
        inner, outer = 1+ring_index*count, 1+(ring_index+1)*count
        for i in range(count):
            j = (i+1)%count
            faces.append((inner+i, inner+j, outer+j, outer+i))
    offset = len(front)
    faces += [tuple(index+offset for index in reversed(face))
              for face in list(faces)]
    edge = 1+(rings-1)*count
    for i in range(count):
        a, b = edge+i, edge+(i+1)%count
        faces.append((a, a+offset, b+offset, b))
    obj = finish(_mesh(name, front+rear, faces), name, key)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError(name+' must be a closed supported feature')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    for face in obj.data.polygons:
        face.use_smooth = True
    obj['sunny_skin_support'] = surface.name
    return obj


def lion_face(objects, bounds):
    """A/H's smaller ivory muzzle and round attached eyes/black nose."""
    head = next(o for o in objects if o.name.split('.')[0] == 'Sphere001')
    a, b = bounds(head)
    radius = (b.y-a.y)/2
    cy, cz = (a.y+b.y)/2, (a.z+b.z)/2
    muzzle = next(o for o in objects if o.name == 'Sphere002')
    low, high = bounds(muzzle)
    centre = (low+high)/2
    points = [muzzle.matrix_world @ v.co for v in muzzle.data.vertices]
    for point in points:
        point.y = cy+(point.y-centre.y)*.72
        point.z = centre.z+(point.z-centre.z)*.82
    replace(muzzle, points, [tuple(f.vertices) for f in muzzle.data.polygons],
            'cream')
    muzzle['sunny_reference_face'] = 'A/H compact ivory muzzle; retained depth/height station'
    # Keep the source head, all seven mane bodies and the muzzle centre/depth.
    # Broad normalized proportions are reconstruction choices from A/H, not
    # official dimensions. Every eye rear is embedded in its actual source skin.
    discard(objects, lambda o: o.name.startswith('Sunny_LionEye_'))
    for side in (-1, 1):
        y, z = cy+side*.40*radius, cz+.40*radius
        eye = fitted_face_patch(head, 'LionEye_white', y, z, .19*radius,
                                .010*radius, .018*radius, .012*radius, 'white')
        fitted_face_patch(eye, 'LionEye_pupil', y, z, .19*.67*radius,
                          .003*radius, .012*radius, .012*radius, 'black')
    low, high = bounds(muzzle)
    nose = next(o for o in objects if o.name == 'Sphere005')
    patch = fitted_face_patch(muzzle, 'LionNose_source', cy,
                              centre.z+(high.z-low.z)*.26, .11*radius,
                              .008*radius, .065*radius, .080*radius, 'black')
    assign_world_mesh(nose, patch.data)
    nose['sunny_authored'] = True
    nose['sunny_skin_support'] = muzzle.name
    bpy.data.objects.remove(patch, do_unlink=True)
    bpy.context.view_layer.update()


def closed_face_mesh(obj, name, level=None, above=True):
    """Bake/weld source face geometry; optionally bisect and cap its muzzle."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.transform(bm, matrix=obj.matrix_world, verts=list(bm.verts))
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00002)
    if level is not None:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                              plane_co=Vector((0, 0, level)), plane_no=Vector((0, 0, 1)),
                              clear_inner=above, clear_outer=not above, dist=.00001)
    boundary = [e for e in bm.edges if e.is_boundary]
    if boundary:
        bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in obj.data.materials:
        mesh.materials.append(mat)
    mesh.update()
    return mesh


def face_boolean(obj, cutter, operation):
    """Evaluate a closed source-face Boolean, retaining cut-surface materials."""
    modifier = obj.modifiers.new('SourceMouth', 'BOOLEAN')
    modifier.operation = operation
    modifier.solver = 'EXACT'
    modifier.object = cutter
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
    obj.modifiers.remove(modifier)
    obj.data = mesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00002)
    # Preserve shared collinear cut vertices through the later polygon cleaner.
    # Otherwise its safe visual simplification creates exported T junctions.
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if not bm.faces or any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError(obj.name+' has an empty or unclosed source-mouth Boolean')
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    for face in mesh.polygons:
        face.use_smooth = face.material_index == 0


def mouth_prism(head, bounds, centre_y, top, bottom, half_width, back):
    """H's tall mouth footprint; metre sizes/chamfers are reconstruction."""
    bevel = .10
    outline = [(-half_width, bottom+bevel), (-half_width+bevel, bottom),
               (half_width-bevel, bottom), (half_width, bottom+bevel),
               (half_width, top-bevel), (half_width-bevel, top),
               (-half_width+bevel, top), (-half_width, top-bevel)]
    front = bounds(head)[0].x-.2
    verts = [(x, centre_y+y, z) for x in (front, back) for y, z in outline]
    size = len(outline)
    faces = [tuple(range(size-1, -1, -1)), tuple(range(size, size*2))]
    faces += [(i, (i+1)%size, (i+1)%size+size, i+size) for i in range(size)]
    cutter = _mesh('SourceMouthCut', verts, faces)
    cutter.data.materials.append(material('lion'))
    cutter.data.materials.append(material('black'))
    for face in cutter.data.polygons:
        face.material_index = 1
    return cutter


def front_face_panel(obj, thickness=.12):
    """Retain the original painted front curve as one opaque moving panel."""
    old = obj.data
    source = [face for face in old.polygons if face.normal.x < -.001
              and old.materials[face.material_index].name == 'Sunny_lion']
    if not source:
        raise RuntimeError('Gaon chin loses its original painted front skin')
    used = sorted({i for face in source for i in face.vertices})
    remap = {index: i for i, index in enumerate(used)}
    verts = [old.vertices[i].co.copy() for i in used]
    count = len(verts)
    verts += [p+Vector((thickness, 0, 0)) for p in verts]
    faces, indices, edges = [], [], {}
    for face in source:
        ids = [remap[i] for i in face.vertices]
        faces.extend((ids, [i+count for i in reversed(ids)]))
        indices.extend((0, 1))
        for a, b in zip(ids, ids[1:]+ids[:1]):
            edges.setdefault(tuple(sorted((a, b))), []).append((a, b))
    for shared in edges.values():
        if len(shared) == 1:
            a, b = shared[0]
            faces.append((a, a+count, b+count, b))
            indices.append(1)
    mesh = bpy.data.meshes.new('Gaon_source_front_panel')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material('lion'))
    mesh.materials.append(material('black'))
    for face, index in zip(mesh.polygons, indices):
        face.material_index = index
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00002)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if not bm.faces or any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError('Gaon front panel has unsupported cut edges')
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj.data = mesh
    obj['sunny_panel_thickness'] = thickness


def gaon_barrel(front, back, centre_y, centre_z, radius, wall=.12):
    """A sealed hollow cannon wall, open front bore and attached rear surface."""
    count = 48
    verts = [(x, centre_y+r*math.cos(i*math.tau/count), centre_z+r*math.sin(i*math.tau/count))
             for x, r in ((front, radius), (back, radius),
                          (front, radius-wall), (back, radius-wall)) for i in range(count)]
    faces = []
    for i in range(count):
        j = (i+1)%count
        faces += [(i, j, count+j, count+i),
                  (2*count+j, 2*count+i, 3*count+i, 3*count+j),
                  (j, i, 2*count+i, 2*count+j),
                  (count+i, count+j, 3*count+j, 3*count+i)]
    barrel = finish(_mesh('Gaon_barrel', verts, faces), 'Gaon_barrel', 'black')
    barrel['sunny_cannon_bore'] = True
    pole('Gaon_throat', (back-.02, centre_y, centre_z), (back+.02, centre_y, centre_z),
         radius-wall, 'black', sides=count)
    ring('Gaon_cannon_rim', (front, centre_y, centre_z), radius, .10, 'darkwood', 'X', 48, 8)
    return barrel


def fitted_cannon_front(chin, centre_y, centre_z, radius):
    """Recess the full cannon lip behind the actual closed curved face."""
    bpy.context.view_layer.update()
    inverse = chin.matrix_world.inverted()
    hits = []
    for i in range(64):
        angle = i*math.tau/64
        origin = Vector((-100, centre_y+radius*math.cos(angle),
                         centre_z+radius*math.sin(angle)))
        hit, point, _, _ = chin.ray_cast(inverse@origin,
                                       inverse.to_3x3()@Vector((1, 0, 0)))
        if not hit:
            raise RuntimeError('Gaon lip loses its closed source-face cover')
        hits.append((chin.matrix_world@point).x)
    # The lip extends .10 m forward of its centre; leave .12 m behind skin.
    return max(hits)+.22


def fitted_mouth_back(head, centre_y, top, bottom, half_width):
    """Keep a rear wall inside the sealed source head at every mouth corner."""
    bpy.context.view_layer.update()
    inverse = head.matrix_world.inverted()
    outline = [(-half_width, bottom), (half_width, bottom),
               (half_width, top), (-half_width, top)]
    hits = []
    for p, q in zip(outline, outline[1:]+outline[:1]):
        for i in range(17):
            t = i/16
            y, z = centre_y+p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t
            hit, point, _, _ = head.ray_cast(inverse@Vector((100, y, z)),
                                           inverse.to_3x3()@Vector((-1, 0, 0)))
            if not hit:
                raise RuntimeError('Mouth footprint leaves the source head')
            hits.append((head.matrix_world@point).x)
    return min(hits)-.12


def muzzle_seam(jaw, bounds, level):
    """H/A/C's horizontal mouth division, attached to the actual lower lip."""
    bpy.context.view_layer.update()
    low, high = bounds(jaw)
    centre = (low.y+high.y)/2
    width = (high.y-low.y)*.47
    inverse = jaw.matrix_world.inverted()
    points = []
    for i in range(25):
        origin = Vector((-100, centre-width+2*width*i/24, level-.025))
        hit, point, _, _ = jaw.ray_cast(inverse@origin,
                                      inverse.to_3x3()@Vector((1, 0, 0)))
        if not hit:
            raise RuntimeError('Horizontal muzzle seam loses lower-lip support')
        point = jaw.matrix_world@point
        point.x -= .018
        points.append(point)
    return [pole('LionSmile', a, b, .025, 'black') for a, b in zip(points, points[1:])]


def lion_mechanisms(objects,bounds):
    """H: source-led tall cavity, sealed lower face and a deep hollow cannon."""
    head=next(o for o in objects if o.name.split('.')[0]=='Sphere001')
    a,b=bounds(head);cy,cz=(a.y+b.y)/2,(a.z+b.z)/2
    petals = [obj for obj in objects
              if obj.name.split('.')[0] in {'Rectangle%03d'%i for i in range(2,9)}]
    if len(petals) != 7:
        raise RuntimeError('The source mouth needs all seven retained mane bodies')
    for obj in petals:
        obj['sunny_mane']=True;obj['sunny_pivot']=[(a.x+b.x)/2,cy,cz];obj['sunny_dynamic']=True
    muzzle=next(o for o in objects if o.name=='Sphere002');ma,mb=bounds(muzzle)
    split=(ma.z+mb.z)/2-.25
    radius = (b.y-a.y)/2
    bottom = split-.66*radius
    half_width = .28*radius
    # The imported dome has an open rear boundary. Seal it before probing its
    # rear skin, otherwise a rearward ray reaches the front skin instead.
    assign_world_mesh(head, closed_face_mesh(head, 'Lion_closed_source'))
    head['sunny_authored'] = True
    head.data.materials.append(material('black'))
    # X is invariant as the mane rotates. Keep the opaque cavity rear ahead
    # of every source blade, preserving their original longitudinal stations.
    back = min(fitted_mouth_back(head, cy, split, bottom, half_width),
               min(bounds(petal)[0].x for petal in petals)-.12)
    discard(objects, lambda o: o.name.startswith('Sunny_LionSmile'))
    # Split/cap the original muzzle instead of exporting two open surface cuts.
    lower = closed_face_mesh(muzzle, 'Gaon_lower_muzzle', split, False)
    upper = closed_face_mesh(muzzle, 'Gaon_upper_muzzle', split, True)
    assign_world_mesh(muzzle, upper)
    muzzle['sunny_authored'] = True
    jaw = bpy.data.objects.new('Gaon_jaw', lower)
    bpy.context.scene.collection.objects.link(jaw)
    finish(jaw, 'Gaon_jaw', 'cream')
    seam = muzzle_seam(jaw, bounds, split)
    # Keep the original face silhouette; detach its thin curved lower panel.
    # Black cut walls/back make a real cavity rather than a painted front disk.
    cutter = mouth_prism(head, bounds, cy, split, bottom, half_width, back)
    chin = bpy.data.objects.new('Sunny_Gaon_chin', head.data.copy())
    bpy.context.scene.collection.objects.link(chin)
    face_boolean(chin, cutter, 'INTERSECT')
    front_face_panel(chin)
    face_boolean(head, cutter, 'DIFFERENCE')
    bpy.data.objects.remove(cutter, do_unlink=True)
    chin['sunny_authored'] = True
    chin['sunny_feature'] = 'Gaon'
    # H shows a compact angled fold, rather than a quarter-turn hanging tray.
    # Retain the real bottom edge; 65 degrees clears the entire existing mouth
    # footprint while halving the excess descent. H does not dimension the
    # hinge/angle/depth: these remain disclosed reconstruction choices.
    pivot = [bounds(chin)[1].x, cy, bottom]
    jaw_axis = [0, -1, 0]  # Blender -Y becomes Three +Z.
    jaw_angle = math.radians(65)
    for component in (jaw, chin, *seam):
        component['sunny_jaw'] = True
        component['sunny_pivot'] = pivot
        component['sunny_jaw_axis'] = jaw_axis
        component['sunny_jaw_angle'] = jaw_angle
        component['sunny_dynamic'] = True
    cannon_z = (split+bottom)/2
    cannon_radius = min(half_width*.72, (split-bottom)*.39)
    front = fitted_cannon_front(chin, cy, cannon_z, cannon_radius+.10)
    gaon_barrel(front, back+.03, cy, cannon_z, cannon_radius)
    return {'maneAxis':[1,0,0],'manePivot':[(a.x+b.x)/2,cy,cz],
            'jawAxis':jaw_axis,'jawPivot':pivot,'jawAngle':jaw_angle,
            'mouth':{'top':split,'bottom':bottom,'halfWidth':half_width,'back':back},
            'outlet':[front-.10,cy,cannon_z]}


def fit_slide_envelope(chute, objects, bounds, thickness=.06):
    """Fit intersecting Aquarium skin/gallery deck to the actual closed trough."""
    bpy.context.view_layer.update()
    chute.data.calc_loop_triangles()
    triangles = [[chute.matrix_world @ chute.data.vertices[i].co for i in face.vertices]
                 for face in chute.data.loop_triangles]
    skins = [(obj, *bounds(obj)) for obj in objects
             if obj.name in ('Sunny_Aquarium_ceiling','Sunny_AftEntryDeck') or obj.name.startswith('Sunny_Aquarium_shell_')]
    down = Vector((0, 0, thickness))
    for triangle in triangles:
        points = [p-down for p in triangle]
        normal = (points[1]-points[0]).cross(points[2]-points[0])
        if normal.z <= .000001:
            continue
        normal.normalize()
        # Above the actual underside, inside this triangle's plan footprint.
        # This preserves the old ceiling/walls everywhere below or beside it.
        planes = []
        for p, q in zip(points, points[1:]+points[:1]):
            edge = q-p
            inward = Vector((-edge.y, edge.x, 0))
            planes.append((inward, inward.dot(p)))
        planes.append((normal, normal.dot(points[0])))
        for obj, low, high in skins:
            if (max(p.x for p in points) <= low.x or min(p.x for p in points) >= high.x
                    or max(p.y for p in points) <= low.y or min(p.y for p in points) >= high.y
                    or min(p.z for p in points) >= high.z-.00001):
                continue
            cut_prism(obj, planes)
            obj['sunny_slide_clearance'] = True
    from sunny_surfaces import floor_soffit
    # Reconstructed structural depth; the original top/entry/exit do not move.
    floor_soffit(chute, thickness)


def slide_support(name, x, y, floor, chute, thickness=.06):
    """Physical post whose complete head fits the exported curved underside."""
    n, radius = 10, .05
    bottom, head = [], []
    for i in range(n):
        angle = i*math.tau/n
        xx, yy = x+radius*math.cos(angle), y+radius*math.sin(angle)
        hit, location, _, _ = chute.ray_cast(Vector((xx, yy, 500)), Vector((0, 0, -1)))
        if not hit:
            raise RuntimeError('slide support lacks its actual trough surface')
        bottom.append((xx, yy, floor))
        head.append((xx, yy, location.z-thickness+.002))
    faces = [(i, (i+1)%n, n+(i+1)%n, n+i) for i in range(n)]
    faces += [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    return finish(_mesh(name, bottom+head, faces), name, 'white', obstacle=True)


def deck_details(objects,bounds,frame,levels):
    """Correct F3 handedness and structural support for swing, trough and flue."""
    cy=frame.y(.585)
    discard(objects,lambda o:o.name.startswith(('Sunny_Swing','Sunny_Slide','Sunny_KitchenChimney')))
    lawn=levels['F1'];gallery=levels['F2A']
    port_tree=next(o for o in bpy.data.objects if o.name=='Sunny_ShadeTree_port_trunk')
    a,b=bounds(port_tree);tx,ty=(a.x+b.x)/2,(a.y+b.y)/2
    end=(tx-1.75,ty,lawn+3.25)
    pole('Swing_branch',(tx,ty,lawn+3.0),end,.11,'darkwood',radius2=.065)
    for x in (end[0]-.40,end[0]+.40):pole('Swing_rope',(x,ty,lawn+3.25),(x,ty,lawn+.61),.025,'rope')
    box('Swing_seat',(end[0],ty,lawn+.56),(1.02,.40,.10),'deck')
    # Human-width curved U section at the plan's starboard edge, accessible
    # directly from F2 gallery; no duplicate ladder/flight is introduced.
    y=cy+11.25;x0=10.0;x1=tx-2.0
    verts,faces=[],[];n,m=40,8
    for i in range(n+1):
        t=i/n;x=x0+(x1-x0)*t;z=gallery+(lawn-gallery)*(t*t*(3-2*t))
        for j in range(m+1):
            q=-1+2*j/m;verts.append((x,y+q*.52,z+.20*q*q))
    for i in range(n):
        for j in range(m):
            k=i*(m+1)+j;faces.append((k,k+1,k+m+2,k+m+1))
    chute=finish(_mesh('Slide_chute',verts,faces),'Slide_chute','gold',walkable=True)
    chute['sunny_rail']=True
    fit_slide_envelope(chute,objects,bounds)
    for side in (0,m):
        for i in range(n):pole('Slide_lip',verts[i*(m+1)+side],verts[(i+1)*(m+1)+side],.038,'red')
    for t in (.1,.7):
        x=x0+(x1-x0)*t
        for yy in (y-.47,y+.47):slide_support('Slide_support',x,yy,lawn,chute)
    chimney=(frame.x(9.25),cy+5.7,levels['F3G'])
    pole('KitchenChimney',chimney,(chimney[0],chimney[1],chimney[2]+2.65),.31,'black',sides=20)
    ring('KitchenChimney_cap',(chimney[0],chimney[1],chimney[2]+2.65),.35,.065,'black',major=32)
    pole('KitchenChimney_throat',(chimney[0],chimney[1],chimney[2]+2.60),(chimney[0],chimney[1],chimney[2]+2.61),.25,'black',sides=20)


def stern_lanterns(objects,bounds):
    """Rebuild the two existing stern stations as black cages with glass panes."""
    sources=[o for o in objects if o.name.split('.')[0] in ('NGon001','NGon005')]
    stations=[((bounds(o)[0]+bounds(o)[1])/2,bounds(o)[1]-bounds(o)[0]) for o in sources]
    discard(objects,lambda o:o.name.split('.')[0] in ('NGon001','NGon003','NGon004','NGon005'))
    for i,(p,size) in enumerate(stations):
        side='port' if p.y<1.287 else 'starboard'
        x,y,z=p;rad=min(size.x,size.y)*.40
        pole('Lantern_stem_'+side,(x,y,z-2.7),(x,y,z-1.0),.105,'black')
        pole('Lantern_base_'+side,(x,y,z-1.0),(x,y,z-.84),rad*.95,'black',sides=6)
        pole('Lantern_roof_'+side,(x,y,z+.86),(x,y,z+1.72),rad*1.15,'black',radius2=.04,sides=6)
        pole('Lantern_spire_'+side,(x,y,z+1.72),(x,y,z+2.40),.048,'black',radius2=.006)
        for j in range(6):
            t0=j*math.tau/6;t1=(j+1)*math.tau/6
            p0=(x+rad*math.cos(t0),y+rad*math.sin(t0));p1=(x+rad*math.cos(t1),y+rad*math.sin(t1))
            pole('Lantern_cage_'+side,(*p0,z-.85),(*p0,z+.86),.07,'black')
            finish(_mesh('Lantern_glass',[(*p0,z-.81),(*p1,z-.81),(*p1,z+.82),(*p0,z+.82)],[(0,1,2,3)]),'Lantern_glass_'+side+'_%d'%j,'glass')
        inward=-1 if y>1.287 else 1
        pole('Lantern_bracket_'+side,(x,y+inward*2.25,z-.80),(x,y,z-2.70),.115,'black')


def main_gaff_roof_tie(objects,bounds):
    """C/N's one visible diagonal from the lowest gaff tip to the roof rim."""
    bpy.context.view_layer.update()
    spar=next(o for o in objects if o.name=='Cylinder013')
    a,b=bounds(spar)
    # Retain the actual far cap's transverse station, including the clipped
    # source spar envelope. Fit both ends to real skin; hidden tackle, exact
    # attachment knots and this small embedding are reconstruction choices.
    caps=[f for f in spar.data.polygons if len(f.vertices)>4]
    if len(caps)!=2:
        raise RuntimeError('Lowest main gaff must retain both actual end caps')
    centres=[sum((spar.matrix_world@spar.data.vertices[i].co for i in f.vertices),
                 Vector((0,0,0)))/len(f.vertices) for f in caps]
    far=max(centres,key=lambda p:p.x)
    point,normal,_,_=yard_skin(spar).find_nearest(Vector((b.x+.03,far.y,far.z)))
    if point is None:
        raise RuntimeError('Missing actual lowest-gaff tip support')
    start=point-normal.normalized()*.012
    rim=[o for o in bpy.data.objects if o.type=='MESH' and
         o.name.startswith('Sunny_LibraryRoof_toprim')]
    hits=[yard_skin(o).find_nearest(start) for o in rim]
    hits=[h for h in hits if h[0] is not None]
    if not hits:
        raise RuntimeError('Missing actual Library roof top rim')
    point,normal,_,_=min(hits,key=lambda h:(h[0]-start).length)
    end=point-normal.normalized()*.012
    tie=pole('MainGaff_roof_tie',start,end,.035,'rope',sides=12)
    tie['sunny_gaff_tie_reference']='C/N: single visible lowest-gaff tip to Library top rim'
    tie['sunny_gaff_tie_endpoints']=[list(start),list(end)]


def library_roof(objects,bounds):
    """L/N's exterior dormers, shallow top opening and rim on the existing hut."""
    roof=next(o for o in objects if o.name=='Sunny_LibraryRoof')
    a,b=bounds(roof);cx,cy=(a.x+b.x)/2,(a.y+b.y)/2;floor=a.z
    rx,ry=(b.x-a.x)/2,(b.y-a.y)/2
    n=96;verts,faces=[],[]
    profile=((rx,ry,floor),(rx*.985,ry*.985,floor+.25),(rx*.90,ry*.90,floor+2.10),(rx*.81,ry*.81,floor+2.72),(rx*.40,ry*.40,floor+3.10))
    for xx,yy,z in profile:
        for i in range(n):
            t=i*math.tau/n;verts.append((cx+xx*math.cos(t),cy+yy*math.sin(t),z))
    for j in range(4):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    replace(roof,verts,faces,'red');roof.data.materials.append(material('gold'))
    for f in roof.data.polygons:f.material_index=(f.index% n)//8 % 2
    for i in range(4):
        t=i*math.pi/2;lat=Vector((-math.sin(t),math.cos(t),0))
        p=Vector((cx+rx*.965*math.cos(t),cy+ry*.965*math.sin(t),floor+.95))
        axis=0 if i%2==0 else 1
        circular_cut(roof,p+Vector((0,0,.35)),.82,axis,p[axis]-1.25,p[axis]+1.25,24)
        arch=[p+lat*(.79*math.cos(j*math.pi/20))+Vector((0,0,1.10*math.sin(j*math.pi/20))) for j in range(21)]
        for v,w in zip(arch,arch[1:]):pole('LibraryRoof_dormer_arch',v,w,.075,'white')
        points=arch+[p-lat*.79-Vector((0,0,.48)),p+lat*.79-Vector((0,0,.48))]
        finish(_mesh('LibraryRoof_dormer',points,[tuple(range(len(points)))]),'LibraryRoof_dormer_glass%d'%i,'glass')
        pole('LibraryRoof_dormer_bar',p-Vector((0,0,.46)),p+Vector((0,0,1.04)),.035,'black')
    for i in range(48):
        t0=i*math.tau/48;t1=(i+1)*math.tau/48
        p0=(cx+rx*.40*math.cos(t0),cy+ry*.40*math.sin(t0),floor+3.10)
        p1=(cx+rx*.40*math.cos(t1),cy+ry*.40*math.sin(t1),floor+3.10)
        pole('LibraryRoof_toprim',p0,p1,.10,'white')
        if i%2==0:pole('LibraryRoof_ventbar',p0,(p0[0],p0[1],p0[2]+.30),.032,'white')
        pole('LibraryRoof_ventrail',(p0[0],p0[1],p0[2]+.30),(p1[0],p1[1],p1[2]+.30),.038,'white')


def human_rails(objects,bounds):
    """Final-metre garden rails and a two-bar balcony with its fore entry gap."""
    discard(objects,lambda o:o.name.startswith(('Sunny_GardenStair_handrail','Sunny_GardenStair_post')))
    for suffix in ('','.001'):
        treads=[o for o in objects if o.name.startswith('Sunny_GardenStair_tread') and o.name.endswith(suffix) and (suffix or '.' not in o.name)]
        treads.sort(key=lambda o:bounds(o)[1].z)
        for side in (0,1):
            path=[]
            for i,obj in enumerate(treads):
                a,b=bounds(obj);x=(a.x+b.x)/2;y=(a.y+.04) if side==0 else (b.y-.04)
                path.append((x,y,b.z))
                if i%4==0 and i not in (0,len(treads)-1):
                    ob=pole('GardenStair_post',(x,y,b.z),(x,y,b.z+1.02),.028,'white');ob['sunny_rail']=True;ob['sunny_obstacle']=True
            for height in (.52,1.02):
                for a,b in zip(path[1:-1],path[2:-1]):
                    ob=pole('GardenStair_handrail',(a[0],a[1],a[2]+height),(b[0],b[1],b[2]+height),.032,'white');ob['sunny_rail']=True;ob['sunny_obstacle']=True
    balcony=next(o for o in objects if o.name=='Sunny_SternBalcony_floor')
    a,b=bounds(balcony);cx,cy,floor=(a.x+b.x)/2,(a.y+b.y)/2,b.z
    old=next(o for o in objects if o.name=='Sunny_SternBalcony_rail')
    discard(objects,lambda o:o==old)
    points=[]
    for obj in list(objects):
        if not obj.name.startswith('Sunny_SternBalcony_post'):continue
        a,b=bounds(obj);x,y=(a.x+b.x)/2,(a.y+b.y)/2
        if x<cx-3 and abs(y-cy)<1.65:
            discard(objects,lambda o:o==obj);continue
        vv=[obj.matrix_world@v.co for v in obj.data.vertices]
        for p in vv:
            p.x=x+(p.x-x)*.38;p.y=y+(p.y-y)*.38;p.z=floor+(p.z-a.z)*1.02/(b.z-a.z)
        replace(obj,vv,[tuple(f.vertices) for f in obj.data.polygons],'white');obj['sunny_rail']=True;obj['sunny_obstacle']=True
        points.append(Vector((x,y,floor)))
    # The imported torus has 20 stations but its posts have 24. Fit both
    # bars through the retained post axes so bends and the gap have support.
    points.sort(key=lambda p:math.atan2(p.y-cy,p.x-cx))
    for height in (.52,1.02):
        for p,q in zip(points,points[1:]+points[:1]):
            mid=(p+q)/2
            if mid.x<cx-3.0 and abs(mid.y-cy)<1.65:continue
            ob=pole('SternBalcony_rail',(p.x,p.y,floor+height),(q.x,q.y,floor+height),.032,'white');ob['sunny_rail']=True;ob['sunny_obstacle']=True


def anchor_paint(objects,bounds):
    """Clip H's three vertical dark bands onto the original gold ball surfaces."""
    for obj in objects:
        if obj.name not in ('Sphere006','Sphere009'):continue
        a,b=bounds(obj);cy=(a.y+b.y)/2;r=(b.y-a.y)/2
        edges=[a.y-.01]+[cy+r*v for c in (-.52,0,.52) for v in (c-.075,c+.075)]+[b.y+.01]
        verts,faces,indices=[],[],[]
        for face in obj.data.polygons:
            polygon=[obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
            for j,(low,high) in enumerate(zip(edges,edges[1:])):
                clipped=clip_face(clip_face(polygon,1,low,True),1,high,False)
                if len(clipped)<3:continue
                faces.append(tuple(range(len(verts),len(verts)+len(clipped))));verts+=clipped;indices.append(j%2)
        replace(obj,verts,faces,'gold')
        obj.data.materials.append(material('black'))
        for face,index in zip(obj.data.polygons,indices):face.material_index=index
        obj['sunny_anchor_bands']=3


def fitted_anchor_hawse(shield, surface, point, normal, side):
    """H's round bow eyelet, fitted to its actual sloped shield skin."""
    # Keep the measured hole centre. Its metal collar lies in the actual local
    # tangent plane; a small axial correction follows the retained curved skin.
    # Lip dimensions and the short dark reveal are reconstruction, not a hidden
    # capstan path. No anchor/fluke stations or stowed state change.
    point, normal = Vector(point), Vector(normal).normalized()
    if normal.x > 0:
        normal.negate()
    u = normal.cross(Vector((0, 0, 1))).normalized()
    v = normal.cross(u).normalized()
    def skin(offset):
        hit, _, _, _ = surface.ray_cast(point+offset+normal*3, -normal, 6)
        if hit is None:
            raise RuntimeError('Anchor hawse loses actual bow skin: '+side)
        return hit
    major, minor, radius, tube = 32, 8, .49, .105
    verts, faces = [], []
    for i in range(major):
        angle = i*math.tau/major
        radial = u*math.cos(angle)+v*math.sin(angle)
        for j in range(minor):
            theta = j*math.tau/minor
            verts.append(skin(radial*(radius+tube*math.cos(theta)))+
                         normal*(.07+tube*math.sin(theta)))
    for i in range(major):
        for j in range(minor):
            a = i*minor+j; b = i*minor+(j+1)%minor
            faces.append((a,b,((i+1)%major)*minor+(j+1)%minor,
                          ((i+1)%major)*minor+j))
    collar = finish(_mesh('Anchor_'+side+'_hawse',verts,faces),
                    'Anchor_'+side+'_hawse','gold')
    collar['sunny_hawse_axis'] = list(normal)
    collar['sunny_hawse_surface'] = list(point)
    # Subtract the real aperture in the same local plane as the fitted collar.
    planes = []
    for i in range(major):
        angle = (i+.5)*math.tau/major
        n = -(u*math.cos(angle)+v*math.sin(angle))
        planes.append((n,n.dot(point)-.39*math.cos(math.pi/major)))
    planes.extend(((normal,normal.dot(point)-1),
                   (-normal,-normal.dot(point)-1)))
    cut_prism(shield,planes)
    # A sealed short sleeve owns the visible reveal. Its front remains open;
    # only the rear is dark. This does not invent a concealed rope run.
    verts, faces = [], []
    for r, depth in ((.405,.01),(.375,.01),(.405,-.33),(.375,-.30)):
        for i in range(major):
            angle = i*math.tau/major
            verts.append(skin((u*math.cos(angle)+v*math.sin(angle))*r)+normal*depth)
    for i in range(major):
        j = (i+1)%major
        faces.extend(((i,j,major+j,major+i),
                      (i,2*major+i,2*major+j,j),
                      (major+i,major+j,3*major+j,3*major+i)))
    faces.append(tuple(range(3*major,4*major)))
    faces.append(tuple(reversed(range(2*major,3*major))))
    # The filled rear disk belongs to the sleeve; its outside rear face closes
    # the solid wall/back volume while keeping the front aperture hollow.
    bore = finish(_mesh('Anchor_'+side+'_bore',verts,faces),
                  'Anchor_'+side+'_bore','black')
    bore['sunny_hawse_axis'] = list(normal)
    bore['sunny_hawse_surface'] = list(point)
    return point+normal*.07, point-normal*.285, normal



def anchor_ropes(objects, bounds):
    """H/A's visible short stowed ropes, attached to measured bow hawse holes."""
    shield=next(o for o in objects if o.name.split('.')[0]=='Circle038')
    surface=yard_skin(shield)
    result=[]
    for name in ('Sphere006','Sphere009'):
        anchor=next(o for o in objects if o.name==name);a,b=bounds(anchor)
        x,y,z=(a.x+b.x)/2,(a.y+b.y)/2,a.z-.65
        point,normal,_,_=surface.ray_cast(Vector((-60,y,z)),Vector((1,0,0)),100)
        if point is None:
            raise RuntimeError('Missing reference bow support for '+name+' hawse')
        side='port' if y<1.287 else 'starboard'
        hawse,entry,normal=fitted_anchor_hawse(shield,surface,point,normal,side)
        end=Vector((x-.10,y,a.z+.08))
        path=[]
        for i in range(13):
            t=i/12;p=hawse.lerp(end,t);p.x-=.20*math.sin(math.pi*t)
            path.append(p)
        # Extend only the first retained segment through the visible opening.
        # The remaining twelve-station stowed path and ball-side end are kept.
        path[0]=entry
        for i,(p,q) in enumerate(zip(path,path[1:])):
            rope=pole('Anchor_'+side+'_rope',p,q,.065,'rope',sides=12)
            rope['sunny_anchor_rope']=side
            if i in (0,11):rope['sunny_rope_endpoint']=list(p if i==0 else q)
        result.append({'side':side,'anchor':name,'hawse':list(hawse),'ropeEnd':list(end),
                       'hawseSurface':list(point),'hawseAxis':list(normal),
                       'state':'stowed; concealed capstan route is not invented'})
    return result



def scalloped_soffit(obj, bounds, throat):
    """A/N's recessed petal bays, retaining the eight-sector support envelope."""
    a,b=bounds(obj);cx,cy=(a.x+b.x)/2,(a.y+b.y)/2
    rx,ry=(b.x-a.x)/2,(b.y-a.y)/2;height=b.z-a.z
    verts,faces=[],[];segments,rows=96,16
    for j in range(rows+1):
        v=j/rows;r=throat+(1-throat)*math.sin(v*math.pi/2)
        for i in range(segments):
            t=i*math.tau/segments
            # Recess the bay between radial supports rather than bulging it
            # below the ribs. Outer rim/throat and all existing bounds stay.
            # Exact normalized relief is reconstructed from A/N morphology.
            recess=.32*(1-throat)*math.sin(v*math.pi)**2*(1-math.cos(8*t))/2
            radius=r-recess
            verts.append((cx+rx*radius*math.cos(t),cy+ry*radius*math.sin(t),a.z+height*v))
    for j in range(rows):
        for i in range(segments):
            k=j*segments+i;next_i=j*segments+(i+1)%segments
            faces.append((k,next_i,next_i+segments,k+segments))
    # Retain a small structural throat; existing authored room floors cap the top.
    faces.append(tuple(reversed(range(segments))))
    replace(obj,verts,faces,'cream');obj['sunny_soffit_lobes']=8


def fore_shrouds(objects,bounds,levels):
    """N/A's paired fan shrouds: deck attachments, ratlines, and yard endpoints."""
    mast=next(o for o in objects if o.name=='Cylinder003');a,b=bounds(mast)
    mx,my=(a.x+b.x)/2,(a.y+b.y)/2
    yard=next(o for o in objects if o.name=='Cylinder004');ya,yb=bounds(yard)
    top=ya.z-.25;floor=levels['F1']+.04
    mast_surface = yard_skin(mast)
    rope=bpy.data.materials.get('Sunny_tarred_rope')
    if rope is None:
        rope=material('rope').copy();rope.name='Sunny_tarred_rope'
        rope.diffuse_color=(.075,.065,.052,1)
        bsdf=rope.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value=rope.diffuse_color
        bsdf.inputs['Roughness'].default_value=.88
        bsdf.inputs['Metallic'].default_value=0
    for name,side in (('Plane006',-1),('Plane007',1)):
        obj=next(o for o in objects if o.name==name)
        verts,faces=[],[]
        def rod(start,end,radius):
            p,q=Vector(start),Vector(end);direction=(q-p).normalized()
            u=direction.cross(Vector((1,0,0))).normalized();v=direction.cross(u)
            offset=len(verts)
            for centre in (p,q):
                for k in range(8):
                    t=k*math.tau/8;verts.append(centre+radius*(math.cos(t)*u+math.sin(t)*v))
            for k in range(8):faces.append((offset+k,offset+(k+1)%8,offset+(k+1)%8+8,offset+k+8))
        bottom=[Vector((mx+1.65,my+side*(3.6+i*.95),floor)) for i in range(6)]
        upper=[fitted_radial_attachment(mast_surface, (mx,my,top),
                                       (.18,side*(.42+i*.16),0)) for i in range(6)]
        for p,q in zip(bottom,upper):rod(p,q,.048)
        count=math.ceil((top-floor)/.36)
        for i in range(1,count):
            t=i/count
            rod(bottom[0].lerp(upper[0],t),bottom[-1].lerp(upper[-1],t),.025)
        replace(obj,verts,faces,'rope');obj.data.materials[0]=rope
        obj['sunny_shroud_endpoints']=[list(p) for p in bottom+upper]
        obj['sunny_shroud_side']='port' if side<0 else 'starboard'


def mast_platforms(objects,bounds):
    """A/O timber platforms with dark rim and exposed radial timber supports."""
    for name in ('Cylinder008','Cylinder012','Cylinder056'):
        obj=next(o for o in objects if o.name==name);a,b=bounds(obj)
        cx,cy=(a.x+b.x)/2,(a.y+b.y)/2;rx,ry=(b.x-a.x)/2,(b.y-a.y)/2
        top=b.z
        verts,faces=[],[];segments=48
        # Preserve each source footprint/top; replace its opaque bowl by a rim/deck.
        for z in (top-.26,top):
            for i in range(segments):
                t=i*math.tau/segments;verts.append((cx+rx*math.cos(t),cy+ry*math.sin(t),z))
        faces.extend([tuple(reversed(range(segments))),tuple(range(segments,2*segments))])
        faces += [(i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments)]
        replace(obj,verts,faces,'darkwood');obj.data.materials.append(material('black'))
        for face in obj.data.polygons:face.material_index=1 if face.index>1 else 0
        mast=next(o for o in objects if o.name=='Cylinder007')
        mast_surface = yard_skin(mast)
        for i in range(8):
            t=i*math.tau/8
            root = fitted_radial_attachment(mast_surface, (cx,cy,a.z),
                                            (math.cos(t),math.sin(t),0), .025)
            pole('MastPlatform_brace_'+name,root,
                 (cx+rx*.85*math.cos(t),cy+ry*.85*math.sin(t),top-.27),.11,'darkwood',sides=8)
        obj['sunny_platform_braces']=8


def lookout_access(objects, bounds, interiors):
    """N's exposed rope-to-ladder access, real floor opening and moving hatch."""
    from sunny_interiors import hatch
    dome = next(o for o in objects if o.name == 'Cylinder006')
    a, b = bounds(dome)
    cx, cy = (a.x+b.x)/2, (a.y+b.y)/2
    rx, ry = (b.x-a.x)/2*.97, (b.y-a.y)/2*.97
    # lookout() records this before rebuilding the roof and raising the sash
    # sill. Reading a pane bound here would incorrectly raise every access part.
    floor = float(dome['sunny_lookout_floor'])
    hx, hy = cx+2.35, cy+1.10
    outline = [(cx+rx*math.cos(i*math.tau/64), cy+ry*math.sin(i*math.tau/64), floor) for i in range(64)]
    deck = finish(_mesh('Lookout_floor', outline, [tuple(range(64))]), 'Lookout_floor', 'deck', walkable=True)
    open_volume_slot(deck, hx-.75, hx+.75, hy-.70, hy+.70, floor-.20, floor+.20)
    deck['sunny_access_slot'] = [hx-.75, hx+.75, hy-.70, hy+.70]
    underside = next(o for o in objects if o.name == 'Cylinder005')
    ua, ub = bounds(underside)
    open_volume_slot(underside, hx-.75, hx+.75, hy-.70, hy+.70, ua.z-.01, floor+.20)
    underside['sunny_obstacle'] = True
    underside['sunny_rail'] = True
    for obj in bpy.data.objects:
        if obj.name.startswith(('Sunny_Lookout_pane', 'Sunny_Lookout_sash', 'Sunny_Lookout_band',
                                'Sunny_Lookout_wall_', 'Sunny_Lookout_crossbar')):
            obj['sunny_obstacle'] = True
            obj['sunny_rail'] = True
    hatch('CrowNestHatch', (hx,hy,floor), 0, (1.50,1.40), rooms=('Fore shroud','Crow\'s Nest'), slide_sign=-1)
    ma, mb = bounds(next(o for o in objects if o.name == 'Cylinder003'))
    ya, yb = bounds(next(o for o in objects if o.name == 'Cylinder004'))
    mx, my = (ma.x+mb.x)/2, (ma.y+mb.y)/2
    points = [Vector((mx+2.20,my+8.85,interiors['levels']['F1'])),
              Vector((yb.x+.55,my+2.75,ya.z-3.75)),
              Vector((hx,hy,ya.z-.55)),
              Vector((hx,hy,floor)),
              Vector((hx-1.60,hy,floor))]
    # Handholds sit half a metre ahead of the human's centre. The guide joins
    # the existing shroud deck mount to the aft yard edge and hanging ladder.
    guide = [p-Vector((.50,0,0)) for p in points[:3]]
    for i,(p,q) in enumerate(zip(guide,guide[1:])):
        pole('Lookout_access_rope%d'%i,p,q,.045,'rope',sides=12)
    yard = next(o for o in objects if o.name == 'Cylinder004')
    yard_centre = Vector(((ya.x+yb.x)/2,guide[1].y,(ya.z+yb.z)/2))
    old_tip = Vector((yb.x+.025,guide[1].y,ya.z+.15))
    tie_tip = fitted_radial_attachment(yard_skin(yard), yard_centre,
                                       old_tip-yard_centre, .018)
    pole('Lookout_rope_yard_tie', guide[1], tie_tip, .038, 'rope', sides=10)
    ladder_bottom = points[2].z
    for side in (-1,1):
        pole('Lookout_ladder_rail%d'%side,(hx-.48,hy+side*.30,ladder_bottom),
             (hx-.48,hy+side*.30,floor-.08),.035,'rope',sides=10)
    count = math.ceil((floor-ladder_bottom)/.30)
    for i in range(count+1):
        z = ladder_bottom+(floor-ladder_bottom)*i/count
        pole('Lookout_ladder_rung%d'%i,(hx-.48,hy-.30,z),(hx-.48,hy+.30,z),.025,'darkwood',sides=10)
    interiors['levels']['F3C'] = floor
    return [{'id':'fore-lookout','label':'Lookout rope and ladder','hatch':'CrowNestHatch',
             'points':[list(p) for p in points],
             'reference':'N: climb the rope to the ladder; exact offsets reconstructed for human clearance'}]


def stern_ladder_access(objects,bounds,interiors):
    """F2/N stern ladder, within the retained flared Library support envelope.

    Only the connecting floor/neck, real hatch and ladder are authored here.
    Fish-tank/Library furnishings stay deferred. Metre offsets are inferred.
    """
    from sunny_interiors import plan_floor, wall_run, door, hatch
    support=next(o for o in objects if o.name=='Cylinder001');a,b=bounds(support)
    cx,cy=(a.x+b.x)/2,(a.y+b.y)/2
    lower,upper=interiors['levels']['F2A'],interiors['levels']['F3L']
    # Measure the actual shell section, rather than placing a floating slab
    # wider than its supporting wall. Repeated polygon edges are deduplicated.
    section={}
    for face in support.data.polygons:
        points=[support.matrix_world@support.data.vertices[i].co for i in face.vertices]
        for p,q in zip(points,points[1:]+points[:1]):
            if abs(q.z-p.z)>1e-8 and min(p.z,q.z)<=lower<=max(p.z,q.z):
                v=p.lerp(q,(lower-p.z)/(q.z-p.z))
                section[(round(v.x,6),round(v.y,6))]=(v.x,v.y)
    if len(section)<24:raise RuntimeError('Missing measured F2 stern support section')
    outline=sorted(section.values(),key=lambda p:math.atan2(p[1]-cy,p[0]-cx))
    floor=plan_floor('SternAccess_floor',outline,lower)
    floor['sunny_f2_stern_access']=True
    neck=plan_floor('SternAccess_neck',[(24.65,cy-.75),(cx-1.45,cy-.75),(cx-1.45,cy+.75),(24.65,cy+.75)],lower)
    neck['sunny_f2_stern_access']=True
    # A short neck connects the plan's small stern structure to the existing
    # service tier. Cut all retained envelope layers at that real threshold.
    for obj in list(bpy.data.objects):
        if obj.type!='MESH':continue
        if obj==support or obj.name.startswith(('Sunny_AftF2_shell','Sunny_RoomPartition_rear_split')) or obj.name in ('Line002','Line006','对象001','对象002','对象003'):
            if obj.get('sunny_aft_native_envelope'):
                from sunny_aft_envelope import closed_box_cut
                closed_box_cut(obj,(23.7,cx-1.0,cy-.75,cy+.75,lower-.15,lower+2.35))
            else:
                # The curved native rear wall's low bearing toe leaves less
                # turning depth than the preceding rectangular lining. Open
                # only the divider 60 cm farther forward; retain every neck,
                # exterior aperture, ladder, door and normal-human station.
                start_x=23.1 if obj.name.startswith('Sunny_RoomPartition_rear_split') else 23.7
                open_volume_slot(obj,start_x,cx-1.0,cy-.75,cy+.75,lower-.15,lower+2.35)
            if obj.name.startswith('Sunny_RoomPartition_rear_split'):
                # A post-cut wall has a lintel above the opening. Its one
                # overall AABB fills that opening; preserve the actual faces.
                obj['sunny_rail']=True
    for side in (-1,1):
        wall_run('SternAccess_neck_wall',((24.8+cx-2.65)/2,cy+side*.75,lower),0,cx-2.65-24.8,2.35,key='cream')
    door('SternAccessDoor',(24.8,cy,lower),math.pi/2,1.40,2.30,
         rooms=('Service Deck','Stern Ladder'),key='white')
    support['sunny_obstacle']=True;support['sunny_rail']=True
    hx,hy=cx-1.90,cy-1.30
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and (obj.get('sunny_walkable') or 'ceiling' in obj.name or obj==support):
            # The recessed support can reach the ladder's lower landing.
            # Clear its skin below that floor, without cutting the separate
            # walking floor or leaving a lip inside the normal body's shaft.
            cut_lower=lower-.12 if obj==support else lower+.02
            open_volume_slot(obj,hx-.70,hx+.70,hy-.675,hy+.675,cut_lower,upper+.20)
    # Retain the legacy ID for controls/tests, while its label/location now
    # describe the sourced stern connection rather than the former galley cover.
    hatch('KitchenHatch',(hx,hy,upper),0,(1.40,1.35),rooms=('Stern Ladder','Library'),mode='lift')
    for side in (-1,1):
        pole('SternAccess_ladder_rail%d'%side,(hx-.48,hy+side*.30,lower+.02),
             (hx-.48,hy+side*.30,upper-.08),.035,'black',sides=10)
    count=math.ceil((upper-lower)/.30)
    for i in range(count+1):
        z=lower+(upper-lower)*i/count
        pole('SternAccess_ladder_rung%d'%i,(hx-.48,hy-.30,z),(hx-.48,hy+.30,z),.025,'darkwood',sides=10)
    interiors['rooms'].append(dict(level='F2A',name='Stern Ladder Access',
        x=(min(p[0] for p in outline),max(p[0] for p in outline)),
        y=(min(p[1] for p in outline),max(p[1] for p in outline))))
    return [dict(id='stern-library-ladder',label='Stern Library ladder',hatch='KitchenHatch',
        points=[[hx,hy,lower],[hx,hy,upper],[hx,hy+1.60,upper]],
        reference='F2/N: stern small-structure ladder to observation/library tier; metric connection inferred')]


def ellipse_paint(obj,bounds,inside,outside,fraction):
    """Partition a retained bow surface into a painted field and its edge band."""
    a,b=bounds(obj);cy,cz=(a.y+b.y)/2,(a.z+b.z)/2
    ry,rz=(b.y-a.y)/2*fraction,(b.z-a.z)/2*fraction
    planes=[]
    for i in range(64):
        t=(i+.5)*math.tau/64;n=Vector((0,-math.cos(t)/ry,-math.sin(t)/rz))
        planes.append((n,n.dot(Vector((0,cy,cz)))-math.cos(math.pi/64)))
    verts,faces,indices=[],[],[]
    for face in obj.data.polygons:
        remaining=[obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
        for normal,offset in planes:
            keep,edge=[],[]
            for p,q in zip(remaining,remaining[1:]+remaining[:1]):
                d,e=normal.dot(p)-offset,normal.dot(q)-offset
                (keep if d>=0 else edge).append(p)
                if (d>=0)!=(e>=0):
                    cross=p.lerp(q,d/(d-e));keep.append(cross);edge.append(cross)
            if len(edge)>=3:
                faces.append(tuple(range(len(verts),len(verts)+len(edge))));verts+=edge;indices.append(1)
            remaining=keep
            if len(remaining)<3:break
        if len(remaining)>=3:
            faces.append(tuple(range(len(verts),len(verts)+len(remaining))));verts+=remaining;indices.append(0)
    replace(obj,verts,faces,inside);obj.data.materials.append(material(outside))
    for face,index in zip(obj.data.polygons,indices):face.material_index=index


def bow_paint(objects,bounds):
    """A/C's red shield/white edge and broad gold collar around the black field."""
    outer=next(o for o in objects if o.name.split('.')[0]=='Circle038')
    ellipse_paint(outer,bounds,'red','white',.90)
    a,b=bounds(outer);cy=(a.y+b.y)/2;cz=(a.z+b.z)/2
    for normal, offset, width in ((Vector((0,1,0)),cy,.55),
                                  (Vector((0,1,.65)),cy+.65*cz-10.7,.52),
                                  (Vector((0,1,-.65)),cy-.65*cz+10.7,.52)):
        repaint_prism(outer,[(normal,offset-width),(-normal,-offset-width)],'white','red')
    outer['sunny_bow_white_divisions']=3
    disk=next(o for o in objects if o.name.split('.')[0]=='Circle002')
    # A/C and H show a substantial rope-storage collar, not a thin gold edge.
    # Perspective evidence supports an inner radius about 70% of the outside;
    # its precise width remains a reconstruction, with original geometry kept.
    ellipse_paint(disk,bounds,'black','gold',.70)
    for obj in objects:
        if obj.name not in ('Cylinder050','Cylinder051','Cylinder052','Cylinder053','Cylinder054','Cylinder055'):continue
        obj.data.materials.clear();obj.data.materials.append(material('gold'))
        for face in obj.data.polygons:face.material_index=0
    for name in ('Tube010','Tube011'):
        collar=next(o for o in objects if o.name==name)
        collar.data.materials.clear();collar.data.materials.append(material('black'))
        for face in collar.data.polygons:face.material_index=0


def bone_frame(obj):
    """Measure the retained bone's long axis and section frame in world metres."""
    points = list({tuple(round(v, 6) for v in obj.matrix_world @ vertex.co):
                   obj.matrix_world @ vertex.co for vertex in obj.data.vertices}.values())
    centre = sum(points, Vector()) / len(points)
    covariance = Matrix([[sum((p-centre)[i]*(p-centre)[j] for p in points)
                          / len(points) for j in range(3)] for i in range(3)])
    major = max(range(3), key=lambda i: covariance[i][i])
    axis = Vector(tuple(1 if i == major else 0 for i in range(3)))
    for _ in range(80):
        axis = (covariance @ axis).normalized()
    if axis.z < 0:
        axis.negate()
    depth = (Vector((1, 0, 0))-axis*axis.x).normalized()
    width = depth.cross(axis).normalized()
    coordinates = [Vector(((p-centre).dot(axis), (p-centre).dot(width),
                           (p-centre).dot(depth))) for p in points]
    low = Vector(tuple(min(p[i] for p in coordinates) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in coordinates) for i in range(3)))
    return centre, axis, width, depth, low, high


def bone_section_profile(obj, frame, samples=65):
    """Intersect actual source polygon edges, retaining its shaft centre curve."""
    centre, axis, width, depth, low, high = frame
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    coordinates = [Vector(((p-centre).dot(axis), (p-centre).dot(width),
                           (p-centre).dot(depth))) for p in points]
    edges = {tuple(sorted((face.vertices[i], face.vertices[(i+1) % len(face.vertices)])))
             for face in obj.data.polygons for i in range(len(face.vertices))}
    profile = []
    for index in range(samples):
        fraction = .10 + .80*index/(samples-1)
        station = low.x+(high.x-low.x)*fraction
        hits = []
        for first, second in edges:
            a, b = coordinates[first], coordinates[second]
            da, db = a.x-station, b.x-station
            if abs(da) < .000001:
                hits.append(a)
            if da*db < 0:
                hits.append(a.lerp(b, da/(da-db)))
        if len(hits) < 3:
            raise RuntimeError(obj.name+' loses its retained shaft section')
        wlo, whi = min(p.y for p in hits), max(p.y for p in hits)
        dlo, dhi = min(p.z for p in hits), max(p.z for p in hits)
        profile.append(((wlo+whi)/2, (dlo+dhi)/2, (whi-wlo)/2, (dhi-dlo)/2))
    return profile


def bone_profile_at(profile, fraction):
    """Interpolate measured centre/width/depth between intact source sections."""
    value = max(0, min(len(profile)-1, (fraction-.10)/.80*(len(profile)-1)))
    first = min(len(profile)-2, int(value))
    weight = value-first
    return tuple(a+(b-a)*weight for a, b in zip(profile[first], profile[first+1]))


def round_bone_tip_shoulders(obj, frame, bounds, original_low, original_high):
    """Gently curve both retained lobe shoulders without moving their poles."""
    centre, axis, width, depth, low, high = frame
    points = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    coordinates = [Vector(((p-centre).dot(axis), (p-centre).dot(width),
                           (p-centre).dot(depth))) for p in points]
    lo, hi = min(p.x for p in coordinates), max(p.x for p in coordinates)
    span = hi-lo
    current_low, current_high = low.copy(), high.copy()
    current_low.x, current_high.x = lo, hi
    cap_sections = bone_section_profile(obj, (centre, axis, width, depth,
                                             current_low, current_high), samples=2)
    caps = []
    for end, sign in ((0, 1), (1, -1)):
        centre_width, _, half_width, _ = cap_sections[end]
        terminal = [p for p in coordinates
                    if ((hi-p.x) if end else (p.x-lo))/span < .12]
        poles = []
        for side in (-1, 1):
            candidates = [p for p in terminal if side*(p.y-centre_width) > 0]
            if not candidates:
                raise RuntimeError(obj.name+' loses a retained terminal lobe')
            tip = max(p.x for p in candidates) if end else min(p.x for p in candidates)
            pole = [p.y for p in candidates if abs(p.x-tip) < half_width*.01]
            poles.append(sum(pole)/len(pole))
        caps.append((sign, poles, half_width*.035, half_width*.28))
    inverse = obj.matrix_world.inverted()
    for vertex, point, local in zip(obj.data.vertices, points, coordinates):
        end = int((local.x-lo)/span >= .5)
        fraction = ((hi-local.x) if end else (local.x-lo))/span
        if fraction >= .16:
            continue
        sign, poles, amplitude, sigma = caps[end]
        t = max(0, min(1, fraction/.16))
        weight = 1-t*t*(3-2*t)
        # A continuous small inward recession curves each shoulder. It is zero
        # at both measured poles, vanishes before the shaft, and retains the
        # source topology/two-lobe separation. Exact depth is reconstruction.
        first = 1-math.exp(-((local.y-poles[0])**2)/(2*sigma*sigma))
        second = 1-math.exp(-((local.y-poles[1])**2)/(2*sigma*sigma))
        vertex.co = inverse @ (point+axis*(sign*amplitude*weight*first*second))
    obj.data.update()
    bpy.context.view_layer.update()
    fitted_low, fitted_high = bounds(obj)
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        vertex.co = inverse @ Vector(tuple(
            original_low[i]+(point[i]-fitted_low[i])
            *(original_high[i]-original_low[i])/(fitted_high[i]-fitted_low[i])
            for i in range(3)))
    obj.data.update()


def rounded_source_bone(obj, bounds):
    """Round a retained closed two-lobe bone and its source-centred shaft."""
    original_low, original_high = bounds(obj)
    frame = bone_frame(obj)
    centre, axis, width, depth, low, high = frame
    retained = bone_section_profile(obj, frame)
    # Preserve the original terminal topology (including its two lobes), rather
    # than substituting disconnected decorative spheres or moving end stations.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.transform(bm, matrix=obj.matrix_world, verts=list(bm.verts))
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00002)
    if any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError(obj.name+' must retain a closed source bone')
    baked = bpy.data.meshes.new(obj.name+'_retained_bone')
    bm.to_mesh(baked)
    bm.free()
    baked.materials.append(material('white'))
    assign_world_mesh(obj, baked)
    modifier = obj.modifiers.new('ReferenceRoundedBone', 'SUBSURF')
    modifier.subdivision_type = 'CATMULL_CLARK'
    modifier.levels = 2
    modifier.render_levels = 2
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    rounded = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),
                                             preserve_all_data_layers=True,
                                             depsgraph=depsgraph)
    obj.modifiers.remove(modifier)
    assign_world_mesh(obj, rounded)
    # Subdivision rounds the angular source caps. Refit its principal envelope
    # before replacing the central rectangular section with an elliptical one.
    coordinates = [Vector(((vertex.co-centre).dot(axis), (vertex.co-centre).dot(width),
                           (vertex.co-centre).dot(depth))) for vertex in obj.data.vertices]
    smooth_low = Vector(tuple(min(p[i] for p in coordinates) for i in range(3)))
    smooth_high = Vector(tuple(max(p[i] for p in coordinates) for i in range(3)))
    for vertex, point in zip(obj.data.vertices, coordinates):
        fitted = Vector(tuple(low[i]+(point[i]-smooth_low[i])*(high[i]-low[i])
                              /(smooth_high[i]-smooth_low[i]) for i in range(3)))
        vertex.co = centre+axis*fitted.x+width*fitted.y+depth*fitted.z
    obj.data.update()
    bpy.context.view_layer.update()
    smoothed = bone_section_profile(obj, frame)
    for vertex in obj.data.vertices:
        relative = vertex.co-centre
        station = relative.dot(axis)
        fraction = (station-low.x)/(high.x-low.x)
        if fraction <= .12 or fraction >= .88:
            continue
        sw, sd, srw, srd = bone_profile_at(smoothed, fraction)
        ow, od, orw, ord = bone_profile_at(retained, fraction)
        u, v = (relative.dot(width)-sw)/srw, (relative.dot(depth)-sd)/srd
        norm = math.hypot(u, v)
        if norm < .00001:
            raise RuntimeError(obj.name+' has an unsupported interior shaft vertex')
        # Smoothly join the rounded source ends; the core is a genuinely round
        # cross section, not a smooth normal applied to a rectangular rod.
        amount = min(1, (fraction-.12)/.08, (.88-fraction)/.08)
        amount = amount*amount*(3-2*amount)
        target = centre+axis*station+width*(ow+orw*u/norm)+depth*(od+ord*v/norm)
        vertex.co = vertex.co.lerp(target, amount)
    obj.data.update()
    bpy.context.view_layer.update()
    # Retain the original visible world envelope exactly. This is an initial
    # source-envelope constraint, not an official blueprint metric claim.
    rounded_low, rounded_high = bounds(obj)
    for vertex in obj.data.vertices:
        vertex.co = Vector(tuple(original_low[i]+(vertex.co[i]-rounded_low[i])
                                 *(original_high[i]-original_low[i])
                                 /(rounded_high[i]-rounded_low[i]) for i in range(3)))
    round_bone_tip_shoulders(obj, frame, bounds, original_low, original_high)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError(obj.name+' must remain one closed rounded bone')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.materials.clear()
    obj.data.materials.append(material('white'))
    for face in obj.data.polygons:
        face.material_index = 0
        face.use_smooth = True
    obj.data.update()
    obj['sunny_authored'] = True
    obj['sunny_bow_bone'] = True
    obj['sunny_bone_envelope_retained'] = True


def fitted_bow_rear_skin(rear, faces, surface, ceiling):
    """Embed every rear face across its actual outward shield-triangle footprint."""
    surface.data.calc_loop_triangles()
    source = []
    for triangle in surface.data.loop_triangles:
        points = [surface.matrix_world @ surface.data.vertices[i].co
                  for i in triangle.vertices]
        # The opposite inner skin is not an additional hidden mounting body.
        if (points[1]-points[0]).cross(points[2]-points[0]).x >= -1e-9:
            continue
        source.append((points, min(p.y for p in points), max(p.y for p in points),
                       min(p.z for p in points), max(p.z for p in points)))
    required = [p[0] for p in rear]
    for face in faces:
        mask = [Vector(rear[i]) for i in face]
        low_y, high_y = min(p.y for p in mask), max(p.y for p in mask)
        low_z, high_z = min(p.z for p in mask), max(p.z for p in mask)
        area = sum(p.y*q.z-q.y*p.z for p, q in zip(mask, mask[1:]+mask[:1]))
        sign = 1 if area > 0 else -1
        support = None
        for points, y0, y1, z0, z1 in source:
            if y1 < low_y or y0 > high_y or z1 < low_z or z0 > high_z:
                continue
            clipped = points
            for a, b in zip(mask, mask[1:]+mask[:1]):
                polygon = []
                for p, q in zip(clipped, clipped[1:]+clipped[:1]):
                    dp = sign*((b.y-a.y)*(p.z-a.z)-(b.z-a.z)*(p.y-a.y))
                    dq = sign*((b.y-a.y)*(q.z-a.z)-(b.z-a.z)*(q.y-a.y))
                    if dp >= 0:
                        polygon.append(p)
                    if (dp >= 0) != (dq >= 0):
                        polygon.append(p.lerp(q, dp/(dp-dq)))
                clipped = polygon
                if len(clipped) < 3:
                    break
            if len(clipped) >= 3:
                x = max(p.x for p in clipped)
                support = x if support is None else max(support, x)
        if support is None:
            raise RuntimeError('Bow head rear face loses its actual outward shield support')
        # A linear rear triangle cannot fall below this maximum over its
        # footprint, regardless of the later diagonal chosen for a quad.
        target = support+.005
        if target > ceiling:
            raise RuntimeError('Bow head rear contact %.6f m exceeds retained %.6f m envelope'
                               % (target, ceiling))
        for index in face:
            required[index] = max(required[index], target)
    return [(required[i], p[1], p[2]) for i, p in enumerate(rear)]


def fitted_bow_stud(stud, surface, bounds, support_key='gold', bulge_fraction=.22, edge_support_keys=(), adaptive_skin=False):
    """Refit one retained bow head into its actual painted supporting skin."""
    a, b = bounds(stud)
    cy, cz = (a.y+b.y)/2, (a.z+b.z)/2
    ry, rz = (b.y-a.y)/2, (b.z-a.z)/2
    bpy.context.view_layer.update()
    inverse = surface.matrix_world.inverted()
    direction = inverse.to_3x3() @ Vector((1, 0, 0))
    count, rings = 64, 8
    # Preserve the original projected footprint whenever it is actually on the
    # painted support. Limited contraction can fit an overhanging source cap; it
    # never silently adds a bracket, changes a station or crosses paint regions.
    for contraction in (1, .97, .94, .91, .88, .85):
        samples = [(cy, cz, 0)]
        for ring_index in range(1, rings+1):
            fraction = ring_index/rings
            for i in range(count):
                angle = i*math.tau/count
                samples.append((cy+ry*contraction*fraction*math.cos(angle),
                                cz+rz*contraction*fraction*math.sin(angle), fraction))
        supported = []
        for y, z, fraction in samples:
            hit, point, _, index = surface.ray_cast(inverse @ Vector((-100, y, z)),
                                                    direction)
            permitted={'Sunny_'+key for key in ((support_key,)+edge_support_keys if fraction else (support_key,))}
            if (not hit or surface.data.materials[
                    surface.data.polygons[index].material_index].name not in permitted):
                break
            supported.append(((surface.matrix_world @ point).x, y, z, fraction))
        if len(supported) == len(samples):
            break
    else:
        raise RuntimeError(stud.name+' loses its actual '+support_key+' '+surface.name+' support')
    radius = min(ry, rz)*contraction
    lift, bulge, embed = radius*.025, radius*bulge_fraction, radius*.10
    # Retain the initial dome's complete envelope and all its sample stations.
    # A stepped source shield can be correctly fitted at every vertex while a
    # coarse face floats between them. Refine radial rows from actual skin
    # midpoint error, keeping a paired front/back mesh and the same crown.
    front_limits = (min(x-lift-bulge*(1-f*f) for x, _, _, f in supported),
                    max(x-lift-bulge*(1-f*f) for x, _, _, f in supported))
    rear_limits = (min(x+embed for x, _, _, _ in supported),
                   max(x+embed for x, _, _, _ in supported))
    if adaptive_skin:
        cache = {(f, i): supported[1+(j-1)*count+i]
                 for j in range(1, rings+1) for i in range(count)
                 for f in (j/rings,)}
        centre_sample = supported[0]
        edge_materials = {'Sunny_'+key for key in (support_key,)+edge_support_keys}

        def skin_sample(fraction, index):
            if fraction == 0:
                return centre_sample
            key = (fraction, index)
            if key not in cache:
                angle = index*math.tau/count
                y = cy+ry*contraction*fraction*math.cos(angle)
                z = cz+rz*contraction*fraction*math.sin(angle)
                hit, point, _, polygon = surface.ray_cast(
                    inverse @ Vector((-100, y, z)), direction)
                if (not hit or surface.data.materials[
                        surface.data.polygons[polygon].material_index].name not in edge_materials):
                    raise RuntimeError(stud.name+' loses its actual painted adaptive skin support')
                cache[key] = ((surface.matrix_world @ point).x, y, z, fraction)
            return cache[key]

        fractions = [j/rings for j in range(rings+1)]
        for _ in range(8):
            additions = []
            for low, high in zip(fractions, fractions[1:]):
                middle = (low+high)/2
                if any(abs(skin_sample(middle, i)[0] -
                           (skin_sample(low, i)[0]+skin_sample(high, i)[0])/2)
                       > radius*.01 for i in range(count)):
                    additions.append(middle)
            if not additions:
                break
            fractions = sorted(fractions+additions)
        supported = [centre_sample]+[skin_sample(f, i)
                                    for f in fractions[1:] for i in range(count)]
        rings = len(fractions)-1
        stud['sunny_skin_radial_rings'] = rings
    # Additional true-skin samples may discover a deeper local source step.
    # Bound the new vertices by the retained initial front/rear envelopes;
    # do not enlarge the gold dome or move any projected station/footprint.
    front = [(max(front_limits[0], min(front_limits[1],
                  x-lift-bulge*(1-fraction*fraction))), y, z)
             for x, y, z, fraction in supported]
    rear = [(max(rear_limits[0], min(rear_limits[1], x+embed)), y, z)
            for x, y, z, _ in supported]
    faces = [(0, 1+(i+1)%count, 1+i) for i in range(count)]
    for ring_index in range(rings-1):
        inner, outer = 1+ring_index*count, 1+(ring_index+1)*count
        for i in range(count):
            j = (i+1)%count
            faces.append((inner+i, inner+j, outer+j, outer+i))
    if adaptive_skin:
        rear = fitted_bow_rear_skin(rear, faces, surface, rear_limits[1])
    offset = len(front)
    faces += [tuple(index+offset for index in reversed(face)) for face in list(faces)]
    edge = 1+(rings-1)*count
    for i in range(count):
        first, second = edge+i, edge+(i+1)%count
        faces.append((first, first+offset, second+offset, second))
    replace(stud, front+rear, faces, 'gold')
    bm = bmesh.new()
    bm.from_mesh(stud.data)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if any(not edge.is_manifold for edge in bm.edges):
        bm.free()
        raise RuntimeError(stud.name+' must be a closed supported round head')
    bm.to_mesh(stud.data)
    bm.free()
    stud.data.update()
    stud['sunny_skin_support'] = surface.name
    stud['sunny_bow_stud'] = True
    stud['sunny_source_station'] = [cy, cz]
    stud['sunny_footprint_contraction'] = contraction


def bow_mount_construction(objects, bounds):
    """H/A rounded retained bones and sixteen supported shallow collar heads."""
    for name in ('Box002', 'Box003'):
        rounded_source_bone(next(obj for obj in objects if obj.name == name), bounds)
    surface = next(obj for obj in objects if obj.name.split('.')[0] == 'Circle002')
    studs = [obj for obj in objects if obj.name.split('.')[0] in
             {'Circle%03d' % index for index in range(3, 19)}]
    if len(studs) != 16:
        raise RuntimeError('Retain all sixteen existing collar head stations')
    for stud in studs:
        fitted_bow_stud(stud, surface, bounds)
    # A/C show three bulbous gold bosses on each red shield side. These six
    # retained heads are separate from the sixteen shallow collar studs. Fit
    # their unchanged red centres and painted edge skin; exact dome depth is reconstruction.
    shield = next(obj for obj in objects if obj.name.split('.')[0] == 'Circle038')
    bosses = [obj for obj in objects if obj.name.split('.')[0] in
              {'Cylinder%03d' % index for index in range(50, 56)}]
    if len(bosses) != 6:
        raise RuntimeError('Retain all six existing outer bow shield bosses')
    for boss in bosses:
        fitted_bow_stud(boss, shield, bounds, support_key='red', bulge_fraction=.75, edge_support_keys=('white',), adaptive_skin=True)




def hull_bands(objects, bounds):
    """A/C's retained curved dark hull mouldings and two rudder straps."""
    for name in ('Box118','Box119','Box121'):
        obj=next(o for o in objects if o.name==name)
        obj.data.materials.clear();obj.data.materials.append(material('black'))
        for face in obj.data.polygons:
            face.material_index=0
        obj['sunny_hull_dark_band']=True
    rudder=next(o for o in objects if o.name=='Line012');a,b=bounds(rudder)
    for fraction in (.23,.78):
        z=a.z+(b.z-a.z)*fraction
        repaint_prism(rudder,[(Vector((0,0,1)),z-.25),(Vector((0,0,-1)),-z-.25)],'black')
    rudder['sunny_rudder_straps']=2


def branch_office(objects,bounds,levels):
    """N/F3's single sloped drawing table and retained human-sized stool."""
    old=next(o for o in objects if o.name=='Sunny_Usopp_office_board')
    a,b=bounds(old);x,y=(a.x+b.x)/2,(a.y+b.y)/2;floor=levels['F3G']
    discard(objects,lambda o:o.name.startswith(('Sunny_Usopp_office_board','Sunny_Usopp_office_drawing')))
    top=box('Usopp_office_board',(x,y,floor+.89),(1.1,1.8,.065),'timber',obstacle=True)
    top.rotation_euler.y=math.radians(-12)
    for dx in (-.43,.43):
        for dy in (-.73,.73):
            height=.89+dx*math.sin(math.radians(12))
            pole('Usopp_office_board_leg',(x+dx,y+dy,floor),(x+dx,y+dy,floor+height),.038,'darkwood')
    page=box('Usopp_office_drawing',(x,y,floor+.931),(.82,1.35,.010),'white')
    page.rotation_euler.y=top.rotation_euler.y


def rudder_mechanism(objects,bounds):
    """Keep the measured source blade and expose its vertical steering hinge."""
    obj=next(o for o in objects if o.name=='Line012')
    a,b=bounds(obj);pivot=[a.x+.10,(a.y+b.y)/2,b.z]
    obj['sunny_rudder']=True;obj['sunny_pivot']=pivot;obj['sunny_dynamic']=True;obj['sunny_feature']='Rudder'
    return {'node':obj.name,'pivot':pivot,'axis':[0,0,1]}


def apply_exterior_accuracy(objects, bounds, frame, interiors):
    """Run exterior geometry repairs and return their mechanism/reference metadata."""
    before = set(bpy.data.objects)
    curved_sails(objects, bounds)
    fit_scroll_paint(objects,bounds)
    port_count = hull_ports(objects, bounds, frame.y(.585))
    burst = burst_barrel(objects, bounds)
    plants(objects, bounds, frame, interiors['levels'])
    bpy.context.view_layer.update()
    controls=helm_controls(objects,bounds)
    docks=rolling_dock(objects,bounds,frame.y(.585))
    lookout(objects,bounds)
    swept_mane(objects,bounds)
    lion_face(objects,bounds)
    lion=lion_mechanisms(objects,bounds)
    deck_details(objects,bounds,frame,interiors['levels'])
    stern_lanterns(objects,bounds)
    library_roof(objects,bounds)
    main_gaff_roof_tie(objects,bounds)
    human_rails(objects,bounds)
    anchor_paint(objects,bounds)
    fore_shrouds(objects,bounds,interiors['levels'])
    mast_platforms(objects,bounds)
    bow_paint(objects,bounds)
    bow_mount_construction(objects,bounds)
    hull_bands(objects,bounds)
    anchors=anchor_ropes(objects,bounds)
    for name,throat in (('Cylinder005',.28),('Cylinder001',.17)):
        scalloped_soffit(next(o for o in objects if o.name==name),bounds,throat)
    climbs=lookout_access(objects,bounds,interiors)+interiors.get('exteriorClimbs',[])+stern_ladder_access(objects,bounds,interiors)
    from sunny_aft_envelope import add_lower_aquarium_windows
    add_lower_aquarium_windows(objects,interiors)
    branch_office(objects,bounds,interiors['levels'])
    rudder=rudder_mechanism(objects,bounds)
    objects += [o for o in bpy.data.objects if o.type == 'MESH' and o not in before and o not in objects]
    bpy.context.view_layer.update()
    return objects, {'burst':burst, 'controls':controls,'dockOpenings':docks,'lion':lion,'rudder':rudder,'anchors':anchors,'climbs':climbs,'smallHullPorts':port_count, 'reference':'docs/exterior-feature-ledger.md'}
