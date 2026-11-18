"""Fit small R09 cannon openings to the four existing model cannon axes."""
import math

import bpy
from mathutils import Vector

from sunny_accuracy import yard_skin
from sunny_exterior import _mesh, assign_world_mesh, finish

PORT_RADIUS = .245
LINER_INNER = .176
LINER_OUTER = .27
SEGMENTS = 48


def cut_surface(obj, x, z, start, end):
    """Cut a local hole in an open source skin, retaining corner finish data."""
    planes = []
    for i in range(SEGMENTS):
        angle=(i+.5)*math.tau/SEGMENTS
        normal=Vector((-math.cos(angle),0,-math.sin(angle)))
        planes.append((normal,normal.dot(Vector((x,0,z)))-PORT_RADIUS*math.cos(math.pi/SEGMENTS)))
    planes.extend(((Vector((0,1,0)),min(start,end)),(Vector((0,-1,0)),-max(start,end))))
    source=obj.data
    source.calc_loop_triangles()
    uv=source.uv_layers.active
    normals=obj.matrix_world.to_3x3().inverted().transposed()
    corners,faces,indices=[],[],[]
    for triangle in source.loop_triangles:
        pending=[(obj.matrix_world@source.vertices[source.loops[i].vertex_index].co,
                  uv.data[i].uv.copy() if uv else None,
                  (normals@source.corner_normals[i].vector).normalized()) for i in triangle.loops]
        # An entirely outside triangle keeps its original positions and finish.
        remaining=[pending]
        if not any(all(normal.dot(p[0])<offset for p in pending) for normal,offset in planes):
            remaining=[]
            for normal,offset in planes:
                inside,outside=[],[]
                for a,b in zip(pending,pending[1:]+pending[:1]):
                    da,db=normal.dot(a[0])-offset,normal.dot(b[0])-offset
                    (inside if da>=0 else outside).append(a)
                    if (da>=0)!=(db>=0):
                        ratio=da/(da-db)
                        vertex=tuple(left.lerp(right,ratio) if left is not None else None for left,right in zip(a,b))
                        inside.append(vertex)
                        outside.append(vertex)
                if len(outside)>=3:
                    remaining.append(outside)
                pending=inside
                if len(pending)<3:
                    break
        for poly in remaining:
            for i in range(1,len(poly)-1):
                a,b,c=poly[0],poly[i],poly[i+1]
                if (b[0]-a[0]).cross(c[0]-a[0]).length_squared<1e-16:
                    continue
                faces.append(tuple(range(len(corners),len(corners)+3)))
                corners.extend((a,b,c))
                indices.append(triangle.material_index)
    mesh=bpy.data.meshes.new(source.name+'_closet_ports')
    mesh.from_pydata([point for point,_,_ in corners],[],faces)
    for mat in source.materials:mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,indices):
        face.material_index=index;face.use_smooth=True
    if uv:
        layer=mesh.uv_layers.new(name=uv.name)
        for i,(_,coordinate,_) in enumerate(corners):layer.data[i].uv=coordinate
    mesh.normals_split_custom_set([normal.normalized() for _,_,normal in corners])
    mesh.update()
    assign_world_mesh(obj,mesh)


def build_liner(name,x,z,direction,inner,outer):
    vertices=[]
    for radii,station in ((LINER_OUTER,inner),(LINER_OUTER,outer),(LINER_INNER,inner),(LINER_INNER,outer)):
        for i in range(SEGMENTS):
            angle=math.tau*i/SEGMENTS
            vertices.append((x+radii*math.cos(angle),station[i],z+radii*math.sin(angle)))
    def index(row,i):return row*SEGMENTS+i%SEGMENTS
    faces=[]
    for i in range(SEGMENTS):
        j=i+1
        faces.extend(((index(0,i),index(1,i),index(1,j),index(0,j)),
                      (index(2,j),index(3,j),index(3,i),index(2,i)),
                      (index(0,j),index(2,j),index(2,i),index(0,i)),
                      (index(1,i),index(3,i),index(3,j),index(1,j))))
    if direction<0:faces=[tuple(reversed(face)) for face in faces]
    obj=finish(_mesh(name,vertices,faces),name,'black')
    obj['sunny_feature']='HullPortCloset'
    return obj


def fit_closet_ports(bounds):
    """Open only the measured local lining, native hull and shield layers."""
    hull=bpy.data.objects['Line002']
    shield=next(obj for obj in bpy.data.objects if obj.name.split('.')[0]=='Circle038')
    skin=[yard_skin(obj) for obj in (hull,shield)]
    records=[]
    objects=[]
    for family,level in (('Quarters','F1'),('Womens','F2')):
        lining=bpy.data.objects['Sunny_Fore'+level+'_shell']
        wall=yard_skin(lining)
        for side in (-1,1):
            barrel=bpy.data.objects[f'Sunny_{family}_cannon{side}_barrel']
            low,high=bounds(barrel)
            x,_,z=(low+high)/2
            direction=1 if (low.y+high.y)>0 else -1
            out=Vector((0,direction,0))
            inner,outer=[],[]
            for i in range(SEGMENTS):
                angle=math.tau*i/SEGMENTS
                at=Vector((x+LINER_OUTER*math.cos(angle),0,z+LINER_OUTER*math.sin(angle)))
                p,*_=wall.ray_cast(at,out,30)
                hits=[surface.ray_cast(at+40*out,-out,40)[0] for surface in skin]
                assert p is not None and any(hit is not None for hit in hits),'gunport must meet the real wall and outer skin'
                inner.append(p.y-direction*.026)
                furthest=max((hit for hit in hits if hit is not None),key=lambda hit:direction*hit.y)
                outer.append(furthest.y+direction*.026)
            end=max(direction*value for value in outer)+.25
            start=min(direction*value for value in inner)-.25
            a,b=(x,direction*start,z),(x,direction*end,z)
            # The retained lining, like the imported skins, has split edges
            # outside this local cut. The fitted closed sleeve finishes both
            # lining faces and connects them to the outer skin.
            for layer in (lining,hull,shield):
                cut_surface(layer,x,z,a[1],b[1])
            name=f'ClosetPort_{level}_{side}'
            obj=build_liner(name,x,z,direction,inner,outer)
            objects.append(obj)
            records.append({'node':obj.name,'barrel':barrel.name,'axis':[x,z],'inner':sum(inner)/SEGMENTS,
                            'exit':sum(outer)/SEGMENTS,'direction':direction,'clearRadius':LINER_INNER})
    return objects,records
