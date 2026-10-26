"""Remaining SBS room fittings around preserved human walking connections."""
import math
import bpy
from mathutils import Vector
from sunny_exterior import material, pole, ring, sphere, text
from sunny_interiors import L, rbox, rpole, wall_run, door, toilet, DOORS


def aquarium_drapery(floor, cy):
    """Supported side curtains and a scalloped valance on the real tank rail."""
    from sunny_room_accuracy import cloth_panel
    centre=(15.0,cy,floor)
    for side in (-1,1):
        p=(15.0,cy+side*8.96,floor+.13)
        cloth_panel('Aquarium_curtain',p,math.pi/2,.78,3.23,8,'cloth_aqua')
        for dx in (-.31,.31):
            pole('Aquarium_curtain_support',(15.0,cy+side*8.96+dx,floor+3.39),
                 (15.0,cy+side*8.96+dx,floor+3.44),.012,'brass')
    # Eight real cloth swags follow the inner tank's measured elliptical arc.
    for i in range(8):
        a=-math.pi/2+i*math.pi/8;b=a+math.pi/8
        pa=Vector((15+5*math.cos(a),cy+9*math.sin(a),floor+3.42))
        pb=Vector((15+5*math.cos(b),cy+9*math.sin(b),floor+3.42))
        points=[]
        count=32
        for row in (0,1):
            for j in range(count+1):
                t=j/count;q=pa.lerp(pb,t)
                q.z-=.06 if row==0 else .11+.30*math.sin(t*math.pi)
                q.x-=.014*math.sin(t*math.tau*5)
                points.append(q)
        n=count+1;faces=[(j,j+1,n+j+1,n+j) for j in range(count)]
        mesh=bpy.data.meshes.new('Aquarium_valance');mesh.from_pydata(points,[],faces)
        mesh.materials.append(material('cloth_aqua'));mesh.update()
        obj=bpy.data.objects.new('Sunny_Aquarium_valance',mesh);bpy.context.scene.collection.objects.link(obj)
        obj['sunny_authored']=True;obj['sunny_fabric']=True;obj['sunny_obstacle']=False
        pole('Aquarium_valance_rail',pa,pb,.012,'brass')


def bath_wc(cx, cy, floor, interiors):
    """Separate accessible WC beyond the preserved bath-stair headroom slot."""
    # The walking-stair adaptation consumes y=2.25..3.55 of the entrance floor.
    # This compact chamber starts beyond that real opening, not over the shaft.
    y=cy+3.64
    wall_run('RoomPartition_bathwc_front',(cx,y,floor),0,1.90,2.55,
             openings=((-0.30,1.10,2.30),),key='timber')
    for side in (-1,1):
        wall_run('RoomPartition_bathwc_side',(cx+side*.95,cy+4.145,floor),math.pi/2,1.01,2.55,key='timber')
    wall_run('RoomPartition_bathwc_back',(cx,cy+4.65,floor),0,1.90,2.55,key='timber')
    spec=door('BathWCDoor',(cx-.30,y,floor),0,1.10,2.30,'slide',1,
              rooms=('Bath Washroom','Bath Toilet'),key='timber',arched=True)
    corners=rbox('RoomPartition_bathwc_arch',(cx-.30,y,floor),0,(1.10,.12,2.30),'timber',(0,0,1.15))
    from sunny_aft_envelope import closed_door_arch_cut
    closed_door_arch_cut(corners,spec)
    corners['sunny_rail']=True
    # Replace the provisional toilet intersecting the main bath partition.
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Sunny_Bath_wash_toilet'):
            bpy.data.objects.remove(obj,do_unlink=True)
    toilet('Bath_wash_toilet',(cx+.28,cy+4.25,floor),-math.pi/2)
    rbox('Bath_wc_books',(cx+.60,cy+4.43,floor),0,(.21,.16,.045),'blue',(0,0,1.0),obstacle=False)
    rbox('Bath_wc_book2',(cx+.60,cy+4.43,floor),.08,(.22,.16,.04),'red',(0,0,1.045),obstacle=False)
    text('Bath_wc_sign','WC',(cx-.30,y-.09,floor+1.94),.11,'brass',(math.pi/2,0,0))
    interiors['rooms'].append(dict(level='F3B',name='Bath Toilet',x=(cx-.95,cx+.95),y=(cy+3.50,cy+4.80)))


def workshop_metals(cy):
    """Franky's supplied metal lining, retaining the timber Usopp-facing wall."""
    bpy.context.view_layer.update()
    for obj in bpy.data.objects:
        if obj.type!='MESH':continue
        if obj.name.startswith('Sunny_InteriorWall_B1_'):
            points=[obj.matrix_world@v.co for v in obj.data.vertices]
            x=sum(p.x for p in points)/len(points);y=sum(p.y for p in points)/len(points)
            if 8.5<x<20.2 and y>cy:
                obj.data.materials.clear();obj.data.materials.append(material('steel'))
                for face in obj.data.polygons:face.material_index=0
        elif obj.name.startswith('Sunny_RoomPartition_workshops'):
            index=len(obj.data.materials);obj.data.materials.append(material('steel'))
            normals=obj.matrix_world.to_3x3().inverted().transposed()
            for face in obj.data.polygons:
                if (normals@face.normal).y>.9:face.material_index=index


def lumber_storage(rooms, floor):
    """Forward storage's supported timber stock at a clear existing station."""
    x=rooms['Storage Room']['x'][0]+4.8;y=3.3
    for dx in (-1.05,1.05):
        rbox('Store_lumber_cradle',(x+dx,y,floor),0,(.18,1.2,.24),'darkwood',(0,0,.12))
    for row in range(3):
        for col in range(5-row):
            rbox('Store_lumber',(x,y,floor),0,(2.6,.19,.11),'timber',(0,-.42+col*.21,row*.12+.30))


def complete_reference_details(frame, interiors):
    """Finish source-supported auxiliary spaces before room visual validation."""
    cy=frame.y(.585);levels=interiors['levels']
    rooms={r['name']:r for r in interiors['rooms']}
    cx=(rooms['Library']['x'][0]+rooms['Library']['x'][1])/2
    aquarium_drapery(levels['F1'],cy)
    bath_wc(cx,cy,levels['F3B'],interiors)
    workshop_metals(cy)
    lumber_storage(rooms,levels['B1'])
    interiors['doors']=list(DOORS)
