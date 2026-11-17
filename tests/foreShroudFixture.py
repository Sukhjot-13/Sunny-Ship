"""Outboard longitudinal source relationship with independent physical supports."""
import os
import sys
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_accuracy import fore_shrouds
from sunny_exterior import box

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.2,depth=30,location=(-13,1.3,12))
mast=bpy.context.object
mast.name='Cylinder003'
yard=box('yard',(-13,1.3,25),(2,44,2),'timber')
yard.name='Cylinder004'
for side in (-1,1):
    box('LawnSidewalk%d'%(-side),(-2,15 if side>0 else -13,-.1),(26,3,.2),'deck',walkable=True)
fans=[]
for name in ('Plane006','Plane007'):
    obj=box(name,(0,0,0),(1,1,1),'rope')
    obj.name=name
    fans.append(obj)
bpy.context.view_layer.update()
def bounds(obj):
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    return Vector(tuple(min(p[i] for p in points) for i in range(3))),Vector(tuple(max(p[i] for p in points) for i in range(3)))
fore_shrouds([mast,yard]+fans,bounds,{'F1':0})
for obj in fans:
    endpoints=[Vector(p) for p in obj['sunny_shroud_endpoints']]
    bottom,upper=endpoints[:6],endpoints[6:]
    assert max(p.x for p in bottom)-min(p.x for p in bottom)>4,'fan opens longitudinally along the side'
    assert max(p.y for p in bottom)-min(p.y for p in bottom)<1e-6,'fan cannot become a transverse curtain'
    deck=bpy.data.objects[obj['sunny_shroud_deck']]
    da,db=bounds(deck)
    assert all(da.x<p.x<db.x and da.y<p.y<db.y and 0<db.z-p.z<.03 for p in bottom),'all actual roots meet their real deck'
    assert all(abs((p-Vector((-13,1.3,p.z))).length-1.18)<.006 for p in upper),'all actual tips embed in the cylindrical mast'
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges),'every rope is a capped solid'
    assert bm.calc_volume(signed=True)>0,'rope winding is outward'
    bm.free()
    # Each ratline is segmented through all six physical fan ropes. It must
    # not bridge only the end ropes and float clear of the curved mast fan.
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    rows=int(obj['sunny_shroud_rows'])
    assert 25<=rows<=35,'source visible fan has a few dozen rows, not metre-spaced hundreds'
    assert len(obj.data.vertices)==16*(6+5*rows),'actual closed rod construction must match every recorded source-density row'
    count=rows+1
    for row in range(1,count):
        for p,q in zip(bottom,upper):
            centre=p.lerp(q,row/count)
            assert min((v-centre).length for v in points)<.026,'ratline meets every fan rope'
print('PASS paired outboard longitudinal fans, fitted deck/mast roots, closed ropes and every source-density ratline junction',flush=True)
