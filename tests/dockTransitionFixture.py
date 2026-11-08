"""Disposable Blender cut fixture; does not modify production assets."""
import os,sys
sys.path.insert(0,os.path.abspath('tools'))
import bpy
from mathutils import Vector
from sunny_dock_transition import rings,subtract_frustum
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add(size=2,location=(.495,0,-46))
o=bpy.context.object;o.scale=(10,2,10);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
sections=rings(.495,-2.1,2.1,-53.15,-40.73,-45.94,7.64,steps=2,count=32)
for a,b in zip(sections,sections[1:]):subtract_frustum(o,a,b)
inv=o.matrix_world.inverted()
def hit(x,z):
 ok,loc,_,_=o.ray_cast(inv@Vector((x,-5,z)),inv.to_3x3()@Vector((0,1,0)))
 return (o.matrix_world@loc).y if ok else None
# Through centre is removed over the volume; side/outside remains.
assert hit(.495,-46) is None,('centre not cut',hit(.495,-46))
assert hit(9,-46) is not None,('outside unexpectedly removed',hit(9,-46))
print('PASS bounded rounded transition cut retains outside geometry')
from sunny_dock_transition import shell_geometry
verts,faces=shell_geometry(sections)
from collections import Counter
edges=Counter(tuple(sorted((f[i],f[(i+1)%len(f)]))) for f in faces for i in range(len(f)))
assert all(n==2 for n in edges.values()),'rounded outlet shell is not closed'
assert len(verts)==len(sections)*2*len(sections[0])
print('PASS thick rounded loft has closed shared edges')
