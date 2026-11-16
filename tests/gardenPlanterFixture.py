"""Independent shell/soil topology and ray checks for the source garden beds."""
import os,sys,math
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_accuracy import garden_planter,leaf_mesh
from sunny_uv import metric_uv
bpy.ops.wm.read_factory_settings(use_empty=True)
for i,rotation in enumerate((0,math.pi/2)):
    planter=garden_planter('Bed'+str(i),(i*4,0,0),rotation)
    bpy.context.view_layer.update()
    bm=bmesh.new();bm.from_mesh(planter.data)
    assert all(edge.is_manifold for edge in bm.edges)and bm.calc_volume(signed=True)>0,'bed must have closed correctly wound walls/base'
    bm.free()
    # Local down-rays distinguish an actual cavity floor from a solid top.
    for x,y in ((0,0),(.9,.3),(-.9,-.3)):
        hit,p,n,index=planter.ray_cast(Vector((x,y,1)),Vector((0,0,-1)))
        assert hit and abs(p.z-.08)<1e-6,'planter interior must be open to its real base'
    for x,y in ((1.14,0),(-1.14,0),(0,.49),(0,-.49)):
        hit,p,n,index=planter.ray_cast(Vector((x,y,1)),Vector((0,0,-1)))
        assert hit and abs(p.z-.50)<1e-6,'all four rims retain physical walls'
    soil=bpy.data.objects['Sunny_Bed'+str(i)+'_soil']
    corners=[soil.matrix_world@v.co for v in soil.data.vertices]
    assert abs(max(v.z for v in corners)-.46)<1e-6 and abs(min(v.z for v in corners)-.08)<1e-6,'soil rests on the base below the rim without a competing visible top'
print('PASS closed open-top garden shells, all four real rims, supported inset soil and rotated construction',flush=True)
for i,direction in enumerate(((1,0,0),(.3,.7,.6),(-.8,.4,-.2))):
    base=Vector((i*2,-2,1));leaf=leaf_mesh('Fixture_leaf'+str(i),base,direction,.25,.12)
    bpy.context.view_layer.update();metric_uv(leaf)
    points=[leaf.matrix_world@v.co for v in leaf.data.vertices]
    root=min(range(len(points)),key=lambda j:(points[j]-base).length)
    tip=max(range(len(points)),key=lambda j:(points[j]-base).length)
    uv=leaf.data.uv_layers['SunnyUV'];mapped={loop.vertex_index:uv.data[loop.index].uv for loop in leaf.data.loops}
    assert (points[root]-base).length<1e-6,'blade retains its actual stem attachment'
    assert all(-.005<=value<=1.005 for pair in mapped.values()for value in pair),'curved leaf UVs stay normalized'
    assert abs(mapped[root].x)<1e-5 and abs(mapped[tip].x-1)<1e-5,'vein UVs run from the real attached root to the real tip'
print('PASS normalized curved blade vein UVs follow actual root/tip at three world orientations',flush=True)
