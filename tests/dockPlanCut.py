"""Blender fixture for a real convex floor opening and retained surroundings."""
import math
import os
import sys
sys.path.insert(0, os.path.abspath('tools'))
import bpy
from mathutils import Vector
from sunny_exterior import open_convex_plan_slot

mesh=bpy.data.meshes.new('fixture')
mesh.from_pydata([(-5,-5,0),(5,-5,0),(5,5,0),(-5,5,0)],[],[(0,1,2,3)])
obj=bpy.data.objects.new('fixture',mesh);bpy.context.scene.collection.objects.link(obj)
outline=[(2*math.cos(i*math.tau/6),2*math.sin(i*math.tau/6)) for i in range(6)]
open_convex_plan_slot(obj,outline)
actual=sum(face.area for face in obj.data.polygons)
expected=100-6*math.sqrt(3)
assert abs(actual-expected)<1e-4,(actual,expected)
bpy.context.view_layer.update()
def hit(x,y):
    return obj.ray_cast(Vector((x,y,2)),Vector((0,0,-1)))[0]
assert not hit(0,0),'opening centre must be empty'
assert not hit(1,0),'opening interior must be empty'
assert hit(3,0) and hit(4,4),'surrounding original floor must remain'
try:
    open_convex_plan_slot(obj,list(reversed(outline)))
    raise AssertionError('clockwise negative control was accepted')
except ValueError:
    pass
try:
    open_convex_plan_slot(obj,[(-2,-2),(2,-2),(0,0),(2,2),(-2,2)])
    raise AssertionError('concave negative control was accepted')
except ValueError:
    pass
print('PASS convex opening, retained area and clockwise negative control')
