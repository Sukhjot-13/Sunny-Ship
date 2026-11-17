"""Closed source-shaped balustrades on measured deck/stair paths."""
import math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from sunny_exterior import _mesh,finish,material,assign_world_mesh


def stair_edge_path(treads,bounds,side,inset=.03,supports=None):
    """Intersect true tread tops at each station, then fit to highest real wood.

    A rotated tread's AABB edge is not its supported edge at the middle X.
    Adjacent curved treads can also overlap slightly at that actual edge.
    """
    bpy.context.view_layer.update()
    supports=list(treads if supports is None else supports)
    surfaces=[];records=[]
    for obj in supports:
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        obj.data.calc_loop_triangles()
        surfaces.append(BVHTree.FromPolygons(points,[tuple(f.vertices)for f in obj.data.loop_triangles],all_triangles=True))
    for obj in treads:
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        lo,hi=bounds(obj);x=(lo.x+hi.x)/2;cross=[]
        obj.data.calc_loop_triangles()
        for triangle in obj.data.loop_triangles:
            vertices=[points[i]for i in triangle.vertices]
            normal=(vertices[1]-vertices[0]).cross(vertices[2]-vertices[0])
            if normal.length<1e-8 or normal.normalized().z<.6:continue
            for a,b in zip(vertices,vertices[1:]+vertices[:1]):
                if abs(a.x-x)<1e-6:cross.append(a)
                if abs(b.x-a.x)>1e-8 and min(a.x,b.x)<=x<=max(a.x,b.x):cross.append(a.lerp(b,(x-a.x)/(b.x-a.x)))
        if not cross:raise RuntimeError(obj.name+' has no real upper tread cross-section')
        low,high=min(p.y for p in cross),max(p.y for p in cross)
        if high-low<=2*inset:raise RuntimeError(obj.name+' tread cross-section is too narrow')
        records.append((x,low+inset if side==0 else high-inset))
    top=max(bounds(obj)[1].z for obj in supports)+.2
    bottom=min(bounds(obj)[0].z for obj in supports)-.2
    path=[]
    for x,y in records:
        hits=[surface.ray_cast(Vector((x,y,top)),Vector((0,0,-1)),top-bottom)[0]for surface in surfaces]
        hits=[p for p in hits if p is not None]
        if not hits:raise RuntimeError('fore balustrade loses its actual tread support')
        path.append((x,y,max(p.z for p in hits)))
    return path


def balustrade_geometry(path,height,post_points=None):
    """Broad white bands and waisted timber shafts; distances are reconstruction.

    A path consists of real supported foot stations. Optional post_points keeps
    stair shafts on actual treads; flat-deck posts use uniform arc-length pitch.
    """
    path=[Vector(p) for p in path]
    if len(path)<2:raise ValueError('balustrade needs a supported open path')
    vertices=[];faces=[];indices=[];smooth=[]
    def solid(points,index,middle=None):
        start=len(vertices);vertices.extend(tuple(p)for p in points)
        body=[(0,2,3,1),(4,5,7,6)]
        if middle is None:body.extend(((0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)))
        else:
            vertices.extend(tuple(p)for p in middle)
            for a,b in ((0,1),(1,3),(3,2),(2,0)):
                body.extend(((a,b,b+8,a+8),(a+8,b+8,b+4,a+4)))
        faces.extend(tuple(start+i for i in f)for f in body)
        indices.extend([index]*len(body));smooth.extend([False]*len(body))
    width=height*.20
    for a,b in zip(path,path[1:]):
        delta=b-a
        if Vector((delta.x,delta.y,0)).length<1e-6:raise ValueError('balustrade stations need distinct plan positions')
        side=Vector((delta.y,-delta.x,0)).normalized()*width/2
        for low,high in ((-.012,height*.25),(height*.82,height)):
            middle=[p+s for p in (a,b)for s in (-side,side)]if low<0 else None
            solid([p+s+Vector((0,0,z))for z in (low,high)for p in (a,b)for s in (-side,side)],0,middle)
    lengths=[(b-a).length for a,b in zip(path,path[1:])];total=sum(lengths)
    def station(distance):
        for a,b,length in zip(path,path[1:],lengths):
            if distance<=length:return a.lerp(b,distance/length),(b-a).normalized()
            distance-=length
        return path[-1],(path[-1]-path[-2]).normalized()
    if post_points is None:
        count=max(1,math.ceil(total/(height*.43)))
        posts=[station(total*i/count)for i in range(count+1)]
    else:
        posts=[]
        for point in post_points:
            point=Vector(point)
            nearest=min(range(len(path)),key=lambda i:(path[i]-point).length)
            tangent=(path[min(nearest+1,len(path)-1)]-path[max(nearest-1,0)]).normalized()
            posts.append((point,tangent))
    profile=((0,1),(.07,1),(.14,.70),(.26,.60),(.65,.60),(.82,.72),(.92,1),(1,1))
    count=12
    for point,tangent in posts:
        along=Vector((tangent.x,tangent.y,0)).normalized();across=Vector((-along.y,along.x,0))
        start=len(vertices);base=point.z+height*.25-.008;top=point.z+height*.82+.008
        for t,radius in profile:
            for i in range(count):
                angle=i*math.tau/count
                p=point+along*(height*.10*radius*math.cos(angle))+across*(width*.5*radius*math.sin(angle))
                p.z=base+(top-base)*t;vertices.append(tuple(p))
        faces.append(tuple(start+i for i in reversed(range(count))));indices.append(1);smooth.append(False)
        for row in range(len(profile)-1):
            for i in range(count):
                j=(i+1)%count
                faces.append((start+row*count+i,start+row*count+j,start+(row+1)*count+j,start+(row+1)*count+i));indices.append(1);smooth.append(True)
        faces.append(tuple(start+(len(profile)-1)*count+i for i in range(count)));indices.append(1);smooth.append(False)
    return vertices,faces,indices,smooth,[list(p)for p,_ in posts]


