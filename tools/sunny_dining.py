"""R10 Dining furnishings in the preserved open galley enclosure."""
import math

from sunny_exterior import PALETTE, _mesh, finish, pole
from sunny_interiors import L, rbox
from sunny_library import upholstered_chair


PALETTE.update({
    'upholstery_dining_ochre':'#b8964a','upholstery_dining_emerald':'#2e6555',
    'cloth_dining':'#9eb8a0','dining_walnut':'#785132','dining_oak':'#a67447',
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


def dining_details(room,floor,cy):
    from sunny_room_accuracy import remove_family
    for family in ('Dining_table','Dining_chair','Dining_sofa'):
        remove_family(family)
    cx=sum(room['x'])/2
    layout=dining_set((cx,cy-5.43,floor))
    wall_sofa(cx,cy,floor)
    room['diningLayout']=layout
