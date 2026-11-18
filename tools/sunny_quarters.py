"""Fore cabin fittings kept inside the established entry and storage routes."""
import math

from sunny_exterior import PALETTE, ring, sphere
from sunny_interiors import L, rbox, rpole


PALETTE.update({
    'quarters_oak':'#b28655', 'quarters_walnut':'#6e4832',
    'quarters_locker_enamel':'#91b0a9',
    'cloth_quarters_canvas':'#ded0ac', 'cloth_quarters_berth':'#738669',
    'upholstery_quarters_blue':'#455d83',
    'cloth_womens_coverlet':'#83b2aa', 'cloth_womens_pillow':'#ece0c9',
    'upholstery_womens_rouge':'#853d43','womens_painted_oak':'#b487a2',
    'womens_wardrobe_enamel':'#e5d9bf', 'quarters_porcelain':'#e1dbca',
    'quarters_cannon_iron':'#384044',
})


def berth_textiles(name,p):
    """Cedar edging and fitted fabric on the retained suspended decks."""
    from sunny_room_accuracy import remove_family, soft_box
    remove_family(name+'_mattress')
    remove_family(name+'_blanket')
    for z in (.44,1.42):
        for x in (-.511,.511):
            soft_box(name+'_cedar_side',p,0,(.049,2.02,.148),'quarters_oak',
                     (x,0,z+.057),radius=.012,obstacle=False)
        for y in (-.994,.994):
            soft_box(name+'_cedar_end',p,0,(1.02,.049,.157),'quarters_oak',
                     (0,y,z+.061),radius=.012,obstacle=False)
        soft_box(name+'_mattress',p,0,(.955,1.88,.172),'cloth_quarters_canvas',
                 (0,0,z+.135),radius=.062)
        soft_box(name+'_blanket',p,0,(.935,1.26,.047),'cloth_quarters_berth',
                 (0,-.278,z+.229),radius=.019,obstacle=False)
        soft_box(name+'_pillow',p,0,(.62,.365,.118),'cloth_quarters_canvas',
                 (0,.604,z+.271),radius=.045,obstacle=False)


def locker_faces(p):
    from sunny_room_accuracy import remove_family, repaint_family, soft_box
    name='Quarters_lockers';rot=math.pi/2
    remove_family(name+'_door')
    remove_family(name+'_handle')
    repaint_family(name+'_body','quarters_locker_enamel')
    for door in range(6):
        x=(door-2.5)*2.8/6
        soft_box(name+'_door'+str(door),p,rot,(.439,.044,1.84),'quarters_locker_enamel',
                 (x,-.287,.977),radius=.015,obstacle=False)
        rbox(name+'_card_frame',p,rot,(.21,.015,.066),'brass',(x,-.312,1.72),obstacle=False)
        rbox(name+'_card',p,rot,(.179,.009,.046),'paper',(x,-.323,1.72),obstacle=False)
        for row in range(3):
            rbox(name+'_vent',p,rot,(.22,.009,.013),'darkwood',
                 (x,-.313,.211+row*.049),obstacle=False)
        rpole(name+'_recess_pull',p,rot,(x+.151,-.322,.91),(x+.151,-.322,1.065),
              .014,'steel',sides=12)


def kotatsu_fittings(p):
    from sunny_room_accuracy import remove_family, soft_box
    for family in ('Quarters_kotatsu_sofa','Quarters_kotatsu_table','Quarters_kotatsu_pot'):
        remove_family(family)
    soft_box('Quarters_kotatsu_table',p,0,(1.60,1.55,.074),'quarters_oak',(0,0,.402),radius=.021)
    for side in (-1,1):
        soft_box('Quarters_kotatsu_cushion',p,0,(1.68,.55,.16),'upholstery_quarters_blue',
                 (0,side*1.23,.095),radius=.060,obstacle=False)
        rpole('Quarters_kotatsu_bolster',p,0,(-.774,side*1.43,.21),(.774,side*1.43,.21),
              .13,'upholstery_quarters_blue',sides=24)
        for x in (-.69,.69):
            stitch=ring('Quarters_kotatsu_bolster_piping',L(p,0,x,side*1.43,.21),.129,.005,'cloth_quarters_canvas','X')
            stitch['sunny_fabric']=True


