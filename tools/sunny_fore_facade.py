"""R09 fore front: starboard upper entry, paired port windows and arch bands."""
import math
import bpy
from mathutils import Vector
from sunny_exterior import _mesh,finish,pole,ring,clip_face,material,assign_world_mesh
from sunny_aft_facade import cut_front_circle,entrance_surround


def fore_front_ports(objects, interiors, centre):
    """Fit two real circular ports through actual upper fore wall layers.

    R09 establishes the pair opposite the upper door. Exact radius, separation
    and hidden reveal depth are reconstruction; both skin hits are mandatory.
    """
    from sunny_aft_envelope import closed_wall_bvh
    bpy.context.view_layer.update()
    x=-18.35;z=interiors['levels']['F2F']+1.45;radius=.50
    targets=[o for o in bpy.data.objects if o.type=='MESH' and
             (o.name.startswith('Sunny_ForeF2_shell') or
              o.name in ('Line002','Line006','Tube008.001','对象001','对象002'))]
    records=[]
    for i,offset in enumerate((-8.,-4.)):
        y=centre+offset;name='ForeFrontPort'+str(i);hits=[]
        for obj in targets:
            surface=closed_wall_bvh(obj)
            for side in (-1,1):
                p=surface.ray_cast(Vector((x+side*2,y,z)),Vector((-side,0,0)),4)[0]
                if p is not None:hits.append(p.x)
        if len(hits)<2:raise RuntimeError(name+' needs actual outside/inside wall support')
        back,front=min(hits),max(hits)
        if not .08<front-back<2.0:raise RuntimeError(name+' unsupported reveal depth')
        cut_x=(front+back)/2;depth=(front-back)/2+.08
        for obj in targets:cut_front_circle(obj,cut_x,y,z,radius,half_depth=depth)
        count=48
        vertices=[(xx,y+r*math.cos(k*math.tau/count),z+r*math.sin(k*math.tau/count))
                  for xx in (back-.025,front+.025) for r in (radius,radius+.055)for k in range(count)]
        faces=[]
        for k in range(count):
            q=(k+1)%count
            faces.extend(((k,q,count+q,count+k),(2*count+k,3*count+k,3*count+q,2*count+q),
                          (k,2*count+k,2*count+q,q),(count+k,count+q,3*count+q,3*count+k)))
        sleeve=finish(_mesh(name+'_reveal',vertices,faces),name+'_reveal','cream',obstacle=True)
        sleeve['sunny_rail']=True
        glass=pole(name+'_glass',(front-.055,y,z),(front-.02,y,z),radius-.006,'glass',sides=48)
        glass['sunny_obstacle']=True;glass['sunny_fore_front_port']=True
        ring(name+'_rim',(front+.03,y,z),radius,.055,'white','X',48,8)
        ring(name+'_inner',(front+.04,y,z),radius-.055,.020,'darkwood','X',48,8)
        records.append(dict(id=name,position=[x,y,z],radius=radius,front=front,back=back))
    interiors['foreFacade']=dict(ports=records,upperEntry='WomensDoor',
        reference='R09: upper entry to starboard, pair of circular ports to port; metre sizes/depth reconstructed')
    return records


def fore_front_finish(interiors):
    """Paint only the native transverse lower frontage cream as shown in R09.

    The retained timber cap stands ahead of the new lining. Partition its
    original polygons at the storey bounds, preserving the hull below/aside.
    """
    bpy.context.view_layer.update()
    obj=bpy.data.objects['Line002'];old=obj.data
    spec=next(d for d in interiors['doors']if d['id']=='ForeDoor')
    low=interiors['levels']['F1'];high=interiors['levels']['F2F']
    cream=next((i for i,m in enumerate(old.materials)if m.name=='Sunny_cream'),None)
    if cream is None:old.materials.append(material('cream'));cream=len(old.materials)-1
    vertices=[];faces=[];indices=[];fronts=[]
    for face in old.polygons:
        points=[obj.matrix_world@old.vertices[i].co for i in face.vertices]
        xs=[p.x for p in points];zs=[p.z for p in points]
        selected=(max(xs)-min(xs)<.002 and spec['pos'][0]<min(xs)<spec['pos'][0]+.30
                  and max(zs)>low and min(zs)<high)
        pieces=[(points,face.material_index)]
        if selected:
            middle=clip_face(clip_face(points,2,low,True),2,high,False)
            pieces=[(clip_face(points,2,low,False),face.material_index),
                    (middle,cream),(clip_face(points,2,high,True),face.material_index)]
            if len(middle)>=3:fronts.append(sum(xs)/len(xs))
        for polygon,index in pieces:
            if len(polygon)<3:continue
            faces.append(tuple(range(len(vertices),len(vertices)+len(polygon))))
            vertices.extend(polygon);indices.append(index)
    if not fronts:raise RuntimeError('missing native lower fore frontage')
    mesh=bpy.data.meshes.new(old.name+'_foreCreamFront');mesh.from_pydata(vertices,[],faces);mesh.update()
    for mat in old.materials:mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,indices):face.material_index=index
    assign_world_mesh(obj,mesh)
    interiors.setdefault('foreFacade',{})['lowerFront']=dict(x=max(fronts),low=low,high=high,
        reference='R09 cream lower transverse frontage; retained native geometry and hull paint outside the storey')


