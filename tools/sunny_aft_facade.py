"""R13's central entrance and paired lobed upper aft facade ornaments.

The drawing establishes topology and relative size. Ratios below are disclosed
reconstruction choices, not metre dimensions printed in the supplied reference.
"""
import math
import bpy
from mathutils import Vector
from sunny_exterior import _mesh, finish, box, pole, ring, assign_world_mesh


def facade_layout(levels, centre):
    """Fit the visible entrance and two tall motifs to their actual storey."""
    storey=levels['F3G']-levels['F2A']
    height=storey*.66
    return dict(x=12.3,centre=centre,floor=levels['F2A'],storey=storey,
                doorHeight=height,doorWidth=height*.60,band=height*.18,
                ornaments=[centre-7.1,centre+7.1],
                ornamentBottom=storey*.055,ornamentHeight=storey*.73,
                ornamentRadius=storey*.105,lobeRadius=storey*.075,
                lobeHeight=storey*.43,
                reference='R13 pp196–197: one central arched entrance, paired tall lobed motifs; ratios reconstructed')


def ornament_outline(radius, height, lobe_radius, lobe_height, steps=24):
    """One arched main aperture with an outward circular lobe on each jamb."""
    spring=height-radius
    if not lobe_radius<lobe_height<spring-lobe_radius:
        raise ValueError('lobes must sit on the straight jambs')
    points=[(-radius,0),(radius,0),(radius,lobe_height-lobe_radius)]
    points += [(radius+lobe_radius*math.cos(-math.pi/2+i*math.pi/steps),
                lobe_height+lobe_radius*math.sin(-math.pi/2+i*math.pi/steps))
               for i in range(1,steps+1)]
    points.append((radius,spring))
    points += [(radius*math.cos(i*math.pi/steps),spring+radius*math.sin(i*math.pi/steps))
               for i in range(1,steps+1)]
    points.append((-radius,lobe_height+lobe_radius))
    points += [(-radius+lobe_radius*math.cos(math.pi/2+i*math.pi/steps),
                lobe_height+lobe_radius*math.sin(math.pi/2+i*math.pi/steps))
               for i in range(1,steps+1)]
    return points


def entrance_surround(layout):
    """Build R13's broad alternating arch blocks around the one clear entry."""
    x,y,z=layout['x'],layout['centre'],layout['floor']
    width,height,band=layout['doorWidth'],layout['doorHeight'],layout['band']
    radius=width/2+.10;spring=height-width/2
    # Fixed jamb blocks and a closed segmented annulus remain outside the
    # opening; their individual surface colliders cannot fill the arch centre.
    for side in (-1,1):
        for i in range(4):
            block=box('AftFacade_jamb', (x-.09,y+side*(radius+band/2),z+spring*(i+.5)/4),
                      (.22,band,spring/4-.015),'cream' if i%2 else 'darkwood',obstacle=True)
            block['sunny_rail']=True
    steps=12
    for i in range(steps):
        a,b=i*math.pi/steps,(i+1)*math.pi/steps
        vertices=[(x+depth,y+r*math.cos(t),z+spring+r*math.sin(t))
                  for depth in (-.20,.02) for r,t in ((radius,a),(radius,b),(radius+band,b),(radius+band,a))]
        faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        ob=finish(_mesh('AftFacade_archBlock',vertices,faces),'AftFacade_archBlock',
                  'cream' if i%2 else 'darkwood',obstacle=True)
        ob['sunny_rail']=True
        for face in ob.data.polygons:face.use_smooth=False