def finish_mens(room,floor,frame):
    berth_offsets=(frame.y(-3.4),frame.y(-1.1),2.50)
    for index,y in enumerate(berth_offsets):
        berth_textiles('Quarters_bunk'+str(index),(room['x'][0]+2.00,y,floor))
    locker_faces((room['x'][0]+.65,frame.y(.585),floor))
    p=((room['x'][0]+room['x'][1])/2-.40,frame.y(1.2),floor)
    kotatsu_fittings(p)
    room['cabinLayout']={'kotatsu':list(p),'bunks':3,'lockers':6}


def oval_vanity_glass(p,rotation,key,name='Womens_vanity_mirror'):
    """A closed oval of fitted mirror glass and a raised brass edge."""
    n=56;vertices=[];faces=[];colours=[]
    for depth,radii in ((.012,(.386,.548)),(-.017,(.402,.568)),(-.039,(.396,.563)),(-.049,(.355,.513))):
        for i in range(n):
            angle=i*math.tau/n
            vertices.append(L(p,rotation,radii[0]*math.cos(angle),depth,radii[1]*math.sin(angle)))
    faces.append(tuple(reversed(range(n))));colours.append('quarters_walnut')
    for row in range(3):
        for i in range(n):
            a=row*n+i;b=row*n+(i+1)%n
            faces.append((a,b,b+n,a+n));colours.append('brass')
    faces.append(tuple(range(3*n,4*n)));colours.append(key)
    from sunny_interiors import _merge
    obj=_merge('Sunny_'+name,vertices,faces,colours)
    obj['sunny_authored']=True
    obj['sunny_feature']=name.split('_',1)[0]
    return obj


def vanity_station(p):
    from sunny_room_accuracy import soft_box
    rotation=math.pi/2;paint='womens_painted_oak'
    soft_box('Womens_vanity_top',p,rotation,(1.32,.525,.069),'quarters_oak',(0,0,.795),radius=.029)
    for x in (-.466,.466):
        soft_box('Womens_vanity_cabinet',p,rotation,(.335,.443,.72),paint,(x,.014,.385),radius=.032)
        soft_box('Womens_vanity_panel',p,rotation,(.264,.040,.464),paint,
                 (x,-.220,.389),radius=.014,obstacle=False)
        rpole('Womens_vanity_pull',p,rotation,(x-.049,-.245,.559),(x+.049,-.245,.559),.012,'brass',sides=12)
    for x in (-.33,.33):
        rpole('Womens_vanity_mirror_mount',p,rotation,(x,.205,.815),(x,.205,1.554),
              .023,'quarters_walnut',sides=14)
    oval_vanity_glass(L(p,rotation,0,.199,1.379),rotation,'glass')
    for i in range(3):
        x=.275+i*.102
        rpole('Womens_vanity_bottle',p,rotation,(x,-.095,.830),(x,-.095,.941+i*.022),.037,
              ('quarters_porcelain','glass','womens_painted_oak')[i],sides=18)
        rpole('Womens_vanity_bottle_cap',p,rotation,(x,-.095,.937+i*.022),(x,-.095,.971+i*.022),
              .026,'brass',sides=14)


def soft_armchair(name,p,rotation):
    """Rounded upholstered sides and bolstered seat, with four timber feet."""
    from sunny_room_accuracy import soft_box
    cloth='upholstery_womens_rouge'
    soft_box(name+'_deck',p,rotation,(.79,.776,.28),cloth,(0,0,.231),radius=.108)
    soft_box(name+'_cushion',p,rotation,(.584,.614,.196),cloth,(0,-.035,.422),radius=.077)
    back=soft_box(name+'_back',p,rotation,(.695,.201,.671),cloth,(0,.305,.632),radius=.076)
    back.rotation_euler.rotate_axis('X',.12)
    for side in (-1,1):
        soft_box(name+'_arm',p,rotation,(.168,.664,.353),cloth,
                 (side*.332,-.005,.448),radius=.065)
        for y in (-.246,.244):
            rpole(name+'_leg',p,rotation,(side*.31,y,0),(side*.30,y,.112),.044,'quarters_walnut',sides=16,radius2=.057)


