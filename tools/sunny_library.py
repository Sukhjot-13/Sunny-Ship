"""R12 built-in library with cloth bindings, shaped seats and a survey station."""
import math
import random

import bmesh
import bpy
from mathutils import Vector

from sunny_exterior import PALETTE, _mesh, finish, material, open_volume_slot, pole, sphere
from sunny_interiors import L, _merge, hatch, rbox


PALETTE.update({
    'library_walnut': '#775032', 'library_oak': '#b8814d', 'library_inlay': '#dec298',
    'library_casing': '#795c41', 'library_leather': '#693b35', 'library_log': '#39596c',
    'paper_library': '#d2b98f', 'paper_chart': '#e4d3af', 'library_chart_ink': '#3b5a53',
    'library_binding0': '#75463e', 'library_binding1': '#525f4f', 'library_binding2': '#3c5268',
    'library_binding3': '#8a704d', 'library_binding4': '#675666', 'library_binding5': '#a38562',
    'upholstery_library_green': '#396a57', 'upholstery_library_ochre': '#a58c3e',
    'upholstery_library_red': '#703a37', 'tile_library_blue': '#3c5d79', 'tile_library_sage': '#8c9b75',
})


class Joinery:
    def __init__(self):
        self.vertices, self.faces, self.finishes = [], [], []

    def face(self, corners, coating):
        first=len(self.vertices)
        self.vertices.extend(corners)
        self.faces.append(tuple(range(first,len(self.vertices))))
        self.finishes.append(coating)

    def block(self, position, rotation, size, coating, centre=(0,0,0), tilt=0):
        hx,hy,hz=(value/2 for value in size)
        local=[(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),
               (-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
        points=[L(position,rotation,centre[0]+x*math.cos(tilt)-z*math.sin(tilt),centre[1]+y,
                  centre[2]+z*math.cos(tilt)+x*math.sin(tilt)) for x,y,z in local]
        for indices in ((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)):
            self.face([points[index] for index in indices],coating)

    def export(self,name):
        model=_merge('Sunny_'+name,self.vertices,self.faces,self.finishes)
        model['sunny_authored']=True
        model['sunny_feature']='Library'
        return model


def built_in_cases(cx,cy,floor):
    records=[]
    for index,bay in enumerate(range(3,48,6)):
        angle=bay*math.tau/48
        width=1.29+.09*abs(math.cos(angle))
        position=(cx+4.77*math.cos(angle),cy+5.32*math.sin(angle),floor+.78)
        rotation=math.atan2(5.5*math.cos(angle),-4.95*math.sin(angle))
        name='Library_case%d'%index
        rbox(name+'_back',position,rotation,(width,.09,2.05),'library_walnut',(0,-.064,1.025),obstacle=False)
        for side in (-1,1):
            rbox(name+'_stile',position,rotation,(.07,.31,2.05),'library_oak',(side*(width/2-.035),.063,1.025),obstacle=False)
        for shelf in range(5):
            z=.057+shelf*.477
            rbox(name+'_shelf',position,rotation,(width,.29,.052),'library_walnut',(0,.064,z),obstacle=False)
            rbox(name+'_lip',position,rotation,(width,.045,.028),'library_oak',(0,.210,z-.006),obstacle=False)
        rng=random.Random(510+bay)
        bindings=Joinery();count=0
        for row in range(4):
            cursor=-width/2+.092;bottom=.083+row*.477
            while cursor<width/2-.14:
                book=rng.uniform(.052,.119);tall=rng.uniform(.24,.409)
                centre=cursor+book/2
                if centre+book/2>width/2-.055:break
                spine=rng.uniform(.145,.181);depth=rng.uniform(.177,.207)
                colour='library_binding%d'%rng.randrange(6)
                bindings.block(position,rotation,(book-.017,depth,tall-.025),'paper_library',(centre,spine-depth/2,bottom+tall/2))
                for side in (-1,1):
                    bindings.block(position,rotation,(.009,depth+.015,tall),colour,
                                   (centre+side*(book/2-.0045),spine-depth/2,bottom+tall/2))
                bindings.block(position,rotation,(book,.018,tall),colour,(centre,spine+.011,bottom+tall/2))
                for fraction in (.17,.79):
                    bindings.block(position,rotation,(book*.68,.0025,.009),'library_inlay',
                                   (centre,spine+.022,bottom+tall*fraction))
                if count%7==4:
                    bindings.block(position,rotation,(book*.64,.0025,.075),'library_log',
                                   (centre,spine+.022,bottom+tall*.58))
                cursor+=book+rng.uniform(.004,.021);count+=1
        books=bindings.export(name+'_bound_volumes');books['sunny_library_books']=count
        records.append({'bay':bay,'bookcase':name,'boundVolumes':count,'centre':list(position)})
    return records


def cushioned_arc(name,centre,arcs,cross,key):
    vertices,faces=[],[];width=len(cross)
    start,end=arcs
    steps=math.ceil((end-start)/.033)
    for index in range(steps+1):
        angle=start+(end-start)*index/steps
        for offset,height in cross:
            vertices.append((centre[0]+(4.55+offset)*math.cos(angle),
                             centre[1]+(5.12+offset)*math.sin(angle),centre[2]+height))
    for index in range(steps):
        for column in range(width):
            current=index*width+column;following=index*width+(column+1)%width
            faces.append((current,current+width,following+width,following))
    faces.extend((tuple(reversed(range(width))),tuple(range(len(vertices)-width,len(vertices)))))
    obj=finish(_mesh(name,vertices,faces),name,key,obstacle=True)
    mesh=bmesh.new();mesh.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces));mesh.to_mesh(obj.data);mesh.free()
    for face in obj.data.polygons:face.use_smooth=face.index<steps*width
    obj['sunny_rail']=True
    return obj


