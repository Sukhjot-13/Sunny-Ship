"""SBS-led interior construction in human metres, after the exterior build.

Primary references are the supplied Volume 46 SBS room drawings and their anime
colour sheets in stuff/images. Hidden dimensions follow the enlarged hull; no
furniture dimension is multiplied by the experience scale. This pass changes
real geometry/material regions, leaving surface textures to the following phase.
"""
import math
import bpy
import bmesh
from mathutils import Vector
from sunny_exterior import PALETTE, material, box, pole, ring, sphere, text, clip_face, assign_world_mesh
from sunny_interiors import L, rbox, rpole, sofa, armchair, stool, desk, shelf_unit, laundry_hamper

PALETTE.update({
    'tile_ivory': '#e9ddbd', 'tile_dark': '#394344',
    'tile_blue': '#355974', 'tile_sage': '#a4b776',
    'upholstery_teal': '#3c8b7f', 'upholstery_lilac': '#be8db3',
    'cloth_aqua': '#a8d5c6', 'lamp_glow': '#ffe7ad',
    'steel': '#6c777a', 'paper': '#f3e4c7',
})


def soft_box(name, p, rot, dims, key, off=(0, 0, 0), radius=.035, obstacle=True):
    """Closed rounded furniture part, with flat panels and smooth curved edges."""
    obj = rbox(name, p, rot, dims, key, off, obstacle=obstacle)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(radius, min(dims)*.4), segments=3, affect='EDGES')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    for face in obj.data.polygons:
        face.use_smooth = max(abs(v) for v in face.normal) < .999
    return obj


def remove_family(prefix):
    """Replace only a named provisional furnishing, preserving the ship shell."""
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Sunny_'+prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def repaint_family(prefix, key):
    """Assign the supplied anime upholstery/metal palette to a fixture family."""
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.name.startswith('Sunny_'+prefix):
            obj.data.materials.clear()
            obj.data.materials.append(material(key))
            for face in obj.data.polygons:
                face.material_index = 0


def tile_floor(obj, size, keys, bounds=None):
    """Split the existing top face into tiles; no overlay or duplicate floor."""
    vertices, faces, materials = [], [], []
    lookup = {mat.name: i for i, mat in enumerate(obj.data.materials)}
    slots = list(obj.data.materials)
    for key in keys:
        mat = material(key)
        if mat.name not in lookup:
            lookup[mat.name] = len(slots)
            slots.append(mat)

    def emit(polygon, index):
        clean=[]
        for point in polygon:
            if not clean or (point-clean[-1]).length>1e-7:
                clean.append(point)
        if len(clean)>1 and (clean[0]-clean[-1]).length<1e-7:
            clean.pop()
        area=Vector((0,0,0))
        for a,b in zip(clean,clean[1:]+clean[:1]):
            area+=a.cross(b)
        if len(clean)>=3 and area.length>1e-8:
            faces.append(tuple(range(len(vertices), len(vertices)+len(clean))))
            vertices.extend(clean)
            materials.append(index)

    for face in obj.data.polygons:
        points = [obj.matrix_world @ obj.data.vertices[i].co for i in face.vertices]
        normal = (points[1]-points[0]).cross(points[2]-points[0])
        if normal.length < 1e-9 or normal.normalized().z < .99:
            emit(points, face.material_index)
            continue
        inside = points
        if bounds:
            for axis, edge, above in ((0,bounds[0],True),(0,bounds[1],False),(1,bounds[2],True),(1,bounds[3],False)):
                emit(clip_face(inside, axis, edge, not above), face.material_index)
                inside = clip_face(inside, axis, edge, above)
                if len(inside) < 3:
                    break
        if len(inside) < 3:
            continue
        x0 = math.floor(min(p.x for p in inside)/size)
        x1 = math.floor(max(p.x for p in inside)/size)
        y0 = math.floor(min(p.y for p in inside)/size)
        y1 = math.floor(max(p.y for p in inside)/size)
        for i in range(x0, x1+1):
            strip = clip_face(clip_face(inside,0,i*size,True),0,(i+1)*size,False)
            if len(strip) < 3:
                continue
            for j in range(y0, y1+1):
                cell = clip_face(clip_face(strip,1,j*size,True),1,(j+1)*size,False)
                emit(cell, lookup['Sunny_'+keys[(i+j)%len(keys)]])
    mesh = bpy.data.meshes.new(obj.name+'_sbs_tiles')
    mesh.from_pydata(vertices, [], faces)
    mesh.validate()
    for mat in slots:
        mesh.materials.append(mat)
    for face, index in zip(mesh.polygons, materials):
        face.material_index = index
        face.use_smooth = False
    mesh.update()
    assign_world_mesh(obj, mesh)
    obj['sunny_floor_pattern'] = 'SBS checkerboard'


