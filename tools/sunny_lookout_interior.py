"""R12 lookout and training room, fitted around the retained hatch and sash belt."""
import math

from sunny_exterior import PALETTE, _mesh, finish, pole
from sunny_interiors import L, rbox, rpole


PALETTE.update({
    'lookout_ash':'#ab7f51', 'lookout_wood_trim':'#765234',
    'lookout_optic_body':'#6d7763', 'lookout_optic_metal':'#909a96',
    'lookout_training_iron':'#414b4c', 'lookout_mat':'#777c66',
})


def curved_window_seat(centre,radii,start,end):
    cx,cy,floor=centre
    rx,ry=radii
    # The seat follows the measured lookout ellipse and stops clear of the hatch.
    steps=22
    vertices=[]
    for z,inset in ((.025,.48),(.025,.16),(.370,.16),(.408,.18),(.408,.53),(.355,.56)):
        for step in range(steps+1):
            angle=start+(end-start)*step/steps
            vertices.append((cx+(rx-inset)*math.cos(angle),cy+(ry-inset)*math.sin(angle),floor+z))
    stride=steps+1
    faces=[]
    for row in range(6):
        next_row=(row+1)%6
        for step in range(steps):
            a=row*stride+step;b=next_row*stride+step
            faces.append((a,a+1,b+1,b))
    faces.append(tuple(row*stride for row in reversed(range(6))))
    faces.append(tuple(row*stride+steps for row in range(6)))
    seat=finish(_mesh('SurveyGym_window_seat',vertices,faces),'SurveyGym_window_seat','lookout_ash',
                obstacle=True)
    seat['sunny_rail']=True
    for side in (-1,1):
        angle=start+(end-start)*(.5+side*.29)
        px=cx+(rx-.32)*math.cos(angle)
        py=cy+(ry-.32)*math.sin(angle)
        pole('SurveyGym_window_seat_foot',(px,py,floor),(px,py,floor+.065),.089,'lookout_wood_trim',sides=12)


def telescope(p):
    base=L(p,0,0,0,1.289)
    pole('SurveyGym_telescope_head',L(p,0,0,0,.994),base,.073,'brass',sides=20)
    for index in range(3):
        a=math.tau*index/3+.17
        foot=L(p,0,.428*math.cos(a),.428*math.sin(a),.00)
        knee=L(p,0,.21*math.cos(a),.21*math.sin(a),.577)
        pole('SurveyGym_tripod_lower',foot,knee,.025,'lookout_wood_trim',sides=14)['sunny_obstacle']=True
        pole('SurveyGym_tripod_upper',knee,base,.032,'lookout_wood_trim',sides=14)
        pole('SurveyGym_tripod_foot',foot,L(foot,0,0,0,.102),.031,'brass',sides=14)
    path=((-1.026,.012,1.745),(-.846,.01,1.654),(-.42,0,1.444),
          (.244,0,1.118),(.452,0,1.011),(.550,0,.962))
    for (start,end),(outer,inner,material) in zip(zip(path,path[1:]),(
        (.161,.162,'brass'),(.145,.145,'lookout_optic_body'),(.116,.106,'lookout_optic_body'),
        (.08,.062,'brass'),(.070,.063,'lookout_training_iron'))):
        rpole('SurveyGym_telescope_tube',p,0,start,end,outer,material,sides=28,radius2=inner)
    rpole('SurveyGym_telescope_lens',p,0,(-1.033,.012,1.749),(-1.020,.012,1.742),
          .129,'glass',sides=30)
    rpole('SurveyGym_telescope_focus',p,0,(-.046,.054,1.315),(-.046,.182,1.315),
          .054,'brass',sides=18)


def binoculars(p):
    from sunny_room_accuracy import soft_box
    soft_box('SurveyGym_optics_stand',p,0,(.48,.385,.087),'lookout_ash',(0,0,.713),radius=.022)
    rpole('SurveyGym_optics_stand_leg',p,0,(0,0,.043),(0,0,.68),.073,'lookout_wood_trim',sides=18)
    rpole('SurveyGym_optics_stand_base',p,0,(0,0,0),(0,0,.067),.192,'lookout_wood_trim',sides=22)
    for y in (-.061,.061):
        rpole('SurveyGym_binoculars_barrel',p,0,(-.118,y,.812),(.116,y,.812),.047,
              'lookout_training_iron',sides=20,radius2=.051)
        rpole('SurveyGym_binoculars_lens',p,0,(-.121,y,.812),(-.115,y,.812),.033,'glass',sides=18)
    rpole('SurveyGym_binoculars_bridge',p,0,(0,-.060,.813),(0,.060,.813),.019,'brass',sides=14)