def rolling_benches(centre):
    for side,arc in enumerate(((-2.57,-.28),(.30,2.27))):
        prefix='Library_bench%d'%side
        cushioned_arc(prefix+'_plinth',centre,arc,[(-.72,.02),(-.03,.02),(-.03,.44),(-.72,.44)],'library_walnut')
        cushioned_arc(prefix+'_seat',centre,arc,[(-.76,.445),(-.70,.411),(-.04,.411),(-.03,.51),
                                                (-.18,.52),(-.68,.52),(-.75,.49)],'upholstery_library_green')
        cushioned_arc(prefix+'_back',centre,arc,[(-.28,.50),(-.05,.50),(.005,.95),(-.01,1.02),
                                                (-.16,1.05),(-.22,1.00),(-.26,.93)],'upholstery_library_green')
        accents=Joinery()
        for number in range(7):
            angle=arc[0]+(arc[1]-arc[0])*(number+.5)/7
            inner=Vector((centre[0]+3.818*math.cos(angle),centre[1]+4.388*math.sin(angle),centre[2]))
            tangent=math.atan2(4.39*math.cos(angle),-3.82*math.sin(angle))
            accents.block(inner,tangent,(.40,.013,.14),'library_oak',(0,.009,.235))
        accents.export(prefix+'_recesses')


