"""Source-derived aft exterior envelope and arched sash construction.

Read the retained native house BEFORE access cuts. No source coverage is inferred
across missing sections. Every proposed wall-foot sample must have actual floor
support. Existing doors/front windows remain fixed; added side/rear stations are disclosed reconstruction.
All dimensions are reconstruction constraints; supplied N/A/F2 establish form.
"""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from sunny_exterior import _mesh, finish, box, pole, assign_world_mesh, open_volume_slot, clip_face
from sunny_interiors import inset_outline, _merge


def snapshot_native_house(obj):
    """Capture capped uncut native polygons without modifying or exporting them.

    Proposed call site: restore_exterior, immediately after cap_roof(对象003)
    and before either original garden stair slot. Do not sample the cut GLB.
    """
    obj.data.calc_loop_triangles()
    points = [tuple(obj.matrix_world @ v.co) for v in obj.data.vertices]
    if max(p[2] for p in points) > 2:
        raise RuntimeError('aft snapshot crosses the separate rig-height transform')
    return {'source': obj.name, 'points': points,
            'triangles': [tuple(t.vertices) for t in obj.data.loop_triangles],
            'stage': 'capped-native-house-before-stair-slots'}


def frame_house_snapshot(snapshot, frame):
    """Apply the native house's actual layout/shift/scale, once, to its snapshot."""
    if snapshot.get('stage') != 'capped-native-house-before-stair-slots':
        raise RuntimeError('complete pre-cut native source coverage is required')
    points = [Vector((frame.x(p[0]), frame.y(p[1]), frame.z(p[2])))
              for p in snapshot['points']]
    return [[points[i].copy() for i in triangle] for triangle in snapshot['triangles']]


def native_section_segments(triangles,height,epsilon=1e-5):
    """Retain every real source connector; only numerical zero is discarded.

    Tiny bevel triangles are real coverage. Removing segments below the welding
    tolerance disconnects their source chain; a separate 1 nm zero threshold
    handles exact plane/collapsed arithmetic while endpoint welding stays 10 µm.
    """
    segments={};zero=1e-9
    key=lambda p:tuple(round(v/zero) for v in p[:2])
    for triangle in triangles:
        if all(abs(p.z-height)<zero for p in triangle):continue
        hits={}
        for a,b in zip(triangle,triangle[1:]+triangle[:1]):
            da,db=a.z-height,b.z-height
            if abs(da)<zero:hits[key(a)]=Vector((a.x,a.y))
            if da*db<0:
                p=a.lerp(b,da/(da-db));hits[key(p)]=Vector((p.x,p.y))
        values=list(hits.values())
        if len(values)!=2 or (values[0]-values[1]).length<=zero:continue
        a,b=values;segments[tuple(sorted((key(a),key(b))))]=(a,b)
    return list(segments.values())



def closed_native_contour(segments,epsilon=1e-5):
    """Trace fully closed source sections with distance-based 10 µm welding.

    Union every observed endpoint pair within the unchanged tolerance across
    neighbouring cells. This is order-independent and preserves transitive real
    tiny connector chains. No new span is added to an incomplete source section.
    """
    observed,buckets,parents=[],{},[]
    def root(index):
        while parents[index]!=index:
            parents[index]=parents[parents[index]];index=parents[index]
        return index
    def observe(point):
        index=len(observed);observed.append(point);parents.append(index)
        cell=tuple(math.floor(v/epsilon) for v in point)
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                for other in buckets.get((cell[0]+dx,cell[1]+dy),()):
                    if (observed[other]-point).length<=epsilon:
                        parents[root(index)]=root(other)
        buckets.setdefault(cell,[]).append(index)
        return index
    edges=[(observe(a),observe(b)) for a,b in segments]
    points={root(i):observed[root(i)] for i in range(len(observed))}
    neighbours={}
    for a,b in edges:
        ka,kb=root(a),root(b)
        if ka==kb:continue
        neighbours.setdefault(ka,set()).add(kb);neighbours.setdefault(kb,set()).add(ka)
    bad=[k for k,values in neighbours.items() if len(values)!=2]
    if not neighbours or bad:
        raise RuntimeError('source section is incomplete/nonmanifold: %d endpoints'%len(bad))
    remaining,loops=set(neighbours),[]
    while remaining:
        start,previous=min(remaining),None;current,loop=start,[]
        while current not in loop:
            loop.append(current)
            choices=neighbours[current]-({previous} if previous is not None else set())
            previous,current=current,min(choices)
        if current!=start:raise RuntimeError('native section branches into another loop')
        remaining.difference_update(loop);outline=[tuple(points[k]) for k in loop]
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(outline,outline[1:]+outline[:1]))/2
        loops.append((abs(area),outline if area>0 else list(reversed(outline))))
    area,outline=max(loops)
    if area<10 or len(outline)<12:raise RuntimeError('native house section lacks its curved outline')
    return outline



