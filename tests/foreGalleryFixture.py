"""R09 balusters retain native support and real stair gap endpoints."""
import os
import sys
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_fore_facade import fore_gallery_guards
from sunny_exterior import box,assign_world_mesh
from sunny_uv import metric_uv

bpy.ops.wm.read_factory_settings(use_empty=True)
original={}
for name,span in [('Box070',(-9,-1)),('Box084',(2,14))]:
    y0,y1=span;parts=[]
    for y in [y0+.11,y1-.11]:
        parts.append(box('fixture',(-17,y,0),(.18,.22,2.2),'timber'))
    parts.append(box('fixture',(-17,(y0+y1)/2,1.045),(.18,y1-y0,.11),'timber'))
    parts.append(box('fixture',(-17,(y0+y1)/2,-.5),(.18,y1-y0,.25),'timber'))
    bpy.context.view_layer.update()
    vertices=[];faces=[]
    for obj in parts:
        offset=len(vertices)
        vertices.extend(obj.matrix_world@v.co for v in obj.data.vertices)
        faces.extend(tuple(offset+i for i in f.vertices) for f in obj.data.polygons)
    target=parts[0];target.name=name
    mesh=bpy.data.meshes.new(name+'_fixture');mesh.from_pydata(vertices,[],faces);mesh.materials.append(parts[0].data.materials[0]);mesh.update()
    assign_world_mesh(target,mesh)
    for obj in parts[1:]:bpy.data.objects.remove(obj,do_unlink=True)
    original[name]=[v.copy() for v in vertices]
bpy.context.view_layer.update()
records=fore_gallery_guards({'levels':{'F2F':0,'F1':-4.136}})
assert len(records)==2
for record in records:
    obj=bpy.data.objects[record['node']]
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    old=original[obj.name]
    assert max(p.x for p in points)<-16.8 and min(p.x for p in points)>-17.2,'fixture uses its translated world support'
    assert all(any((p-q).length<1e-5 for q in points) for p in old if p.z<-.026),'every native below-cut vertex is retained'
    for axis in range(3):
        assert abs(min(p[axis] for p in old)-min(p[axis] for p in points))<1e-5
        if axis<2:assert abs(max(p[axis] for p in old)-max(p[axis] for p in points))<1e-5,'outer span and stair gap must remain unchanged'
    assert abs(max(p.z for p in points)/4.136-.36)<1e-5,'full guard height follows same-panel storey ratio'
    assert .36<record['pitch']/record['height']<.48 and len(record['centres'])>=12,'dense source-relative rhythm'
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges),'retained cut support and new rail/baluster pieces are all closed'
    assert bm.calc_volume(signed=True)>0,'outward winding is retained'
    bm.free()
    metric_uv(obj)
    assert obj['sunny_uv_kind']=='cylinder' and obj['sunny_uv_space']=='metres','component grain uses actual length axes'
    layer=obj.data.uv_layers['SunnyUV']
    h=record['height'];z0=h*.25-.008;z1=h*.82+.008
    for face in obj.data.polygons:
        if max(obj.data.vertices[i].co.z for i in face.vertices)<z0+1e-5:continue
        if min(obj.data.vertices[i].co.z for i in face.vertices)>z1-1e-5:continue
        if obj.data.materials[face.material_index].name!='Sunny_timber':continue
        face_points=[obj.data.vertices[i].co for i in face.vertices]
        u=[layer.data[i].uv.x for i in face.loop_indices]
        for a in range(len(face_points)):
            for b in range(a):
                assert abs(abs(u[a]-u[b])-abs(face_points[a].z-face_points[b].z))<1e-5,'actual shaft grain follows vertical world length'
    # Actual sampled shaft vertices prove a narrow waist and embedded ends;
    # metadata count alone cannot establish the profile or joined rails.
    for centre in record['centres']:
        post=[p for p in points if abs(p.y-centre)<h*.13 and z0-1e-5<=p.z<=z1+1e-5]
        foot=[p for p in post if abs(p.z-z0)<1e-5]
        waist=[p for p in post if abs(p.z-(z0+(z1-z0)*.65))<1e-5]
        assert len(foot)==12 and len(waist)==12
        assert max(p.x for p in waist)-min(p.x for p in waist)<.65*(max(p.x for p in foot)-min(p.x for p in foot))
        assert min(p.z for p in post)<h*.25 and max(p.z for p in post)>h*.82,'posts embed into both actual rails'
print('PASS source-relative full-height broad gallery rails, dense waisted balusters/vertical grain, closed joints and exact native support/gaps',flush=True)
