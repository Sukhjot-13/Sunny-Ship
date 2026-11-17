"""R09 paired real ports and correctly facing closed fore arch bands."""
import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_exterior import box,_mesh,material,open_volume_slot
from sunny_fore_facade import fore_front_ports,fore_entry_surrounds,fore_upper_entry_depth,fore_front_finish
bpy.ops.wm.read_factory_settings(use_empty=True)
cy=1.287
wall=box('ForeF2_shell_fixture',(-18.5,cy,1.4),(.2,25.6,2.8),'cream',obstacle=True)
interiors={'levels':{'F2F':0},'doors':[
    dict(id='WomensDoor',pos=[-18.35,cy+7.55,0],height=2.24,width=1.10)]}
cap=_mesh('Line002',[(-20.285,cy-13,0),(-20.285,cy+13,0),(-20.285,cy+13,2.8),(-20.285,cy-13,2.8)],[(3,2,1,0)])
cap.data.materials.append(material('timber'))
bpy.context.view_layer.update()
open_volume_slot(wall,-19.2,-17.5,cy+7.55-.60,cy+7.55+.60,-.15,2.36)
records=fore_front_ports([wall,cap],interiors,cy)
fore_entry_surrounds(interiors)
tunnel=fore_upper_entry_depth(interiors)
bpy.context.view_layer.update()
def ray(obj,y,z):
    inverse=obj.matrix_world.inverted()
    return obj.ray_cast(inverse@Vector((-16,y,z)),inverse.to_3x3()@Vector((-1,0,0)))[0]
assert not ray(wall,cy+7.55,1.45) and not ray(cap,cy+7.55,1.45),'upper doorway must cross both actual wall planes'
assert not ray(tunnel,cy+7.55,1.45),'joined tunnel remains open through its centre'
assert ray(tunnel,cy+7.55+.66,1.45) and ray(tunnel,cy+7.55,2.42),'tunnel owns real closed side/header surfaces'
bm=bmesh.new();bm.from_mesh(tunnel.data)
assert all(edge.is_manifold for edge in bm.edges)and tunnel['sunny_aperture_shell'],'closed connector must retain physical overhead faces'
bm.free()
assert len(records)==2
for record in records:
    assert record['position'][1]<cy,'paired ports are opposite the upper entry'
    for i in range(24):
        angle=i*math.tau/24;y=record['position'][1]+record['radius']*.90*math.cos(angle);z=record['position'][2]+record['radius']*.90*math.sin(angle)
        assert not ray(wall,y,z),'actual wall layers block a port'
        assert ray(bpy.data.objects['Sunny_'+record['id']+'_glass'],y,z),'actual aperture needs its pane'
    assert ray(wall,record['position'][1]+record['radius']*.92,record['position'][2]+record['radius']*.92),'round port must retain diagonal wall corners'
    pane=bpy.data.objects['Sunny_'+record['id']+'_glass']
    assert pane['sunny_obstacle'],'glass must participate in physical collision'
    rim=bpy.data.objects['Sunny_'+record['id']+'_rim']
    bm=bmesh.new();bm.from_mesh(rim.data)
    assert all(edge.is_manifold for edge in bm.edges)and bm.calc_volume(signed=True)>0,'broad annular trim must be a real closed outward-wound body'
    bm.free()
spacing=records[1]['position'][1]-records[0]['position'][1]
assert 2.0<spacing/(2*records[0]['outerRadius'])<2.3,'same-panel source spacing/outer-circle ratio must match R09'
assert .52<records[0]['radius']/records[0]['outerRadius']<.60,'source inner/outer circle ratio needs the broad white rim'
blocks=[o for o in bpy.data.objects if o.name.startswith('Sunny_ForeFacadeWomensDoor')]
assert len(blocks)==20,'both jambs and every broad arch segment are required'
front=interiors['foreFacade']['surrounds'][0]['x']
for block in blocks:
    points=[block.matrix_world@v.co for v in block.data.vertices]
    assert min(p.x for p in points)>front-.021 and max(p.x for p in points)>front+.15,'fore bands face the lawn at +X'
    bm=bmesh.new();bm.from_mesh(block.data)
    assert all(edge.is_manifold for edge in bm.edges),'each band block is a closed solid'
    bm.free()
print('PASS R09 paired actual circular ports, glazing/corners and all20 correctly facing closed upper-entry band blocks',flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
front=box('native',(-16.8,0,-3),(.05,4,6),'timber',obstacle=True)
front.name='Line002'
fore_front_finish({'levels':{'F1':-4,'F2F':-1},'doors':[dict(id='ForeDoor',pos=[-16.9,0,-4])]})
inverse=front.matrix_world.inverted()
for height,expected in [(-5,'Sunny_timber'),(-3,'Sunny_cream'),(-2,'Sunny_cream'),(-.5,'Sunny_timber')]:
    hit,p,n,index=front.ray_cast(inverse@Vector((-16,0,height)),inverse.to_3x3()@Vector((-1,0,0)))
    assert hit and abs(p.x+16.775)<1e-5,'finish must preserve the actual native front plane'
    assert front.data.materials[front.data.polygons[index].material_index].name==expected,'only the source F1 frontage changes paint'
print('PASS R09 cream frontage with unchanged native plane and preserved paint above/below',flush=True)
