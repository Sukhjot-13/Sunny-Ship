"""Supplied SBS exterior details. Metre values are reconstruction, not survey data."""
import math
import bpy
from mathutils import Vector
from sunny_exterior import _mesh, finish, pole, ring, box, material, sphere, assign_world_mesh

EXTERIOR_DOORS = {'ForeDoor', 'ForeDoorStarboard', 'WomensDoor', 'AquariumDoor',
                  'DiningEntrance', 'KitchenEntrance', 'LibraryDoor',
                  'PantryOutsideDoor', 'SickOutsideDoor'}


def local_point(p, rot, x, y, z):
    """Place door-local coordinates in Blender world coordinates."""
    c, s = math.cos(rot), math.sin(rot)
    return Vector((p[0]+c*x-s*y, p[1]+s*x+c*y, p[2]+z))


def round_figurehead(objects, bounds):
    """Round R01/R02/R08's head profile while retaining its front and diameter.

    The source's 0.50 depth/diameter produces a flattened disk in the side view.
    A 0.68 depth/diameter is a reference interpretation. The forward limit,
    muzzle station, front silhouette, mane and hull envelope remain fixed.
    """
    head = next(o for o in objects if o.name.split('.')[0] == 'Sphere001')
    low, high = bounds(head)
    diameter=high.y-low.y
    centre=Vector((low.x+.34*diameter,(low.y+high.y)/2,(low.z+high.z)/2))
    rounded=sphere('LionProfileFixture',centre,(.34*diameter,diameter/2,diameter/2),
                   'lion',segments=96,rings=64)
    bpy.context.view_layer.update()
    mesh=rounded.data.copy();mesh.transform(rounded.matrix_world)
    assign_world_mesh(head,mesh)
    bpy.data.objects.remove(rounded,do_unlink=True)
    head['sunny_reference_profile'] = 'R01/R02/R08; rounded profile, reconstructed depth ratio 0.68'
    bpy.context.view_layer.update()


def door_porthole(leaf, id_, p, rot, width, height, thickness):
    """Cut a real glazed porthole; both rims, bolts and straps move with the leaf."""
    from sunny_accuracy import face_boolean
    radius, z, count = min(.22, width*.19), height*.73, 48
    vertices = [local_point(p, rot, radius*math.cos(i*math.tau/count), depth,
                            z+radius*math.sin(i*math.tau/count))
                for depth in (-.25,.25) for i in range(count)]
    faces = [tuple(range(count-1,-1,-1)), tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,count+(i+1)%count,count+i) for i in range(count)]
    cutter = _mesh('DoorPortholeCutter', vertices, faces)
    # Explicit outward normals avoid relying on local coordinate handedness.
    import bmesh
    bm=bmesh.new();bm.from_mesh(cutter.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cutter.data);bm.free()
    face_boolean(leaf,cutter,'DIFFERENCE');bpy.data.objects.remove(cutter,do_unlink=True)
    # Door faces are planar joinery. Smooth normals around a Boolean hole
    # interpolate the cylindrical reveal into the panel and make it look melted.
    for face in leaf.data.polygons:face.use_smooth=False
    for side in (-1,1):
        pos=local_point(p,rot,0,side*(thickness/2+.015),z)
        rim=ring(id_+'_porthole_rim',pos,radius+.012,.032,'gold','Y',48,8)
        rim.rotation_euler.z=rot
        for i in range(8):
            a=i*math.tau/8
            a0=local_point(p,rot,(radius+.012)*math.cos(a),side*(thickness/2+.04),z+(radius+.012)*math.sin(a))
            a1=local_point(p,rot,(radius+.012)*math.cos(a),side*(thickness/2+.05),z+(radius+.012)*math.sin(a))
            pole(id_+'_porthole_bolt',a0,a1,.012,'darkwood',sides=8)
        for level in (.23,.48):
            # Thin face straps stop short of the moving edge/handle.
            a=local_point(p,rot,-width*.43,side*(thickness/2+.008),height*level)
            b=local_point(p,rot,width*.43,side*(thickness/2+.008),height*level)
            pole(id_+'_strap',a,b,.018,'darkwood',sides=8)
    glass=pole(id_+'_porthole_glass',local_point(p,rot,0,-.012,z),
               local_point(p,rot,0,.012,z),radius-.006,'glass',sides=48)
    glass['sunny_glazing']=True
    leaf['sunny_door_rotation']=rot
    leaf['sunny_reference_porthole']=True
    leaf['sunny_reference_porthole_radius']=radius
    # Hardware belongs to its moving door, including in the editable master.
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.name.startswith(('Sunny_'+id_+'_porthole','Sunny_'+id_+'_strap')):
            world=obj.matrix_world.copy();obj.parent=leaf;obj.matrix_world=world
            obj['sunny_dynamic']=True;obj['sunny_door_hardware']=id_


