import bpy,bmesh,json
bpy.ops.wm.open_mainfile(filepath='assets/sunny-master.blend')
o=next(o for o in bpy.data.objects if o.name.startswith('Circle038'))
b=bmesh.new();b.from_mesh(o.data);bmesh.ops.remove_doubles(b,verts=list(b.verts),dist=.000001)
print('SHIELD',len(b.verts),len(b.faces),'nonmanifold',sum(not e.is_manifold for e in b.edges),'boundary',sum(e.is_boundary for e in b.edges),'volume',b.calc_volume(signed=True))
b.free()
