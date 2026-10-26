"""Recognizable Sunny fittings and six dock contents, authored in human metres.

Silhouettes follow the wiki/anime references; these are base-colour models,
not claims of canonical dimensions or final character/map surface artwork.
"""
import math
import bpy
from sunny_exterior import box, pole, ring, sphere, text


def dock_vehicle(channel, p, rot):
    """Supported channel contents, local +X points out of the radial bay."""
    from sunny_interiors import L, rbox, rpole
    name='Vehicle%d'%channel
    def cube(s,off,dims,key):
        return rbox(name+'_'+s,p,rot,dims,key,off,obstacle=False)
    def ball(s,off,dims,key):
        ob=sphere(name+'_'+s,L(p,rot,*off),dims,key);ob.rotation_euler.z=rot;return ob
    def tube(s,a,b,r,key,r2=None):
        return rpole(name+'_'+s,p,rot,a,b,r,key,**({'radius2':r2} if r2 is not None else {}))
    def wheel(s,x,y,z,r,width):
        tube(s,(x,y-width/2,z),(x,y+width/2,z),r,'black')
        tube(s+'_hub',(x,y-width/2-.012,z),(x,y+width/2+.012,z),r*.42,'red')
    floor=.14
    if channel in (1,2,3):
        # Boats rest on real timber cradles, never hover above the platform.
        for x in (-.8,.8):
            cube('cradle',(x,0,floor+.16),(.18,1.35,.32),'darkwood')
    if channel==1:
        ball('horse_hull',(0,0,.65),(1.25,.55,.30),'white')
        cube('red_stripe',(0,0,.70),(2.15,1.12,.11),'red')
        ball('horse_bow',(1.0,0,.70),(.38,.50,.28),'white')
        tube('horse_neck',(.85,0,.88),(.98,0,1.62),.14,'white',.10)
        ball('horse_head',(1.03,0,1.70),(.28,.16,.20),'white')
        ball('horse_muzzle',(1.25,0,1.66),(.16,.14,.11),'white')
        for y in (-.095,.095):
            tube('horse_ear',(.96,y,1.82),(.90,y,2.02),.045,'white',.02)
            ball('horse_eye',(1.04,y*1.65,1.75),(.027,.014,.028),'black')
            tube('bridle',(1.17,y*1.5,1.61),(.9,y*1.5,1.8),.024,'timber')
            cube('saddle_bag',(-.45,y*4,.96),(.44,.18,.38),'timber')
        ball('saddle',(-.30,0,.99),(.50,.34,.14),'darkwood')
        tube('steering',(.25,-.32,1.30),(.25,.32,1.30),.035,'black')
        for y in (-.2,.2):
            tube('binocular',(.25,y,1.32),(.42,y,1.32),.08,'gold')
            tube('bow_suspension',(.88,y,.48),(.88,y,.85),.035,'black')
    elif channel==2:
        ball('boat_hull',(0,0,.70),(1.65,.77,.38),'timber')
        cube('deck',(0,0,.96),(2.65,1.28,.09),'deck')
        for y in (-.65,.65):
            cube('gunwale',(0,y,1.08),(2.8,.10,.25),'white')
        tube('mast',(-.25,0,.98),(-.25,0,2.65),.055,'darkwood')
        cube('sail',(-.25,0,2.08),(.035,1.25,1.0),'white')
        tube('boom',(-.25,-.72,2.65),(-.25,.72,2.65),.035,'darkwood')
        ball('sheep_head',(1.50,0,1.10),(.29,.29,.27),'white')
        ball('sheep_muzzle',(1.71,0,1.04),(.16,.18,.14),'cream')
        for y in (-.22,.22):
            ball('sheep_eye',(1.59,y,1.20),(.04,.035,.04),'black')
            ball('horn',(1.38,y*1.3,1.17),(.13,.10,.13),'gold')
        cube('bench',(.55,0,1.05),(.34,1.25,.09),'timber')
    elif channel==3:
        ball('shark_hull',(0,0,1.05),(1.7,.77,.64),'blue')
        ball('shark_nose',(1.48,0,1.05),(.28,.59,.47),'blue')
        cube('mouth',(1.65,0,.9),(.025,.62,.16),'black')
        for y in (-.24,-.08,.08,.24):
            tube('tooth',(1.68,y,.97),(1.68,y,.87),.042,'white',.0)
        for y in (-1,1):
            cube('fin',(-.2,y*.84,.93),(.95,.58,.08),'blue')
            ball('eye',(1.3,y*.48,1.30),(.1,.035,.10),'white')
            ball('pupil',(1.34,y*.515,1.30),(.045,.016,.045),'black')
            for x in (-.8,0,.8):
                tube('porthole',(x,y*.75,1.12),(x,y*.80,1.12),.16,'gold')
                tube('glass',(x,y*.81,1.12),(x,y*.825,1.12),.115,'glass')
        cube('dorsal',(-.45,0,1.77),(.85,.09,.40),'blue')
        tube('periscope',(.1,0,1.58),(.1,0,2.22),.055,'gold')
        tube('periscope_eye',(.1,0,2.22),(.40,0,2.22),.055,'gold')
        tube('tail',(-1.65,0,1.05),(-1.95,0,1.05),.07,'blue')
        cube('tail_fin',(-1.91,0,1.05),(.23,.08,.9),'blue')
    elif channel==4:
        wheel('front_wheel',1.25,0,.64,.50,.45)
        for y in (-.9,.9):wheel('rear_wheel',-.95,y,.69,.55,.38)
        cube('chassis',(-.10,0,.75),(2.4,.65,.30),'red')
        cube('seat',(-.55,0,1.12),(.9,.62,.18),'black')
        tube('fork',(1.25,0,.66),(.95,0,1.55),.08,'blue')
        ball('rhino_head',(1.1,0,1.36),(.47,.36,.24),'black')
        tube('rhino_horn',(1.4,0,1.5),(1.6,0,1.94),.16,'white',.0)
        tube('handlebar',(.6,-.5,1.60),(.6,.5,1.60),.035,'gold')
        for y in (-.45,.45):
            tube('exhaust',(-1.0,y,1.05),(-1.40,y,1.65),.11,'black')
            ball('rhino_eye',(1.20,y*.72,1.5),(.07,.025,.04),'white')
    elif channel==5:
        for y in (-1.0,1.0):
            cube('tread',(-.15,y,.49),(2.9,.46,.70),'black')
            for x in (-1.22,-.6,0,.6,1.02):
                tube('roller',(x,y-.24,.48),(x,y+.24,.48),.28,'darkwood')
            cube('fender',(-.15,y,.94),(3.05,.52,.15),'blue')
        ball('cylindrical_body',(-.20,0,1.17),(1.45,.84,.72),'white')
        tube('red_front',(.99,0,1.17),(1.13,0,1.17),.69,'red')
        cube('turret',(-.22,0,1.92),(1.35,.85,.32),'blue')
        tube('dinosaur_barrel',(.10,0,1.7),(1.92,0,1.7),.16,'gold',.20)
        tube('mouth',(1.93,0,1.7),(1.945,0,1.7),.135,'black')
        for y in (-.15,.15):
            ball('dinosaur_eye',(1.64,y,1.9),(.075,.055,.065),'white')
            ball('dinosaur_pupil',(1.67,y*1.26,1.9),(.024,.021,.027),'black')
        text(name+'_number','5',L(p,rot,-.3,-.855,1.25),.42,'black',(math.pi/2,0,rot))
    else:
        # Closed-bottom inflatable pool, the documented sixth dock option.
        pool=pole(name+'_bottom',L(p,rot,0,0,.14),L(p,rot,0,0,.19),1.40,'blue')
        for z in (.25,.42,.59):
            ring(name+'_inflatable',L(p,rot,0,0,z),1.40,.14,'white' if z==.42 else 'blue','Z')
    # One conservative physical proxy per vehicle; the outline cannot be walked
    # through. Small props are merged into the bay's animation by channel tag.
    bounds={1:(2.85,1.30,2.02),2:(3.60,1.80,2.65),3:(4.05,2.26,2.30),4:(3.9,2.35,2.02),5:(4.20,2.56,2.20),6:(3.1,3.1,.75)}[channel]
    return bounds