def sampled_contour(outline, count=256):
    """Resample along real source edges, without filling any coverage gap."""
    outline = list(outline)
    start = min(range(len(outline)), key=lambda i: (outline[i][0], outline[i][1]))
    outline = outline[start:]+outline[:start]
    lengths = [math.dist(a, b) for a, b in zip(outline, outline[1:]+outline[:1])]
    perimeter, points, edge, before = sum(lengths), [], 0, 0.
    for i in range(count):
        target = perimeter*i/count
        while edge < len(lengths)-1 and before+lengths[edge] < target:
            before += lengths[edge]
            edge += 1
        a, b = Vector(outline[edge]), Vector(outline[(edge+1)%len(outline)])
        points.append(tuple(a.lerp(b, (target-before)/lengths[edge])))
    return points


def actual_floor_bvh(objects):
    """Read actual retained room/entry/gallery floor faces, including real holes."""
    vertices, polygons = [], []
    for obj in objects:
        obj.data.calc_loop_triangles()
        for triangle in obj.data.loop_triangles:
            points = [obj.matrix_world @ obj.data.vertices[i].co for i in triangle.vertices]
            normal = (points[1]-points[0]).cross(points[2]-points[0])
            if normal.z <= 1e-8:
                continue
            start = len(vertices)
            vertices.extend(points)
            polygons.append((start, start+1, start+2))
    if not polygons:
        raise RuntimeError('actual walking-floor triangles are required')
    return BVHTree.FromPolygons(vertices, polygons)


def require_floor_support(surface, outline, height, tolerance=.03):
    """Refuse unsupported lining feet; no sampled hull/rectangle can waive this."""
    faults = []
    for x, y in outline:
        hit, _normal, _index, _distance = surface.ray_cast(
            Vector((x, y, height+.08)), Vector((0, 0, -1)), .16)
        if hit is None or abs(hit.z-height) > tolerance:
            faults.append((x, y))
    if faults:
        raise RuntimeError('native lining has %d unsupported floor stations; do not extend floors blindly'%len(faults))


def source_house_rows(triangles, floor, top, surface, spacing=.20):
    """Recover every height row from complete pre-slot source, never cut skin.

    A/N establish the planar cream bow end. Remove only the imported front
    bevel strip at the actual X13.64 room-floor edge, then place its complete
    cut edge at the retained X12.3 doorway transfer. Native red side/rear points
    behind that strip retain their exact source X; no convex hull or global
    longitudinal stretch replaces their curvature. This front treatment is
    reconstruction anchored to existing floor/door stations.
    """
    count = max(2, math.ceil((top-floor)/spacing))
    rows, native = [], []
    for i in range(count+1):
        level = floor+(top-floor)*i/count
        section = level+.002 if i == 0 else level-.002 if i == count else level
        contour = closed_native_contour(native_section_segments(triangles, section))
        outline = sampled_contour(contour,128)
        front = clip_face([Vector((x,y,0)) for x,y in contour],0,13.64,True)
        if len(front)<12:raise RuntimeError('native front transfer loses the actual house outline')
        # Exact cut-plane anchoring prevents float32 half-ULP X differences
        # from moving the arclength seam to another front station between rows.
        planar = [(13.64 if abs(p.x-13.64)<.00001 else p.x,p.y) for p in front]
        clipped = sampled_contour(planar,128)
        mapped = [(12.3 if abs(x-13.64)<.00001 else x,y) for x,y in clipped]
        rows.append((level,mapped));native.append((level,outline))
    # The native vault edge projects slightly beyond the retained room floor.
    # Its closed 44 cm low toe bears on the actual floor at this inner edge;
    # a thin 18 cm skin alone would float over that documented narrow gap.
    require_floor_support(surface,inset_outline(rows[0][1],.50),floor)
    return rows,native




def garden_stair_bounds(tread,vertex_bbox):
    """The unchanged highest-footprint support/body volume of one real tread."""
    low,high=vertex_bbox(tread)
    return (low.x-.72,high.x+.72,low.y-.38,high.y+.38,high.z-.12,high.z+1.95)


