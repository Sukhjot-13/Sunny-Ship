"""R11 lounge and supplied anime palette inside the retained aft shell."""
import math
import random

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from sunny_exterior import PALETTE, _mesh, assign_world_mesh, clip_face, finish, pole, sphere
from sunny_interiors import _merge, rbox


PALETTE.update({
    'upholstery_aquarium': '#682e48', 'cloth_aquarium': '#294366',
    'aquarium_backdrop': '#2e8799', 'aquarium_sand': '#527e80',
    'aquarium_reef': '#346a73', 'aquarium_weed': '#307a71',
    'aquarium_coral': '#935c65', 'aquarium_fish': '#a4d7d5',
    'aquarium_fish_gold': '#e9c682', 'aquarium_fish_blue': '#638cae',
    'tile_aquarium_pale': '#b5b8af', 'tile_aquarium_dark': '#334657',
})


class TankProfile:
    def __init__(self, floor, cy, rear, height):
        self.floor, self.cy, self.height = floor, cy, height
        self.cx, self.rx, self.ry = 15.35, rear-1.00-15.35, 9.10
        self.stations = [(-math.pi/2,-2.15)]+[(math.pi*(i/64-.5),0) for i in range(65)]+[(math.pi/2,-2.15)]

    def point(self, station, offset=0, height=0):
        angle, extension = station
        return (self.cx+extension+(self.rx+offset)*math.cos(angle),
                self.cy+(self.ry+offset)*math.sin(angle), self.floor+height)

    def strip(self, name, stations, cross_section, key, obstacle=False, role=None, closed=True):
        columns = len(cross_section)
        vertices = [self.point(station, offset, height) for station in stations for offset,height in cross_section]
        faces = []
        for index in range(len(stations)-1):
            for column in range(columns if closed else columns-1):
                following = (column+1)%columns
                faces.append((index*columns+column,(index+1)*columns+column,
                              (index+1)*columns+following,index*columns+following))
        if closed:
            faces.extend((tuple(reversed(range(columns))),tuple(range(len(vertices)-columns,len(vertices)))))
        obj = finish(_mesh(name,vertices,faces),name,key,obstacle=obstacle)
        if closed:
            mesh=bmesh.new();mesh.from_mesh(obj.data)
            bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces));mesh.to_mesh(obj.data);mesh.free()
        if obstacle:
            obj['sunny_rail'] = True
        if role:
            obj['sunny_aquarium_surface'] = role
        return obj


def aquarium_shell(profile):
    height, stations = profile.height, profile.stations
    profile.strip('Aquarium_panoramic_glass',stations,[(0,.78),(.048,.78),(.048,height),(0,height)],
                  'glass',True,'glass')
    profile.strip('Aquarium_panoramic_water',stations,[(.056,.89),(.985,.89),(.985,height-.075),(.056,height-.075)],
                  'tankwater',role='volume')
    profile.strip('Aquarium_panoramic_backdrop',stations,[(.994,.86),(.994,height)],
                  'aquarium_backdrop',role='backdrop',closed=False)
    profile.strip('Aquarium_tank_sand',stations,[(.046,.87),(.996,.87),(.996,.905),(.046,.905)],
                  'aquarium_sand',role='sand')
    profile.strip('Aquarium_tank_plinth',stations,[(0,.01),(.998,.01),(.998,.88),(0,.88)],'darkwood',True)
    for name,z,size,key in [('sill',.88,.11,'timber'),('crown',height,.13,'darkwood'),('brass',height-.09,.035,'brass')]:
        profile.strip('Aquarium_tank_'+name,stations,[(-.10,z-size/2),(.08,z-size/2),(.08,z+size/2),(-.10,z+size/2)],key)
    for side, station in enumerate((stations[0],stations[-1])):
        point=profile.point(station,.49,(height+.86)/2)
        end=rbox('Aquarium_tank_end'+str(side),point,0,(.075,1.01,height-.86),'glass',obstacle=True)
        end['sunny_aquarium_surface']='glass'


