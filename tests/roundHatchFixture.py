"""R14 circular hatch fixture: true hole, preserved corners and closed round lid."""
import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
import sunny_exterior
from sunny_exterior import box
from sunny_interiors import hatch
bpy.ops.wm.read_factory_settings(use_empty=True)
floor=box('RoundHatchFixtureFloor',(0,0,-.10),(3,3,.20),'deck',walkable=True)
spec=hatch('DockLadderHatch',(0,0,0),0,(1.4,1.4),shape='round')
bpy.context.view_layer.update()
def ray(obj,x,y):
    inverse=obj.matrix_world.inverted()
    return obj.ray_cast(inverse@Vector((x,y,2)),inverse.to_3x3()@Vector((0,0,-1)))[0]
for i in range(32):
    angle=i*math.tau/32
    assert not ray(floor,.60*math.cos(angle),.60*math.sin(angle)),'floor blocks circular aperture'
    assert ray(floor,.85*math.cos(angle),.85*math.sin(angle)),'native floor lost outside circular cut'
for x in (-.70,.70):
    for y in (-.70,.70):assert ray(floor,x,y),'rectangular corner erasure is not a round opening'
lid=bpy.data.objects[spec['node']]
for i in range(32):
    angle=i*math.tau/32
    assert ray(lid,.68*math.cos(angle),.68*math.sin(angle)),'lid must close the real bore'
assert not ray(lid,.60,.60),'lid must have a circular silhouette'
bm=bmesh.new();bm.from_mesh(lid.data)
assert all(edge.is_manifold for edge in bm.edges),'round lid must be a closed solid'
bm.free()
assert spec['shape']=='round'
assert len([o for o in lid.children if 'hinge' in o.name])==2,'hardware must move with lid'
print('PASS R14 round opening, preserved surrounding lawn, solid disc and attached hardware',flush=True)