def add_front_ornaments(objects, interiors, layout):
    """Cut real lobed apertures through the closed front and fit their glazing."""
    from sunny_aft_envelope import closed_wall_bvh,arch_prism,closed_boolean_cut
    bpy.context.view_layer.update()
    wall=next(o for o in objects if o.get('sunny_aft_native_envelope'))
    records=[]
    for i,y in enumerate(layout['ornaments']):
        name='AftFrontOrnament'+str(i)
        centre=Vector((layout['x'],y,layout['floor']+layout['ornamentBottom']))
        normal=Vector((-1,0,0));lateral=Vector((0,-1,0))
        outline=ornament_outline(layout['ornamentRadius'],layout['ornamentHeight'],
                                 layout['lobeRadius'],layout['lobeHeight'])
        surface=closed_wall_bvh(wall)
        outer=[];inner=[]
        for horizontal,vertical in outline:
            p=centre+lateral*horizontal+Vector((0,0,vertical))
            a=surface.ray_cast(p+normal*2,-normal,4)[0]
            b=surface.ray_cast(p-normal*2,normal,4)[0]
            if a is None or b is None or not .12<(a-b).dot(normal)<.65:
                raise RuntimeError(name+' needs both actual supporting wall skins')
            outer.append(a);inner.append(b)
        front=sum((p-centre).dot(normal) for p in outer)/len(outer)
        back=sum((p-centre).dot(normal) for p in inner)/len(inner)
        cutter=arch_prism(name+'_cutter',outline,
                          centre+normal*((front+back)/2),normal,lateral,front-back+.10)
        # Boolean reveal faces use the wall's matching cream slot, rather
        # than inheriting the native curved side skin's red material at index0.
        for mat in wall.data.materials:cutter.data.materials.append(mat)
        cream=next(j for j,mat in enumerate(wall.data.materials)if mat.name=='Sunny_cream')
        for face in cutter.data.polygons:face.material_index=cream
        closed_boolean_cut(wall,cutter)
        glass=arch_prism(name+'_glass',outline,centre+normal*(front-.035),normal,lateral,.035)
        finish(glass,name+'_glass','glass',obstacle=True)
        glass['sunny_aft_front_ornament']=True
        glass['sunny_aft_front_outline']=outline
        glass['sunny_aft_front_position']=tuple(centre)
        for a,b in zip(outer,outer[1:]+outer[:1]):
            pole(name+'_frame',a+normal*.015,b+normal*.015,.055,'cream')
        for side in (-1,1):
            p=centre+lateral*(side*layout['ornamentRadius'])+Vector((0,0,layout['lobeHeight']))+normal*(front+.02)
            ring(name+'_roundel',p,layout['lobeRadius'],.045,'gold','X',48,8)
        pole(name+'_divider',centre+normal*(front+.025),
             centre+normal*(front+.025)+Vector((0,0,layout['ornamentHeight'])),.025,'darkwood')
        records.append(dict(id=name,position=tuple(centre),outline=outline,
                            reference=layout['reference']))
    entrance_surround(layout)
    interiors['aftFacade']=dict(layout,entrance='AftEntrance',ornaments=records)
    return records


