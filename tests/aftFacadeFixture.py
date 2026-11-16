"""Independent physical facade cuts, retained corners and finite port scope."""
import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_exterior import box,material
from sunny_aft_facade import facade_layout,add_front_ornaments,cut_front_circle
bpy.ops.wm.read_factory_settings(use_empty=True)
levels={'F1':-5,'F2A':0,'F3G':6.25}
layout=facade_layout(levels,0)
wall=box('FacadeFixture',(12.4,0,3.125),(.2,25.6,6.25),'red',obstacle=True)
wall.data.materials.append(material('cream'))
for face in wall.data.polygons:
    if abs(face.normal.x)>.99:face.material_index=1
wall['sunny_aft_native_envelope']=True
interiors={'levels':levels}
records=add_front_ornaments([wall],interiors,layout)
bpy.context.view_layer.update()
def ray(obj,x,y,z):
    inverse=obj.matrix_world.inverted()
    return obj.ray_cast(inverse@Vector((x,y,z)),inverse.to_3x3()@Vector((1,0,0)))[0]
for y in layout['ornaments']:
    assert not ray(wall,11,y,2),'main tall aperture must be clear'
    for side in (-1,1):
        assert not ray(wall,11,y+side*(layout['ornamentRadius']+layout['lobeRadius']*.5),
                       layout['ornamentBottom']+layout['lobeHeight']),'actual side lobe must be cut'
    assert ray(wall,11,y+1.5,2),'unrelated wall beside ornament must survive'
    assert ray(wall,11,y+.60,layout['ornamentBottom']+layout['ornamentHeight']-.05), 'solid upper arch corners must survive'
bm=bmesh.new();bm.from_mesh(wall.data)
assert bm.faces and all(edge.is_manifold for edge in bm.edges),'real reveal walls must remain closed'
bm.free()
reveals=[]
for face in wall.data.polygons:
    points=[wall.matrix_world@wall.data.vertices[i].co for i in face.vertices]
    centre=sum(points,Vector())/len(points)
    if max(p.x for p in points)-min(p.x for p in points)>.15 and abs(face.normal.x)<.9 and layout['ornamentBottom']-.001<centre.z<layout['ornamentBottom']+layout['ornamentHeight']+.001 and any(abs(centre.y-y)<1.3 for y in layout['ornaments']):
        reveals.append(face)
assert reveals and all(wall.data.materials[f.material_index].name=='Sunny_cream'for f in reveals),'front reveals must not inherit red side-skin slot0'
assert len(records)==2 and interiors['aftFacade']['entrance']=='AftEntrance'
port=box('PortFixture',(0,0,0),(.2,4,4),'cream')
distant=box('DistantFixture',(4,0,0),(.2,4,4),'cream')
bpy.context.view_layer.update()
assert cut_front_circle(port,0,0,0,.7)
assert not cut_front_circle(distant,0,0,0,.7),'finite bore must not cut distant wall'
for i in range(48):
    angle=(i+.5)*math.tau/48
    assert not ray(port,-1,.68*math.cos(angle),.68*math.sin(angle))
    assert ray(port,-1,.75*math.cos(angle),.75*math.sin(angle))
assert ray(port,-1,.65,.65),'square corners around a circle must remain'
print('PASS two real lobed apertures, retained wall/crown corners, closed reveals and finite circular ports',flush=True)
