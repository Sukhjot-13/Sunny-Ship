"""Terminate the retained bow shield at actual fore room construction volumes.

The painted source is an open polygon shell already. Cut its intruding surface
pieces behind the existing room lining; do not add a covering wall, repaint,
move the exterior skin, or change the reference-derived room outline. Profile
strips preserve the small nonconvex bends in measured hull sections.
"""
import bpy
from math import sqrt
from sunny_exterior import assign_world_mesh


def split_polygon(points, normal, offset):
    """Partition in double precision; Blender Vector dot/lerp quantize each cut."""
    inside, outside = [], []
    for p, q in zip(points, points[1:]+points[:1]):
        d = sum(n*v for n,v in zip(normal,p))-offset
        e = sum(n*v for n,v in zip(normal,q))-offset
        (inside if d >= 0 else outside).append(p)
        if (d >= 0) != (e >= 0):
            t = d/(d-e)
            crossing = tuple(a+(b-a)*t for a,b in zip(p,q))
            inside.append(crossing); outside.append(crossing)
    return inside, outside


def profile_prisms(volume):
    """Recover convex station strips from the actual X-monotone room outline."""
    outline = volume['outline']
    rows = {}
    for x, y in outline:
        rows.setdefault(x, []).append(y)
    stations = sorted(rows)
    if len(stations)*2 != len(outline) or any(len(rows[x]) != 2 for x in stations):
        raise RuntimeError('fore trim requires paired actual hull-section stations')
    result = []
    for x0, x1 in zip(stations, stations[1:]):
        low0, high0 = min(rows[x0]), max(rows[x0])
        low1, high1 = min(rows[x1]), max(rows[x1])
        lower, upper = (low1-low0)/(x1-x0), (high1-high0)/(x1-x0)
        # Terminate 50 micrometres behind the real boundary, inside the wall
        # thickness. This guards Float32 export/UV transforms without changing
        # room contours or relaxing independent 20-micrometre verification.
        margin = .00005
        low_margin, high_margin = margin*sqrt(1+lower*lower), margin*sqrt(1+upper*upper)
        planes = [((1,0,0),x0), ((-1,0,0),-x1),
                  ((-lower,1,0),low0-lower*x0-low_margin),
                  ((upper,-1,0),upper*x0-high0-high_margin),
                  ((0,0,1),volume['bottom']-margin),
                  ((0,0,-1),-volume['top']-margin)]
        result.append((x0,x1,min(low0,low1)-low_margin,max(high0,high1)+high_margin,planes))
    return result


def subtract_prism(points, planes):
    """Keep all disjoint surface pieces outside one finite construction prism."""
    # Most source faces lie completely outside. Do not subdivide those faces.
    if any(all(sum(a*b for a,b in zip(n,p))-d < -1e-9 for p in points) for n,d in planes):
        return [points]
    remaining, kept = points, []
    for normal, offset in planes:
        remaining, outside = split_polygon(remaining, normal, offset)
        if len(outside) >= 3:
            kept.append(outside)
        if len(remaining) < 3:
            break
    return kept


def reconcile_fore_trim(objects, interiors):
    """Terminate shield intrusions and confirmed dark bands at real room boundaries."""
    targets = [o for o in objects if o.name.split('.')[0] in ('Circle038', 'Box118', 'Box119', 'Line004', 'Line007')]
    if sum(o.name.split('.')[0] == 'Circle038' for o in targets) != 1:
        raise RuntimeError('one retained bow shield is required')
    receipt = []
    for obj in targets:
        shield = obj.name.split('.')[0] == 'Circle038'
        volumes = interiors['foreTrimVolumes'] if shield else [interiors['foreTrimVolumes'][0]]
        prisms = [prism for volume in volumes for prism in profile_prisms(volume)]
        if not shield:
            # The attributed black band enters the forward store. Its Dock/aft
            # surfaces belong to other construction and must remain untouched.
            prisms = [(x0,min(x1,-9.0),y0,y1,planes+[((-1,0,0),9.0)])
                      for x0,x1,y0,y1,planes in prisms if x0 < -9.0]
        old = obj.data
        old.calc_loop_triangles()
        vertices, faces, indices = [], [], []
        for face in old.loop_triangles:
            pieces = [[tuple(obj.matrix_world @ old.vertices[i].co) for i in face.vertices]]
            for x0,x1,y0,y1,planes in prisms:
                next_pieces = []
                for points in pieces:
                    if (max(p[0] for p in points) < x0 or min(p[0] for p in points) > x1
                            or max(p[1] for p in points) < y0 or min(p[1] for p in points) > y1):
                        next_pieces.append(points)
                    else:
                        next_pieces.extend(subtract_prism(points,planes))
                pieces = next_pieces
                if not pieces:
                    break
            for points in pieces:
                # Clip actual source triangles, then emit explicit triangles.
                # Retessellating nonplanar/concave source n-gons after clipping
                # can bridge the cut and recreate tiny room intersections.
                for i in range(1,len(points)-1):
                    a = tuple(v-u for u,v in zip(points[0],points[i]))
                    b = tuple(v-u for u,v in zip(points[0],points[i+1]))
                    area = sqrt(sum(c*c for c in (a[1]*b[2]-a[2]*b[1],
                        a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])))
                    if area <= 1e-12:
                        continue
                    faces.append(tuple(range(len(vertices),len(vertices)+3)))
                    vertices.extend((points[0],points[i],points[i+1]))
                    indices.append(face.material_index)
        mesh = bpy.data.meshes.new(old.name+'_room_terminated')
        mesh.from_pydata(vertices,[],faces); mesh.update()
        for mat in old.materials:
            mesh.materials.append(mat)
        for face,index in zip(mesh.polygons,indices):
            face.material_index = index
        assign_world_mesh(obj,mesh)
        obj['sunny_fore_trim_terminated'] = True
        receipt.append(dict(node=obj.name,sourceFaces=len(old.polygons),resultFaces=len(faces),
                            ownership='existing fore floor/ceiling/lining volumes; dark bands limited to storage X<-9; exterior surface retained'))
    interiors['foreTrimRepair'] = receipt
    return receipt
