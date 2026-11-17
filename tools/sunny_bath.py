"""R12 Bath and washroom fixtures within the retained domed room."""
import math

import bmesh

from sunny_exterior import PALETTE, material, pole, ring, sphere
from sunny_interiors import L, rbox, rpole


PALETTE.update({
    'bath_jade': '#5a887a', 'bath_porcelain': '#b5d0bf', 'bath_enamel': '#8ba9a1', 'bath_water': '#407e77',
    'bath_pipe': '#8c9b9a', 'bath_cedar': '#a97142', 'bath_stone': '#879a9c',
    'upholstery_bath_mat': '#78577d', 'bath_amber': '#b78656', 'bath_tile': '#cec4a0',
})


def round_rectangle(centre, radii, z, steps=64, exponent=3.4):
    def curve(angle, fn):
        value=fn(angle)
        return math.copysign(abs(value)**(2/exponent),value)
    return [(centre[0]+radii[0]*curve(angle,math.cos),centre[1]+radii[1]*curve(angle,math.sin),centre[2]+z)
            for angle in (i*math.tau/steps for i in range(steps))]


def profiled_basin(name,centre,profile,keys,obstacle):
    from sunny_interiors import _merge
    count=64;vertices=[];faces=[];finishes=[]
    for rx,ry,z in profile:vertices.extend(round_rectangle(centre,(rx,ry),z,count))
    for row in range(len(profile)-1):
        for index in range(count):
            first=row*count+index;following=row*count+(index+1)%count
            faces.append((first,following,following+count,first+count));finishes.append(keys[row])
    faces.extend((tuple(reversed(range(count))),tuple(range(len(vertices)-count,len(vertices)))))
    finishes.extend((keys[0],keys[-1]))
    obj=_merge('Sunny_'+name,vertices,faces,finishes)
    mesh=bmesh.new();mesh.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces));mesh.to_mesh(obj.data);mesh.free()
    for face in obj.data.polygons:face.use_smooth=face.index<len(faces)-2
    obj['sunny_authored']=True;obj['sunny_feature']='Bath';obj['sunny_obstacle']=obstacle
    if obstacle:obj['sunny_rail']=True
    return obj


def bath_tub(cx,cy,floor):
    centre=(cx+.62,cy-2.52,floor)
    profile=((1.68,.94,.015),(1.72,.98,.064),(1.76,1.02,.63),(1.80,1.06,.69),(1.79,1.05,.756),
             (1.74,1.00,.79),(1.56,.85,.79),(1.51,.80,.748),(1.49,.78,.68),
             (1.38,.668,.25),(1.31,.604,.178))
    tub=profiled_basin('Bath_tub_shell',centre,profile,
                       ('bath_cedar','bath_cedar','bath_cedar','bath_jade','bath_jade','bath_jade',
                        'bath_porcelain','bath_porcelain','bath_porcelain','bath_porcelain'),True)
    tub['sunny_reference']='R12 deep communal rounded basin; cedar and green glaze from the supplied anime still'
    water=profiled_basin('Bath_tub_water',centre,((1.319,.614,.19),(1.428,.711,.53)),('bath_water',),False)
    water['sunny_bath_water']=True
    end=centre[0]+1.38
    for sign in (-1,1):
        t=(end,centre[1]+sign*.33,floor+.79)
        pole('Bath_tub_tap_post',t,(t[0],t[1],t[2]+.26),.037,'bath_pipe',sides=18)
        pole('Bath_tub_handle',(t[0],t[1]-.087,t[2]+.22),(t[0],t[1]+.087,t[2]+.22),.022,'bath_pipe',sides=12)
        pole('Bath_tub_spout',(t[0],t[1],t[2]+.218),(t[0]-.21,t[1],t[2]+.17),.029,'bath_pipe',sides=14)
    return {'centre':list(centre),'waterline':floor+.53,'rim':floor+.79}


def shower_bank(cx,cy,floor):
    from sunny_room_accuracy import soft_box
    for angle in (-2.18,-1.91):
        p=(cx+4.27*math.cos(angle),cy+4.78*math.sin(angle),floor)
        rotation=math.atan2(5.0*math.cos(angle),-4.5*math.sin(angle))
        rbox('Bath_shower_dado',p,rotation,(1.11,.125,.62),'bath_enamel',(0,.068,.33))
        for x in (-.25,.25):
            rpole('Bath_shower_flange',p,rotation,(x,.0,.61),(x,.20,.61),.062,'bath_pipe',sides=14)
            rpole('Bath_shower_tap',p,rotation,(x,.10,.61),(x,.28,.641),.026,'bath_pipe',sides=14)
            rpole('Bath_shower_handle',p,rotation,(x-.075,.21,.659),(x+.075,.21,.659),.014,'bath_pipe',sides=8)
        height=1.94
        rpole('Bath_shower_riser',p,rotation,(0,.139,.72),(0,.139,height-.12),.021,'bath_pipe',sides=14)
        previous=(0,.139,height-.12)
        for step in range(1,13):
            angle=step/12*math.pi/2
            point=(0,.139+.11*(1-math.cos(angle)),height-.12+.11*math.sin(angle))
            rpole('Bath_shower_curve',p,rotation,previous,point,.021,'bath_pipe',sides=10)
            previous=point
        rpole('Bath_shower_head_arm',p,rotation,previous,(0,.391,height-.013),.021,'bath_pipe')
        pole('Bath_shower_head',L(p,rotation,0,.391,height),L(p,rotation,0,.391,height-.048),.101,'bath_pipe',radius2=.136,sides=24)
        stool=L(p,rotation,.08,.54,0)
        soft_box('Bath_wash_seat',stool,rotation,(.40,.34,.07),'bath_jade',(0,0,.285),radius=.035)
        for x in (-.14,.14):
            rbox('Bath_wash_seat_brace',stool,rotation,(.052,.268,.245),'bath_jade',(x,0,.122))
        bowl=L(p,rotation,.44,.54,0)
        profiled_basin('Bath_wash_bowl',bowl,((.12,.11,.018),(.18,.17,.115),(.19,.18,.136),(.162,.152,.136),(.112,.102,.032)),
                       ('bath_jade','bath_jade','bath_porcelain','bath_porcelain'),False)
        for bar in range(6):
            rbox('Bath_drain_grate',p,rotation,(.016,.171,.004),'bath_pipe',((bar-2.5)*.026,.867,.007),obstacle=False)


