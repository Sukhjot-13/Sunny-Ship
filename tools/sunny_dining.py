"""R10 Dining furnishings in the preserved open galley enclosure."""
import math

from sunny_exterior import PALETTE, _mesh, finish, material, pole, ring, sphere
from sunny_interiors import L, rbox, rpole
from sunny_library import upholstered_chair


PALETTE.update({
    'upholstery_dining_ochre':'#b8964a','upholstery_dining_emerald':'#2e6555',
    'cloth_dining':'#9eb8a0','dining_walnut':'#67422e','dining_oak':'#a67447',
    'dining_floor_oak':'#a5825f',
})


def table_linen(centre,length,width):
    corners=((-1,-1),(1,-1),(1,1),(-1,1))
    count=48;stations=[]
    for index,(ax,ay) in enumerate(corners):
        bx,by=corners[(index+1)%4]
        for step in range(count):
            t=step/count
            stations.append(((ax+(bx-ax)*t)*length/2,(ay+(by-ay)*t)*width/2,
                             (-(by-ay)/2,(bx-ax)/2)))
    size=len(stations);vertices=[]
    for level in range(11):
        v=level/10
        for index,(x,y,normal) in enumerate(stations):
            wave=math.sin(index/size*math.tau*33)
            fold=.008+v*(.018+.023*wave)
            vertices.append((centre[0]+x-normal[0]*fold,centre[1]+y-normal[1]*fold,
                             centre[2]+.765-v*(.224+.024*math.cos(index/size*math.tau*33))))
    faces=[tuple(range(size))]
    for row in range(10):
        for index in range(size):
            i=row*size+index;j=row*size+(index+1)%size
            faces.append((i,i+size,j+size,j))
    linen=finish(_mesh('Dining_table_linen',vertices,faces),'Dining_table_linen','cloth_dining')
    linen['sunny_fabric']=True
    return linen


def dining_set(position):
    length,width=4.55,1.82
    rbox('Dining_table_top',position,0,(length,width,.070),'dining_oak',(0,0,.725))
    for dx in (-length/2+.24,length/2-.24):
        for dy in (-width/2+.19,width/2-.19):
            for bottom,top,radius,radius2 in ((0,.11,.068,.087),(.11,.17,.087,.065),(.17,.56,.065,.077),(.56,.69,.077,.072)):
                pole('Dining_table_leg',L(position,0,dx,dy,bottom),L(position,0,dx,dy,top),radius,'dining_walnut',radius2=radius2,sides=16)
    table_linen(position,length,width)
    for index,(dx,dy,rotation) in enumerate([(x,side*1.38,0 if side<0 else math.pi) for side in (-1,1) for x in (-1.50,0,1.50)]+
                                                    [(-2.76,0,-math.pi/2),(2.76,0,math.pi/2)]):
        upholstered_chair('Dining_seat%d'%index,L(position,0,dx,dy,0),rotation,'upholstery_dining_ochre')
    return {'centre':list(position),'topHeight':.76,'chairs':8}


def wall_sofa(cx,cy,floor):
    from sunny_room_accuracy import soft_box
    position=(cx,cy-9.73,floor)
    wood='dining_walnut';cloth='upholstery_dining_emerald'
    soft_box('Dining_wall_sofa_plinth',position,0,(5.08,.74,.38),wood,(0,0,.226),radius=.065)
    soft_box('Dining_wall_sofa_back',position,0,(4.78,.19,.60),cloth,(0,-.29,.73),radius=.075)
    for side in (-1,1):
        soft_box('Dining_wall_sofa_arm',position,0,(.24,.71,.47),cloth,(side*2.44,0,.57),radius=.095)
    for index in range(7):
        x=(index-3)*.675
        soft_box('Dining_wall_sofa_seat',position,0,(.651,.606,.19),cloth,(x,.047,.479),radius=.077)
        back=soft_box('Dining_wall_sofa_backpad',position,0,(.651,.147,.467),cloth,(x,-.207,.744),radius=.064)
        back.rotation_euler.x=.14


def ship_phone(position):
    """Table-mounted snail phone and cradle in the aft corner of Dining."""
    from sunny_room_accuracy import soft_box
    soft_box('Dining_phone_table',position,0,(.62,.58,.055),'dining_oak',(0,0,.755),radius=.022)
    for x in (-.24,.24):
        for y in (-.22,.22):
            rpole('Dining_phone_table_leg',position,0,(x*1.13,y*1.13,.006),(x,y,.73),.032,'dining_walnut',sides=12)
    soft_box('Dining_phone_cradle',position,0,(.34,.24,.063),'dining_walnut',(0,0,.836),radius=.028,obstacle=False)
    sphere('Dining_phone_body',L(position,0,-.025,.006,.925),(.152,.098,.085),'cream',segments=24,rings=12)
    sphere('Dining_phone_shell',L(position,0,.031,.047,1.015),(.119,.109,.126),'brass',segments=24,rings=12)
    sphere('Dining_phone_head',L(position,0,-.106,-.006,1.019),(.074,.083,.076),'cream',segments=20,rings=12)
    for x in (-.14,-.079):
        rpole('Dining_phone_eye_stalk',position,0,(x,-.025,1.047),(x,-.071,1.112),.011,'cream',sides=10)
        sphere('Dining_phone_eye',L(position,0,x,-.071,1.112),(.019,.019,.024),'white',segments=16,rings=8)
        sphere('Dining_phone_pupil',L(position,0,x,-.088,1.112),(.008,.005,.013),'black',segments=12,rings=6)
    rpole('Dining_phone_handset',position,0,(-.105,-.079,.897),(.103,-.079,.899),.017,'black',sides=12)
    for x in (-.109,.109):
        rpole('Dining_phone_handset_cup',position,0,(x,-.065,.898),(x,-.105,.898),.034,'black',sides=12)


def bulkhead_sconce(position):
    """Lamp mounted to the Dining face of the existing service bulkhead."""
    x,y,z=position
    pole('Dining_sconce_plate',(x-.025,y,z),(x+.012,y,z),.075,'brass',sides=24)
    pole('Dining_sconce_arm',(x,y,z),(x-.17,y,z-.06),.018,'brass',sides=12)
    pole('Dining_sconce_socket',(x-.17,y,z-.07),(x-.17,y,z+.035),.037,'brass',radius2=.066,sides=20)
    sphere('Dining_sconce_globe',(x-.17,y,z+.114),(.069,.069,.098),'lamp_glow',segments=24,rings=14)
    ring('Dining_sconce_collar',(x-.17,y,z+.047),.061,.009,'brass')
    return {'room':'Dining Room','pos':[x-.36,y,z-.10],'colour':'#ffd395','intensity':20,'distance':12}


def dining_details(room,floor,cy):
    from sunny_room_accuracy import remove_family
    for family in ('Dining_table','Dining_chair','Dining_sofa','Dining_dendenmushi'):
        remove_family(family)
    cx=sum(room['x'])/2
    layout=dining_set((cx,cy-5.43,floor))
    wall_sofa(cx,cy,floor)
    ship_phone((room['x'][1]-.91,cy-9.59,floor))
    room['diningLayout']=layout
    return [bulkhead_sconce((room['x'][1]-.10,cy+dy,floor+2.38)) for dy in (-7.15,-10.25)]


def finish_dining_floor(obj, room):
    """Use oiled oak on the existing Dining-side deck surface."""
    obj.data.materials.append(material('dining_floor_oak'))
    slot=len(obj.data.materials)-1
    for face in obj.data.polygons:
        if face.normal.z>.98 and face.center.y<room['y'][1] and face.center.x<room['x'][1]:
            face.material_index=slot