def fore_entry_surrounds(interiors):
    """R09's three striped arch bands, embedded in their actual wall front."""
    from sunny_aft_envelope import closed_wall_bvh
    bpy.context.view_layer.update()
    records=[]
    for spec in interiors['doors']:
        if spec['id'] not in ('ForeDoor','ForeDoorStarboard','WomensDoor'):continue
        # Measure the real room shell beside both jambs; a nominal doorway
        # centre is not its outer skin, and the gallery rail is not support.
        level='ForeF2_shell' if spec['id']=='WomensDoor' else 'ForeF1_shell'
        shell=next(o for o in bpy.data.objects if o.name.startswith('Sunny_'+level))
        surface=closed_wall_bvh(shell)
        height=spec['height']+.06;width=spec['width']+.05;band=height*.18
        hits=[]
        for side in (-1,1):
            p=Vector((spec['pos'][0]+1,spec['pos'][1]+side*(width/2+band/2),spec['pos'][2]+height*.35))
            hit=surface.ray_cast(p,Vector((-1,0,0)),2)[0]
            if hit is None:raise RuntimeError(spec['id']+' surround needs actual jamb-side wall support')
            hits.append(hit.x)
        if max(hits)-min(hits)>.015:raise RuntimeError('fore band requires a fitted curved back at this station')
        front=max(hits)
        if spec['id']!='WomensDoor' and 'lowerFront' in interiors.get('foreFacade',{}):
            front=max(front,interiors['foreFacade']['lowerFront']['x'])
        entrance_surround(dict(x=front,centre=spec['pos'][1],floor=spec['pos'][2],
                              doorHeight=height,doorWidth=width,band=band,
                              outward=1,prefix='ForeFacade'+spec['id']))
        records.append(dict(id=spec['id'],x=front,embedding=.02))
    interiors.setdefault('foreFacade',{})['surrounds']=records


def fore_upper_entry_depth(interiors):
    """Join the upper entry to the real timber cap behind the new front skin.

    The retained hull has a flat inward-facing cap behind this doorway. The
    original shallow common cut did not reach it. Keep every surface outside
    the measured entry profile and close the connecting jamb/header reveal.
    Hidden depth is reconstruction fitted to actual construction, not canon.
    """
    from sunny_aft_envelope import closed_wall_bvh,arch_outline
    from sunny_accuracy import cut_prism
    bpy.context.view_layer.update()
    spec=next(d for d in interiors['doors']if d['id']=='WomensDoor')
    hull=bpy.data.objects['Line002'];surface=closed_wall_bvh(hull)
    hits=[]
    for across in (-.30,0,.30):
        p=Vector((spec['pos'][0]-.9,spec['pos'][1]+across,spec['pos'][2]+1.45))
        hit,normal,_index,_distance=surface.ray_cast(p,Vector((-1,0,0)),3)
        if hit is None or abs(normal.x)<.99:raise RuntimeError('upper entry needs its actual flat timber cap')
        hits.append(hit.x)
    if max(hits)-min(hits)>.01:raise RuntimeError('upper entry cap is not the measured transverse plane')
    back=min(hits)
    front=next(v['x']for v in interiors['foreFacade']['surrounds']if v['id']=='WomensDoor')
    if not .2<front-back<2.5:raise RuntimeError('unexpected upper fore entry depth')
    radius=(spec['width']+.10)/2
    base=spec['pos'][2]-.15;spring=spec['height']+.27-radius
    inner=arch_outline(radius,spring,sections=32)
    planes=[(Vector((1,0,0)),back-.08),(Vector((-1,0,0)),-front-.08)]
    for a,b in zip(inner,inner[1:]+inner[:1]):
        point=Vector((0,spec['pos'][1]+a[0],base+a[1]))
        edge=Vector((0,b[0]-a[0],b[1]-a[1]))
        inward=Vector((0,-edge.z,edge.y)).normalized()
        planes.append((inward,inward.dot(point)))
    cut_prism(hull,planes)
    thickness=.12
    outer=arch_outline(radius+thickness,spring,sections=32)
    outer[0]=(outer[0][0],-thickness);outer[1]=(outer[1][0],-thickness)
    n=len(inner)
    vertices=[(x,spec['pos'][1]+y,base+z)
              for x in (back-.025,front+.025)for outline in (inner,outer)for y,z in outline]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend(((i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)))
    tunnel=finish(_mesh('ForeEntryTunnel_WomensDoor',vertices,faces),
                  'ForeEntryTunnel_WomensDoor','timber',obstacle=True)
    tunnel['sunny_rail']=True;tunnel['sunny_aperture_shell']=True
    interiors['foreFacade']['entryPassage']=dict(id='WomensDoor',front=front,back=back,
        radius=radius,spring=spring,base=base,thickness=thickness,
        reference='R09 entry connection; measured native timber cap and reconstructed closed reveal')
    return tunnel