def upholstered_chair(name,centre,rotation,key):
    sphere(name+'_seat',L(centre,rotation,0,.0,.55),(.29,.27,.105),key,segments=24,rings=12)['sunny_obstacle']=True
    points=[];faces=[];columns=22;rows=10
    for surface in (-1,1):
        for row in range(rows+1):
            v=row/rows
            for column in range(columns+1):
                u=column/columns*2-1
                x=u*(.285-.047*v)
                y=-.20-.135*v+.104*u*u+surface*.034
                z=.53+v*(.64-.13*u*u)
                points.append(L(centre,rotation,x,y,z))
    stride=columns+1;offset=stride*(rows+1)
    for row in range(rows):
        for column in range(columns):
            index=row*stride+column
            face=(index,index+1,index+stride+1,index+stride)
            faces.extend((face,tuple(offset+index for index in reversed(face))))
    border=[*range(stride),*(row*stride+columns for row in range(1,rows+1)),
            *(rows*stride+column for column in range(columns-1,-1,-1)),*(row*stride for row in range(rows-1,0,-1))]
    for a,b in zip(border,border[1:]+border[:1]):faces.append((a,b,b+offset,a+offset))
    shell=finish(_mesh(name+'_shell',points,faces),name+'_shell',key,obstacle=True)
    mesh=bmesh.new();mesh.from_mesh(shell.data)
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces));mesh.to_mesh(shell.data);mesh.free()
    pole(name+'_column',L(centre,rotation,0,0,.075),L(centre,rotation,0,0,.48),.058,'brass',sides=16)
    pole(name+'_foot',centre,L(centre,rotation,0,0,.075),.17,'library_walnut',sides=20)


def navigation_table(cx,cy,floor):
    position=(cx-.40,cy,floor);radius=.84
    for name,low,high,rad,key in (('plinth',.02,.095,.68,'library_walnut'),('pedestal',.092,.70,.58,'library_walnut'),
                                  ('edge',.699,.748,.855,'library_oak'),('top',.747,.76,radius,'library_walnut')):
        piece=pole('Library_central_table_'+name,(position[0],cy,floor+low),(position[0],cy,floor+high),rad,key,sides=8)
        piece['sunny_obstacle']=True
    panels=Joinery()
    for side in range(8):
        angle=(side+.5)*math.tau/8
        tangent=angle+math.pi/2
        p=L(position,angle,.537,0,0)
        panels.block(p,tangent,(.33,.026,.40),'library_oak',(0,0,.379))
        panels.block(p,tangent,(.268,.029,.331),'library_walnut',(0,-.012,.379))
        first=angle-math.pi/8;second=angle+math.pi/8
        outer=L(position,angle,.71,0,.7615)
        left=L(position,first,.23,0,.7615);right=L(position,second,.23,0,.7615)
        panels.face((L(position,angle,.09,0,.7615),left,outer,right),'library_inlay' if side%2 else 'library_oak')
    table=panels.export('Library_central_table_marquetry')
    table['sunny_reference']='R12 octagonal panelled chart table; timber compass rose is reconstructed ornament'
    for index,angle in enumerate((-.76,.98,2.20,-1.68)):
        p=L(position,angle,1.43,0,0)
        upholstered_chair('Library_table_chair%d'%index,p,angle-math.pi/2,'upholstery_library_ochre')


