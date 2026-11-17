"""Real attached lawn foliage, exact retained trunk and component leaf grain."""
import os,sys,math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_accuracy import reference_tree
from sunny_shade import shade_tree
from sunny_uv import metric_uv

def trunk_geometry(obj):
    bpy.context.view_layer.update()
    return ([tuple(obj.matrix_world@v.co)for v in obj.data.vertices],
            [tuple(face.vertices)for face in obj.data.polygons])

for seed in (3,4):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    original=trunk_geometry(reference_tree('Old',(2,-3,.7),seed=seed))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    trunk=shade_tree('New',(2,-3,.7),seed=seed)
    assert trunk_geometry(trunk)==original,'actual rooted trunk must remain exactly unchanged'
    leaves=[o for o in bpy.data.objects if '_leaves_batch' in o.name]
    assert len(leaves)==2,'same-material batching stays bounded'
    wood=[o for o in bpy.data.objects if o.type=='MESH' and o not in leaves]
    trees=[]
    for obj in wood:
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        obj.data.calc_loop_triangles()
        trees.append(BVHTree.FromPolygons(points,[tuple(f.vertices)for f in obj.data.loop_triangles],all_triangles=True))
    all_points=[];roots=0
    for obj in leaves:
        points=[obj.matrix_world@v.co for v in obj.data.vertices];all_points+=points
        assert len(points)%11==0,'each real curved blade retains its connected eleven-vertex construction'
        for index in range(0,len(points),11):
            distances=[tree.find_nearest(points[index])[3]for tree in trees]
            assert min(d for d in distances if d is not None)<.016,'actual blade root must meet real woody shoot geometry'
            roots+=1
        metric_uv(obj)
        assert obj['sunny_uv_kind']=='leaf','actual curved blade islands retain leaf-vein mapping'
        assert all(math.isfinite(value)for loop in obj.data.uv_layers['SunnyUV'].data for value in loop.uv)
    low=[min(p[i]for p in all_points)for i in range(3)];high=[max(p[i]for p in all_points)for i in range(3)]
    ratio=(high[2]-low[2])/max(high[i]-low[i]for i in (0,1))
    assert .80<ratio<1.20,'reconstructed crown must have actual rounded depth rather than a shallow spread'
    assert roots>3000,'full attached foliage is retained in actual geometry'
    print('PASS seed',seed,'exact rooted trunk,',roots,'actual attached blade roots, two leaf batches/vein UVs and deep crown',ratio,flush=True)
