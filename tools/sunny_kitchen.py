"""R10 galley furniture and finishes around the retained mast lift."""
import math

import bpy

from sunny_exterior import PALETTE, pole, ring, sphere
from sunny_interiors import L, rbox, rpole


PALETTE.update({
    'kitchen_marble':'#d7d4c7', 'kitchen_enamel':'#ded6bd',
    'kitchen_walnut':'#8a5434', 'kitchen_steel':'#849195',
    'kitchen_oven_glaze':'#2a3537', 'tile_kitchen_cream':'#d5c6a2',
    'tile_kitchen_sand':'#bcab87',
})


def serve_island(cy,floor):
    from sunny_room_accuracy import soft_box
    p=(16.00,cy+6.65,floor)
    length,depth=3.24,.78
    soft_box('Kitchen_serving_island_base',p,0,(length,depth,.81),'kitchen_walnut',(0,0,.46),radius=.045)
    rbox('Kitchen_serving_island_plinth',p,0,(length-.08,depth-.09,.12),'darkwood',(0,0,.06))
    soft_box('Kitchen_serving_island_marble',p,0,(length+.13,depth+.10,.091),'kitchen_marble',(0,0,.901),radius=.025)
    for i in range(10):
        x=(i-4.5)*.31
        soft_box('Kitchen_serving_island_stave',p,0,(.282,.032,.65),'kitchen_walnut',
                 (x,-depth/2,.482),radius=.008,obstacle=False)
    for x in (-1.23,0,1.23):
        rpole('Kitchen_serving_island_rail_post',p,0,(x,-.48,.135),(x,-.48,.31),.021,'brass',sides=12)
        rpole('Kitchen_serving_island_rail_brace',p,0,(x,-.36,.14),(x,-.48,.14),.021,'brass',sides=12)
    rpole('Kitchen_serving_island_footrail',p,0,(-1.37,-.48,.309),(1.37,-.48,.309),.026,'brass',sides=16)
    return list(p)


def cabinet(name,p,length,depth,sections,rotation=0,stone=True):
    from sunny_room_accuracy import soft_box
    soft_box(name+'_carcass',p,rotation,(length,depth,.79),'kitchen_enamel',(0,0,.465),radius=.022)
    rbox(name+'_kick',p,rotation,(length-.035,depth-.09,.12),'darkwood',(0,.015,.06))
    if stone:
        soft_box(name+'_stone',p,rotation,(length+.053,depth+.059,.061),'kitchen_marble',(0,0,.893),radius=.015)
    for i in range(sections):
        width=length/sections
        x=(i-(sections-1)/2)*width
        soft_box(name+'_door',p,rotation,(width-.039,.037,.565),'kitchen_enamel',
                 (x,-depth/2,.438),radius=.009,obstacle=False)
        rbox(name+'_door_inset',p,rotation,(width-.123,.023,.454),'kitchen_walnut',
             (x,-depth/2-.022,.426),obstacle=False)
        soft_box(name+'_drawer',p,rotation,(width-.039,.033,.112),'kitchen_enamel',
                 (x,-depth/2,.790),radius=.009,obstacle=False)
        rpole(name+'_door_pull',p,rotation,(x+width*.29,-depth/2-.043,.545),
              (x+width*.29,-depth/2-.043,.650),.012,'brass',sides=12)
        rpole(name+'_drawer_pull',p,rotation,(x-.057,-depth/2-.041,.789),
              (x+.057,-depth/2-.041,.789),.011,'brass',sides=12)


def sink_station(cy,floor):
    from sunny_room_accuracy import soft_box
    from sunny_bath import profiled_basin
    p=(13.075,cy+10,floor)
    soft_box('Kitchen_sink_case',p,0,(1.30,.72,.65),'kitchen_enamel',(0,0,.385),radius=.025)
    rbox('Kitchen_sink_kick',p,0,(1.265,.63,.12),'darkwood',(0,.02,.06))
    for x in (-.32,.32):
        soft_box('Kitchen_sink_door',p,0,(.56,.041,.525),'kitchen_enamel',
                 (x,-.363,.392),radius=.013,obstacle=False)
        rpole('Kitchen_sink_pull',p,0,(x*.39,-.413,.457),(x*.39,-.413,.567),.012,'brass',sides=12)
    for side in (-1,1):
        rbox('Kitchen_sink_stone_side',p,0,(.358,.78,.061),'kitchen_marble',
             (side*.493,0,.893),obstacle=False)
        rbox('Kitchen_sink_stone_lip',p,0,(.630,.170,.061),'kitchen_marble',
             (0,side*.305,.893),obstacle=False)
    basin=profiled_basin('Kitchen_sink_bowl',p,
        ((.30,.20,.72),(.321,.223,.88),(.342,.248,.934),(.292,.198,.934),(.255,.162,.755)),
        ('kitchen_steel',)*4,False,feature='Kitchen')
    basin['sunny_reference']='R10 galley prep sink inset into stone worktop'
    rpole('Kitchen_sink_drain',p,0,(0,0,.748),(0,0,.763),.046,'black',sides=18)
    for start,end in (((0,.292,.915),(0,.292,1.182)),((0,.292,1.182),(0,.203,1.246)),
                      ((0,.203,1.246),(0,.036,1.246)),((0,.036,1.246),(0,-.030,1.193))):
        rpole('Kitchen_sink_mixer',p,0,start,end,.022,'brass',sides=14)
    for x in (-.11,.11):
        rpole('Kitchen_sink_valve',p,0,(x,.286,.922),(x,.286,.980),.026,'brass',sides=16)
    return p