def cut_front_circle(obj, x, y, z, radius, half_depth=.8, steps=48):
    """Remove a finite circular volume from retained open or closed wall faces.

    Preserve every face outside the finite bore, with its original material.
    The fitted annular sleeve in add_front_ports owns the aperture reveal.
    """
    planes=[(Vector((1,0,0)),x-half_depth),(Vector((-1,0,0)),-x-half_depth)]
    for i in range(steps):
        angle=(i+.5)*math.tau/steps
        normal=Vector((0,-math.cos(angle),-math.sin(angle)))
        planes.append((normal,-y*math.cos(angle)-z*math.sin(angle)-radius*math.cos(math.pi/steps)))
    def clip(points, normal, edge, inside):
        result=[]
        for a,b in zip(points,points[1:]+points[:1]):
            da,db=normal.dot(a)-edge,normal.dot(b)-edge
            ia=da>=0 if inside else da<=0;ib=db>=0 if inside else db<=0
            if ia:result.append(a)
            if ia!=ib:result.append(a.lerp(b,da/(da-db)))
        return result
    vertices=[];faces=[];materials=[];changed=False
    for face in obj.data.polygons:
        points=[obj.matrix_world@obj.data.vertices[i].co for i in face.vertices]
        bounds=[(min(p[k]for p in points),max(p[k]for p in points))for k in range(3)]
        outside=[]
        if any(hi<lo_cut or low>hi_cut for (low,hi),(lo_cut,hi_cut)in
               zip(bounds,((x-half_depth,x+half_depth),(y-radius,y+radius),(z-radius,z+radius)))):
            outside=[points]
        else:
            remaining=points
            for normal,edge in planes:
                part=clip(remaining,normal,edge,False)
                if len(part)>=3:outside.append(part)
                remaining=clip(remaining,normal,edge,True)
                if len(remaining)<3:break
            if len(remaining)>=3:changed=True
        for polygon in outside:
            faces.append(tuple(range(len(vertices),len(vertices)+len(polygon))))
            vertices.extend(polygon);materials.append(face.material_index)
    if not changed:return False
    old=obj.data;mesh=bpy.data.meshes.new(old.name+'_roundFrontPort')
    mesh.from_pydata(vertices,[],faces);mesh.update()
    for mat in old.materials:mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,materials):face.material_index=index
    assign_world_mesh(obj,mesh)
    return True


def add_front_ports(objects, interiors, layout):
    """R13 lower front: four round ports, each with true cut, sleeve and glass."""
    from sunny_aft_envelope import closed_wall_bvh
    bpy.context.view_layer.update()
    lower=interiors['levels']['F1'];story=interiors['levels']['F2A']-lower
    x=8.65;radius=story*.14;z=lower+story*.58
    targets=[o for o in bpy.data.objects if o.type=='MESH' and
             (o.name.startswith(('Sunny_RoomPartition_aqua_fwd','Sunny_Aquarium_shell')) or
              o.name in ('Tube008.001','对象001','对象002','Line002'))]
    records=[]
    for i,offset in enumerate((-8.,-3.2,3.2,8.)):
        y=layout['centre']+offset;name='AquariumFrontPort'+str(i)
        hits=[]
        for obj in targets:
            surface=closed_wall_bvh(obj)
            for side in (-1,1):
                point=surface.ray_cast(Vector((x+side*.8,y,z)),Vector((-side,0,0)),1.6)[0]
                if point is not None:hits.append(point.x)
        if len(hits)<2:raise RuntimeError(name+' needs actual outside/inside supporting walls')
        front,back=min(hits),max(hits)
        if not .10<back-front<1.60:raise RuntimeError(name+' unsupported reveal depth')
        for obj in targets:cut_front_circle(obj,x,y,z,radius)
        count=48
        vertices=[(depth,y+r*math.cos(k*math.tau/count),z+r*math.sin(k*math.tau/count))
                  for depth in (front-.025,back+.025) for r in (radius,radius+.055)for k in range(count)]
        faces=[]
        for k in range(count):
            q=(k+1)%count
            faces.extend(((k,q,count+q,count+k),(2*count+k,3*count+k,3*count+q,2*count+q),
                          (k,2*count+k,2*count+q,q),(count+k,count+q,3*count+q,3*count+k)))
        sleeve=finish(_mesh(name+'_reveal',vertices,faces),name+'_reveal','cream',obstacle=True)
        sleeve['sunny_rail']=True
        glass=pole(name+'_glass',(front+.02,y,z),(front+.055,y,z),radius-.006,'glass',sides=48)
        glass['sunny_window_round_front']=True
        glass['sunny_obstacle']=True
        ring(name+'_rim',(front-.03,y,z),radius,.055,'cream','X',48,8)
        records.append(dict(id=name,position=[x,y,z],radius=radius,front=front,back=back))
    lower_layout=dict(layout,x=x,floor=lower,doorHeight=story*.72,doorWidth=story*.72*.60,band=story*.72*.18)
    entrance_surround(lower_layout)
    interiors['aftFacade']['lowerPorts']=records
    return records
