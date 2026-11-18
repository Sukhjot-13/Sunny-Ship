"""Human-scale cabinetry, stores and hardware for the lower interior."""
import math

import bpy

from sunny_exterior import PALETTE, material, ring, text
from sunny_interiors import L, crate, rbox, rpole


PALETTE.update({
    'workshop_maple':'#b08253', 'workshop_oak':'#70472c',
    'workshop_cast_iron':'#404a4d', 'workshop_steel':'#8e9a99',
    'workshop_painted_steel':'#556e73', 'workshop_slate':'#557171',
    'workshop_copper':'#a77954',
    'dock_deck_oak':'#a27a53', 'dock_porcelain_paint':'#ded8c0',
    'dock_marine_blue':'#315d72', 'dock_marine_red':'#a84342',
    'dock_rubber':'#303b42', 'dock_pool_vinyl_blue':'#4c86a0', 'dock_pool_vinyl_ivory':'#ded8c8',
})


def drawer_case(name,p,rotation,width,depth,rows,columns,key,height):
    from sunny_room_accuracy import soft_box
    soft_box(name+'_body',p,rotation,(width,depth,height-.08),key,(0,0,height*.5+.04),radius=.025)
    rbox(name+'_toe',p,rotation,(width-.08,depth-.055,.095),'workshop_oak',(0,.019,.0475))
    for row in range(rows):
        for col in range(columns):
            span=(height-.16)/rows
            x=(col-(columns-1)/2)*width/columns
            z=.108+(row+.5)*span
            soft_box(name+'_face',p,rotation,(width/columns-.035,.045,span-.026),key,
                     (x,-depth/2,z),radius=.013,obstacle=False)
            rpole(name+'_pull',p,rotation,(x-.076,-depth/2-.041,z+.017),(x+.076,-depth/2-.041,z+.017),
                  .014,'brass',sides=12)


def factory_bench(p):
    from sunny_room_accuracy import soft_box
    name='Factory_assembly_table'
    rot=math.pi
    soft_box(name+'_top',p,rot,(2.96,.90,.10),'workshop_maple',(0,0,.878),radius=.024)
    for x in (-1.33,1.33):
        for y in (-.34,.34):
            rbox(name+'_leg',p,rot,(.13,.133,.844),'workshop_oak',(x,y,.422))
    rbox(name+'_stretcher',p,rot,(2.68,.73,.072),'workshop_maple',(0,0,.285))
    for x in (-.94,.84):
        rbox(name+'_chart',p,rot+.075*x,(.46,.29,.006),'paper',(x,.05,.935),obstacle=False)
    for i in range(6):
        rpole(name+'_dowel',p,rot+.21,(.13,-.22+i*.066,.950),(.525,-.22+i*.066,.950),
              .016,'workshop_maple',sides=12)
    for i in range(7):
        rpole(name+'_edge_pin',p,rot,(-1.17+i*.39,-.43,.872),(-1.17+i*.39,-.462,.872),
              .013,'workshop_cast_iron',sides=10)
    for x in (-1.13,1.13):
        rbox('Factory_sign_post',p,rot,(.10,.12,2.38),'workshop_oak',(x,.484,1.19))
    soft_box('Factory_sign_panel',p,rot,(2.76,.069,.443),'linen',(0,.435,2.187),radius=.018,obstacle=False)
    text('Factory_sign','USOPP FACTORY',L(p,rot,0,.482,2.116),.252,'workshop_oak',(math.pi/2,0,0))


def handtool_rack(name,p,rotation,metal=False):
    from sunny_room_accuracy import soft_box
    body='workshop_painted_steel' if metal else 'workshop_maple'
    soft_box(name+'_panel',p,rotation,(1.76,.088,.72),body,(0,0,1.423),radius=.026,obstacle=False)
    for x in (-.744,.744):
        rbox(name+'_upright',p,rotation,(.079,.091,1.62),body,(x,.031,.81))
    for i,x in enumerate((-.58,-.30,0,.30,.59)):
        rpole(name+'_hook',p,rotation,(x,-.025,1.568),(x,-.123,1.568),
              .012,'workshop_steel',sides=10)
        rpole(name+'_tool_handle',p,rotation,(x,-.11,1.264),(x+.026,-.11,1.437),
              .026,'workshop_oak',sides=12)
        rpole(name+'_tool_shank',p,rotation,(x+.02,-.11,1.425),(x+.045,-.11,1.574),
              .012,'workshop_steel',sides=10)
        if i%2==0:
            rbox(name+'_tool_head',p,rotation,(.092,.040,.034),'workshop_cast_iron',
                 (x+.026,-.11,1.572),obstacle=False)