def aquarium_seating(profile):
    for index,(minimum,maximum) in enumerate(((-1.55,-.40),(.40,1.55))):
        stations=[(minimum+(maximum-minimum)*i/44,0) for i in range(45)]
        stations=([(minimum,-1.84)]+stations) if index==0 else (stations+[(maximum,-1.84)])
        prefix='Aquarium_banquette'+str(index)
        profile.strip(prefix+'_plinth',stations,[(-.88,.025),(-.08,.025),(-.08,.51),(-.88,.51)],'darkwood',True)
        profile.strip(prefix+'_seat',stations,[(-.93,.48),(-.10,.48),(-.10,.66),(-.80,.68),(-.93,.61)],'upholstery_aquarium',True)
        profile.strip(prefix+'_back',stations,[(-.29,.58),(-.08,.58),(-.075,1.25),(-.15,1.32),(-.24,1.28),(-.34,1.12)],'upholstery_aquarium',True)
        profile.strip(prefix+'_piping',stations,[(-.94,.58),(-.93,.57),(-.92,.58),(-.93,.60)],'upholstery_aquarium')
        for stitch in stations[3:-1:3]:
            angle,extension=stitch
            p=profile.point(stitch,-.347,.69);q=profile.point((angle,extension),-.263,1.23)
            pole(prefix+'_seam',p,q,.008,'upholstery_aquarium',sides=5)


def aquarium_drapery(profile):
    height=profile.height
    for panel in range(9):
        start=-math.pi/2+math.pi*panel/9; span=math.pi/9
        steps, folds = 28, 14
        vertices=[]
        for row in range(folds+1):
            v=row/folds
            for column in range(steps+1):
                u=column/steps; sag=math.sin(math.pi*u)**.76
                offset=-.15-.13*sag*math.sin(math.pi*v)-.082*math.cos(v*math.tau*3.5)*sag
                vertices.append(profile.point((start+span*u,0),offset,height-.04-v*(.20+.62*sag)))
        width=steps+1
        faces=[(i,i+1,i+width+1,i+width) for i in range(width*folds) if i%width<steps]
        cloth=finish(_mesh('Aquarium_valance',vertices,faces),'Aquarium_valance','cloth_aquarium')
        cloth['sunny_fabric']=True
    for side,station in enumerate((profile.stations[0],profile.stations[-1])):
        centre=profile.point(station,-.18,0)
        vertices=[];steps=28; rows=38
        for row in range(rows+1):
            v=row/rows; pinch=1-.71*math.exp(-((v-.43)/.105)**2)
            for column in range(steps+1):
                u=column/steps
                vertices.append((centre[0]+(u-.5)*1.22*pinch,
                    centre[1]+.13*math.cos(u*math.tau*5)*pinch,centre[2]+.08+v*(height-.08)))
        width=steps+1
        faces=[(i,i+1,i+width+1,i+width) for i in range(width*rows) if i%width<steps]
        cloth=finish(_mesh('Aquarium_curtain',vertices,faces),'Aquarium_curtain'+str(side),'cloth_aquarium')
        cloth['sunny_fabric']=True
        pole('Aquarium_curtain_tie',(centre[0]-.17,centre[1]-.10,centre[2]+height*.43),
             (centre[0]+.17,centre[1]-.10,centre[2]+height*.43),.042,'brass')


