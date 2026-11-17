import bpy,json,os
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/Users/sukhjot/codes/Sunny-Ship/assets/sunny-master.blend')
obj=bpy.data.objects['Line006'];mesh=obj.data
points=[obj.matrix_world@v.co for v in mesh.vertices]
support=bpy.data.objects['Sunny_ForedeckSupport']
floor=max((support.matrix_world@v.co).z for v in support.data.vertices)
top=max(p.z for p in points)
def bounds(values):
    return {'min':[min(p[i]for p in values)for i in range(3)],'max':[max(p[i]for p in values)for i in range(3)]}
mesh.calc_loop_triangles()
sections=[]
for fraction in (.15,.5,.8,.96):
    height=floor+(top-floor)*fraction;edges=set();positions={}
    for triangle in mesh.loop_triangles:
        vertices=[points[i]for i in triangle.vertices];cross=[]
        for p,q in zip(vertices,vertices[1:]+vertices[:1]):
            if abs(q.z-p.z)>1e-9 and min(p.z,q.z)<=height<=max(p.z,q.z):
                v=p.lerp(q,(height-p.z)/(q.z-p.z));key=tuple(round(v[i],4)for i in (0,1))
                positions[key]=v;cross.append(key)
        if len(set(cross))==2:edges.add(tuple(sorted(set(cross))))
    graph={}
    for a,b in edges:graph.setdefault(a,set()).add(b);graph.setdefault(b,set()).add(a)
    seen=set();groups=[]
    for start in graph:
        if start in seen:continue
        group=[];todo=[start];seen.add(start)
        while todo:
            current=todo.pop();group.append(current)
            for next_key in graph[current]:
                if next_key not in seen:seen.add(next_key);todo.append(next_key)
        groups.append({'bounds':bounds([positions[k]for k in group]),'centre':[sum(k[i]for k in group)/len(group)for i in range(2)],'points':len(group),'closed':all(len(graph[k])==2 for k in group)})
    sections.append({'fraction':fraction,'height':height,'groups':groups})
result={'master':'/Users/sukhjot/codes/Sunny-Ship/assets/sunny-master.blend','object':'Line006','bounds':bounds(points),'floor':floor,'height':top-floor,'vertices':len(points),'faces':len(mesh.polygons),'sections':sections,'floorPoints':[list(p)for p in points if abs(p.z-floor)<.003]}
with open('/private/tmp/sunny-fore-rim-inspection.json','w')as stream:json.dump(result,stream,indent=2)
print('FORE_RIM_INSPECTION',json.dumps({k:result[k]for k in ['floor','height','vertices','faces']}))
for section in sections:print('SECTION',section['fraction'],len(section['groups']),'groups',sum(g['closed']for g in section['groups']),'closed')

area=up=0
for triangle in mesh.loop_triangles:
    p,q,r=[points[i]for i in triangle.vertices]
    if max(abs(v.z-floor)for v in (p,q,r))<.003:
        normal=(q-p).cross(r-p);area+=normal.length/2
        if normal.z>0:up+=normal.length/2
print("FLOOR_CAP_AREA",area,"UPWARD",up)
