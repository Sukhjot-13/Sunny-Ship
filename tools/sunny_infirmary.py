"""R10 infirmary furnishings with clear doorways and actual glazing."""
import math

from sunny_exterior import PALETTE, sphere
from sunny_interiors import L, desk, rbox, rpole, swivel_chair


PALETTE.update({
    'cloth_sick_linen':'#e8e4cd', 'cloth_sick_blanket':'#719780',
    'upholstery_sick_green':'#497a69', 'sick_powdercoat':'#e4e1cd',
    'sick_cork':'#927250', 'sick_amber':'#946441',
})


def infirmary_bed(position):
    from sunny_room_accuracy import soft_box
    p=position
    soft_box('Sick_bed_frame',p,0,(.96,2.02,.106),'sick_powdercoat',(0,0,.539),radius=.047)
    soft_box('Sick_bed_mattress',p,0,(.91,1.93,.151),'cloth_sick_linen',(0,0,.657),radius=.060)
    soft_box('Sick_bed_sheet',p,0,(.931,1.38,.061),'cloth_sick_blanket',(0,-.281,.738),radius=.027,obstacle=False)
    for x in (-.438,.438):
        soft_box('Sick_bed_sheet_drop',p,0,(.054,1.38,.13),'cloth_sick_blanket',
                 (x,-.281,.679),radius=.022,obstacle=False)
    soft_box('Sick_bed_pillow',p,0,(.65,.400,.115),'cloth_sick_linen',(0,.685,.770),radius=.055,obstacle=False)
    for x in (-.407,.407):
        for y in (-.858,.858):
            rpole('Sick_bed_leg',p,0,(x,y,.099),(x,y,.536),.031,'steel',sides=16)
            rpole('Sick_bed_castor',p,0,(x-.028,y,.061),(x+.028,y,.061),.061,'black',sides=16)
            rpole('Sick_bed_castor_pin',p,0,(x-.034,y,.061),(x+.034,y,.061),.018,'brass',sides=12)
        rpole('Sick_bed_lower_stretcher',p,0,(x,-.85,.19),(x,.85,.19),.021,'steel',sides=14)
    for y,top in ((-.963,.716),(.963,.946)):
        for x in (-.387,.387):
            rpole('Sick_bed_end_post',p,0,(x,y,.53),(x,y,top),.028,'sick_powdercoat',sides=14)
        rpole('Sick_bed_end_top',p,0,(-.387,y,top),(.387,y,top),.028,'sick_powdercoat',sides=14)
    for y in (-.63,-.05):
        rpole('Sick_bed_grip_leg',p,0,(.446,y,.549),(.446,y,.808),.020,'steel',sides=12)
    rpole('Sick_bed_grip',p,0,(.446,-.63,.808),(.446,-.05,.808),.020,'steel',sides=12)


def medicine_case(position):
    from sunny_room_accuracy import soft_box
    p=position;rot=math.pi/2
    wood='timber'
    for x in (-.44,.44):
        soft_box('Sick_cabinet_side',p,rot,(.058,.429,1.87),wood,(x,0,1.008),radius=.012)
    rbox('Sick_cabinet_back',p,rot,(.90,.045,1.86),wood,(0,.198,1.003))
    for z in (.138,.62,1.003,1.374,1.918):
        rbox('Sick_cabinet_shelf',p,rot,(.92,.426,.047),wood,(0,0,z))
    soft_box('Sick_cabinet_foot',p,rot,(.87,.40,.13),'darkwood',(0,0,.066),radius=.018)
    for x in (-.219,.219):
        soft_box('Sick_cabinet_door',p,rot,(.414,.051,.414),wood,(x,-.208,.387),radius=.020,obstacle=False)
        rbox('Sick_cabinet_glass',p,rot,(.367,.027,1.218),'glass',(x,-.220,1.268),obstacle=False)
        for side in (-1,1):
            rbox('Sick_cabinet_glass_stile',p,rot,(.043,.058,1.302),wood,(x+side*.198,-.223,1.268),obstacle=False)
            rbox('Sick_cabinet_glass_rail',p,rot,(.397,.058,.056),wood,(x,-.223,1.268+side*.628),obstacle=False)
        rpole('Sick_cabinet_pull',p,rot,(x*.26,-.255,1.086),(x*.26,-.255,1.181),.012,'brass',sides=12)
    for row,z in enumerate((.644,1.027,1.398)):
        for index in range(5):
            x=(index-2)*.145
            height=.111+((index*2+row)%4)*.025
            radius=.037+(index%3)*.007
            rpole('Sick_medicine_vial',p,rot,(x,.024,z),(x,.024,z+height),radius,
                  ('sick_amber','sick_powdercoat','glass')[(row+index)%3],sides=18,radius2=radius*.93)
            rpole('Sick_medicine_cap',p,rot,(x,.024,z+height),(x,.024,z+height+.022),radius*.73,
                  'darkwood',sides=14)
            rbox('Sick_medicine_label',p,rot,(radius*1.49,.008,.044),'paper',
                 (x,.025-radius,z+.066),obstacle=False)


def chart_station(position,wall_x):
    from sunny_room_accuracy import repaint_family
    p=position;rot=math.pi/2
    desk('Sick_desk',p,rot,1.31,.583,.762)
    swivel_chair('Sick_chair',(p[0]+.88,p[1]+.10,p[2]),-math.pi/2)
    repaint_family('Sick_chair_seat','upholstery_sick_green')
    repaint_family('Sick_chair_back','upholstery_sick_green')
    rbox('Sick_chart_cover',p,rot,(.323,.253,.021),'darkwood',(-.17,-.005,.797),obstacle=False)
    rbox('Sick_chart_pages',p,rot,(.302,.232,.010),'paper',(-.17,-.005,.812),obstacle=False)
    for i in range(5):
        rbox('Sick_chart_rule',p,rot,(.237-i*.012,.003,.001),'sick_cork',
             (-.174,-.075+i*.026,.818),obstacle=False)
    centre=(wall_x+.018,p[1],p[2])
    rbox('Sick_bulletin_board',centre,rot,(1.19,.048,.73),'sick_cork',(0,0,1.625),obstacle=False)
    for side in (-1,1):
        rbox('Sick_board_stile',centre,rot,(.038,.059,.77),'timber',(side*.601,0,1.625),obstacle=False)
        rbox('Sick_board_rail',centre,rot,(1.19,.059,.038),'timber',(0,0,1.625+side*.37),obstacle=False)
    for i,(x,z) in enumerate(((-.39,1.61),(-.075,1.725),(.25,1.57),(.41,1.775))):
        rise=.27 if i%2==0 else .194
        rbox('Sick_notice',centre,rot,(.223,.009,rise),'paper',(x,-.031,z),obstacle=False)
        sphere('Sick_notice_pin',L(centre,rot,x,-.038,z+rise*.38),(.014,.011,.013),'red',segments=12,rings=8)


def finish_infirmary(room,cy,floor):
    from sunny_room_accuracy import remove_family
    for family in ('Sick_bed','Sick_desk','Sick_chair','Sick_cabinet','Sick_poster','Sick_blanket',
                   'Sick_bulletin_board','Sick_notice','Sick_pin','Sick_first_aid','Sick_medicine'):
        remove_family(family)
    x=room['x'][0]
    bed=(23.52,cy-8.73,floor)
    infirmary_bed(bed)
    cabinet=(x+.41,cy-9.91,floor)
    medicine_case(cabinet)
    chart_station((x+.55,cy-6.97,floor),x+.09)
    room['infirmaryLayout']={'bed':list(bed),'cabinet':list(cabinet),'doorCorridorY':cy-5.0}
