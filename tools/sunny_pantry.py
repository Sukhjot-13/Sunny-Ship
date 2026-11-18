"""Dry raw-produce stores beside the unblocked R10 Pantry doors."""
import math
from random import Random

from sunny_exterior import PALETTE, _mesh, finish, pole, ring, sphere
from sunny_interiors import L, crate, rbox


PALETTE.update({
    'pantry_oak':'#ad7850', 'pantry_endgrain':'#654a34',
    'cloth_pantry_hessian':'#b29c75', 'cloth_pantry_hemp':'#9e7955',
    'pantry_potato':'#9d7d4d', 'pantry_onion':'#b78a62',
    'pantry_ceramic':'#c8b38b',
})


def dry_sack(name,position,radius,height,seed,key,obstacle):
    """Closed gathered hessian with individually folded shoulders."""
    random=Random(seed);vertices=[];faces=[]
    count=36;phases=[random.random()*math.tau for _ in range(3)]
    profile=((.77,0),(.92,.085),(1,.27),(.94,.55),(.81,.78),(.51,.91),(.22,.957),(.20,1))
    for row,(width,rise) in enumerate(profile):
        for i in range(count):
            angle=i/count*math.tau
            wave=.042*math.sin(angle*3+phases[0])+.037*math.sin(angle*7+phases[1])
            fold=.066*(rise**3)*math.sin(angle*12+phases[2])
            w=radius*width*(1+wave+fold)
            vertices.append((position[0]+w*math.cos(angle)+radius*.13*rise,
                             position[1]+w*.81*math.sin(angle),position[2]+height*rise))
    faces.append(tuple(reversed(range(count))))
    for row in range(len(profile)-1):
        for i in range(count):
            a=row*count+i;b=row*count+(i+1)%count
            faces.append((a,b,b+count,a+count))
    faces.append(tuple(range(len(vertices)-count,len(vertices))))
    sack=finish(_mesh(name,vertices,faces),name,key,obstacle=obstacle)
    sack['sunny_fabric']=True
    for face in sack.data.polygons:face.use_smooth=len(face.vertices)==4
    tie=(position[0]+radius*.126,position[1],position[2]+height*.967)
    for offset in (-.007,.004,.014):
        ring(name+'_tie',(tie[0],tie[1],tie[2]+offset),radius*.175,.006,'rope')
    return sack


def stock_rack(name,p,rotation,width):
    depth=.53;levels=(.24,.83,1.43,2.02)
    for x in (-width/2+.047,width/2-.047):
        for y in (-depth/2+.045,depth/2-.045):
            rbox(name+'_leg',p,rotation,(.093,.095,2.18),'pantry_endgrain',(x,y,1.09))
    for z in levels:
        rbox(name+'_shelf',p,rotation,(width,depth,.062),'pantry_oak',(0,0,z))
        rbox(name+'_lip',p,rotation,(width,.047,.078),'pantry_endgrain',(0,-.252,z+.034),obstacle=False)
        rbox(name+'_back',p,rotation,(width,.058,.17),'pantry_endgrain',(0,.239,z+.11),obstacle=False)
    random=Random(round(p[1]*100))
    for i in range(4):
        x=(i-1.5)*width*.20
        low=L(p,rotation,x,0,.271)
        dry_sack(name+'_bulk_sack',low,.157,.36,min(i+11,17),
                 ('cloth_pantry_hessian','cloth_pantry_hemp')[i%2],False)
        c=L(p,rotation,x,0,.861)
        rbox(name+'_produce_bin_base',c,rotation,(.36,.36,.038),'pantry_oak',
             (0,0,.019),obstacle=False)
        for side in (-1,1):
            rbox(name+'_produce_bin_side',c,rotation,(.033,.36,.135),'pantry_oak',
                 (side*.162,0,.071),obstacle=False)
            rbox(name+'_produce_bin_end',c,rotation,(.294,.033,.135),'pantry_oak',
                 (0,side*.162,.071),obstacle=False)
        for j in range(9):
            dx=(j%3-1)*.078+random.uniform(-.02,.02)
            dy=(j//3-1)*.078+random.uniform(-.02,.02)
            rx=random.uniform(.039,.052);rz=random.uniform(.028,.038)
            centre=L(c,rotation,dx,dy,.038+rz)
            sphere(name+'_produce',centre,(rx,rx*.81,rz),
                   ('pantry_potato','pantry_onion')[(i+j)%2],segments=12,rings=8)
        c=L(p,rotation,x,.027,1.461)
        for j in (-1,1):
            base=L(c,rotation,.074*j,0,0)
            container=name+'_crock'
            pole(container,base,L(base,rotation,0,0,.179),.063,'pantry_ceramic',sides=18,radius2=.052)
            pole(container+'_lid',L(base,rotation,0,0,.173),L(base,rotation,0,0,.201),.055,'pantry_endgrain',sides=16)
    for i in range(3):
        x=(i-1)*width*.26
        dry_sack(name+'_top_sack',L(p,rotation,x,0,2.051),.157,.232,i+34,
                 'cloth_pantry_hessian',False)


def finish_dry_stores(room,doors,cy,floor):
    from sunny_room_accuracy import remove_family
    for family in ('Pantry_shelf','Pantry_sack','Pantry_crate'):
        remove_family(family)
    door=next(door for door in doors if door['id']=='PantryOutsideDoor')
    # Both shelf banks stop before the outside door and its opening sweep.
    stock_rack('Pantry_forward_rack',(23.71,cy+2.27,floor),-math.pi/2,2.56)
    stock_rack('Pantry_aft_rack',(23.71,cy+8.60,floor),-math.pi/2,2.66)
    for i,(y,radius,height) in enumerate(((8.25,.32,.62),(9.0,.30,.55),(9.69,.283,.53))):
        dry_sack('Pantry_floor_sack',(21.13,cy+y,floor),radius,height,i+50,
                 ('cloth_pantry_hemp','cloth_pantry_hessian')[i%2],True)
    for i,y in enumerate((9.57,10.44)):
        crate('Pantry_raw_crate',(22.23,cy+y,floor),i*.17,.63,'pantry_oak')
    room['pantryLayout']={'doorCorridorY':door['pos'][1],'rackDepth':.53,'racks':2}
    x,y,z=room['x'][0]+.09,cy+3.39,floor+2.26
    pole('Pantry_lamp_mount',(x-.01,y,z),(x+.039,y,z),.084,'brass',sides=20)
    pole('Pantry_lamp_arm',(x+.025,y,z),(x+.19,y,z+.019),.022,'brass',sides=12)
    pole('Pantry_lamp_socket',(x+.19,y,z-.013),(x+.19,y,z+.072),.044,'brass',sides=18)
    sphere('Pantry_lamp_globe',(x+.19,y,z+.151),(.089,.089,.108),'lamp_glow',segments=22,rings=14)
    ring('Pantry_lamp_ring',(x+.19,y,z+.140),.091,.012,'brass')
    return {'room':'Pantry','pos':[x+.30,y,z-.08],'colour':'#ffdfad','intensity':20,'distance':8}