def finish_womens(room,floor,frame):
    from sunny_room_accuracy import remove_family, repaint_family, soft_box
    cy=frame.y(.585)
    for family in ('Womens_vanity','Womens_mirror','Womens_sofa','Womens_bed_mattress',
                   'Womens_bed_pillow','Womens_bed_blanket','Womens_blanket'):
        remove_family(family)
    p=(room['x'][1]-1.1,frame.y(2.2),floor);r=math.pi/2
    soft_box('Womens_bed_mattress',p,r,(1.79,1.98,.217),'cloth_womens_pillow',
             (0,0,.450),radius=.077)
    soft_box('Womens_bed_coverlet',p,r,(1.814,1.37,.078),'cloth_womens_coverlet',
             (0,-.306,.572),radius=.030,obstacle=False)
    for x in (-.424,.424):
        soft_box('Womens_bed_pillow',p,r,(.707,.417,.159),'cloth_womens_pillow',
                 (x,.64,.637),radius=.061,obstacle=False)
    for x in (-.893,.893):
        soft_box('Womens_bed_coverlet_edge',p,r,(.062,1.369,.111),'cloth_womens_coverlet',
                 (x,-.306,.523),radius=.024,obstacle=False)
    repaint_family('Womens_closet_body','womens_wardrobe_enamel')
    repaint_family('Womens_closet_door','womens_wardrobe_enamel')
    vanity=(room['x'][0]+1.37,cy+1.38,floor)
    vanity_station(vanity)
    tea=(room['x'][0]+3.31,cy-4.95,floor)
    soft_armchair('Womens_tea_armchair',L(tea,0,-.875,.043,0),math.pi/2-.28)
    soft_armchair('Womens_tea_armchair',L(tea,0,.875,.043,0),-math.pi/2+.28)
    rpole('Womens_tea_table_foot',tea,0,(0,0,0),(0,0,.078),.263,'quarters_walnut',sides=28)
    rpole('Womens_tea_table_column',tea,0,(0,0,.059),(0,0,.613),.103,'quarters_oak',sides=24)
    top=rpole('Womens_tea_table_top',tea,0,(0,0,.602),(0,0,.676),.442,'quarters_oak',sides=32)
    top['sunny_obstacle']=True
    room['cabinLayout']={'bed':list(p),'vanity':list(vanity),'teaTable':list(tea)}


def wash_station(name,p,rotation):
    from sunny_bath import profiled_basin
    from sunny_room_accuracy import soft_box
    feature=name.split('_')[0]
    rpole(name+'_pedestal',p,rotation,(0,0,0),(0,0,.855),.155,
          'quarters_porcelain',radius2=.104,sides=28)['sunny_obstacle']=True
    rw,rd=(.29,.24) if rotation==0 else (.24,.29)
    profiled_basin(name+'_bowl',p,((rw*.71,rd*.65,.785),(rw,rd,.887),(rw,rd,.935),
                    (rw*.80,rd*.79,.935),(rw*.60,rd*.55,.834)),('quarters_porcelain',)*4,True,feature=feature)
    rpole(name+'_drain',p,rotation,(0,0,.829),(0,0,.84),.035,'steel',sides=16)
    rpole(name+'_tap',p,rotation,(0,.192,.913),(0,.192,1.168),.018,'brass',sides=14)
    rpole(name+'_spout',p,rotation,(0,.192,1.168),(0,.021,1.115),.018,'brass',sides=14)
    for y in (.16,.214):
        rpole(name+'_tap_handle',p,rotation,(-.047,y,1.133),(.047,y,1.133),.012,'brass',sides=12)
    soft_box(name+'_mirror_back',p,rotation,(.82,.069,1.88),'quarters_oak',
             (0,.289,.94),radius=.028,obstacle=False)
    oval_vanity_glass(L(p,rotation,0,.250,1.398),rotation,'glass',name=name+'_mirror')


def alarm_bell(p):
    for bottom,top,r1,r2 in ((0,.047,.110,.083),(.047,.107,.083,.072),(.107,.147,.072,.042)):
        rpole('Wash_alarm_bell',p,0,(0,0,bottom),(0,0,top),r1,'brass',sides=28,radius2=r2)
    rpole('Wash_alarm_bell_arm',p,0,(0,.20,.155),(0,0,.155),.023,'quarters_walnut',sides=14)
    sphere('Wash_alarm_bell_clapper',L(p,0,0,0,-.022),(.029,.029,.035),'steel',segments=18,rings=10)
    rpole('Wash_alarm_bell_pull',p,0,(0,0,-.047),(0,0,-.335),.007,'rope',sides=10)