def splashback_and_rack(cy,floor):
    from sunny_room_accuracy import soft_box
    p=(15.48,cy+10,floor)
    rbox('Kitchen_prep_backboard',p,0,(3.54,.082,1.83),'darkwood',(0,.356,1.2),obstacle=False)
    for row in range(4):
        for i in range(12):
            rbox('Kitchen_prep_tile',p,0,(.279,.027,.173),('tile_kitchen_cream','tile_kitchen_sand')[(i+row)%2],
                 ((i-5.5)*.286,.303,.997+row*.181),obstacle=False)
    for x in (-1.70,1.70):
        rbox('Kitchen_prep_stanchion',p,0,(.062,.105,2.09),'kitchen_walnut',(x,.367,1.045),obstacle=False)
    soft_box('Kitchen_dish_shelf',p,0,(2.90,.385,.061),'kitchen_walnut',(0,.152,1.724),radius=.019,obstacle=False)
    rbox('Kitchen_dish_shelf_lip',p,0,(2.90,.034,.091),'kitchen_walnut',(0,-.023,1.775),obstacle=False)
    for x in (-1.27,1.27):
        rpole('Kitchen_dish_shelf_brace',p,0,(x,.308,1.47),(x,.018,1.713),.018,'brass',sides=12)
    for i in range(5):
        x=-1.17+i*.266
        rpole('Kitchen_plate',p,0,(x,.129,1.884),(x,.156,1.884),.127,'white',sides=28)
        rpole('Kitchen_plate_foot',p,0,(x,.137,1.884),(x,.168,1.884),.067,'white',sides=22)
    for i in range(4):
        x=.36+i*.199
        rpole('Kitchen_crock',p,0,(x,.15,1.753),(x,.15,1.899),.060,'tile_kitchen_cream',sides=20)
        rpole('Kitchen_crock_lid',p,0,(x,.15,1.897),(x,.15,1.928),.066,'kitchen_walnut',sides=16)
    rpole('Kitchen_utensil_rail',p,0,(-1.40,.221,1.545),(1.40,.221,1.545),.013,'brass',sides=14)
    for x in (-1.40,1.40):
        rpole('Kitchen_utensil_rail_mount',p,0,(x,.221,1.545),(x,.309,1.545),.018,'brass',sides=12)
    for x in (-.98,-.56,.72,1.02):
        rpole('Kitchen_utensil_stem',p,0,(x,.215,1.536),(x,.188,1.315),.011,'kitchen_steel',sides=10)
        sphere('Kitchen_utensil_bowl',L(p,0,x,.169,1.275),(.043,.018,.059),'kitchen_steel',segments=18,rings=10)
    return {'room':'Kitchen','pos':list(L(p,0,0,-.09,1.69)),'colour':'#ffe3b7','intensity':11,'distance':7}