def garden_stair_enclosures(vertex_bbox,centre_y):
    """Fit the inner cheeks to actual flights, keeping the outside vault fixed.

    F2/N show enclosed rooms beneath the open garden flights. These hidden
    cheek depths and aft blends are reconstruction, not canonical dimensions.
    Their full section ends beyond the body corridor; a later blend returns to
    the native side well before the retained side/rear window stations.
    """
    groups={'port':[],'starboard':[]}
    for obj in bpy.data.objects:
        if obj.type!='MESH' or not obj.get('sunny_stair') or not obj.name.startswith('Sunny_GardenStair_tread'):
            continue
        low,high=vertex_bbox(obj)
        groups['port' if (low.y+high.y)/2<centre_y else 'starboard'].append(garden_stair_bounds(obj,vertex_bbox))
    specs=[]
    for side,volumes in groups.items():
        if len(volumes)<30:raise RuntimeError('both complete actual garden flights are required for enclosure fitting')
        boundary=max(v[3] for v in volumes) if side=='port' else min(v[2] for v in volumes)
        rear=max(v[1] for v in volumes)+.75
        specs.append(dict(side=side,treadCount=len(volumes),bodyBoundary=boundary,
                          innerPlane=boundary+(.18 if side=='port' else -.18),
                          thickness=.18,rear=rear,blendEnd=rear+1.2,
                          reference='F2/N: enclosed rooms beneath outside garden flights; hidden cheek depth and blend are reconstructed'))
    return specs


def stair_enclosed_inner_ring(ring,specs):
    """Close the room slots without reshaping any unaffected native lining.

    Keep every outside source vertex. Only the actual stair-side inner points
    move; collapsed corner runs redistribute along their next real edge to
    preserve the closed loft's original count/index without changing its shape.
    """
    if not specs:return ring
    result=[]
    for x,y in ring:
        for spec in specs:
            weight=max(0.,min(1.,(spec['blendEnd']-x)/(spec['blendEnd']-spec['rear'])))
            target=max(y,spec['innerPlane']) if spec['side']=='port' else min(y,spec['innerPlane'])
            y+=(target-y)*weight
        result.append((x,y))
    original=list(result)
    starts=[i for i in range(len(result)) if (Vector(result[i])-Vector(result[i-1])).length>1e-8]
    if not starts:raise RuntimeError('garden lining loses its native closed contour')
    for start in starts:
        count=1
        while count<len(result) and (Vector(original[(start+count)%len(result)])-Vector(original[start])).length<=1e-8:
            count+=1
        if count==1:continue
        a,b=Vector(original[start]),Vector(original[(start+count)%len(result)])
        for j in range(count):result[(start+j)%len(result)]=tuple(a.lerp(b,j/count))
    return result


def closed_wall_mesh(rows,stair_enclosures=()):
    """One closed source-shaped skin with an 18 cm body and supported low toe.

    This replaces both the open native skin and its rectangular cream lining.
    A 44 cm low base tapers to 18 cm above the unchanged walking floor.
    Its lowest cap is embedded 20 mm below that floor, and its top cap bevels
    inward 20 mm below the retained garden rim. Both remain closed while the
    visible walking planes retain their sole surface owner.
    This real bearing toe spans the measured source-skin/floor edge gap; neither
    a floor expansion nor an unsupported 6 cm outer-foot tolerance is used.
    Shared vertices close the inner/outer surfaces, sill and garden roof seam.
    Actual garden flights locally thicken the inner cheeks; the outside source
    surface remains fixed while every standing volume retains its clearance.
    """
    n, vertices, faces, colours = len(rows[0][1]), [], [], []
    for row,(height,outline) in enumerate(rows):
        inner_inset=.24+.26*max(0.,1-(height-rows[0][0])/.35)
        inner=stair_enclosed_inner_ring(inset_outline(outline,inner_inset),stair_enclosures)
        for side,ring in enumerate((inset_outline(outline,.06),inner)):
            level=height-.02 if row==0 or (row==len(rows)-1 and side==1) else height
            vertices.extend((x,y,level) for x,y in ring)
    for row in range(len(rows)-1):
        low,high=row*2*n,(row+1)*2*n
        for i in range(n):
            j=(i+1)%n
            faces.extend(((low+i,low+j,high+j,high+i),(low+n+j,low+n+i,high+n+i,high+n+j)))
            front=max(vertices[k][0] for k in faces[-2])<12.37
            colours.extend(('cream' if front else 'red','cream'))
    top=(len(rows)-1)*2*n
    for i in range(n):
        j=(i+1)%n
        faces.extend(((j,i,n+i,n+j),(top+i,top+j,top+n+j,top+n+i)))
        colours.extend(('cream','red'))
    obj=_merge('AftNativeClosedConstruction',vertices,faces,colours)
    if stair_enclosures:
        # The fitted inner cheeks make some loft quads non-planar. Resolve
        # their real triangles before the first exact access Boolean, rather
        # than letting the cutter choose an ambiguous quad tessellation.
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        if any(not edge.is_manifold for edge in bm.edges) or bm.calc_volume(signed=True)<=0:
            bm.free();raise RuntimeError('garden enclosure loft must be closed and outward before access cuts')
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    return obj