def training_rack(p):
    from sunny_room_accuracy import soft_box
    rotation=math.pi
    soft_box('SurveyGym_training_case',p,rotation,(1.126,.38,1.12),'lookout_optic_body',
             (0,0,.608),radius=.041)
    for i in range(3):
        rbox('SurveyGym_training_slot',p,rotation,(.282,.039,.207),'lookout_training_iron',
             ((i-1)*.333,-.20,.915),obstacle=False)
        rpole('SurveyGym_training_pull',p,rotation,((i-1)*.333-.066,-.231,.806),
              ((i-1)*.333+.066,-.231,.806),.013,'lookout_optic_metal',sides=12)
    rbox('SurveyGym_weight_cradle',p,rotation,(1.15,.46,.064),'lookout_wood_trim',(0,-.255,.081))
    for i in range(3):
        x=(i-1)*.343;rad=.084+i*.019;top=.113+rad
        rpole('SurveyGym_dumbbell_grip',p,rotation,(x,-.418,top),(x,-.157,top),.021,'lookout_optic_metal',sides=18)
        for y in (-.41,-.172):
            rpole('SurveyGym_dumbbell_weight',p,rotation,(x,y-.034,top),(x,y+.034,top),
                  rad,'lookout_training_iron',sides=24)
    for x in (-.43,.43):
        rpole('SurveyGym_towel_rail_post',p,rotation,(x,.083,1.14),(x,.083,1.57),.019,
              'lookout_optic_metal',sides=12)
    rpole('SurveyGym_towel_rail',p,rotation,(-.43,.083,1.57),(.43,.083,1.57),.017,
          'lookout_optic_metal',sides=14)
    for index,x in enumerate((-.186,.186)):
        towel=soft_box('SurveyGym_towel',p,rotation,(.242,.021,.289),'linen',
                     (x,.101,1.427-index*.011),radius=.008,obstacle=False)
        towel['sunny_fabric']=True


def fit_lookout(interiors):
    import bpy
    from sunny_interiors import DOORS
    from sunny_room_accuracy import soft_box
    hatch=next(spec for spec in DOORS if spec['id']=='CrowNestHatch')
    hx,hy,floor=hatch['pos'];centre=(hx-2.35,hy-1.10,floor)
    deck=bpy.data.objects['Sunny_Lookout_floor']
    points=[deck.matrix_world@v.co for v in deck.data.vertices]
    radii=(max(p.x for p in points)-centre[0],max(p.y for p in points)-centre[1])
    for begin,end in ((-2.92,-2.08),(-1.13,-.38),(1.54,2.77)):
        curved_window_seat(centre,radii,begin,end)
    scope=L(centre,0,-2.45,.15,0)
    telescope(scope)
    binoculars(L(centre,0,-1.55,-1.43,0))
    training=L(centre,0,.47,-2.27,0)
    training_rack(training)
    for dx in (-.71,.70):
        p=L(centre,0,dx,1.92,0)
        rpole('SurveyGym_bar_post',p,0,(0,0,0),(0,0,2.052),.046,'lookout_optic_metal',
              sides=18)['sunny_obstacle']=True
        rpole('SurveyGym_bar_base',p,0,(0,0,0),(0,0,.066),.106,'lookout_training_iron',sides=20)
    rpole('SurveyGym_training_bar',centre,0,(-.71,1.92,1.952),(.70,1.92,1.952),.037,'lookout_optic_metal',sides=20)
    soft_box('SurveyGym_training_mat',centre,0,(1.74,1.13,.019),'lookout_mat',
             (-.073,.79,.013),radius=.005,obstacle=False)
    mic=L(centre,0,2.90,-.95,0)
    rpole('SurveyGym_mic_post',mic,0,(0,0,0),(0,0,1.16),.029,'lookout_training_iron',sides=14)
    rpole('SurveyGym_mic_base',mic,0,(0,0,0),(0,0,.069),.149,'brass',sides=22)
    rpole('SurveyGym_mic_head',mic,0,(0,0,1.145),(-.106,0,1.236),.052,'lookout_optic_metal',sides=20)
    interiors['lookoutRoom']={'centre':list(centre),'scope':list(scope),'training':list(training),'bounds':list(radii)}