def machine_bench(p):
    from sunny_room_accuracy import soft_box
    rot=0;name='Weapons_drawing_bench'
    drawer_case(name,p,rot,1.54,.71,3,2,'workshop_painted_steel',.88)
    top=soft_box(name+'_drawing_slab',p,rot,(1.64,.82,.064),'workshop_maple',(0,0,1.002),radius=.024)
    top.rotation_euler.rotate_axis('X',-.23)
    sheet=rbox(name+'_drawing',p,rot,(1.13,.535,.006),'paper',(0,.016,1.036),obstacle=False)
    sheet.rotation_euler.rotate_axis('X',-.23)
    for i in range(4):
        xy=L(p,rot,-.33+i*.20,-.262,1.114)
        rpole(name+'_drawing_clip',xy,rot,(0,0,0),(.064,0,0),.009,'brass',sides=10)


def foundry_furnace(p):
    from sunny_room_accuracy import soft_box
    name='Weapons_furnace'
    rot=math.pi
    soft_box(name,p,rot,(1.23,.84,1.27),'workshop_cast_iron',(0,0,.642),radius=.12)
    outer=ring(name+'_door_bezel',L(p,rot,0,-.431,.65),.327,.046,'workshop_steel','Y',36,9)
    outer.scale.y=1.03
    rpole(name+'_firebrick_door',p,rot,(0,-.437,.65),(0,-.454,.65),.283,'workshop_cast_iron',sides=32)
    for i in range(6):
        x=(i-2.5)*.071
        rbox(name+'_vent',p,rot,(.032,.019,.328),'mane',(x,-.467,.651),obstacle=False)
    rpole(name+'_door_handle',p,rot,(.187,-.493,.719),(.297,-.493,.719),.026,'workshop_copper',sides=16)
    rpole(name+'_flue',p,rot,(0,.178,1.228),(0,.178,2.79),.132,'workshop_cast_iron',sides=18)
    for z in (1.367,2.21):
        ring(name+'_flue_band',L(p,rot,0,.178,z),.137,.018,'workshop_steel')