def closed_boolean_cut(obj,cutter):
    """Cut a physical closed aperture and retain its real reveal faces."""
    modifier=obj.modifiers.new('AftConstructionOpening','BOOLEAN')
    modifier.operation='DIFFERENCE';modifier.solver='EXACT';modifier.object=cutter
    bpy.context.view_layer.update()
    graph=bpy.context.evaluated_depsgraph_get()
    mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(graph),depsgraph=graph)
    obj.modifiers.remove(modifier)
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if not bm.faces or any(not edge.is_manifold for edge in bm.edges):
        bm.free();raise RuntimeError(obj.name+' has an empty/unclosed aft aperture')
    bm.to_mesh(mesh);bm.free();mesh.update();obj.data=mesh
    bpy.data.objects.remove(cutter,do_unlink=True)


def closed_box_cut(obj,bounds):
    """Apply one exact retained door/stair body volume to the closed envelope."""
    x0,x1,y0,y1,z0,z1=bounds
    cutter=box('AftConstructionCutter',((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),(x1-x0,y1-y0,z1-z0),'cream')
    closed_boolean_cut(obj,cutter)


def cut_aft_stair_access(objects,vertex_bbox,targets):
    """Retain the real garden flights with continuous normal-human headroom.

    Finite standing volumes preserve native wall below/above the flight. The old
    whole-storey plan erasure is not copied into this recovered source envelope.
    Existing GardenDeck upper openings and every tread/landing stay unchanged.
    """
    treads=[obj for obj in bpy.data.objects if obj.type=='MESH' and obj.get('sunny_stair')
            and obj.name.startswith('Sunny_GardenStair_tread')]
    if len(treads)<20:raise RuntimeError('both actual retreaded garden flights are required')
    volumes=[]
    for tread in treads:
        # Ground detection retains the highest tread under a 34 cm footprint.
        # The body reaches another 34 cm ahead of that supporting tread, so
        # longitudinal clearance needs both radii plus 4 cm proxy/contact skin.
        # Treads are level across Y; lateral body clearance remains 38 cm.
        bounds=garden_stair_bounds(tread,vertex_bbox)
        volumes.append(list(bounds))
        for obj in targets:
            if obj.get('sunny_aft_native_envelope'):closed_box_cut(obj,bounds)
            else:open_volume_slot(obj,*bounds)
    return volumes


def build_aft_envelope(objects,vertex_bbox,frame,snapshot,floor,top):
    """Replace the rectangular F2 exterior with its complete native vault.

    Supplied A/N show a cream bow end and red curved side window skins beneath
    the garden. F2 floor, door/stair stations and normal human scale stay fixed.
    The native pre-slot snapshot is required; incomplete public skin is refused.
    """
    if snapshot is None:raise RuntimeError('missing complete aft source snapshot')
    triangles=frame_house_snapshot(snapshot,frame)
    floors=[obj for obj in bpy.data.objects if obj.type=='MESH' and obj.get('sunny_walkable')]
    rows,native=source_house_rows(triangles,floor,top,actual_floor_bvh(floors))
    stair_enclosures=garden_stair_enclosures(vertex_bbox,frame.y(.585))
    inner_foot=stair_enclosed_inner_ring(inset_outline(rows[0][1],.50),stair_enclosures)
    require_floor_support(actual_floor_bvh(floors),inner_foot,floor)
    original=next(obj for obj in objects if obj.name=='对象003')
    replacement=closed_wall_mesh(rows,stair_enclosures)
    assign_world_mesh(original,replacement.data)
    bpy.data.objects.remove(replacement,do_unlink=True)
    original['sunny_obstacle']=True;original['sunny_aft_native_envelope']=True
    original['sunny_aft_source']='A/N; pre-stair-slot 对象003 sections'
    original['sunny_aft_front_station']=12.3
    report=dict(level='F2A',outline=rows[0][1],ceilingOutline=rows[-1][1],
                sourceRows=[[z,p] for z,p in native],wallRows=[[z,p] for z,p in rows],
                thickness=.18,baseBearingInset=.50,baseBearingHeight=.35,baseCapEmbedding=.02,topCapBevel=.02,
                nativeFrontClip=13.64,frontStation=12.3,floor=floor,top=top,
                stairSideClosures=stair_enclosures,
                reference='A/N/F2: source curved red side skin and cream bow end; retained X12.3 transfer, wall depth and added sash stations reconstructed')
    return original,report




def closed_wall_bvh(obj):
    """Read both actual wall surfaces, including source curvature and openings."""
    obj.data.calc_loop_triangles()
    return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],
                               [tuple(t.vertices) for t in obj.data.loop_triangles])