def finish_washrooms(rooms,levels):
    from sunny_details import tea_set
    from sunny_room_accuracy import remove_family,soft_box
    from sunny_interiors import shelf_unit
    for family in ('Wash_sink','Wash_toothbrushes','Wash_bell','WWash_sink','WWash_cupboard','WWash_bottle','WWash_tea'):
        remove_family(family)
    men=rooms["Men's Washroom"]
    p=(men['x'][1]-.354,6.86,levels['F1'])
    wash_station('Wash_sink',p,-math.pi/2)
    shelf=(p[0]-.04,p[1]-.433,p[2]+1.05)
    rbox('Wash_toothbrush_shelf',shelf,-math.pi/2,(.273,.225,.045),'quarters_oak',(0,0,0),obstacle=False)
    for x in (-.088,.088):
        rpole('Wash_toothbrush_shelf_brace',shelf,-math.pi/2,(x,.086,.891-1.05),
              (x,-.073,-.018),.013,'brass',sides=12)
    rpole('Wash_toothbrush_cup',shelf,-math.pi/2,(0,.015,.023),(0,.015,.107),
          .064,'quarters_porcelain',sides=18)
    for i in range(4):
        x=(i-1.5)*.024
        rpole('Wash_toothbrush',shelf,-math.pi/2,(x,0,.071),(x,.012,.224-i*.011),
              .010,('red','blue','leaf','cream')[i],sides=10)
    alarm_bell(((men['x'][0]+men['x'][1])/2,men['y'][0]-.21,levels['F1']+2.35))
    women=rooms["Women's Washroom"]
    sink=(women['x'][0]+.39,8.05,levels['F2F'])
    wash_station('WWash_sink',sink,0)
    cupboard=(women['x'][1]-1.02,8.60,levels['F2F'])
    shelf_unit('WWash_cupboard',cupboard,0,1.13,.34,1.88,4,'quarters_oak')
    for x in (-.277,.277):
        soft_box('WWash_cupboard_door',cupboard,0,(.519,.052,.495),'womens_wardrobe_enamel',
                 (x,-.180,.399),radius=.017,obstacle=False)
        rpole('WWash_cupboard_pull',cupboard,0,(x*.46,-.219,.429),(x*.46,-.219,.49),.015,'brass',sides=12)
    for i in range(4):
        x=(i-1.5)*.212;z=.70;height=.25+(i%2)*.052
        rpole('WWash_wine_bottle',cupboard,0,(x,.018,z),(x,.018,z+height),.049,('leaf','glass')[i%2],
              sides=18,radius2=.038)
        rpole('WWash_wine_neck',cupboard,0,(x,.018,z+height),(x,.018,z+height+.062),.027,'darkwood',sides=16)
        rbox('WWash_wine_label',cupboard,0,(.070,.013,.073),'paper',(x,-.023,z+.112),obstacle=False)
    tea_set(L(cupboard,0,-.024,.007,1.265))
    men['washLayout']={'basin':list(p)}
    women['washLayout']={'basin':list(sink),'tea':list(cupboard)}


def finish_cannon_closet_surfaces():
    from sunny_room_accuracy import repaint_family
    for cabin in ('Quarters','Womens'):
        for side in (-1,1):
            prefix=f'{cabin}_cannon{side}'
            for part,key in (('barrel','quarters_cannon_iron'),('carriage','quarters_walnut'),
                             ('rim','quarters_cannon_iron'),('wheel','quarters_oak'),('wheel_hub','brass')):
                repaint_family(prefix+'_'+part,key)


def finish_forward_toilets(rooms,floor):
    """Replace the two under-stair fixtures inside their retained walls."""
    from sunny_bath import profiled_basin
    from sunny_room_accuracy import remove_family,soft_box
    for side,label in ((-1,'Port'),(1,'Starboard')):
        room=rooms['Fore '+label+' Toilet']
        cx=sum(room['x'])/2; cy=sum(room['y'])/2
        name='ForeToilet'+str(side)
        sink='ForeToilet_sink'+str(side)
        remove_family(name)
        remove_family(sink)
        p=(cx-.42,cy+.40,floor)
        rpole(name+'_pedestal',p,0,(0,0,0),(0,0,.275),.121,
              'quarters_porcelain',sides=24,radius2=.104)['sunny_obstacle']=True
        profiled_basin(name+'_bowl',p,((.13,.118,.235),(.221,.166,.326),(.262,.184,.429),
                        (.216,.147,.429),(.157,.108,.285)),('quarters_porcelain',)*4,True,feature='ForeToilet')
        soft_box(name+'_cistern',p,0,(.198,.342,.309),'quarters_porcelain',(-.244,0,.603),radius=.034)
        rpole(name+'_flush',p,0,(-.16,-.099,.700),(-.12,-.132,.700),.012,'brass',sides=12)
        wash_station(sink,(cx-.42,cy-.42,floor),math.pi/2)
        room['washLayout']={'toilet':list(p)}