def aquarium_fish_mesh(name, positions, seed):
    rng=random.Random(seed); vertices=[];faces=[];colours=[]
    keys=('aquarium_fish','aquarium_fish_gold','aquarium_fish_blue')
    for index,(point,angle,size) in enumerate(positions):
        forward=Vector((math.cos(angle),math.sin(angle),0)); right=Vector((-forward.y,forward.x,0))
        def emit(local):
            length,width,height=local
            vertices.append(Vector(point)+(forward*length+right*width+Vector((0,0,height)))*size)
        start=len(vertices)
        shapes=((-0.69,.07,.11),(-.42,.21,.31),(.08,.31,.45),(.49,.26,.33),(.72,.07,.12))
        for length,width,height in shapes:
            for radial in range(10):
                turn=radial*math.tau/10
                emit((length,width*math.cos(turn),height*math.sin(turn)))
        key=keys[index%len(keys)]
        faces.extend((tuple(range(start+9,start-1,-1)),tuple(range(start+40,start+50))));colours.extend((key,key))
        for row in range(4):
            for column in range(10):
                first=start+row*10+column;following=start+row*10+(column+1)%10
                faces.append((first,following,following+10,first+10));colours.append(key)
        for fin in [((-.57,0,0),(-1.12,0,.41),(-.97,0,0),(-1.15,0,-.33)),
                    ((-.43,0,.18),(-.20,0,.61),(.30,0,.30)),
                    ((.16,.16,-.12),(-.39,.35,-.35),(-.20,.12,-.22)),
                    ((.16,-.16,-.12),(-.39,-.35,-.35),(-.20,-.12,-.22))]:
            begin=len(vertices)
            for vertex in fin:emit(vertex)
            faces.append(tuple(range(begin,len(vertices))));colours.append(key)
        for sign in (-1,1):
            begin=len(vertices)
            for y,z in ((-.05,-.044),(.045,-.048),(.05,.042),(-.04,.052)):
                emit((.49+y,sign*.272,.095+z))
            faces.append(tuple(range(begin,len(vertices))));colours.append('black')
    fish=_merge('Sunny_'+name,vertices,faces,colours)
    fish['sunny_feature']='Aquarium';fish['sunny_authored']=True
    fish['sunny_aquarium_surface']='fish';fish['sunny_aquarium_swim']=[rng.uniform(0,math.tau),rng.uniform(.38,.74)]
    for face in fish.data.polygons:face.use_smooth=len(face.vertices)==4
    return fish


def aquarium_habitat(profile):
    rng=random.Random(71026)
    for group in range(12):
        angle=-1.49+group*2.98/11
        positions=[]
        for index in range(11):
            a=angle+rng.uniform(-.105,.105)
            point=profile.point((a,0),rng.uniform(.37,.66),rng.uniform(1.43,profile.height-.52))
            tangent=math.atan2(profile.ry*math.cos(a),-profile.rx*math.sin(a))
            size=rng.uniform(.08,.19) if index else rng.uniform(.23,.32)
            positions.append((point,tangent+(math.pi if group%2 else 0),size))
        aquarium_fish_mesh('Aquarium_school'+str(group),positions,group)
    habitat=[]
    for index in range(28):
        angle=-1.57+index*3.14/27
        point=profile.point((angle,0),rng.uniform(.45,.59),1.05)
        size=rng.uniform(.19,.38)
        rock=sphere('Aquarium_reef',point,(size,size*.67,size*.68),'aquarium_reef',segments=9,rings=5)
        habitat.append((rock,'aquarium_reef'))
        for branch in range(4):
            a=rng.uniform(0,math.tau); bend=rng.uniform(.09,.19)
            base=Vector(point)+Vector((0,0,size*.5))
            elbow=base+Vector((math.cos(a)*bend,math.sin(a)*bend,rng.uniform(.18,.36)))
            tip=elbow+Vector((math.cos(a)*bend*.6,math.sin(a)*bend*.6,rng.uniform(.17,.38)))
            key='aquarium_coral' if index%3==1 else 'aquarium_weed'
            for start,end,radius in ((base,elbow,.036),(elbow,tip,.025),(elbow,tip+Vector((.07,-.10,-.07)),.016)):
                branch_mesh=pole('Aquarium_reef_branch',start,end,radius,key,radius2=radius*.45,sides=5)
                habitat.append((branch_mesh,key))
    bpy.context.view_layer.update()
    vertices=[];faces=[];colours=[]
    for obj,key in habitat:
        first=len(vertices)
        vertices.extend(obj.matrix_world@vertex.co for vertex in obj.data.vertices)
        faces.extend(tuple(first+i for i in face.vertices) for face in obj.data.polygons)
        colours.extend([key]*len(obj.data.polygons))
        bpy.data.objects.remove(obj,do_unlink=True)
    reef=_merge('Sunny_Aquarium_reef_display',vertices,faces,colours)
    reef['sunny_feature']='Aquarium';reef['sunny_authored']=True;reef['sunny_aquarium_surface']='reef'