def cooker(cy,floor):
    from sunny_room_accuracy import soft_box
    p=(18.70,cy+10,floor)
    soft_box('Kitchen_stove_body',p,0,(1.63,.80,.91),'kitchen_enamel',(0,0,.455),radius=.035)
    soft_box('Kitchen_stove_hob',p,0,(1.69,.86,.05),'black',(0,0,.934),radius=.019)
    soft_box('Kitchen_stove_oven_bezel',p,0,(1.16,.058,.575),'kitchen_steel',(0,-.424,.417),radius=.028,obstacle=False)
    soft_box('Kitchen_stove_oven_glass',p,0,(.96,.038,.445),'kitchen_oven_glaze',
             (0,-.458,.414),radius=.033,obstacle=False)
    rpole('Kitchen_stove_handle',p,0,(-.43,-.496,.582),(.43,-.496,.582),.024,'brass',sides=16)
    for x in (-.58,-.29,0,.29,.58):
        rpole('Kitchen_stove_knob',p,0,(x,-.398,.818),(x,-.442,.818),.040,'brass',sides=16)
    for x in (-.49,.49):
        for y in (-.22,.22):
            centre=L(p,0,x,y,.958)
            ring('Kitchen_stove_burner',centre,.125,.017,'black')
            ring('Kitchen_stove_burner_inset',centre,.074,.009,'kitchen_steel')
            for axis in (0,math.pi/2):
                rbox('Kitchen_stove_grate',centre,axis,(.302,.018,.018),'black',(0,0,.018),obstacle=False)
    pan=L(p,0,.49,.22,.974)
    rpole('Kitchen_stockpot',pan,0,(0,0,0),(0,0,.260),.152,'kitchen_steel',sides=28)
    ring('Kitchen_stockpot_rim',L(pan,0,0,0,.257),.151,.013,'kitchen_steel')
    sphere('Kitchen_stockpot_lid',L(pan,0,0,0,.27),(.151,.151,.024),'kitchen_steel',segments=24,rings=12)
    rpole('Kitchen_stockpot_knob',pan,0,(0,0,.282),(0,0,.313),.029,'brass',sides=14)
    for side in (-1,1):
        rpole('Kitchen_stockpot_handle',pan,0,(side*.147,0,.223),(side*.209,0,.223),.019,'brass',sides=12)
    soft_box('Kitchen_hood',p,0,(1.93,.94,.46),'kitchen_steel',(0,0,2.25),radius=.043,obstacle=False)
    for row in range(2):
        for i in range(8):
            rbox('Kitchen_hood_louver',p,0,(.149,.017,.108),'black',
                 ((i-3.5)*.218,-.473,2.162+.151*row),obstacle=False)
    rbox('Kitchen_hood_tasklight',p,0,(.73,.084,.025),'lamp_glow',(0,-.21,2.009),obstacle=False)
    return p


def tall_appliances(cy,floor):
    from sunny_room_accuracy import soft_box
    rotation=math.pi/2
    oven=(13.0,cy+7.4,floor)
    soft_box('Kitchen_giant_oven',oven,rotation,(1.50,.72,1.95),'kitchen_enamel',(0,0,.98),radius=.046)
    soft_box('Kitchen_giant_oven_frame',oven,rotation,(1.29,.062,1.16),'kitchen_steel',
             (0,-.382,1.188),radius=.047,obstacle=False)
    soft_box('Kitchen_giant_oven_glass',oven,rotation,(1.10,.022,.97),'kitchen_oven_glaze',
             (0,-.420,1.185),radius=.052,obstacle=False)
    rpole('Kitchen_giant_oven_handle',oven,rotation,(-.51,-.463,1.595),(.51,-.463,1.595),.030,'brass',sides=18)
    for x in (-.39,0,.39):
        rpole('Kitchen_giant_oven_knob',oven,rotation,(x,-.362,.472),(x,-.421,.472),.063,'brass',sides=20)
    fridge=(13.5,cy+1.9,floor)
    soft_box('Kitchen_fridge_body',fridge,rotation,(1.05,.78,2.00),'kitchen_enamel',(0,0,1.00),radius=.060)
    for z,height in ((.545,.95),(1.51,.93)):
        soft_box('Kitchen_fridge_door',fridge,rotation,(.993,.073,height),'kitchen_enamel',
                 (0,-.412,z),radius=.052,obstacle=False)
        rpole('Kitchen_fridge_handle',fridge,rotation,(-.28,-.478,z-.135),(-.28,-.478,z+.135),
              .020,'brass',sides=16)
    soft_box('Kitchen_fridge_lock',fridge,rotation,(.220,.063,.148),'kitchen_steel',
             (.233,-.464,1.464),radius=.012,obstacle=False)
    for row in range(2):
        for i in range(2):
            rbox('Kitchen_fridge_key',fridge,rotation,(.030,.016,.032),'black',
                 (.197+i*.072,-.505,1.437+row*.052),obstacle=False)


def finish_galley(room,cy,floor):
    """Replace the provisional furniture and preserve the fitted flue and lift."""
    from sunny_room_accuracy import remove_family
    for family in ('Kitchen_counter','Kitchen_serving_bar','Kitchen_sink','Kitchen_plate','Kitchen_dish_rack',
                   'Kitchen_rack_rail','Kitchen_stove','Kitchen_hood_vent','Kitchen_fridge','Kitchen_oven','Kitchen_giant_oven'):
        remove_family(family)
    bpy.data.objects.remove(bpy.data.objects['Sunny_Kitchen_hood'],do_unlink=True)
    island=serve_island(cy,floor)
    cabinet('Kitchen_prep_cabinet',(15.50,cy+10,floor),3.50,.72,4)
    cabinet('Kitchen_return',(19.86,cy+8.80,floor),1.76,.64,3,-math.pi/2)
    sink=sink_station(cy,floor)
    task_light=splashback_and_rack(cy,floor)
    stove=cooker(cy,floor)
    tall_appliances(cy,floor)
    room['galleyLayout']={'island':island,'sink':list(sink),'stove':list(stove),'counterHeight':.924}
    return task_light