def tea_set(p, rot=0):
    """Teapot, lid, handle, spout and four cups resting on a cupboard shelf."""
    from sunny_interiors import L, rpole
    sphere('WWash_teapot',L(p,rot,0,0,.105),(.14,.12,.105),'white')
    pole('WWash_teapot_lid',L(p,rot,0,0,.195),L(p,rot,0,0,.217),.087,'gold')
    sphere('WWash_teapot_knob',L(p,rot,0,0,.235),(.025,)*3,'gold')
    rpole('WWash_teapot_spout',p,rot,(.11,0,.08),(.24,0,.18),.035,'white',radius2=.022)
    ring('WWash_teapot_handle',L(p,rot,-.15,0,.11),.065,.014,'gold','Y')
    for x in (-.42,-.25,.32,.49):
        pole('WWash_teacup',L(p,rot,x,0,.005),L(p,rot,x,0,.10),.055,'white')
        pole('WWash_tea',L(p,rot,x,0,.101),L(p,rot,x,0,.104),.041,'timber')


def wall_art(name, p, rot=0, crew='LUFFY'):
    """Geometry-only wanted-poster cues; detailed likeness remains a surface task."""
    from sunny_interiors import L, rbox
    rbox(name+'_paper',p,rot,(.52,.015,.72),'cream',obstacle=False)
    text(name+'_wanted','WANTED',L(p,rot,-.23,-.012,.24),.086,'black',(math.pi/2,0,rot))
    sphere(name+'_portrait',L(p,rot,0,-.016,.025),(.11,.01,.12),'mane')
    if crew=='LUFFY':
        rbox(name+'_hat',p,rot,(.32,.015,.045),'gold',(0,-.022,.11),obstacle=False)
        rbox(name+'_hat_band',p,rot,(.22,.018,.055),'red',(0,-.024,.145),obstacle=False)
    elif crew=='CHOPPER':
        rbox(name+'_hat',p,rot,(.30,.02,.075),'pink',(0,-.026,.13),obstacle=False)
        rbox(name+'_hat_cross',p,rot,(.075,.025,.016),'white',(0,-.042,.15),obstacle=False)
        rbox(name+'_hat_cross_up',p,rot,(.016,.025,.075),'white',(0,-.042,.15),obstacle=False)
        for side in (-1,1):
            from sunny_interiors import rpole
            rpole(name+'_antler',p,rot,(side*.13,-.03,.14),(side*.20,-.03,.22),.008,'timber')
            rpole(name+'_antler_fork',p,rot,(side*.17,-.03,.18),(side*.18,-.03,.25),.008,'timber')
    elif crew=='FRANKY':
        rbox(name+'_pompadour',p,rot,(.24,.02,.12),'blue',(0,-.026,.15),obstacle=False)
        rbox(name+'_forehead',p,rot,(.13,.025,.075),'mane',(0,-.03,.10),obstacle=False)
    else:
        key={'ZORO':'leaf','USOPP':'darkwood','NAMI':'orange'}.get(crew,'black')
        rbox(name+'_hair',p,rot,(.24,.018,.10),key,(0,-.024,.12),obstacle=False)
        if crew=='NAMI':
            for x in (-.10,.10):rbox(name+'_hair_side',p,rot,(.07,.02,.24),'orange',(x,-.025,-.015),obstacle=False)
        if crew=='USOPP':
            rbox(name+'_long_nose',p,rot,(.15,.02,.035),'mane',(.14,-.03,.025),obstacle=False)
            for x in (-.07,.07):sphere(name+'_goggle',L(p,rot,x,-.035,.14),(.045,.015,.035),'gold')
    for x in (-.045,.045):sphere(name+'_eye',L(p,rot,x,-.03,.04),(.015,.005,.012),'black')
    text(name+'_name',crew,L(p,rot,-.22,-.012,-.25),.058,'black',(math.pi/2,0,rot))