def washroom_sink(cx,cy,floor):
    p=(cx+2.32,cy+2.49,floor)
    pole('Bath_wash_pedestal',p,L(p,0,0,0,.84),.145,'bath_jade',radius2=.089,sides=32)['sunny_obstacle']=True
    profiled_basin('Bath_wash_basin',p,((.244,.19,.793),(.398,.267,.878),(.407,.274,.949),(.364,.235,.949),(.274,.155,.829)),
                   ('bath_jade','bath_jade','bath_porcelain','bath_porcelain'),True)
    rpole('Bath_wash_faucet',p,math.pi,(0,.163,.92),(0,.163,1.205),.021,'bath_pipe',sides=16)
    rpole('Bath_wash_spout',p,math.pi,(0,.163,1.205),(0,-.015,1.138),.018,'bath_pipe',sides=16)
    sphere('Bath_wash_mirror',L(p,math.pi,0,.256,1.58),(.32,.016,.395),'glass',segments=36,rings=18)
    frame=ring('Bath_wash_mirror_frame',L(p,math.pi,0,.241,1.58),.334,.019,'bath_jade','Y',48,10)
    frame.scale.y=1.20
    rbox('Bath_wash_mat',(cx+1.99,cy+3.10,floor),0,(.57,.42,.022),'upholstery_bath_mat',(0,0,.012),obstacle=False)


def bath_partition_lattice(cx,cy,floor):
    y=cy+4.6*.45
    for start,end in ((cx-2.81,cx-.75),(cx+.75,cx+2.81)):
        rbox('Bath_partition_panel',((start+end)/2,y-.092,floor),0,(end-start,.031,1.54),'bath_cedar',
             (0,0,1.596),obstacle=False)
        for direction in (-1,1):
            rise=direction*.93
            for station in range(-6,14):
                offset=start+station*.225
                x0=max(start,min(end,offset))
                x1=max(start,min(end,offset+rise*1.54))
                if abs(x0-x1)<.02:continue
                lo,hi=(x0-offset)/rise,(x1-offset)/rise
                if not (0<=lo<=1.54 and 0<=hi<=1.54):continue
                pole('Bath_partition_lattice',(x0,y-.12,floor+.825+lo),(x1,y-.12,floor+.825+hi),
                     .012,'bath_enamel',sides=6)
        for level in (.81,2.38):
            pole('Bath_partition_trim',(start,y-.122,floor+level),(end,y-.122,floor+level),.024,'bath_amber',sides=8)


def bath_details(cx,cy,floor,room):
    from sunny_room_accuracy import remove_family,soft_box
    for name in ('Bath_tub','Bath_wash_sink','Bath_shower','Bath_wash_bowl','Bath_wash_stool',
                 'Bath_wash_mirror','Bath_wash_tap','Bath_vent','Bath_towel'):
        remove_family(name)
    room['bathLayout']=bath_tub(cx,cy,floor)
    shower_bank(cx,cy,floor)
    washroom_sink(cx,cy,floor)
    bath_partition_lattice(cx,cy,floor)
    p=(cx-.37,cy-4.20,floor)
    rbox('Bath_vent_casing',p,0,(.72,.065,.405),'bath_amber',(0,0,2.17),obstacle=False)
    for row in range(5):
        rbox('Bath_vent_slats',p,0,(.63,.038,.041),'bath_pipe',(0,.04,2.02+row*.075),obstacle=False)
    shelf=(cx+1.47,cy+2.20,floor)
    rbox('Bath_wash_towel_shelf',shelf,0,(.62,.25,.055),'bath_cedar',(0,0,.92),obstacle=False)
    for index in range(3):
        soft_box('Bath_wash_folded_towel',shelf,0,(.41,.215,.07),'linen',(0,0,.983+index*.065),radius=.024,obstacle=False)


def bath_floor_finish(obj,cx,cy):
    from sunny_room_accuracy import tile_floor
    wet_edge=cy+4.6*.45
    tile_floor(obj,.55,('bath_stone',),(cx-4.7,cx+4.7,cy-5.2,wet_edge))
    dry=len(obj.data.materials);obj.data.materials.append(material('bath_cedar'))
    for face in obj.data.polygons:
        if face.normal.z>.98 and face.center.y>=wet_edge:
            face.material_index=dry
    obj['sunny_floor_pattern']='R12 wet pebble mosaic and dry timber separated by the Bath partition'