def finish_workshops(rooms,floor):
    from sunny_room_accuracy import soft_box
    factory=(14.65,10.75,floor)
    drawing=(12.61,-7.65,floor)
    factory_bench(factory)
    handtool_rack('Factory_tool_rack',(18.25,10.45,floor),0)
    drawer_case('Factory_tool_case',(17.86,9.50,floor),0,1.39,.56,3,2,'workshop_maple',.82)
    toolbox=(16.41,10.10,floor)
    soft_box('Factory_portable_box',toolbox,0,(.56,.34,.31),'workshop_painted_steel',
             (0,0,.155),radius=.044)
    rpole('Factory_tool_box_handle',toolbox,0,(-.10,0,.335),(.10,0,.335),.009,'workshop_steel',sides=12)
    machine_bench(drawing)
    drawer_case('Weapons_parts_cabinet',(14.36,-8.20,floor),math.pi,1.25,.54,5,3,'workshop_painted_steel',1.84)
    handtool_rack('Weapons_tool_rack',(16.44,-8.48,floor),math.pi,metal=True)
    foundry_furnace((18.65,-7.88,floor))
    scrap=(18.15,-5.37,floor)
    soft_box('Weapons_scrap_crate',scrap,0,(1.37,.89,.15),'workshop_cast_iron',(0,0,.075))
    for x in (-.64,.64):
        rbox('Weapons_scrap_crate_side',scrap,0,(.09,.89,.58),'workshop_painted_steel',(x,0,.29))
    for y in (-.40,.40):
        rbox('Weapons_scrap_crate_side',scrap,0,(1.23,.08,.58),'workshop_painted_steel',(0,y,.29))
    for i in range(9):
        p=L(scrap,0,-.27+(i%3)*.247,-.22+(i//3)*.225,.21+(i%2)*.15)
        ring('Weapons_scrap_gear',p,.09+i*.008,.022,'workshop_steel')
        rpole('Weapons_scrap_tube',p,i*.4,(-.22,0,-.06),(.22,0,.15),.033,'workshop_copper',sides=12)
    rooms["Usopp's Main Factory"]['workshopLayout']={'bench':list(factory),'aisle':list(L(factory,0,0,-1.15))}
    rooms["Franky's Weapon Development Room"]['workshopLayout']={'bench':list(drawing),'aisle':list(L(drawing,0,0,1.10))}


def finish_storage(room,floor):
    from sunny_pantry import dry_sack
    from sunny_room_accuracy import remove_family
    remove_family('Store_sack')
    for i in range(7):
        x=room['x'][0]+5.41+(i%4)*.64;y=4.62+(i//4)*.80
        dry_sack('Store_hessian_sack',(x,y,floor),.292+i%3*.033,.46+i%3*.066,196+i,
                 'cloth_pantry_hessian' if i%2 else 'cloth_pantry_hemp',True)
    shelf=(room['x'][1]-1.0,-7.6,floor)
    for i in range(4):
        crate('Store_dry_bin',L(shelf,0,(i-1.5)*.55,0,.14),0,.38,'workshop_maple')
    for i in range(3):
        cask=L(shelf,0,(i-1)*.70,.025,.807)
        rpole('Store_spare_cask',cask,0,(0,0,0),(0,0,.51),.190,'workshop_oak',sides=22,radius2=.209)
        for z in (.066,.443):
            ring('Store_spare_cask_ring',L(cask,0,0,0,z),.201,.014,'workshop_cast_iron')
    room['storeLayout']={'stockShelf':list(shelf)}


def finish_energy_room(room,floor):
    from sunny_room_accuracy import repaint_family,soft_box
    p=(23.15,8.55,floor)
    repaint_family('Energy_cola_chamber','workshop_painted_steel')
    repaint_family('Energy_chamber_grille','workshop_cast_iron')
    repaint_family('Energy_feed_pipe','workshop_copper')
    for x in (-1.46,1.46):
        rbox('Energy_boiler_foot',p,0,(.22,1.23,.13),'workshop_cast_iron',(x,0,.065))
        for z in (.31,.66,1.01,1.36,1.71,2.06,2.41):
            rpole('Energy_boiler_rivet',p,0,(x,-.589,z),(x,-.629,z),.025,'workshop_steel',sides=14)
    panel=(24.20,4.30,floor)
    soft_box('Energy_control_box',panel,0,(.74,.43,1.36),'workshop_painted_steel',(0,0,.68),radius=.032)
    for x in (-.216,0,.216):
        rpole('Energy_control_bezel',panel,0,(x,-.209,1.151),(x,-.239,1.151),.073,'brass',sides=24)
        rpole('Energy_control_face',panel,0,(x,-.236,1.151),(x,-.251,1.151),.054,'white',sides=24)
        rpole('Energy_control_pointer',panel,0,(x,-.253,1.151),(x+.019,-.253,1.181),.006,'black',sides=10)
    room['boilerLayout']={'chamber':list(p),'cabinet':list(panel)}


def finish_dock(room,centre,water_level):
    """Marine finishes on the retained six vehicles and rotating mechanism."""
    from sunny_room_accuracy import repaint_family
    repaint_family('Dock_turntable_deck','dock_deck_oak')
    repaint_family('Dock_turntable_hub','workshop_oak')
    repaint_family('Dock_capstan_spoke','workshop_maple')
    p=(centre[0],centre[1],water_level+.45)
    for z,rad in ((.18,.262),(.907,.262),(1.053,.242)):
        ring('Dock_capstan_binding',L(p,0,0,0,z),rad,.022,'workshop_cast_iron',major=30)
    paint={'Sunny_white':'dock_porcelain_paint','Sunny_blue':'dock_marine_blue','Sunny_red':'dock_marine_red'}
    for obj in bpy.data.objects:
        if obj.type!='MESH' or not obj.name.startswith('Sunny_Vehicle') or not obj.get('sunny_dock_channel'):
            continue
        name=obj.name.lower()
        replacements=paint
        if any(part in name for part in ('_wheel','_tread','_seat')):
            replacements={**paint,'Sunny_black':'dock_rubber'}
        elif '_inflatable' in name or name.startswith('sunny_vehicle6_bottom'):
            replacements={'Sunny_blue':'dock_pool_vinyl_blue','Sunny_white':'dock_pool_vinyl_ivory'}
        elif '_sail' in name:
            replacements={'Sunny_white':'linen'}
        for index,original in enumerate(obj.data.materials):
            if original and original.name in replacements:
                obj.data.materials[index]=material(replacements[original.name])
    room['dockFinish']={'waitingDeck':list(p),'vehicleChannels':6}