def door_arch_corners(id_, p, rot, width, height, depth=.22):
    """Close only the square opening's upper corners around an arched door."""
    from sunny_aft_envelope import closed_door_arch_cut
    pos=local_point(p,rot,0,0,(height+.14)/2)
    obj=box(id_+'_arch_infill',pos,(width+.12,depth,height+.14),'cream',obstacle=True)
    obj.rotation_euler.z=rot
    bpy.context.view_layer.update()
    closed_door_arch_cut(obj,dict(id=id_,pos=list(p),rot=rot,width=width-.05,height=height-.06))
    obj['sunny_rail']=True
    return obj


def branch_office_details(objects, bounds):
    """R13/R15's paper drawing and hand tools, fitted to the real work table."""
    paper=next((o for o in bpy.data.objects if o.name=='Sunny_Usopp_office_drawing'),None)
    if paper is None:return
    bpy.context.view_layer.update()
    low,high=bounds(paper);cx,cy=(low.x+high.x)/2,(low.y+high.y)/2
    inverse=paper.matrix_world.inverted()
    def on_paper(x,y):
        hit,point,_,_=paper.ray_cast(inverse@Vector((x,y,high.z+1)),inverse.to_3x3()@Vector((0,0,-1)))
        if not hit:raise RuntimeError('drawing detail leaves actual branch-office paper')
        point=paper.matrix_world@point;point.z+=.007;return point
    for i in range(6):
        y=cy-.38+i*.14
        pole('Usopp_office_plan',on_paper(cx-.22,y),on_paper(cx+.22-(i%3)*.05,y+.025),.004,'blue',sides=6)
    for side in (-1,1):
        pts=[on_paper(cx+side*(.08+.08*math.sin(i*math.pi/12)),cy-.35+i*.058) for i in range(13)]
        for a,b in zip(pts,pts[1:]):pole('Usopp_office_sketch',a,b,.006,'darkwood',sides=6)
    a=on_paper(cx+.28,cy-.40);b=on_paper(cx+.28,cy+.35)
    pole('Usopp_office_pencil',a,b,.013,'gold',sides=8)


def curved_muzzle_halves(muzzle, split, radius):
    """Split the actual ivory muzzle along R08's shallow upward-ended smile."""
    from sunny_accuracy import closed_face_mesh, face_boolean
    original=closed_face_mesh(muzzle,'Lion_muzzle_closed')
    points=[muzzle.matrix_world@v.co for v in muzzle.data.vertices]
    cy=(min(p.y for p in points)+max(p.y for p in points))/2
    half=(max(p.y for p in points)-min(p.y for p in points))/2
    count=64
    line=[(cy-half-.02+(2*half+.04)*i/count) for i in range(count+1)]
    outline=[(line[0],split-radius*2),(line[-1],split-radius*2)]
    outline += [(y,split+.07*radius*((y-cy)/half)**2) for y in reversed(line)]
    n=len(outline)
    verts=[(x,y,z) for x in (-100,100) for y,z in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    cutter=_mesh('SmileCutFixture',verts,faces)
    import bmesh
    bm=bmesh.new();bm.from_mesh(cutter.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cutter.data);bm.free()
    cutter.data.materials.append(material('cream'))
    meshes=[]
    for operation in ('INTERSECT','DIFFERENCE'):
        obj=bpy.data.objects.new('MuzzleSplitFixture',original.copy());bpy.context.scene.collection.objects.link(obj)
        face_boolean(obj,cutter,operation);meshes.append(obj.data.copy());bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.objects.remove(cutter,do_unlink=True)
    return meshes


def smile_height(y, centre, half_width, split, radius):
    """Shared actual smile seam used by the physical split and fitted ink line."""
    return split+.07*radius*((y-centre)/half_width)**2
