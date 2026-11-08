"""Geometry primitives for a bounded, rounded Soldier Dock outlet loft.

The subtraction retains everything outside each convex slice, including
materials. This module alone does not apply any cuts to a production ship.
"""
import math
import bmesh
import bpy
from mathutils import Vector
from sunny_exterior import assign_world_mesh
from dock_channel_profile import section_profile,half_width_at


def _clip(points, normal, distance, inside):
    result=[]
    for a,b in zip(points,points[1:]+points[:1]):
        da=normal.dot(a)-distance;db=normal.dot(b)-distance
        aa=da<=1e-8 if inside else da>=-1e-8
        bb=db<=1e-8 if inside else db>=-1e-8
        if aa:result.append(a)
        if aa!=bb and abs(da-db)>1e-12:result.append(a.lerp(b,da/(da-db)))
    return result


def frustum_planes(first, second):
    """Outward support planes of the convex hull of two polygon rings."""
    bm=bmesh.new()
    for p in first+second:bm.verts.new(p)
    bm.verts.ensure_lookup_table()
    bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
    bm.normal_update()
    centre=sum((Vector(p) for p in first+second),Vector())/(len(first)+len(second))
    result=[];seen=set()
    for f in bm.faces:
        n=f.normal.copy().normalized();d=n.dot(f.verts[0].co)
        if n.dot(centre)>d:n.negate();d=-d
        key=tuple(round(q,6) for q in (*n,d))
        if key not in seen:result.append((n,d));seen.add(key)
    bm.free()
    if len(result)<6:raise ValueError('invalid outlet transition hull')
    return result


def subtract_frustum(obj, first, second):
    """Cut a bounded convex frustum from the real faces of one object."""
    planes=frustum_planes(first,second)
    points=[Vector(p) for p in first+second]
    lo=[min(v[k] for v in points) for k in range(3)]
    hi=[max(v[k] for v in points) for k in range(3)]
    old=obj.data;verts=[];faces=[];materials=[]
    def add(poly,material):
        if len(poly)>=3:
            base=len(verts);verts.extend(poly);faces.append(tuple(range(base,len(verts))));materials.append(material)
    for face in old.polygons:
        source=[obj.matrix_world@old.vertices[i].co for i in face.vertices]
        if any(max(p[k] for p in source)<lo[k] or min(p[k] for p in source)>hi[k] for k in range(3)):
            add(source,face.material_index);continue
        remaining=source
        for normal,d in planes:
            add(_clip(remaining,normal,d,False),face.material_index)
            remaining=_clip(remaining,normal,d,True)
            if len(remaining)<3:break
    mesh=bpy.data.meshes.new(old.name+'_rounded_channel')
    mesh.from_pydata(verts,[],faces);mesh.update()
    for material in old.materials:mesh.materials.append(material)
    for face,index in zip(mesh.polygons,materials):face.material_index=index
    assign_world_mesh(obj,mesh)


def rings(cx,start,end,bed,roof,mouth_z,radius,steps=6,count=64):
    """Return cross-section rings from the bay to the retained mouth."""
    return [[(x,start+(end-start)*t,z) for x,z in section_profile(cx,bed,roof,mouth_z,radius,t,count)]
            for t in (i/steps for i in range(steps+1))]


def shell_geometry(sections, thickness=.16):
    """Closed thick loft, with coincident boundaries at every station."""
    if len(sections)<2 or not sections[0] or any(len(row)!=len(sections[0]) for row in sections):
        raise ValueError('inconsistent outlet sections')
    count=len(sections[0]);verts=[];faces=[]
    for row in sections:
        cx=sum(p[0] for p in row)/count;cz=sum(p[2] for p in row)/count
        for outer in (False,True):
            for x,y,z in row:
                radial=Vector((x-cx,0,z-cz)).normalized()
                verts.append((x+(thickness*radial.x if outer else 0),y,z+(thickness*radial.z if outer else 0)))
    def index(s,outer,i):return s*count*2+(count if outer else 0)+i%count
    for s in range(len(sections)-1):
        for i in range(count):
            j=(i+1)%count
            faces.extend(((index(s,0,i),index(s,0,j),index(s+1,0,j),index(s+1,0,i)),
                          (index(s,1,j),index(s,1,i),index(s+1,1,i),index(s+1,1,j))))
    for s in (0,len(sections)-1):
        for i in range(count):
            j=(i+1)%count
            faces.append((index(s,0,i),index(s,1,i),index(s,1,j),index(s,0,j)))
    return verts,faces


def make_shell(name, sections):
    """Create the visible and collidable closed timber transition shell."""
    from sunny_exterior import _mesh,finish
    verts,faces=shell_geometry(sections)
    obj=_mesh(name,verts,faces)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    obj=finish(obj,name,'timber',obstacle=True)
    obj['sunny_rail']=True;obj['sunny_feature']='Dock1';obj['sunny_dock_transition']=True
    return obj


def make_water(name, sections, water):
    """A closed thin surface following each actual wet cross-section."""
    from sunny_exterior import _mesh,finish
    verts=[];faces=[]
    for row in sections:
        cx=sum(p[0] for p in row)/len(row)
        width=half_width_at([(p[0],p[2]) for p in row],water,cx)
        if width is None or width<=0:raise ValueError('water misses outlet section')
        y=row[0][1]
        verts.extend([(cx-width+.02,y,water-.04),(cx+width-.02,y,water-.04),
                      (cx-width+.02,y,water),(cx+width-.02,y,water)])
    for i in range(len(sections)-1):
        a=4*i;b=a+4
        faces.extend(((a,b,b+1,a+1),(a+2,a+3,b+3,b+2),
                      (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)))
    faces.extend(((0,1,3,2),(len(verts)-4,len(verts)-2,len(verts)-1,len(verts)-3)))
    return finish(_mesh(name,verts,faces),name,'tankwater')
