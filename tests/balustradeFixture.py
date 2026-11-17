"""Independent closed/wound rail sections, actual supported shafts and grain."""
import os,sys,math
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,os.path.join(os.path.dirname(os.path.dirname(__file__)),'tools'))
from sunny_balustrade import balustrade_object,fore_top_guard,stair_edge_path
from sunny_uv import metric_uv
from sunny_exterior import box
bpy.ops.wm.read_factory_settings(use_empty=True)
height=1.49
flat=balustrade_object('ForeTopGuard_fixture',[(0,0,0),(3,0,0),(3,3,0)],height)
stairs=[(6+i*.5,0,i*.2)for i in range(7)]
for p in stairs:box('real_tread',(p[0],p[1],p[2]-.08),(.5,1,.16),'deck',walkable=True)
stair=balustrade_object('ForeStairGuard_fixture',stairs,height,post_points=stairs[::2])
bpy.context.view_layer.update()
for obj in (flat,stair):
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(edge.is_manifold for edge in bm.edges),'every band section/shaft must be closed'
    # Check each disconnected physical piece; a large positive shaft volume
    # cannot hide an accidentally reversed band section.
    seen=set()
    for start in bm.verts:
        if start in seen:continue
        seen.add(start);todo=[start];component=set()
        while todo:
            vertex=todo.pop();component.add(vertex)
            for edge in vertex.link_edges:
                next_vertex=edge.other_vert(vertex)
                if next_vertex not in seen:seen.add(next_vertex);todo.append(next_vertex)
        faces={face for vertex in component for face in vertex.link_faces}
        volume=0
        for face in faces:
            points=[v.co for v in face.verts]
            for i in range(1,len(points)-1):volume+=points[0].dot(points[i].cross(points[i+1]))/6
        assert volume>0,'each actual band/shaft has outward winding'
    bm.free()
    metric_uv(obj)
    assert obj['sunny_uv_kind']=='cylinder','each beam/shaft gets its own length-axis grain'
    assert all(math.isfinite(v)for face in obj.data.uv_layers['SunnyUV'].data for v in face.uv),'grain UVs stay finite'
    for p in obj['sunny_guard_posts']:
        if obj==stair:assert any((Vector(p)-Vector(t)).length<1e-6 for t in stairs),'all stair posts mount on actual supported tread centres'
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    for p in obj['sunny_guard_posts']:
        centre=Vector(p)
        low=p[2]+height*.25-.008;high=p[2]+height*.82+.008
        assert sum(abs(v.z-low)<1e-6 and (Vector((v.x,v.y,0))-Vector((p[0],p[1],0))).length<height*.11 for v in points)>=12,'all closed shaft feet embed into their bottom rail'
        assert sum(abs(v.z-high)<1e-6 and (Vector((v.x,v.y,0))-Vector((p[0],p[1],0))).length<height*.11 for v in points)>=12,'all closed shaft heads embed into their top rail'
print('PASS closed outward rail/shaft pieces on turned/sloped paths, supported tread posts, embedded ends and finite component grain',flush=True)

floor=box('floor_fixture',(-2.5,0,-.09),(5,8,.18),'deck',walkable=True)
target=box('old_guard_fixture',(-2.5,0,1),(5,8,2),'timber')
bpy.context.view_layer.update()
original=[v.co.copy()for v in floor.data.vertices]
record=fore_top_guard([(-5,-4),(0,-4),(0,4),(-5,4)],0,height,(-1,1),target)
assert all((a-v.co).length==0 for a,v in zip(original,floor.data.vertices)),'upper guard must not modify its actual deck'
assert record['gap'][0]<-1 and record['gap'][1]>1,'actual stair width plus real post ends stays clear'
for face in target.data.polygons:
    points=[target.matrix_world@target.data.vertices[i].co for i in face.vertices]
    assert not any(abs(p.y)<1 and p.x>-.35 for p in points),'no cap/shaft may close the actual upper stair entrance'
assert any(abs(v.co.z)<1e-6 for v in target.data.vertices),'real footing-plane skin vertices remain measurable'
bm=bmesh.new();bm.from_mesh(target.data)
assert all(e.is_manifold for e in bm.edges) and bm.calc_volume(signed=True)>0
bm.free()
print('PASS reconstructed upper front/curved rail keeps the unchanged floor and full actual stair entrance',flush=True)

curved=[]
for i in range(4):
    tread=box('curved_tread_fixture',(10+i*.45,0,i*.2-.08),(.6,2.6,.16),'deck',walkable=True)
    tread.rotation_euler.z=.20+i*.04;curved.append(tread)
bpy.context.view_layer.update()
def actual_bounds(obj):
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    return Vector(tuple(min(p[i]for p in points)for i in range(3))),Vector(tuple(max(p[i]for p in points)for i in range(3)))
outside=0
for side in (0,1):
    fitted=stair_edge_path(curved,actual_bounds,side)
    for obj,p in zip(curved,fitted):
        lo,hi=actual_bounds(obj)
        old=Vector(((lo.x+hi.x)/2,lo.y+.03 if side==0 else hi.y-.03,hi.z))
        local=obj.matrix_world.inverted()@old
        outside+=abs(local.x)>.3 or abs(local.y)>1.3
        local=obj.matrix_world.inverted()@Vector(p)
        assert abs(local.x)<=.30001 and abs(local.y)<1.3,'real fitted edge lies inside the source tread footprint'
        hits=[]
        for support in curved:
            inverse=support.matrix_world.inverted()
            hit,point,_,_=support.ray_cast(inverse@Vector((p[0],p[1],2)),inverse.to_3x3()@Vector((0,0,-1)))
            if hit:hits.append((support.matrix_world@point).z)
        assert hits and abs(p[2]-max(hits))<1e-6,'foot follows highest real overlapping tread, not its box maximum'
assert outside>0,'fixture must reproduce unsupported AABB-edge placement'
print('PASS actual rotated/overlapping tread cross-sections replace unsupported box edges without changing any tread',flush=True)

# A transfer gap omits a rail station, but its overlapping physical tread
# must still participate in support fitting at the retained station.
lower=box('retained_support_fixture',(20,0,-.08),(.6,2.6,.16),'deck',walkable=True)
upper=box('omitted_station_fixture',(20.2,0,.12),(.6,2.6,.16),'deck',walkable=True)
bpy.context.view_layer.update()
for side in (0,1):
    fitted=stair_edge_path([lower],actual_bounds,side,supports=[lower,upper])
    assert abs(fitted[0][2]-.2)<1e-6,'omitted rail station retains its actual overlapping tread support'
print('PASS full physical flight remains support authority across omitted transfer stations',flush=True)