def aquarium_mast_table(mast, floor, cy):
    from sunny_room_accuracy import soft_box
    centre=(mast[0],cy,floor)
    count=64
    for name,inner,outer,low,high,key in [('deck',1.24,1.77,1.02,1.13,'timber'),('band',1.73,1.78,1.04,1.11,'brass')]:
        vertices=[(centre[0]+radius*math.cos(i*math.tau/count),cy+radius*math.sin(i*math.tau/count),floor+z)
                  for z in (low,high) for radius in (inner,outer) for i in range(count)]
        faces=[]
        for index in range(count):
            following=(index+1)%count
            faces.extend(((index,following,count+following,count+index),(2*count+index,3*count+index,3*count+following,2*count+following),
                          (index,2*count+index,2*count+following,following),(count+index,count+following,3*count+following,3*count+index)))
        table=finish(_mesh('Aquarium_mast_table_'+name,vertices,faces),'Aquarium_mast_table_'+name,key,obstacle=name=='deck')
        table['sunny_rail']=name=='deck'
    for side in (-1,1):
        position=(mast[0]-.22,cy+side*2.82,floor)
        spin=-side*math.pi/2
        soft_box('Aquarium_lounge_chair_seat',position,spin,(.78,.72,.16),'upholstery_aquarium',(0,0,.56),radius=.07)
        soft_box('Aquarium_lounge_chair_back',position,spin,(.20,.76,.75),'upholstery_aquarium',(-.32,0,.86),radius=.08)
        for y in (-.22,.22):
            point=(position[0]+y,position[1],floor)
            pole('Aquarium_lounge_chair_leg',point,(point[0],point[1],floor+.53),.043,'darkwood',sides=8)
    for index in range(3):
        angle=math.pi+(index-1)*.92
        base=(mast[0]+1.27*math.cos(angle),cy+1.27*math.sin(angle),floor+3.52)
        tip=(mast[0]+1.59*math.cos(angle),cy+1.59*math.sin(angle),floor+3.67)
        pole('Aquarium_mast_sconce_arm',base,tip,.048,'brass',sides=12)
        pole('Aquarium_mast_sconce_cup',tip,(tip[0],tip[1],tip[2]+.12),.092,'brass',radius2=.065,sides=12)
        lamp=sphere('Aquarium_mast_sconce_glow',(tip[0],tip[1],tip[2]+.23),(.075,.075,.15),'lamp_glow')
        lamp['sunny_aquarium_surface']='lamp'


def aquarium_wine_racks(floor,cy):
    for side in (-1,1):
        rack=(9.03,cy+side*3.55,floor)
        rbox('Aquarium_wine_panel',rack,0,(.22,1.42,2.18),'darkwood',(0,0,1.09))
        for z in (.24,.79,1.88,2.12):
            rbox('Aquarium_wine_rail',rack,0,(.37,1.48,.075),'timber',(.10,0,z))
        for y in (-.69,.69):
            rbox('Aquarium_wine_stile',rack,0,(.37,.09,2.08),'timber',(.10,y,1.08))
        for row in range(3):
            for col in range(3):
                y=(col-1)*.38;z=.99+row*.36
                bottle=(rack[0]+.17,rack[1]+y,floor+z)
                pole('Aquarium_wine_bottle',(bottle[0]-.12,bottle[1],bottle[2]),
                     (bottle[0]+.14,bottle[1],bottle[2]),.079,('leaf','red','darkwood')[(row+col)%3],sides=12)
                pole('Aquarium_wine_cork',(bottle[0]+.13,bottle[1],bottle[2]),
                     (bottle[0]+.22,bottle[1],bottle[2]),.035,'cream',sides=10)
                for across in (-1,1):
                    pole('Aquarium_wine_lattice',(rack[0]+.26,bottle[1]-.18,bottle[2]+across*.18),
                         (rack[0]+.26,bottle[1]+.18,bottle[2]-across*.18),.014,'timber',sides=6)