def balustrade_object(name,path,height,post_points=None,target=None):
    """Create/update one batched physical object without changing floor geometry."""
    path=[list(p)for p in path]
    vertices,faces,indices,smooth,posts=balustrade_geometry(path,height,post_points)
    if target is None:obj=finish(_mesh(name,vertices,faces),name,'white',obstacle=True)
    else:
        mesh=bpy.data.meshes.new(name+'_reference');mesh.from_pydata(vertices,[],faces);mesh.update()
        mesh.materials.append(material('white'));assign_world_mesh(target,mesh);obj=target
    obj.data.materials.append(material('timber'))
    for face,index,soft in zip(obj.data.polygons,indices,smooth):face.material_index=index;face.use_smooth=soft
    obj['sunny_authored']=True;obj['sunny_obstacle']=True;obj['sunny_rail']=True;obj['sunny_balustrade']=True
    obj['sunny_guard_height']=height;obj['sunny_guard_posts']=posts
    obj['sunny_guard_path']=path
    return obj


def fore_top_guard(outline,floor,height,stair_span,target):
    """Fit the source front/curved guard, leaving the actual upper stair gap.

    Inspection proves Line006 has only downward foot caps (no deck floor), so
    its guard mesh can be replaced while the real ForedeckSupport stays intact.
    """
    from sunny_exterior import inset_outline
    path=inset_outline(outline,.03)
    rear=max(range(len(path)),key=lambda i:abs(path[(i+1)%len(path)][1]-path[i][1]))
    a,b=Vector((*path[rear],floor)),Vector((*path[(rear+1)%len(path)],floor))
    if min(a.x,b.x)<min(p[0]for p in path)+(max(p[0]for p in path)-min(p[0]for p in path))*.6:
        raise RuntimeError('fore top guard cannot identify the real aft deck edge')
    margin=height*.10+.04
    low,high=stair_span[0]-margin,stair_span[1]+margin
    if not min(a.y,b.y)<low<high<max(a.y,b.y):raise RuntimeError('upper stair gap leaves the actual deck edge')
    def at(y):return a.lerp(b,(y-a.y)/(b.y-a.y))
    first,last=(high,low)if b.y>a.y else(low,high)
    stations=[at(first)]+[Vector((*path[(rear+1+i)%len(path)],floor))for i in range(len(path))]+[at(last)]
    obj=balustrade_object('ForeTopGuard',stations,height,target=target)
    obj['sunny_fore_top_guard']=True;obj['sunny_guard_path']=[list(p)for p in stations]
    obj['sunny_guard_gap']=[low,high]
    return dict(node=obj.name,height=height,path=[list(p)for p in stations],stairSpan=list(stair_span),gap=[low,high],
        reference='R09 fore rim/front balustrade; equal physical gallery height with perspective, actual floor/stair gap retained; profile/pitch reconstructed')