def cloth_panel(name, p, rot, width, height, folds=9, key='cloth_aqua'):
    """Closed folded fabric hanging from its own real header rail."""
    steps = folds*8
    verts, faces = [], []
    for depth in (-.004, .004):
        for z in (0, height):
            for i in range(steps+1):
                x = (i/steps-.5)*width
                y = depth + .042*math.sin(i/steps*math.tau*folds)
                verts.append(L(p, rot, x, y, z))
    n = steps+1
    for i in range(steps):
        faces.extend(((i,i+1,n+i+1,n+i), (2*n+i,3*n+i,3*n+i+1,2*n+i+1),
                      (i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)))
    faces.extend(((0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material(key))
    mesh.update()
    obj = bpy.data.objects.new('Sunny_'+name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj['sunny_authored'] = True
    obj['sunny_obstacle'] = False
    obj['sunny_walkable'] = False
    obj['sunny_fabric'] = True
    rpole(name+'_rail', p, rot, (-width/2-.04,0,height+.03),(width/2+.04,0,height+.03),.018,'brass')
    return obj


def pendant(name, p, ceiling, room):
    """Supported marine lamp and light record for the later lighting phase."""
    x, y, z = p
    pole(name+'_ceiling_mount',(x,y,ceiling-.03),(x,y,ceiling+.02),.07,'brass',sides=16)
    pole(name+'_chain',(x,y,z+.20),(x,y,ceiling-.03),.011,'black',sides=8)
    sphere(name+'_bulb',(x,y,z),(.105,.105,.17),'lamp_glow',segments=20,rings=12)
    for dz, radius in ((-.17,.05),(.17,.06),(0,.117)):
        ring(name+'_cage_ring',(x,y,z+dz),radius,.014,'brass')
    for i in range(6):
        a=i*math.tau/6
        pole(name+'_cage',(x+.05*math.cos(a),y+.05*math.sin(a),z-.17),
             (x+.06*math.cos(a),y+.06*math.sin(a),z+.17),.009,'brass',sides=6)
    return dict(room=room,pos=[x,y,z],colour='#ffda98',intensity=28,distance=12)


def rounded_table(name, p, radius=.85, height=.76, sides=8):
    """The library's octagonal central table and panelled pedestal."""
    top = pole(name+'_top',(p[0],p[1],p[2]+height-.045),(p[0],p[1],p[2]+height),radius,'timber',sides=sides)
    top['sunny_obstacle'] = True
    body = pole(name+'_pedestal',(p[0],p[1],p[2]+.06),(p[0],p[1],p[2]+height-.055),radius*.64,'darkwood',sides=sides)
    body['sunny_obstacle'] = True
    for i in range(sides):
        a=(i+.5)*math.tau/sides
        rpole(name+'_panel',p,a,(radius*.64,-.15,.17),(radius*.64,-.15,height-.16),.015,'gold')


def stocked_shelf(name, p, rot=0, width=2, tiers=4):
    """Pantry's raw stores on open shelving, rather than empty cabinet boxes."""
    shelf_unit(name,p,rot,width,.42,2.0,tiers)
    for row in range(tiers):
        z=.12+1.8*row/max(1,tiers-1)+.045
        for i in range(5):
            x=-width*.4+i*width*.2
            if row%2:
                rpole(name+'_jar',p,rot,(x,0,z),(x,0,z+.23),.075,'white',sides=14)
                rpole(name+'_lid',p,rot,(x,0,z+.23),(x,0,z+.25),.08,'timber',sides=14)
            else:
                sphere(name+'_produce',L(p,rot,x,0,z+.085),(.12,.10,.085),('orange','leaf','cream','red','gold')[i])


def curved_bench_part(name, centre, inner, outer, bottom, top, start, end, key):
    """Closed annular seating with real curved sides, rather than spaced chairs."""
    count=math.ceil((end-start)/.045)
    vertices=[]
    for z in (bottom,top):
        for radius in (inner,outer):
            vertices.extend((centre[0]+radius*math.cos(start+(end-start)*i/count),
                             centre[1]+radius*math.sin(start+(end-start)*i/count),
                             centre[2]+z) for i in range(count+1))
    n=count+1
    faces=[]
    for i in range(count):
        faces.extend(((i,n+i,n+i+1,i+1),(2*n+i,2*n+i+1,3*n+i+1,3*n+i),
                      (i,i+1,2*n+i+1,2*n+i),(n+i,3*n+i,3*n+i+1,n+i+1)))
    faces.extend(((0,2*n,3*n,n),(n-1,2*n-1,4*n-1,3*n-1)))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.materials.append(material(key))
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.update()
    for face in mesh.polygons:
        face.use_smooth=abs(face.normal.z)<.01 and face.index<4*count
    obj=bpy.data.objects.new('Sunny_'+name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj['sunny_authored']=True;obj['sunny_obstacle']=True
    obj['sunny_walkable']=False;obj['sunny_rail']=True
    obj['sunny_reference']='SBS p195 and supplied anime Library: continuous curved perimeter bench'
    return obj


def library_details(room, floor):
    """Reference green encircling seating, chart desk and central octagonal table."""
    cx=(room['x'][0]+room['x'][1])/2
    cy=(room['y'][0]+room['y'][1])/2
    remove_family('Library_bench')
    # Keep the fore door/ladder gap and port bath-stair approach open.
    # Hidden metric endpoints fit the existing enlarged room, not the drawing.
    centre=(cx,cy,floor)
    for name,inner,outer,bottom,top,key in (
        ('plinth',3.68,4.29,.02,.42,'darkwood'),
        ('seat',3.58,4.30,.42,.52,'upholstery_teal'),
        ('back',4.19,4.31,.50,.97,'upholstery_teal')):
        curved_bench_part('Library_bench0_'+name,centre,inner,outer,bottom,top,-2.55,1.87,key)
    # Move the survey desk and its actual attached mapping props to the aft wall.
    shift=Vector((3.25,0,0))
    for obj in bpy.data.objects:
        if obj.name.startswith(('Sunny_Library_mapdesk','Sunny_Library_chart','Sunny_Library_globe','Sunny_Library_shiplog','Sunny_Library_chair')):
            obj.location += shift
    rounded_table('Library_central_table',(cx-.4,cy,floor),.83)
    for i in range(4):
        a=math.pi/4+i*math.tau/4
        p=(cx-.4+1.10*math.cos(a),cy+1.10*math.sin(a),floor)
        stool('Library_table_stool%d'%i,p,a,seat=.46,key='gold')
        soft_box('Library_table_stool%d_cushion'%i,p,a,(.38,.38,.055),'upholstery_teal',(0,0,.51),radius=.02)


def quarters_details(frame, levels, rooms):
    """Laundry, correctly supported suspended bunks and the women's canopy."""
    men=rooms["Men's Quarters"]
    f1=levels['F1']
    laundry_hamper('Quarters_laundry',(men['x'][0]+3.5,-5.75,f1))
    for i in range(3):
        rpole('Quarters_hanger%d'%i,(men['x'][0]+3.5,-5.75,f1),0,(-.21+i*.19,0,1.12),(-.13+i*.19,0,1.23),.01,'brass')
    # Every suspension ends at the real ceiling, independent of ship scale.
    ceiling=levels['F2F']-.18
    for obj in bpy.data.objects:
        if obj.name.startswith('Sunny_Quarters_bunk') and '_rope' in obj.name:
            bpy.context.view_layer.update()
            world=[obj.matrix_world@v.co for v in obj.data.vertices]
            old_top=max(p.z for p in world)
            inv=obj.matrix_world.inverted()
            for vertex,p in zip(obj.data.vertices,world):
                if p.z>old_top-.02:
                    p.z=ceiling
                    vertex.co=inv@p
            obj.data.update()
    for obj in bpy.data.objects:
        if obj.name.startswith('Sunny_Quarters_bunk') and '_ceiling_beam' in obj.name:
            # Shaft cuts may have baked the beam into world-space vertices.
            # Translate by its measured world centre, never assign an absolute
            # object coordinate that would translate already-baked geometry twice.
            bpy.context.view_layer.update()
            points=[obj.matrix_world@v.co for v in obj.data.vertices]
            centre=(min(p.z for p in points)+max(p.z for p in points))*.5
            obj.location.z += ceiling-.06-centre
    women=rooms["Women's Quarters"]
    f2=levels['F2F']
    bx=women['x'][1]-1.1
    by=frame.y(2.2)
    # Bed is rotated pi/2 in the base build. Posts and crown stay human sized.
    p=(bx,by,f2)
    rot=math.pi/2
    for dx in (-.83,.83):
        for dy in (-.95,.95):
            rpole('Womens_canopy_post',p,rot,(dx,dy,.12),(dx,dy,2.15),.035,'brass')
    for dy in (-.95,.95):
        rpole('Womens_canopy_rail',p,rot,(-.88,dy,2.15),(.88,dy,2.15),.035,'brass')
    cloth_panel('Womens_canopy_head',L(p,rot,0,.96,.78),rot,1.75,1.34,8,'upholstery_lilac')
    for dx in (-.78,.78):
        cloth_panel('Womens_canopy_side',L(p,rot,dx,0,1.63),rot+math.pi/2,1.84,.50,8,'upholstery_lilac')
    soft_box('Womens_blanket',p,rot,(1.78,1.25,.055),'upholstery_lilac',(0,-.34,.605),radius=.02,obstacle=False)
    lamp_p=(women['x'][0]+2.1,frame.y(2.25),f2)
    pole('Womens_floor_lamp',(lamp_p[0],lamp_p[1],f2),(lamp_p[0],lamp_p[1],f2+1.35),.024,'brass')
    pole('Womens_floor_lamp_base',(lamp_p[0],lamp_p[1],f2+.015),(lamp_p[0],lamp_p[1],f2+.045),.22,'brass',sides=20)
    pole('Womens_floor_lamp_shade',(lamp_p[0],lamp_p[1],f2+1.30),(lamp_p[0],lamp_p[1],f2+1.65),.28,'linen',radius2=.16,sides=24)


def kitchen_details(cy, floor):
    """SBS giant oven, cooker hood, dish rack, tablecloth and locked fridge."""
    # Kitchen is starboard (+Blender Y), dining is port, as the F2 plan shows.
    p=(13.0,cy+7.4,floor)
    soft_box('Kitchen_giant_oven',p,math.pi/2,(1.50,.72,1.95),'cream',(0,0,.98),radius=.035)
    rbox('Kitchen_giant_oven_glass',p,math.pi/2,(1.20,.035,.91),'black',(0,-.375,1.22),obstacle=False)
    for x in (-.63,.63):
        rbox('Kitchen_oven_frame',p,math.pi/2,(.055,.05,1.04),'brass',(x,-.398,1.22),obstacle=False)
    rpole('Kitchen_oven_handle',p,math.pi/2,(-.43,-.435,.83),(.43,-.435,.83),.025,'brass')
    for x in (-.4,0,.4):
        sphere('Kitchen_oven_knob',L(p,math.pi/2,x,-.405,.47),(.06,.035,.06),'brass')
    remove_family('Kitchen_stove_flue')
    hood=(18.7,cy+10.0,floor+3.40)
    pole('Kitchen_hood_stack',(18.7,cy+10.0,floor+2.12),hood,.17,'steel',sides=16)
    chimney=bpy.data.objects['Sunny_KitchenChimney']
    bpy.context.view_layer.update()
    points=[chimney.matrix_world@vertex.co for vertex in chimney.data.vertices]
    root=Vector(((min(p.x for p in points)+max(p.x for p in points))/2,
                 (min(p.y for p in points)+max(p.y for p in points))/2,min(p.z for p in points)))
    bend=(root.x,root.y,hood[2])
    # The transfer clears partition headers and meets the retained exterior
    # chimney. Its hidden route is reconstructed; the chimney station is fixed.
    pole('Kitchen_hood_transfer',hood,bend,.17,'steel',sides=16)
    pole('Kitchen_hood_riser',bend,root,.17,'steel',sides=16)
    soft_box('Kitchen_hood',(18.7,cy+10.0,floor),0,(1.85,.90,.24),'steel',(0,0,2.12),radius=.035)
    for i in range(6):
        rbox('Kitchen_hood_vent',(18.7,cy+10.0,floor),0,(.025,.92,.08),'black',(-.69+i*.275,0,2.10),obstacle=False)
    # Table top stays the original 0.76 m; fabric adds only its physical thickness.
    cloth_panel('Dining_tablecloth_side',(16.3,cy-5.6-.69,floor+.54),0,6.42,.24,12,'cloth_aqua')
    rbox('Dining_tablecloth',(16.3,cy-5.6,floor),0,(6.42,1.34,.008),'cloth_aqua',(0,0,.792),obstacle=False)
    for i in range(5):
        x=13.1+i*.18
        rpole('Kitchen_plate', (x,cy+9.5,floor+.99),0,(0,0,0),(0,.025,0),.15,'white',sides=24)
    rbox('Kitchen_dish_rack',(13.45,cy+9.5,floor),0,(1.2,.40,.05),'brass',(0,0,.98),obstacle=False)
    for i in range(7):
        rpole('Kitchen_rack_rail',(13.45,cy+9.5,floor),0,(-.52+i*.17,-.18,.98),(-.52+i*.17,.18,.98),.009,'brass')
    fridge=(13.5,cy+1.9,floor)
    rbox('Kitchen_fridge_lock',fridge,math.pi/2,(.19,.06,.10),'black',(.20,-.40,1.11),obstacle=False)
    for i in range(3):
        rbox('Kitchen_fridge_lock_digit',fridge,math.pi/2,(.032,.013,.035),'cream',(.15+i*.045,-.438,1.11),obstacle=False)


def infirmary_details(cy, floor):
    """Chopper's green bed, swivel chair, bulletin board and medicines."""
    repaint_family('Sick_chair_seat','upholstery_teal')
    repaint_family('Sick_chair_back','upholstery_teal')
    soft_box('Sick_blanket',(23.5,cy-8.5,floor),0,(.86,1.48,.045),'cloth_aqua',(0,-.20,.75),radius=.018,obstacle=False)
    p=(24.45,cy-8.3,floor)
    rbox('Sick_bulletin_board',p,-math.pi/2,(1.5,.065,1.15),'upholstery_teal',(0,0,1.60),obstacle=False)
    for i in range(5):
        dx=-.55+(i%3)*.5
        dz=1.45+(i//3)*.44
        rbox('Sick_notice',p,-math.pi/2,(.30,.008,.35),'paper',(dx,-.04,dz),obstacle=False)
        sphere('Sick_pin',L(p,-math.pi/2,dx,-.05,dz+.13),(.016,.016,.016),'red')
    for i in range(5):
        x=22.95+i*.20
        pole('Sick_medicine',(x,cy-2.5,floor+.80),(x,cy-2.5,floor+.98),.055,'glass',sides=16)
        pole('Sick_medicine_lid',(x,cy-2.5,floor+.98),(x,cy-2.5,floor+1.015),.055,'white',sides=16)
    text('Sick_first_aid','+', (23.8,cy-10.76,floor+1.75),.30,'red',(-math.pi/2,0,0))


def workshop_details(rooms, floor):
    """Distinct timber Usopp factory and Franky's metal furnace/scrap station."""
    factory=rooms["Usopp's Main Factory"]
    weapons=rooms["Franky's Weapon Development Room"]
    fx=(factory['x'][0]+factory['x'][1])/2
    wx=(weapons['x'][0]+weapons['x'][1])/2
    text('Factory_sign','USOPP FACTORY',(fx,-9.35,floor+2.35),.30,'darkwood',(math.pi/2,0,math.pi))
    soft_box('Weapons_furnace',(wx,10.0,floor),0,(1.25,.80,1.25),'black',(0,0,.63),radius=.12)
    rbox('Weapons_furnace_mouth',(wx,10.0,floor),0,(.70,.05,.60),'mane',(0,-.43,.56),obstacle=False)
    for i in range(6):
        rpole('Weapons_furnace_grille',(wx,10.0,floor),0,(-.30+i*.12,-.47,.30),(-.30+i*.12,-.47,.81),.014,'steel')
    pole('Weapons_furnace_flue',(wx,10.0,floor+1.25),(wx,10.0,floor+3.0),.13,'black',sides=16)
    for i in range(9):
        p=(18.1+(i%3)*.20,7.4+(i//3)*.23,floor+.22+(i%2)*.15)
        ring('Weapons_scrap_gear',p,.13+i*.01,.035,'steel')
        rpole('Weapons_scrap_tube',p,i*.4,(-.30,0,-.08),(.30,0,.15),.045,'steel')
    rbox('Weapons_scrap_crate',(18.3,7.7,floor),0,(1.10,1.1,.12),'darkwood',(0,0,.08),obstacle=True)
    for x in (17.8,18.8):
        rbox('Weapons_scrap_crate_side',(x,7.7,floor),0,(.08,1.1,.55),'timber',(0,0,.30))


def arched_chamber(name, p, width=3.18, depth=1.18, height=3.3):
    """Closed annular boiler housing around a real barrel-loading cavity."""
    outside,inside=width/2,1.22
    straight=height-outside
    loops=[]
    for radius,base in ((outside,0),(inside,.28)):
        loops.append([(-radius,base),(radius,base)]+[(radius*math.cos(i*math.pi/40),straight+radius*math.sin(i*math.pi/40)) for i in range(41)])
    n=len(loops[0]);verts=[];faces=[]
    for y in (-depth/2,depth/2):
        for loop in loops:
            verts.extend(L(p,0,x,y,z) for x,z in loop)
    for i in range(n):
        j=(i+1)%n
        faces.extend(((i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces);mesh.materials.append(material('steel'));mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
    obj=bpy.data.objects.new('Sunny_'+name,mesh);bpy.context.scene.collection.objects.link(obj)
    obj['sunny_authored']=True;obj['sunny_obstacle']=True;obj['sunny_rail']=True
    obj['sunny_cola_capacity']=3
    return obj


def energy_details(floor):
    """SBS three-barrel cola chamber, curved arch and containment grille."""
    for prefix in ('Energy_tank','Energy_manifold','Energy_pipe','Energy_gauge','Energy_control','Energy_lever'):
        remove_family(prefix)
    p=(23.15,8.55,floor)
    arched_chamber('Energy_cola_chamber',p)
    rbox('Energy_chamber_back',p,0,(2.45,.12,3.0),'black',(0,.50,1.50))
    rbox('Energy_loading_floor',p,0,(2.44,1.02,.12),'steel',(0,0,.34))
    for i in range(3):
        dx=-.79+i*.79
        rpole('Energy_cola_barrel%d'%i,p,0,(dx,-.22,.40),(dx,-.22,1.39),.30,'timber',sides=24)
        for z in (.49,1.27):
            o=ring('Energy_cola_hoop',L(p,0,dx,-.22,z),.305,.025,'black')
        text('Energy_cola_label','COLA',L(p,0,dx,-.527,.91),.12,'white',(math.pi/2,0,0))
    for i in range(9):
        dx=-1.10+i*.275
        rpole('Energy_chamber_grille',p,0,(dx,-.625,.50),(dx,-.625,2.49),.015,'black')
    for z in (.55,2.43):
        rpole('Energy_chamber_grille_cross',p,0,(-1.14,-.625,z),(1.14,-.625,z),.024,'brass')
    for dx in (-.70,.70):
        root=3.3-1.59+math.sqrt(1.59**2-dx**2)-.02
        rpole('Energy_feed_pipe',p,0,(dx,0,root),(dx,0,3.85),.075,'brass')
        rpole('Energy_feed_elbow',p,0,(dx,0,3.85),(dx*.60,0,4.10),.075,'brass')
    for i in range(3):
        rpole('Energy_pressure_gauge',p,0,(-.65+i*.65,-.66,2.94),(-.65+i*.65,-.70,2.94),.11,'white',sides=24)
        rpole('Energy_gauge_needle',p,0,(-.65+i*.65,-.716,2.94),(-.61+i*.65,-.716,3.01),.008,'black')


def bath_details(cx, cy, floor):
    """Communal bath's showers, wash bowls, towels, vent and patterned tiles."""
    repaint_family('Bath_tub_rim','upholstery_teal')
    for i in range(2):
        p=(cx-2.4+i*1.30,cy-3.65,floor)
        rpole('Bath_shower_pipe',p,0,(0,0,.65),(0,0,1.95),.018,'steel')
        rpole('Bath_shower_head_arm',p,0,(0,0,1.95),(0,-.24,1.95),.018,'steel')
        pole('Bath_shower_head',L(p,0,0,-.24,1.94),L(p,0,0,-.24,1.90),.085,'steel',sides=20)
        for dx in (-.17,.17):
            rpole('Bath_wash_tap',p,0,(dx,0,.64),(dx,-.12,.64),.020,'brass')
        stool('Bath_wash_stool',L(p,0,0,-.5,0),seat=.24,key='leaflight')
        ring('Bath_wash_bowl',L(p,0,.33,-.65,.20),.18,.028,'leaflight')
        pole('Bath_wash_bowl_bottom',L(p,0,.33,-.65,.03),L(p,0,.33,-.65,.06),.17,'leaflight',sides=20)
    p=(cx+.2,cy-4.0,floor)
    rbox('Bath_vent',p,0,(.72,.06,.48),'steel',(0,0,2.12),obstacle=False)
    for i in range(6):
        rbox('Bath_vent_slat',p,0,(.63,.025,.023),'black',(0,-.043,1.95+i*.062),obstacle=False)
    for i in range(3):
        soft_box('Bath_towel',(cx+1.1,cy-3.35,floor),0,(.48,.28,.08),'linen',(0,0,.10+i*.083),radius=.015,obstacle=False)
    # Separate mirror and bath towel stand in the entrance washroom.
    p=(cx+2.0,cy+3.83,floor)
    mirror=sphere('Bath_wash_mirror',L(p,math.pi,0,.20,1.55),(.30,.015,.38),'glass',segments=32,rings=16)
    ring('Bath_wash_mirror_frame',L(p,math.pi,0,.22,1.55),.32,.025,'brass','Y')
    rpole('Bath_towel_rail',p,math.pi,(-.3,.2,1.07),(.3,.2,1.07),.018,'brass')
    cloth_panel('Bath_wash_towel',L(p,math.pi,0,.21,.52),math.pi,.40,.54,4,'linen')


def complete_room_fittings(objects, frame, interiors):
    """Apply supplied room silhouettes/palette without altering the exterior."""
    before=set(bpy.data.objects)
    original_names=[obj.name for obj in objects]
    levels=interiors['levels']
    rooms={room['name']:room for room in interiors['rooms']}
    cy=frame.y(.585)
    quarters_details(frame,levels,rooms)
    kitchen_details(cy,levels['F2A'])
    infirmary_details(cy,levels['F2A'])
    library_details(rooms['Library'],levels['F3L'])
    workshop_details(rooms,levels['B1'])
    energy_details(levels['B1'])
    lc=(rooms['Library']['x'][0]+rooms['Library']['x'][1])/2
    bath_details(lc,cy,levels['F3B'])
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and obj.name.startswith(('Sunny_Aquarium_sofa','Sunny_Aquarium_armchair','Sunny_Dining_sofa','Sunny_Womens_sofa')) and any(word in obj.name for word in ('_base','_back','_arm','_cushion')):
            key='upholstery_lilac' if obj.name.startswith('Sunny_Womens') else 'upholstery_teal'
            obj.data.materials.clear();obj.data.materials.append(material(key))
            for face in obj.data.polygons:face.material_index=0
    for i in range(3):
        remove_family('Pantry_shelf%d'%i)
        stocked_shelf('Pantry_shelf%d'%i,(24.0,cy+2+i*3,levels['F2A']),-math.pi/2)
    from sunny_room_details import complete_reference_details
    complete_reference_details(frame, interiors)
    # Patterns belong to the actual floor surface, preserving hatches/headroom.
    for name in ('Sunny_AquariumFloor_entry','Sunny_AquariumFloor_shell'):
        obj=bpy.data.objects.get(name)
        if obj:
            tile_floor(obj,.75,('tile_ivory','tile_dark'))
    tile_floor(bpy.data.objects['Sunny_InteriorFloor_F3_library'],.65,('tile_blue','tile_sage'))
    tile_floor(bpy.data.objects['Sunny_InteriorFloor_lower'],.85,('steel',),(8.5,20.2,cy,13.2))
    tile_floor(bpy.data.objects['Sunny_InteriorFloor_F2_service'],.55,('tile_ivory','tile_dark'),(20.6,24.8,-11.5,cy))
    tile_floor(bpy.data.objects['Sunny_InteriorFloor_F3_bath'],.55,('tile_ivory','tile_sage'))
    tile_floor(bpy.data.objects['Sunny_InteriorFloor_F2_aft'],.65,('tile_ivory','tile_dark'),
               (12.3,20.6,cy,13.5))
    lights=[]
    for name, p, ceiling in (
        ("Men's Quarters",((rooms["Men's Quarters"]['x'][0]+rooms["Men's Quarters"]['x'][1])/2,cy,levels['F1']+2.9),levels['F2F']-.18),
        ("Women's Quarters",((rooms["Women's Quarters"]['x'][0]+rooms["Women's Quarters"]['x'][1])/2,cy,levels['F2F']+2.25),levels['F2F']+2.80),
        ('Aquarium Bar',(12.8,cy,levels['F1']+3.1),levels['F2A']-.18),
        ('Kitchen',(16.4,cy+5.2,levels['F2A']+2.9),levels['F3G']-.18),
        ('Dining Room',(16.4,cy-5.2,levels['F2A']+2.9),levels['F3G']-.18),
        ('Sick Bay',(22.8,cy-5.4,levels['F2A']+2.6),levels['F3G']-.18),
        ('Library',(lc-1.4,cy,levels['F3L']+2.70),levels['F3L']+3.05),
        ('Bath',(lc,cy-.8,levels['F3B']+2.16),levels['F3B']+2.58),
        ("Usopp's Main Factory",(14.4,-5.6,levels['B1']+3.2),levels['F1']-.18),
        ("Franky's Weapon Development Room",(14.4,6.6,levels['B1']+3.2),levels['F1']-.18),
        ('Energy Room',(22.65,cy,levels['B1']+3.1),levels['F1']-.18),
    ):
        safe=name.replace("'",'').replace(' ','_')
        lights.append(pendant('RoomLamp_'+safe,p,ceiling,name))
    interiors['lights']=lights
    retained=[bpy.data.objects[name] for name in original_names if name in bpy.data.objects]
    additions=[obj for obj in bpy.data.objects if obj not in before and obj.type=='MESH']
    return list(dict.fromkeys(retained+additions))