def aquarium_passage_tank(left,right,cy,floor,ceiling):
    x=(left+right)/2; width=right-left; span=16.0
    bottom,top=floor+2.71,ceiling-.13
    height=top-bottom
    for side in (-1,1):
        for z in (bottom,top):
            pole('Aquarium_passage_beam',(x+side*width/2,cy-span/2,z),(x+side*width/2,cy+span/2,z),.059,'darkwood')
    for index in range(5):
        y=cy+(index/4-.5)*span
        pole('Aquarium_passage_brace',(left,y,bottom),(right,y,bottom),.033,'brass')
    for side in (-1,1):
        glass=rbox('Aquarium_passage_ceiling_glass',(x,cy+side*span/2,(bottom+top)/2),0,(width,.038,height),'glass',obstacle=False)
        glass['sunny_aquarium_surface']='glass'
        glass=rbox('Aquarium_passage_ceiling_glass',(x+side*width/2,cy,(bottom+top)/2),0,(.038,span,height),'glass',obstacle=False)
        glass['sunny_aquarium_surface']='glass'
    panel=rbox('Aquarium_passage_underwater_glass',(x,cy,bottom),0,(width,span,.049),'glass',obstacle=False)
    panel['sunny_aquarium_surface']='glass'
    canopy=rbox('Aquarium_passage_lit_surface',(x,cy,top-.01),0,(width,span,.035),'aquarium_backdrop',obstacle=False)
    canopy['sunny_aquarium_surface']='canopy'
    water=rbox('Aquarium_passage_ceiling_water',(x,cy,(bottom+top)/2),0,(width-.13,span-.13,height-.15),'tankwater',obstacle=False)
    water['sunny_aquarium_surface']='volume'
    rng=random.Random(190)
    for batch in range(4):
        positions=[((x+rng.uniform(-.34,.34),cy+(batch-1.5)*3.4+rng.uniform(-1.3,1.3),
                     bottom+rng.uniform(.42,1.16)),math.pi/2*(1 if batch%2 else -1),rng.uniform(.13,.25))
                   for index in range(14)]
        aquarium_fish_mesh('Aquarium_passage_school'+str(batch),positions,batch+20)


def build_aquarium_lounge(floor, ceiling, cy, rear, mast, stair_edge):
    profile=TankProfile(floor,cy,stair_edge-.12,ceiling-floor-.14)
    aquarium_shell(profile)
    aquarium_seating(profile)
    aquarium_drapery(profile)
    aquarium_habitat(profile)
    aquarium_mast_table(mast,floor,cy)
    aquarium_wine_racks(floor,cy)
    aquarium_passage_tank(rear,rear+1.60,cy,floor,ceiling)
    return {'centre':[mast[0],cy,floor], 'backGlassX':profile.cx+profile.rx,
            'tankOuterX':profile.cx+profile.rx+1.00,'viewHeight':profile.height, 'waterDepth':profile.height-.965}


def open_aquarium_entrance(hull, door, floor, ceiling):
    points=[hull.matrix_world@vertex.co for vertex in hull.data.vertices]
    surface=BVHTree.FromPolygons(points,[tuple(face.vertices) for face in hull.data.polygons])
    x,cy,_=door
    start=Vector((x+.68,cy,floor+1.55))
    hit,_,_,_=surface.ray_cast(start,Vector((1,0,0)),1.2)
    if hit is None:
        raise RuntimeError('Expected measured inner Aquarium bulkhead behind its door')
    limits=((hit.x-.10,hit.x+.10),(cy-2.65,cy+2.65),(floor-.04,ceiling-.08))
    vertices=[];faces=[];materials=[];smooth=[]
    for face in hull.data.polygons:
        polygon=[points[index] for index in face.vertices]
        if any(max(point[axis] for point in polygon)<low or min(point[axis] for point in polygon)>high
               for axis,(low,high) in enumerate(limits)):
            pieces=[polygon]
        else:
            pieces=[]
            for axis,(low,high) in enumerate(limits):
                for edge,above in ((low,True),(high,False)):
                    piece=clip_face(polygon,axis,edge,not above)
                    if len(piece)>=3:pieces.append(piece)
                    polygon=clip_face(polygon,axis,edge,above)
                    if len(polygon)<3:break
                if len(polygon)<3:break
        for piece in pieces:
            first=len(vertices);vertices.extend(piece);faces.append(tuple(range(first,len(vertices))))
            materials.append(face.material_index);smooth.append(face.use_smooth)
    mesh=bpy.data.meshes.new(hull.data.name+'_Aquarium_entry')
    mesh.from_pydata(vertices,[],faces)
    for material in hull.data.materials:mesh.materials.append(material)
    mesh.update()
    for face,index,shade in zip(mesh.polygons,materials,smooth):
        face.material_index=index;face.use_smooth=shade
    assign_world_mesh(hull,mesh)
    return [[low,high] for low,high in limits]