def arch_outline(radius,straight,sections=24):
    """A real rectangular lower aperture with a semicircular upper head."""
    return [(-radius,0),(radius,0),(radius,straight)]+[
        (radius*math.cos(i*math.pi/sections),straight+radius*math.sin(i*math.pi/sections))
        for i in range(1,sections+1)]


def fitted_arch(surface,position,outward,radius=.55,straight=1.15):
    """Fit each arch boundary and glazing plane to both real curved wall skins."""
    centre,normal=Vector(position),Vector(outward).normalized()
    lateral=Vector((-normal.y,normal.x,0));outline=arch_outline(radius,straight)
    outer,inner=[],[]
    for horizontal,vertical in outline:
        p=centre+lateral*horizontal+Vector((0,0,vertical))
        front=surface.ray_cast(p+normal*3,-normal,6)[0]
        back=surface.ray_cast(p-normal*3,normal,6)[0]
        if front is None or back is None:raise RuntimeError('aft arch misses actual source wall')
        depth=(front-back).dot(normal)
        if not .12<=depth<=.65:raise RuntimeError('aft arch crosses unsupported wall depth')
        outer.append(front);inner.append(back)
    return outline,outer,inner,normal,lateral


def arch_prism(name,outline,centre,normal,lateral,depth):
    """Closed arched cutter/glass prism with real crown, jambs and sill."""
    n=len(outline)
    vertices=[tuple(centre+lateral*x+Vector((0,0,z))+normal*d)
              for d in (-depth/2,depth/2) for x,z in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=_mesh(name,vertices,faces)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    return obj


def closed_door_arch_cut(obj,spec):
    """Cut the two N-supported entrances with real crowns and closed reveals.

    Existing footprint/depth/bottom/top limits stay fixed. The arch is a shape
    repair inside that same volume, not a larger player or entrance. Metadata
    width/height/pos/rot/baseOffset/slide and the moving AABB remain untouched.
    """
    radius=(spec['width']+.10)/2
    straight=spec['height']+.27-radius
    centre=Vector(spec['pos'])+Vector((0,0,-.15))
    lateral=Vector((math.cos(spec['rot']),math.sin(spec['rot']),0))
    normal=Vector((-math.sin(spec['rot']),math.cos(spec['rot']),0))
    cutter=arch_prism(spec['id']+'_arch_cutter',arch_outline(radius,straight,sections=32),
                      centre,normal,lateral,1.50)
    closed_boolean_cut(obj,cutter)


def curved_arch_glass(surface,id_,centre,normal,lateral,radius,straight,steps=18):
    """Closed curved glazing follows the actual vault at every sash sample.

    A flat pane cannot sit inside a sloping barrel wall at all heights. These
    real skin rays place both 28 mm glazing surfaces and curved sash supports;
    the crown columns match the exact cutter's 24-segment arch boundary.
    """
    columns=25;points=[]
    for row in range(steps+1):
        for col in range(columns):
            angle=math.pi*(24-col)/24
            x=radius*math.cos(angle);height=straight+radius*math.sin(angle)
            p=centre+lateral*x+Vector((0,0,height*row/steps))
            skin=surface.ray_cast(p+normal*3,-normal,6)[0]
            if skin is None:raise RuntimeError(id_+' glazing misses actual supporting skin')
            points.append(skin-normal*.018)
    n=len(points);vertices=[tuple(p-normal*d) for d in (0,.028) for p in points]
    faces=[]
    for row in range(steps):
        for col in range(columns-1):
            a=row*columns+col;b=a+1;c=b+columns;d=a+columns
            faces.extend(((a,b,c,d),(n+d,n+c,n+b,n+a)))
    boundary=list(range(columns))+[row*columns+columns-1 for row in range(1,steps+1)]+[
        steps*columns+col for col in reversed(range(columns-1))]+[
        row*columns for row in reversed(range(1,steps))]
    for a,b in zip(boundary,boundary[1:]+boundary[:1]):faces.append((a,n+a,n+b,b))
    glass=finish(_mesh(id_+'_glass',vertices,faces),id_+'_glass','glass',obstacle=True)
    bm=bmesh.new();bm.from_mesh(glass.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(glass.data);bm.free()
    return glass,points,columns


def add_fitted_arch(obj,id_,position,outward,radius=.55,straight=1.15,legacy=False):
    """Cut a true arch and seat its curved, closed, multi-pane glazing in skin."""
    surface=closed_wall_bvh(obj)
    outline,outer,inner,normal,lateral=fitted_arch(surface,position,outward,radius,straight)
    centre=Vector(position)
    outer_depths=[(p-centre).dot(normal) for p in outer]
    inner_depths=[(p-centre).dot(normal) for p in inner]
    depth_low,depth_high=min(inner_depths)-.10,max(outer_depths)+.10
    glass,grid,columns=curved_arch_glass(surface,id_,centre,normal,lateral,radius,straight)
    cut_centre=centre+normal*((depth_low+depth_high)/2)
    closed_boolean_cut(obj,arch_prism(id_+'_cutter',outline,cut_centre,normal,lateral,depth_high-depth_low))
    glass['sunny_window_arch' if legacy else 'sunny_aft_window_arch']=True
    glass['sunny_aft_window_id']=id_;glass['sunny_aft_window_position']=tuple(centre)
    glass['sunny_aft_window_outward']=tuple(normal);glass['sunny_aft_window_radius']=radius
    glass['sunny_aft_window_straight']=straight
    for i in range(len(outline)):
        j=(i+1)%len(outline)
        pole(id_+'_frame',outer[i]+normal*.008,outer[j]+normal*.008,.055,'gold')
    # Sash bars use actual fitted intermediate points, including the curved
    # vertical profile. A straight chord would float away from a vaulted wall.
    for row in range(18):
        a,b=grid[row*columns+12],grid[(row+1)*columns+12]
        pole(id_+'_mullion',a+normal*.030,b+normal*.030,.028,'black')
    for h in (.50,1.05):
        bars=[]
        for col in range(columns):
            angle=math.pi*(24-col)/24;x=radius*math.cos(angle)
            p=centre+lateral*x+Vector((0,0,h))
            skin=surface.ray_cast(p+normal*3,-normal,6)[0]
            if skin is None:raise RuntimeError(id_+' crossbar misses actual skin')
            bars.append(skin+normal*.012)
        for a,b in zip(bars,bars[1:]):pole(id_+'_crossbar',a,b,.026,'black')
    return dict(id=id_,position=tuple(centre),outward=tuple(normal),radius=radius,straight=straight,
                legacy=legacy,reference='A/N visible arched sash morphology; hidden count and metre stations reconstructed')


def add_aft_windows(objects,frame,interiors):
    """Keep four bow windows and add reviewed side/rear curved-skin stations."""
    obj=next(obj for obj in objects if obj.get('sunny_aft_native_envelope'))
    level=interiors['levels']['F2A'];cy=frame.y(.585);records=[]
    for i,y in enumerate((cy-8.8,cy-1.7,cy+1.7,cy+8.8)):
        records.append(add_fitted_arch(obj,'DiningWindow'+str(i),(12.3,y,level+.95),(-1,0,0),legacy=True))
        # Retain the existing thin front room-return openings behind this sash.
        for other in list(bpy.data.objects):
            if other.type=='MESH' and other.name.startswith(('Sunny_RoomPartition_DiningEntrance','Sunny_RoomPartition_KitchenEntrance')):
                open_volume_slot(other,11.5,13.1,y-.55,y+.55,level+.95,level+2.65)
    # Explicit reconstruction, not a claim of a hidden canonical window count.
    # Front half side stations remain reserved for the unchanged garden flights.
    for side in (-1,1):
        for i,x in enumerate((22.10,23.65)):
            records.append(add_fitted_arch(obj,'AftSideWindow'+('Port' if side<0 else 'Starboard')+str(i),
                           (x,cy+side*12,level+.95),(0,side,0),radius=.50))
    for i,y in enumerate((cy-8.1,cy+8.1)):
        records.append(add_fitted_arch(obj,'AftRearWindow'+str(i),(24.0,y,level+.95),(1,0,0),radius=.50))
    interiors['aftEnclosures'][0]['windows']=records
    return records


def paint_lower_aquarium_tier(hull,floor,top):
    """A/C cream lower sash tier, partitioned into existing retained hull faces.

    Only existing timber outside the actual Aquarium lining and between its
    retained floor/roof/longitudinal bounds is reassigned. Timber below this
    tier and every other paint region remain; no overlay skin is introduced.
    """
    from sunny_accuracy import repaint_prism
    common=[(Vector((1,0,0)),8.65),(Vector((-1,0,0)),-25.71353),
            (Vector((0,0,1)),floor),(Vector((0,0,-1)),-(top-.20))]
    for normal,offset in ((Vector((0,-1,0)),11.6),(Vector((0,1,0)),14.)):
        repaint_prism(hull,common+[(normal,offset)],'cream',source='timber')
    hull['sunny_aquarium_side_paint_bounds']=[8.65,25.71353,-11.6,14.,floor,top-.20]
    return list(hull['sunny_aquarium_side_paint_bounds'])


def fitted_arch_pair(outer_surface,inner_surface,position,outward,outline):
    """Seat one lower sash/reveal between its real outer hull and inner lining.

    A/C/N show the exposed lower sash tier. This source contains a measured gap
    between two retained skins; pretending the inner box is the exterior would
    leave the pane occluded. Every boundary sample needs both actual supports.
    """
    centre,normal=Vector(position),Vector(outward).normalized()
    lateral=Vector((-normal.y,normal.x,0));front,back=[],[]
    for horizontal,vertical in outline:
        point=centre+lateral*horizontal+Vector((0,0,vertical))
        outer=outer_surface.ray_cast(point+normal*3,-normal,6)[0]
        inner=inner_surface.ray_cast(point-normal*3,normal,6)[0]
        if outer is None or inner is None:
            raise RuntimeError('lower Aquarium arch misses actual outer/inner skin at centre=%s sample=(%.9f,%.9f) point=%s normal=%s outer=%s inner=%s'%(tuple(centre),horizontal,vertical,tuple(point),tuple(normal),tuple(outer) if outer is not None else None,tuple(inner) if inner is not None else None))
        depth=(outer-inner).dot(normal)
        if not .12<=depth<=1.20:
            raise RuntimeError('lower Aquarium arch crosses unsupported/reversed skin depth')
        front.append(outer);back.append(inner)
    return front,back,normal,lateral


def closed_arch_reveal(id_,outline,expanded,outer_surface,inner_surface,centre,normal):
    """Close an annular physical reveal across the measured facade/lining gap.

    Four connected rings retain a true open arch. A reconstructed 75 mm border
    embeds in both real skins; it is not an unsupported trim hiding a square cut.
    """
    front,back,normal,lateral=fitted_arch_pair(outer_surface,inner_surface,centre,normal,outline)
    outer_front,outer_back,_,_=fitted_arch_pair(outer_surface,inner_surface,centre,normal,expanded)
    rings=( [p+normal*.004 for p in outer_front], [p-normal*.020 for p in front],
            [p+normal*.020 for p in back], [p-normal*.004 for p in outer_back])
    n=len(outline);vertices=[tuple(p) for ring_ in rings for p in ring_];faces=[]
    for row in range(4):
        next_row=(row+1)%4
        for i in range(n):
            j=(i+1)%n
            faces.append((row*n+i,row*n+j,next_row*n+j,next_row*n+i))
    obj=finish(_mesh(id_+'_reveal',vertices,faces),id_+'_reveal','cream',obstacle=True)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if not bm.faces or any(not edge.is_manifold for edge in bm.edges):
        bm.free();raise RuntimeError(id_+' lower reveal must retain a closed annular body')
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    obj['sunny_aquarium_window_reveal']=id_
    return obj,front,back,normal,lateral


def add_lower_aquarium_arch(outer_obj,inner_obj,id_,position,outward,support_surfaces,radius=.55,straight=1.15):
    """Cut a supported true arch through every actual opaque skin; close glazing."""
    from sunny_accuracy import cut_prism
    centre=Vector(position);normal=Vector(outward).normalized()
    outer_surface,inner_surface=support_surfaces
    outline=arch_outline(radius,straight)
    expanded=inset_outline(outline,-.075)
    reveal,front,back,normal,lateral=closed_arch_reveal(
        id_,outline,expanded,outer_surface,inner_surface,centre,normal)
    glass,grid,columns=curved_arch_glass(outer_surface,id_,centre,normal,lateral,radius,straight)
    # The same convex arch is subtracted from each real skin. Source/legacy
    # sheets stay source sheets; the independent closed annular reveal supplies
    # their real tunnel rather than asserting an open imported hull is manifold.
    planes=[];up=Vector((0,0,1))
    for (x,z),(xx,zz) in zip(outline,outline[1:]+outline[:1]):
        inward=(-lateral*(zz-z)+up*(xx-x)).normalized()
        planes.append((inward,inward.dot(centre+lateral*x+up*z)))
    lower=min((p-centre).dot(normal) for p in back)-.10
    upper=max((p-centre).dot(normal) for p in front)+.10
    planes.extend(((normal,normal.dot(centre)+lower),(-normal,-normal.dot(centre)-upper)))
    for obj in {outer_obj,inner_obj}:cut_prism(obj,planes)
    glass['sunny_aquarium_window_arch']=True
    for suffix,value in (('id',id_),('position',tuple(centre)),('outward',tuple(normal)),
                         ('radius',radius),('straight',straight)):
        glass['sunny_aquarium_window_'+suffix]=value
    for i in range(len(outline)):
        j=(i+1)%len(outline)
        pole(id_+'_frame',front[i]+normal*.008,front[j]+normal*.008,.055,'gold')
    for row in range(18):
        a,b=grid[row*columns+12],grid[(row+1)*columns+12]
        pole(id_+'_mullion',a+normal*.030,b+normal*.030,.028,'black')
    for height in (.50,1.05):
        bars=[]
        for col in range(columns):
            angle=math.pi*(24-col)/24;x=radius*math.cos(angle)
            point=centre+lateral*x+Vector((0,0,height))
            skin=outer_surface.ray_cast(point+normal*3,-normal,6)[0]
            if skin is None:raise RuntimeError(id_+' lower sash crossbar misses actual skin')
            bars.append(skin+normal*.012)
        for a,b in zip(bars,bars[1:]):pole(id_+'_crossbar',a,b,.026,'black')
    for obj in bpy.data.objects:
        if obj.name.startswith('Sunny_'+id_+'_'):obj['sunny_feature']='AquariumWindow'
    return dict(id=id_,position=tuple(centre),outward=tuple(normal),radius=radius,straight=straight,
                outerSkin=outer_obj.name,innerSkin=inner_obj.name,
                depthRange=[min((a-b).dot(normal) for a,b in zip(front,back)),
                            max((a-b).dot(normal) for a,b in zip(front,back))],
                reference='A/C/N visible lower arched sash tier; six added stations/count and border metres reconstructed')


def add_lower_aquarium_windows(objects,interiors):
    """Fill only supported exposed lower side/rear sash stations, keeping access.

    A/C/N show this lower tier. Actual first-hit rays support two side stations
    behind the stair/slide region on each side; X23.45 is rejected because the
    retained hull/lining switch outer ownership across one footprint. Two rear
    stations use the actual rear lining. Hidden count/metres remain reconstruction.
    Existing four front Aquarium sashes/doors/floors and all furniture stay fixed.
    """
    hull=next(obj for obj in objects if obj.name=='Line002')
    walls={obj.name:obj for obj in bpy.data.objects if obj.name.startswith('Sunny_Aquarium_shell_')}
    required=('Sunny_Aquarium_shell_0_seg0','Sunny_Aquarium_shell_1_seg0','Sunny_Aquarium_shell_2_seg0')
    if any(name not in walls for name in required):raise RuntimeError('retain actual lower Aquarium side/rear skins')
    # Retain actual skin snapshots before any paint split or sash cut. Neither
    # painting nor previously authored openings redefine the supporting shape;
    # resampling clipped float32 seams created false BVH misses in the fixture.
    support_skins={obj:closed_wall_bvh(obj) for obj in [hull]+[walls[name] for name in required]}
    floor=interiors['levels']['F1'];records=[]
    interiors['aquariumSidePaintBounds']=paint_lower_aquarium_tier(hull,floor,interiors['levels']['F2A'])
    for side,y,normal,index in (('Port',-11.6,(0,-1,0),0),('Starboard',14.,(0,1,0),2)):
        lining=walls['Sunny_Aquarium_shell_%d_seg0'%index]
        for i,x in enumerate((18.4,21.15)):
            records.append(add_lower_aquarium_arch(hull,lining,'AquariumSideWindow'+side+str(i),
                           (x,y,floor+.95),normal,(support_skins[hull],support_skins[lining])))
    rear=walls['Sunny_Aquarium_shell_1_seg0']
    bpy.context.view_layer.update()
    points=[rear.matrix_world@v.co for v in rear.data.vertices]
    x=(min(p.x for p in points)+max(p.x for p in points))/2
    cy=interiors['dockCentre'][1]
    for i,y in enumerate((cy-7.8,cy+7.8)):
        records.append(add_lower_aquarium_arch(rear,rear,'AquariumRearWindow'+str(i),
                       (x,y,floor+.95),(1,0,0),(support_skins[rear],support_skins[rear])))
    interiors['aquariumWindows']=records
    return records