def survey_station(cx,cy,floor):
    from sunny_room_accuracy import soft_box
    position=(cx+3.03,cy,floor)
    soft_box('Library_survey_base',position,0,(.79,1.82,.74),'library_walnut',(0,0,.38),radius=.035)
    slope=.43;facing=math.atan(slope)
    model=Joinery()
    model.block(position,0,(.85,1.95,.065),'library_oak',(0,0,.974),tilt=facing)
    for lateral in (-.87,.87):
        model.block(position,0,(.86,.027,.059),'library_inlay',(0,lateral,1.003),tilt=facing)
    for y in (-.62,0,.62):
        model.block(position,0,(.04,.55,.19),'library_oak',(-.415,y,.49))
        model.block(position,0,(.045,.44,.115),'library_walnut',(-.441,y,.49))
        model.block(position,0,(.047,.14,.032),'library_inlay',(-.451,y,.49))
    def chart(x,y,height=.0):return L(position,0,x,y,1.013+slope*x+height)
    model.face([chart(x,y) for x,y in ((-.342,-.58),(.31,-.58),(.31,.48),(-.342,.48))],'paper_chart')
    for x in (-.31,-.18,-.05,.08,.21,.28):
        model.face([chart(a,b,.002) for a,b in ((x-.001,-.553),(x+.001,-.553),(x+.001,.449),(x-.001,.449))],'library_chart_ink')
    for y in (-.52,-.354,-.188,-.022,.144,.31,.42):
        model.face([chart(a,b,.002) for a,b in ((-.31,y-.001),(.28,y-.001),(.28,y+.001),(-.31,y+.001))],'library_chart_ink')
    for centre_x,centre_y,sx,sy in ((-.12,-.28,.138,.19),(.144,.13,.096,.11),(-.14,.29,.064,.092)):
        outline=[(-1,-.4),(-.66,-.78),(-.14,-1),(.48,-.79),(.9,-.22),(.64,.29),(.91,.52),(.23,.92),(-.48,1),(-.75,.51)]
        model.face([chart(centre_x+x*sx,centre_y+y*sy,.004) for x,y in outline],'library_chart_ink')
    model.export('Library_survey_chart')
    soft_box('Library_survey_log',L(position,0,.12,.72,1.04),.12,(.29,.40,.072),'library_leather',radius=.014,obstacle=False)
    pole('Library_survey_chart_roller',chart(-.343,-.594,.012),chart(-.343,.50,.012),.014,'library_walnut',sides=12)
    for y in (-.53,.44):
        sphere('Library_survey_chart_weight',chart(.268,y,.027),(.034,.034,.021),'brass',segments=12,rings=6)
    upholstered_chair('Library_survey_chair',L(position,0,-1.05,0,0),-math.pi/2,'upholstery_library_red')
    return list(position)


def library_details(room,floor):
    from sunny_room_accuracy import remove_family
    cx=sum(room['x'])/2;cy=sum(room['y'])/2
    for family in ('Library_books','Library_bench','Library_clock','Library_mapdesk','Library_chart',
                   'Library_globe','Library_shiplog','Library_chair'):
        remove_family(family)
    cases=built_in_cases(cx,cy,floor)
    rolling_benches((cx,cy,floor))
    navigation_table(cx,cy,floor)
    survey=survey_station(cx,cy,floor)
    room['libraryLayout']={'centre':[cx,cy,floor],'cases':cases,'surveyStation':survey,'source':'R12 and supplied anime Library still'}


def library_bath_access(objects,cx,cy,bottom,top):
    x,y=cx-2.18,cy+2.83
    width,depth=1.48,1.40
    for obj in objects:
        if obj.name=='Cylinder002':
            open_volume_slot(obj,x-width/2-.08,x+width/2+.08,y-depth/2-.08,y+depth/2+.08,bottom+.12,top+2.08)
    hatch('BathLadderHatch',(x,y,top),math.pi,(width,depth),lid_key='library_walnut',
          rooms=('Library','Bath Washroom'),mode='lift')
    for side in (-1,1):
        pole('Library_bath_ladder_rail',(x-.51,y+side*.32,bottom+.018),
             (x-.51,y+side*.32,top-.08),.047,'library_walnut',sides=10)
    steps=math.ceil((top-bottom)/.29)
    for step in range(steps+1):
        height=bottom+.13+(top-bottom-.25)*step/steps
        pole('Library_bath_ladder_rung',(x-.51,y-.32,height),(x-.51,y+.32,height),.027,'library_oak',sides=12)
    return {'id':'library-bath-ladder','label':'Library Bath ladder','hatch':'BathLadderHatch',
            'points':[[x,y,bottom],[x,y,top],[x+1.47,y,top]],
            'reference':'R12 upright timber ladder and ceiling opening; reconstructed safety lid and clearances'}


def library_ceiling_finish(objects):
    for obj in objects:
        if obj.name not in ('Sunny_Library_ceiling','Sunny_InteriorFloor_F3_bath'):continue
        mesh=obj.data
        slot=len(mesh.materials);mesh.materials.append(material('library_casing'))
        for face in mesh.polygons:
            if (obj.matrix_world.to_3x3()@face.normal).z < -.95:
                face.material_index=slot
