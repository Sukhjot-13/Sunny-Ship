"""Furnished Thousand Sunny interiors, in final world metres (Blender Z-up).

Called by `sunny_exterior.restore_exterior` AFTER the uniform experience
enlargement, so every dimension written here is a real metre dimension and can
never grow with the ship. Room *placement* is anchored to the supplied B1/F1/F2/F3
blueprint coordinates through `Frame`, which converts a blueprint station into
final world metres; offsets from that anchor are ordinary metres.

Reference (onepiece.fandom.com/wiki/Thousand_Sunny + Oda Volume 46 plans):
men's quarters first floor fore, women's quarters above them, kitchen/dining and
sick bay second floor aft, aquarium bar first floor aft, circular library and
bath in the stern hut, crow's nest on the foremast, observation deck over the
kitchen, Usopp's Main Factory and Franky's Weapon Development Room below deck aft
of the Soldier Dock, and an Energy Room reached from the aquarium bar.

Furniture sizing follows ordinary human dimensions (seat 0.45 m, table top
0.74 m, bed 0.55 m, counter 0.92 m, door leaf 0.95 m x 2.15 m, 1.2 m wide
doorway) and is deliberately independent of the ship's enlargement.
"""
import math

import bpy
from mathutils import Vector

from sunny_exterior import (
    EXTERIOR_CONFIG,
    PALETTE,
    _mesh,
    box,
    clip_face,
    finish,
    hull_sides,
    layout_x,
    material,
    open_plan_slot,
    open_convex_plan_slot,
    open_volume_slot,
    plan_floor,
    pole,
    ring,
    sphere,
    text,
)

S = EXTERIOR_CONFIG['experienceScale']

# --------------------------------------------------------------------------
# blueprint levels (station numbers in the imported metre model, pre-enlargement)
# --------------------------------------------------------------------------
LEVEL_B1 = -10.5     # below deck: Soldier Dock turntable, storage, workshops
LEVEL_F1 = -7.5      # main deck level: fore quarters + aquarium bar
LEVEL_F2F = -5.62    # second floor fore: women's quarters
LEVEL_F2A = -5.26    # second floor aft: dining, kitchen, pantry, sick bay
LEVEL_F3G = -2.42    # observation deck / garden
LEVEL_F3L = -2.32    # stern balcony and library

LEVEL_NAMES = {
    'B1': LEVEL_B1, 'F1': LEVEL_F1, 'F2F': LEVEL_F2F,
    'F2A': LEVEL_F2A, 'F3G': LEVEL_F3G, 'F3L': LEVEL_F3L,
}

# horizontal centreline of the hull in the source model
CENTRE_Y = 0.585


class Frame:
    """Blueprint station -> final world metres, with metre offsets.

    The pipeline enlarges the hull uniformly by `experienceScale` and then
    translates it down by `shift`. Interior geometry is authored after that
    transform, so this class is how a blueprint coordinate still finds its place
    on the enlarged ship. Every offset argument is in real metres.
    """

    def __init__(self, shift):
        self.shift = shift

    def x(self, station, offset=0.0):
        return layout_x(station) * S + offset

    def y(self, station, offset=0.0):
        return station * S + offset

    def z(self, level, offset=0.0):
        return (level - self.shift) * S + offset

    def p(self, xs, ys, level, dx=0.0, dy=0.0, dz=0.0):
        return Vector((self.x(xs, dx), self.y(ys, dy), self.z(level, dz)))

    def station(self, x):
        """Inverse of x(): world metres back to a blueprint station."""
        return x / S


# --------------------------------------------------------------------------
# low level helpers
# --------------------------------------------------------------------------
def L(p, rot, dx=0.0, dy=0.0, dz=0.0):
    """Offset a local frame at p, rotated by rot about the vertical axis."""
    c, s = math.cos(rot), math.sin(rot)
    return (p[0] + dx * c - dy * s, p[1] + dx * s + dy * c, p[2] + dz)


def _merge(name, verts, faces, colours):
    """One mesh, one material per face, for clusters of tiny repeated props."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    lookup = {}
    for key in colours:
        if key not in lookup:
            lookup[key] = len(me.materials)
            me.materials.append(material(key))
    for face, colour in zip(me.polygons, colours):
        face.material_index = lookup[colour]
        face.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def rbox(name, p, rot, dims, key, off=(0, 0, 0), **kw):
    """Box authored in metres, rotated about p's vertical axis.

    Solid by default: furniture, walls and frames must be real obstacles. Walkable
    boxes (treads, landings) opt out, and decoration built from spheres and poles
    stays non-solid so it never blocks a doorway.
    """
    if 'obstacle' not in kw and not kw.get('walkable'):
        kw['obstacle'] = True
    obj = box(name, L(p, rot, *off), dims, key, **kw)
    obj.rotation_euler.z = rot
    return obj


def dock_water_annulus(name, centre, inner, outer, bottom, top, count=64):
    """Closed annular water volume over the Dock bed, in world metres."""
    vertices=[]
    for z in (bottom,top):
        for radius in (inner,outer):
            for i in range(count):
                a=i*math.tau/count
                vertices.append((centre[0]+radius*math.cos(a),centre[1]+radius*math.sin(a),z))
    def idx(z,r,i): return (z*2+r)*count+i%count
    faces=[]
    for i in range(count):
        j=i+1
        faces.extend(((idx(0,0,i),idx(0,0,j),idx(0,1,j),idx(0,1,i)),
                      (idx(1,0,j),idx(1,0,i),idx(1,1,i),idx(1,1,j)),
                      (idx(0,0,j),idx(0,0,i),idx(1,0,i),idx(1,0,j)),
                      (idx(0,1,i),idx(0,1,j),idx(1,1,j),idx(1,1,i))))
    return finish(_mesh(name,vertices,faces),name,'tankwater')


def rpole(name, p, rot, offset_a, offset_b, radius, key, **kw):
    a, b = L(p, rot, *offset_a), L(p, rot, *offset_b)
    return pole(name, a, b, radius, key, **kw)


def panel(name, p, rot, length, height, key, off=(0, 0, 0), thickness=0.08):
    return rbox(name, p, rot, (thickness, length, height), key, off)


def peg(name, p, rot, off, radius, key, height=None, **kw):
    """Short vertical post/leg."""
    o = L(p, rot, off[0], off[1], off[2])
    return pole(name, (o[0], o[1], o[2]), (o[0], o[1], o[2] + (height if height is not None else radius * 2)), radius, key, **kw)


# --------------------------------------------------------------------------
# furniture kit - every dimension in metres
# --------------------------------------------------------------------------
def chair(name, p, rot=0.0, key='timber', seat=0.45, back=True):
    """Dining/side chair: 0.45 m seat, 0.90 m back."""
    rbox(name + '_seat', p, rot, (0.44, 0.44, 0.06), key, (0, 0, seat))
    for dx in (-0.18, 0.18):
        for dy in (-0.18, 0.18):
            peg(name + '_leg', p, rot, (dx, dy, 0.0), 0.022, 'darkwood', height=seat)
    if back:
        rbox(name + '_back', p, rot, (0.44, 0.06, 0.44), key, (0, 0.19, seat + 0.25))
        rpole(name + '_post', p, rot, (-0.18, 0.19, seat), (-0.18, 0.19, seat + 0.46), 0.022, 'darkwood')
        rpole(name + '_post', p, rot, (0.18, 0.19, seat), (0.18, 0.19, seat + 0.46), 0.022, 'darkwood')


def stool(name, p, rot=0.0, seat=0.46, key='timber'):
    rbox(name + '_seat', p, rot, (0.38, 0.38, 0.06), key, (0, 0, seat))
    for i in range(3):
        a = rot + i * math.tau / 3
        o = L(p, rot, 0.15 * math.cos(a), 0.15 * math.sin(a), 0)
        pole(name + '_leg', (o[0], o[1], o[2]), (o[0], o[1], o[2] + seat), 0.021, 'darkwood')


def table(name, p, rot=0.0, w=1.4, d=0.85, h=0.74, key='timber', top='deck'):
    rbox(name + '_top', p, rot, (w, d, 0.055), top, (0, 0, h))
    for dx in (-1, 1):
        for dy in (-1, 1):
            peg(name + '_leg', p, rot, (dx * (w / 2 - 0.09), dy * (d / 2 - 0.09), 0), 0.032, key, height=h)


def bench(name, p, rot=0.0, w=1.6, d=0.40, h=0.45, key='timber'):
    rbox(name + '_seat', p, rot, (w, d, 0.07), key, (0, 0, h))
    for dx in (-1, 1):
        rbox(name + '_leg', p, rot, (0.07, d, h), 'darkwood', (dx * (w / 2 - 0.12), 0, h / 2))


def counter(name, p, rot=0.0, w=2.4, d=0.70, h=0.92, doors=3, key='cream'):
    """Kitchen counter: 0.92 m working height with a 0.05 m overhang."""
    rbox(name + '_carcass', p, rot, (w, d, h - 0.12), key, (0, 0, (h - 0.12) / 2))
    rbox(name + '_top', p, rot, (w + 0.06, d + 0.08, 0.06), 'deck', (0, 0, h - 0.03))
    rbox(name + '_kick', p, rot, (w, d - 0.12, 0.12), 'darkwood', (0, 0, 0.06))
    for i in range(doors):
        dx = -w / 2 + (i + 0.5) * w / doors
        rbox(name + '_door%d' % i, p, rot, (w / doors - 0.06, 0.04, h - 0.22), 'white',
             (dx, -d / 2 - 0.015, h / 2 + 0.02))
        rpole(name + '_handle%d' % i, p, rot, (dx + w / doors / 2 - 0.14, -d / 2 - 0.06, h * 0.55),
              (dx + w / doors / 2 - 0.14, -d / 2 - 0.06, h * 0.75), 0.016, 'gold')


def shelf_unit(name, p, rot=0.0, w=1.2, d=0.34, h=1.9, tiers=4, key='timber'):
    rbox(name + '_back', p, rot, (w, 0.04, h), key, (0, d / 2 - 0.02, h / 2))
    for dx in (-1, 1):
        rbox(name + '_side', p, rot, (0.05, d, h), key, (dx * (w / 2 - 0.025), 0, h / 2))
    for i in range(tiers):
        z = 0.12 + (h - 0.2) * i / max(1, tiers - 1)
        rbox(name + '_shelf%d' % i, p, rot, (w, d, 0.04), key, (0, 0, z))


def bookcase(name, p, rot=0.0, w=1.6, d=0.36, h=2.15, seed=0):
    shelf_unit(name, p, rot, w, d, h, 5)
    # Every spine in a case is welded into one mesh per shelf: several hundred
    # separate book cubes would dominate the scene and the exported GLB.
    value = 12345 + seed * 7919
    for i in range(5):
        z = 0.12 + (h - 0.2) * i / 4
        verts, faces, groups = [], [], []
        run = -w / 2 + 0.07
        while run < w / 2 - 0.12:
            value = (value * 1103515245 + 12345) & 0x7FFFFFFF
            bw = 0.035 + (value % 9) * 0.012
            if run + bw > w / 2 - 0.07:
                break
            bh = 0.20 + (value % 4) * 0.03
            key = ('red', 'gold', 'cream', 'leaf', 'mane')[value % 5]
            centre = L(p, rot, run + bw / 2, -0.02, z + 0.14)
            base = len(verts)
            hx, hy, hz = bw / 2, d * 0.36, bh / 2
            local = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
                     (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
            for vx, vy, vz in local:
                verts.append(L(centre, rot, vx, vy, vz))
            faces.extend([(base + a, base + b, base + c, base + d2)
                          for a, b, c, d2 in
                          ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                           (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7))])
            groups.extend([key] * 6)
            run += bw + 0.006
        if not verts:
            continue
        obj = _merge(name + '_spines%d' % i, verts, faces, groups)
        obj.name = 'Sunny_' + name + '_spines%d' % i
        obj['sunny_authored'] = True
        obj['sunny_feature'] = name.split('_')[0]
        obj['sunny_obstacle'] = False


def crate(name, p, rot=0.0, s=0.80, key='timber'):
    rbox(name, p, rot, (s, s, s * 0.86), key, (0, 0, s * 0.43))
    for dz in (0.14, 0.72):
        rbox(name + '_band', p, rot, (s + 0.02, s + 0.02, 0.05), 'darkwood', (0, 0, s * dz))


def planter(name, p, rot=0.0, w=2.35, d=1.05, h=0.56, key='white'):
    rbox(name + '_body', p, rot, (w, d, h), key, (0, 0, h / 2))
    rbox(name + '_rim', p, rot, (w + 0.08, d + 0.08, 0.08), 'timber', (0, 0, h + 0.02))
    rbox(name + '_seat', p, rot, (w - 0.16, d - 0.16, 0.06), 'deck', (0, 0, h + 0.02))


def barrel(name, p, key='darkwood'):
    o = (p[0], p[1], p[2] + 0.42)
    pole(name + '_body', (o[0], o[1], p[2]), (o[0], o[1], p[2] + 0.84), 0.28, key, radius2=0.30)
    for z in (p[2] + 0.14, p[2] + 0.70):
        ring(name + '_hoop', (o[0], o[1], z), 0.295, 0.022, 'gold', 'Z')


def sack(name, p, key='cream'):
    sphere(name, (p[0], p[1], p[2] + 0.26), (0.34, 0.26, 0.26), key)


def sofa(name, p, rot=0.0, w=2.05, key='red'):
    rbox(name + '_base', p, rot, (w, 0.86, 0.36), key, (0, 0, 0.22))
    rbox(name + '_back', p, rot, (w, 0.20, 0.62), key, (0, 0.33, 0.52))
    for dx in (-1, 1):
        rbox(name + '_arm', p, rot, (0.18, 0.86, 0.34), key, (dx * (w / 2 - 0.09), 0, 0.46))
    for dx in (-1,1):
        for dy in (-1,1):
            rbox(name+'_foot',p,rot,(.08,.08,.06),'darkwood',(dx*(w/2-.2),dy*.3,.03))
    for i in range(2):
        rbox('%s_cushion%d' % (name, i), p, rot, (w / 2 - 0.22, 0.62, 0.14), 'cream',
             ((i - 0.5) * (w / 2), -0.05, 0.47))


def armchair(name, p, rot=0.0, key='red'):
    sofa(name, p, rot, 0.95, key)


def rug(name, p, w=2.4, d=1.6, key='mane'):
    rbox(name, p, 0.0, (w, d, 0.02), key, (0, 0, 0.012))


def bed(name, p, rot=0.0, w=1.35, d=2.05, key='timber'):
    """Bed with 0.55 m mattress height; w=1.35 d=2.05 is a single, w>1.6 a king."""
    rbox(name + '_frame', p, rot, (w, d, 0.34), key, (0, 0, 0.17))
    rbox(name + '_head', p, rot, (w, 0.08, 0.62), key, (0, d / 2 - 0.04, 0.31))
    rbox(name + '_foot', p, rot, (w, 0.08, 0.38), key, (0, -d / 2 + 0.04, 0.19))
    rbox(name + '_mattress', p, rot, (w - 0.06, d - 0.12, 0.21), 'white', (0, 0, 0.445))
    rbox(name + '_blanket', p, rot, (w - 0.06, d * 0.62, 0.05), 'red', (0, -d * 0.16, 0.57))
    rbox(name + '_pillow', p, rot, (w * 0.52, 0.42, 0.11), 'white', (0, d / 2 - 0.32, 0.60))


def bunk(name, p, rot=0.0, w=1.05, d=2.05, ceiling=3.6):
    """Suspended double-decker bunk, hung from the beams over the cabin floor."""
    for z in (0.44, 1.42):
        rbox(name + '_deck', p, rot, (w, d, 0.10), 'darkwood', (0, 0, z))
        rbox(name + '_mattress', p, rot, (w - 0.10, d - 0.14, 0.18), 'white', (0, 0, z + 0.14))
        rbox(name + '_blanket', p, rot, (w - 0.10, d * 0.6, 0.05), 'leaf', (0, -d * 0.16, z + 0.25))
    for dx in (-1, 1):
        for dy in (-1, 1):
            rpole(name + '_rope', p, rot, (dx * w / 2, dy * d / 2, .39), (dx * w / 2, dy * d / 2, ceiling),
                  0.018, 'rope')
    rbox(name+'_ceiling_beam',p,rot,(w+.20,d+.20,.12),'darkwood',(0,0,ceiling-.02))
    ladder(name + '_ladder', L(p, rot, w / 2 + 0.10, 0, 0), rot + math.pi / 2, height=1.65, width=0.52)


def locker_bank(name, p, rot=0.0, n=6, w=1.10, h=1.85, d=0.50):
    rbox(name + '_body', p, rot, (w, d, h), 'white', (0, 0, h / 2))
    for i in range(n):
        dx = -w / 2 + (i + 0.5) * w / n
        rbox('%s_door%d' % (name, i), p, rot, (w / n - 0.03, 0.03, h - 0.10), 'timber',
             (dx, -d / 2 - 0.01, h / 2))
        rpole('%s_handle%d' % (name, i), p, rot, (dx + w / n / 2 - 0.08, -d / 2 - 0.05, h * 0.45),
              (dx + w / n / 2 - 0.08, -d / 2 - 0.05, h * 0.60), 0.014, 'gold')


def wardrobe(name, p, rot=0.0, w=1.70, h=2.10, d=0.62, doors=4):
    rbox(name + '_body', p, rot, (w, d, h), 'timber', (0, 0, h / 2))
    for i in range(doors):
        dx = -w / 2 + (i + 0.5) * w / doors
        rbox('%s_door%d' % (name, i), p, rot, (w / doors - 0.03, 0.03, h - 0.12), 'white',
             (dx, -d / 2 - 0.01, h / 2))
        rpole('%s_handle%d' % (name, i), p, rot, (dx + w / doors / 2 - 0.08, -d / 2 - 0.05, 1.0),
              (dx + w / doors / 2 - 0.08, -d / 2 - 0.05, 1.25), 0.014, 'gold')


def desk(name, p, rot=0.0, w=1.55, d=0.78, h=0.76, drawers=True):
    rbox(name + '_top', p, rot, (w, d, 0.05), 'deck', (0, 0, h))
    for dx in (-1, 1):
        rbox(name + '_leg', p, rot, (0.07, d, h), 'darkwood', (dx * (w / 2 - 0.08), 0, h / 2))
    if drawers:
        rbox(name + '_pedestal', p, rot, (0.44, d - 0.06, h - 0.06), 'white', (w / 2 - 0.30, 0, (h - 0.06) / 2))
        for i in range(3):
            rbox('%s_drawer%d' % (name, i), p, rot, (0.40, 0.03, (h - 0.16) / 3), 'timber',
                 (w / 2 - 0.30, -(d - 0.06) / 2 - 0.01, 0.10 + (h - 0.16) * (i + 0.5) / 3))


def stool_small(name, p, rot=0.0):
    stool(name, p, rot, 0.52, 'darkwood')


def kotatsu(name, p, rot=0.0):
    """Horigotatsu: sunken table with low sofas and a central heater."""
    rbox(name + '_well', p, rot, (1.9, 1.9, 0.08), 'timber', (0, 0, -.42), obstacle=False)
    rbox(name + '_table', p, rot, (1.55, 1.55, 0.06), 'deck', (0, 0, 0.40))
    for dx in (-1, 1):
        for dy in (-1, 1):
            rbox(name + '_leg', p, rot, (0.08, 0.08, .82), 'darkwood', (dx * .66, dy * .66, -.01))
    rbox(name + '_heater', p, rot, (0.52, 0.52, 0.16), 'black', (0, 0, .29))
    ring(name + '_pot', (p[0], p[1], p[2] + 0.60), 0.34, 0.04, 'black', 'Z')
    for dx, dy, rr in ((0, 1.35, 0.0), (0, -1.35, math.pi)):
        sofa(name + '_sofa', L(p, rot, 0, dy, 0), rot + rr, 1.7, 'red')


def workbench(name, p, rot=0.0, w=2.2, d=0.85, h=0.90):
    rbox(name + '_top', p, rot, (w, d, 0.09), 'timber', (0, 0, h))
    for dx in (-1, 1):
        for dy in (-1, 1):
            rbox(name + '_leg', p, rot, (0.10, 0.10, h), 'darkwood',
                 (dx * (w / 2 - 0.12), dy * (d / 2 - 0.12), h / 2))
    rbox(name + '_drawer', p, rot, (w * 0.5, d - 0.1, 0.22), 'white', (-w * 0.22, 0, h - 0.20))
    # bench vice
    rbox(name + '_vice', p, rot, (0.26, 0.22, 0.20), 'black', (w / 2 - 0.28, -d / 2 - 0.06, h + 0.05))


def tool_board(name, p, rot=0.0, w=2.0, h=1.10):
    rbox(name + '_panel', p, rot, (w, 0.05, h), 'cream', (0, 0, h / 2 + 1.05))
    for dx in (-w*.42,w*.42):
        rbox(name+'_stand',p,rot,(.06,.06,1.08),'darkwood',(dx,.02,.54))
        rbox(name+'_foot',p,rot,(.25,.32,.05),'darkwood',(dx,.02,.025))
    for i in range(9):
        dx = -w / 2 + 0.16 + i * (w - 0.32) / 8
        rpole('%s_tool%d' % (name, i), p, rot, (dx, -0.06, 1.20), (dx + 0.02, -0.06, 1.20 + 0.30 + (i % 3) * 0.16),
              0.018, 'black')


def stove(name, p, rot=0.0):
    """Giant range with an oversized oven, as described for the Sunny's kitchen."""
    rbox(name + '_body', p, rot, (1.60, 0.80, 0.90), 'white', (0, 0, 0.45))
    rbox(name + '_oven_door', p, rot, (0.95, 0.05, 0.60), 'black', (-0.22, -0.42, 0.46))
    rbox(name + '_oven_glass', p, rot, (0.72, 0.03, 0.40), 'glass', (-0.22, -0.45, 0.48))
    rpole(name + '_oven_handle', p, rot, (-0.62, -0.47, 0.62), (0.18, -0.47, 0.62), 0.022, 'gold')
    rbox(name + '_hob', p, rot, (1.64, 0.84, 0.06), 'black', (0, 0, 0.93))
    for i, dx in enumerate((-0.52, 0.52)):
        for j, dy in enumerate((-0.20, 0.20)):
            ring('%s_burner%d%d' % (name, i, j), L(p, rot, dx, dy, 0.97), 0.13, 0.022, 'gold', 'Z')
    rpole(name + '_flue', p, rot, (0.62, 0.26, 0.96), (0.62, 0.26, 2.60), 0.075, 'black')


def fridge(name, p, rot=0.0):
    """The lockable four digit-code refrigerator."""
    rbox(name + '_body', p, rot, (1.05, 0.78, 2.00), 'white', (0, 0, 1.00))
    for i, (z, h) in enumerate(((1.42, 1.10), (0.55, 1.06))):
        rbox('%s_door%d' % (name, i), p, rot, (1.01, 0.05, h), 'cream', (0, -0.41, z))
        rpole('%s_handle%d' % (name, i), p, rot, (0.42, -0.48, z - h / 2 + 0.12),
              (0.42, -0.48, z + h / 2 - 0.12), 0.020, 'gold')
    rbox(name + '_lock', p, rot, (0.22, 0.06, 0.26), 'black', (0.30, -0.45, 1.62))
    for i in range(4):
        rbox('%s_key%d' % (name, i), p, rot, (0.035, 0.02, 0.035), 'gold', (0.24 + (i % 2) * 0.11, -0.49, 1.68 - (i // 2) * 0.09))


def sink(name, p, rot=0.0, w=0.62):
    rbox(name+'_pedestal',p,rot,(.22,.30,.78),'white',(0,.05,.39))
    rbox(name + '_basin', p, rot, (w, 0.50, 0.26), 'white', (0, 0, 0.86))
    rbox(name + '_bowl', p, rot, (w - 0.12, 0.38, 0.06), 'black', (0, 0, 0.80))
    rpole(name + '_tap', p, rot, (0, 0.24, 0.98), (0, 0.24, 1.22), 0.020, 'gold')
    rpole(name + '_spout', p, rot, (0, 0.24, 1.22), (0, 0.02, 1.16), 0.018, 'gold')


def toothbrushes(name, p, rot=0.0, n=4):
    """The washroom detail the reference calls out for the men's quarters."""
    for i in range(n):
        rbox('%s_%d' % (name, i), p, rot, (0.03, 0.02, 0.16), ('red', 'gold', 'leaf', 'cream')[i % 4],
             (-0.16 + i * 0.11, 0.03, 0.06))
    rbox(name + '_cup', p, rot, (0.10, 0.08, 0.12), 'white', (0, 0, 0.06))


def bathtub(name, p, rot=0.0):
    """Large communal bath: hollow tiled shell and contained water, not a solid box."""
    w, d, h, rim = 3.0, 2.0, 0.68, 0.16
    rbox(name + '_bottom', p, rot, (w, d, 0.12), 'white', (0, 0, 0.06))
    for sign in (-1, 1):
        rbox(name + '_side', p, rot, (rim, d, h), 'white', (sign * (w-rim)/2, 0, h/2))
        rbox(name + '_end', p, rot, (w-2*rim, rim, h), 'white', (0, sign * (d-rim)/2, h/2))
        rbox(name + '_rim_side', p, rot, (rim+.06, d+.06, .06), 'cream', (sign*(w-rim)/2, 0, h))
        rbox(name + '_rim_end', p, rot, (w-2*rim, rim+.06, .06), 'cream', (0, sign*(d-rim)/2, h))
    rbox(name + '_water', p, rot, (w-2*rim-.04, d-2*rim-.04, .42), 'tankwater', (0, 0, .34), obstacle=False)
    rpole(name + '_tap', p, rot, (0, d/2+.08, .68), (0, d/2+.08, .95), .025, 'gold')
    rpole(name + '_spout', p, rot, (0, d/2+.08, .95), (0, d/2-.25, .95), .025, 'gold')


def toilet(name, p, rot=0.0):
    rbox(name + '_cistern', p, rot, (0.44, 0.20, 0.62), 'white', (0, 0.22, 0.62))
    rbox(name + '_bowl', p, rot, (0.40, 0.56, 0.40), 'white', (0, -0.06, 0.20))
    rbox(name + '_seat', p, rot, (0.42, 0.50, 0.05), 'cream', (0, -0.08, 0.42))


def swivel_chair(name, p, rot=0.0, key='red'):
    rbox(name + '_seat', p, rot, (0.48, 0.48, 0.10), key, (0, 0, 0.48))
    rbox(name + '_back', p, rot, (0.46, 0.10, 0.46), key, (0, 0.22, 0.72))
    rpole(name + '_stem', p, rot, (0, 0, 0.06), (0, 0, 0.44), 0.05, 'black')
    for i in range(5):
        a = i * math.tau / 5
        rpole(name + '_spoke', p, rot, (0, 0, 0.07), (0.26 * math.cos(a), 0.26 * math.sin(a), 0.05), 0.03, 'black')


def medical_bed(name, p, rot=0.0):
    rbox(name + '_frame', p, rot, (0.92, 2.00, 0.12), 'white', (0, 0, 0.62))
    rbox(name + '_mattress', p, rot, (0.86, 1.92, 0.14), 'cream', (0, 0, 0.75))
    rbox(name + '_pillow', p, rot, (0.60, 0.36, 0.10), 'white', (0, 0.74, 0.86))
    rbox(name + '_head', p, rot, (0.92, 0.06, 0.42), 'white', (0, 0.99, 0.80))
    for dx in (-0.36, 0.36):
        for dy in (-0.85, 0.85):
            peg(name + '_leg', p, rot, (dx, dy, 0.0), 0.028, 'gold', height=0.62)
    rbox(name + '_rail', p, rot, (0.05, 1.70, 0.32), 'gold', (0.46, 0, 0.86))


def ceiling_lamp(name, p, drop=0.45, key='white'):
    o = (p[0], p[1], p[2] - drop)
    pole(name + '_cord', (p[0], p[1], p[2]), o, 0.014, 'black')
    sphere(name + '_globe', (o[0], o[1], o[2] - 0.10), (0.17, 0.17, 0.14), 'glass')
    pole(name + '_cap', (o[0], o[1], o[2]), (o[0], o[1], o[2] - 0.12), 0.14, key, radius2=0.05)


def wall_lamp(name, p, rot=0.0, key='white'):
    rbox(name + '_bracket', p, rot, (0.10, 0.24, 0.10), 'black', (0, 0.14, 0))
    o = L(p, rot, 0, 0.30, 0.02)
    sphere(name + '_globe', o, (0.15, 0.15, 0.19), 'glass')
    pole(name + '_cap', (o[0], o[1], o[2] + 0.16), (o[0], o[1], o[2] + 0.26), 0.13, key, radius2=0.05)


def pot_plant(name, p, pot=0.34, height=1.15, key='leaf'):
    pole(name + '_pot', (p[0], p[1], p[2]), (p[0], p[1], p[2] + pot), pot * 0.8, 'red', radius2=pot)
    ring(name + '_rim', (p[0], p[1], p[2] + pot), pot * 0.98, 0.03, 'white', 'Z')
    top = p[2] + pot
    pole(name + '_stem', (p[0], p[1], top), (p[0], p[1], top + height * 0.45), 0.03, 'darkwood')
    for i in range(6):
        a = i * math.tau / 6
        o = (p[0] + 0.26 * math.cos(a), p[1] + 0.26 * math.sin(a), top + height * (0.35 + 0.09 * (i % 3)))
        sphere('%s_leaf%d' % (name, i), o, (0.24, 0.11, 0.30), key if i % 2 else 'leaflight')


def cannon(name, p, rot=0.0, scale=1.0):
    """Outboard naval cannon: closed hollow bore, carriage and four round wheels."""
    s=scale;n=32;verts=[];faces=[]
    for x,radius in ((-.45,.10),(.75,.13),(.75,.105),(-.38,.075)):
        for i in range(n):
            a=i*math.tau/n
            verts.append(L(p,rot,x*s,math.cos(a)*radius*s,(.64+math.sin(a)*radius)*s))
    for i in range(n):
        j=(i+1)%n
        faces.extend(((i,j,n+j,n+i),(n+i,n+j,2*n+j,2*n+i),
                      (2*n+i,2*n+j,3*n+j,3*n+i)))
    faces.extend((tuple(reversed(range(n))),tuple(range(3*n,4*n))))
    obj=finish(_merge(name+'_barrel',verts,faces,['black']*len(faces)),name+'_barrel','black',obstacle=True)
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
    obj['sunny_cannon_bore']=True
    obj['sunny_cannon_direction']=[math.cos(rot),math.sin(rot),0]
    rim=ring(name+'_rim',L(p,rot,.76*s,0,.64*s),.13*s,.025*s,'gold','X')
    rim.rotation_euler.z=rot
    rbox(name+'_carriage',p,rot,(1.10*s,.52*s,.30*s),'darkwood',(.10*s,0,.30*s))
    for dx in (-.32,.48):
        for side in (-1,1):
            rpole(name+'_wheel',p,rot,(dx*s,(side*.30-.05)*s,.31*s),
                  (dx*s,(side*.30+.05)*s,.31*s),.31*s,'timber',sides=24)
            rpole(name+'_wheel_hub',p,rot,(dx*s,side*.35*s,.31*s),
                  (dx*s,side*.365*s,.31*s),.075*s,'brass',sides=16)


def laundry_hamper(name, p, rot=0.0):
    rbox(name + '_basket', p, rot, (0.52, 0.42, 0.58), 'cream', (0, 0, 0.29))
    ring(name + '_rim', (p[0], p[1], p[2] + 0.58), 0.26, 0.02, 'gold', 'Z')


def ladder(name, p, rot=0.0, height=2.2, width=0.52, rails=0.05):
    """Vertical ladder; p is the foot centre."""
    for dx in (-width / 2, width / 2):
        rpole(name + '_rail', p, rot, (dx, 0, 0), (dx, 0, height), rails / 2, 'white')
    rungs = max(2, int(height / 0.32))
    for i in range(rungs):
        z = 0.22 + i * (height - 0.3) / max(1, rungs - 1)
        rpole('%s_rung%d' % (name, i), p, rot, (-width / 2, 0, z), (width / 2, 0, z), 0.021, 'white')

# --------------------------------------------------------------------------
# openings: walls with real holes, frames, moving leaves, hatches
# --------------------------------------------------------------------------
DOORS = []          # filled by door()/hatch(), consumed by build_interiors' caller


def wall_run(name, p, rot, length, height, openings=(), key='cream', thickness=0.12, base=0.0, front_lintel_key=None):
    """Wall along local +X centred on p, with rectangular openings.

    `openings` is a list of (centre_offset, width, head_height) in local X
    measured from the wall centre. Segments between openings are full height;
    each opening gets a lintel above its head height so the hole is real.
    """
    edges = [-length / 2]
    for centre, width, _head in sorted(openings):
        edges += [centre - width / 2, centre + width / 2]
    edges.append(length / 2)
    for i in range(0, len(edges), 2):
        lo, hi = edges[i], edges[i + 1]
        if hi - lo > 0.02:
            rbox('%s_seg%d' % (name, i), p, rot, (hi - lo, thickness, height), key,
                 ((lo + hi) / 2, 0, base + height / 2))
    for i, (centre, width, head) in enumerate(sorted(openings)):
        if height - head > 0.02:
            lintel=rbox('%s_lintel%d' % (name, i), p, rot, (width, thickness, height - head), 'darkwood',
                        (centre, 0, base + head + (height - head) / 2))
            if front_lintel_key is not None:
                # At the aft entrance stations local +Y faces the bow. Match
                # the SBS cream facade while keeping the interior beam timber.
                lintel.data.materials.append(material(front_lintel_key))
                for face in lintel.data.polygons:
                    if face.normal.y > .9:
                        face.material_index = len(lintel.data.materials) - 1


def door_frame(name, p, rot, width=1.20, height=2.25, thickness=0.12, trim='white', arched=False):
    """Fixed jambs and a real rectangular or N-supported semicircular crown."""
    jamb_h=height-width/2 if arched else height
    for side in (-1, 1):
        rbox('%s_jamb%d' % (name, side), p, rot, (0.10, thickness + 0.08, jamb_h), trim,
             (side * (width / 2 + 0.05), 0, jamb_h / 2))
    if not arched:
        return rbox(name + '_head', p, rot, (width + 0.20, thickness + 0.08, 0.10), trim,
                    (0, 0, height + 0.05))
    # One closed annular crown; its actual inner edge meets both jambs.
    steps=32;n=steps+1;verts=[];faces=[]
    for depth in (-(thickness+.08)/2,(thickness+.08)/2):
        for radius in (width/2,width/2+.10):
            for i in range(n):
                a=i*math.pi/steps
                verts.append(L(p,rot,radius*math.cos(a),depth,jamb_h+radius*math.sin(a)))
    for i in range(steps):
        j=i+1
        faces.extend(((i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),
                      (i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)))
    faces.extend(((0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)))
    faces=[tuple(reversed(face)) for face in faces]
    crown=finish(_merge(name+'_head',verts,faces,[trim]*len(faces)),name+'_head',trim,obstacle=True)
    crown['sunny_door_arch_frame']=True
    crown['sunny_rail']=True  # existing surface colliders preserve the clear arch interior
    return crown


def door(id_, p, rot, width=1.20, height=2.25, kind='slide', sign=1,
         rooms=(), swing_deg=95.0, key='red', arched=False):
    """Authored door leaf + frame and register it for runtime behaviour.

    Sliding leaves run in the wall plane (local X) and never sweep through the
    player. Swinging leaves hinge on one jamb; the runtime rotates the leaf
    about that hinge. Either way the pipeline emits NO static collider for the
    leaf - collision follows the live door state instead.
    """
    door_frame(id_ + '_frame', p, rot, width, height, arched=arched)
    leaf_w, leaf_h = width - 0.05, height - 0.06
    thickness = 0.075
    leaf = rbox('Door_%s_leaf' % id_, p, rot, (leaf_w, thickness, leaf_h), key, (0, 0, leaf_h / 2 + 0.03))
    if arched:
        from sunny_aft_envelope import arch_outline
        outline=arch_outline(leaf_w/2,leaf_h-leaf_w/2,sections=32)
        n=len(outline)
        # Keep the existing leaf origin/rotation/baseOffset: door() parents the
        # handle after this replacement, and runtime translates that root.
        vertices=[(x,y,z-leaf_h/2) for y in (-thickness/2,thickness/2) for x,z in outline]
        faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[
            (i,n+i,n+(i+1)%n,(i+1)%n) for i in range(n)]
        mesh=bpy.data.meshes.new(leaf.name+'_arched')
        mesh.from_pydata(vertices,[],faces);mesh.validate();mesh.update()
        for mat in leaf.data.materials:mesh.materials.append(mat)
        leaf.data=mesh
        leaf['sunny_door_arch']=True
        leaf['sunny_door_arch_radius']=leaf_w/2
        leaf['sunny_door_arch_straight']=leaf_h-leaf_w/2
    leaf['sunny_door'] = id_
    leaf['sunny_walkable'] = False
    leaf['sunny_obstacle'] = False
    if kind == 'swing':
        for index,z in enumerate((.35,leaf_h-.35)):
            rbox('%s_hinge%d'%(id_,index),p,rot,(.05,thickness+.05,.12),'gold',
                 (sign*(leaf_w/2-.02),0,z),obstacle=False)
        rbox(id_ + '_handle', p, rot, (0.05, thickness + 0.10, 0.05), 'gold',
             (-sign * (leaf_w / 2 - 0.16), 0, 1.05))
        spec = {
            'id': id_, 'kind': 'door', 'mode': 'swing', 'rooms': list(rooms),
            'pos': [p[0], p[1], p[2]], 'rot': rot,
            'width': leaf_w, 'height': leaf_h, 'thickness': thickness,
            'hinge': [sign * (leaf_w / 2 - 0.025), 0.0],
            'angle': math.radians(swing_deg) * (1 if sign < 0 else -1),
            'node': leaf.name,
        }
    else:
        rbox(id_ + '_handle', p, rot, (0.05, thickness + 0.09, 0.05), 'gold',
             (sign * (leaf_w / 2 - 0.16), 0, 1.05))
        travel = leaf_w + 0.06
        spec = {
            'id': id_, 'kind': 'door', 'mode': 'slide', 'rooms': list(rooms),
            'pos': [p[0], p[1], p[2]], 'rot': rot,
            'width': leaf_w, 'height': leaf_h, 'thickness': thickness,
            'slide': [math.cos(rot) * sign * travel, math.sin(rot) * sign * travel, 0.0],
            'node': leaf.name,
        }
    spec['baseOffset'] = leaf_h / 2 + 0.03
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Sunny_' + id_ + '_handle'):
            world = obj.matrix_world.copy()
            obj.parent = leaf
            obj.matrix_world = world
            obj['sunny_obstacle'] = False
    DOORS.append(spec)
    return spec


def hatch(id_, p, rot, size=(1.35, 1.10), lid_key='deck', rooms=(), slide_sign=1,
          mode='slide', grille=False):
    """Sliding or edge-hinged hatch with a real aperture through floor layers.

    Upper stair treads remain in the opening; the adjacent exit landing must be
    beyond it. The earlier caller-only shaft cut preceded new exit plates, which
    silently filled four openings after they had been cut.
    """
    w, d = size
    # The wooden coaming fills the outer 8 cm of the floor opening. Cutting
    # only to the lid edge leaves its inner face coincident with the floor's
    # aperture wall, and its top coincident with the walking floor.
    corners = [L(p, rot, dx*(w/2+.08), dy*(d/2+.08)) for dx in (-1,1) for dy in (-1,1)]
    xlo, xhi = min(v[0] for v in corners), max(v[0] for v in corners)
    ylo, yhi = min(v[1] for v in corners), max(v[1] for v in corners)
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH' or obj.get('sunny_stair'):
            continue
        if not (obj.get('sunny_walkable') or 'ceiling' in obj.name):
            continue
        points = [obj.matrix_world@Vector(v) for v in obj.bound_box]
        if (max(v.x for v in points) <= xlo or min(v.x for v in points) >= xhi or
                max(v.y for v in points) <= ylo or min(v.y for v in points) >= yhi or
                max(v.z for v in points) <= p[2]-.25 or min(v.z for v in points) >= p[2]+.20):
            continue
        open_volume_slot(obj, xlo, xhi, ylo, yhi, p[2]-.25, p[2]+.20)
    for side in (-1, 1):
        rbox('Hatch_%s_frame_x%d' % (id_, side), p, rot, (0.08, d + 0.16, 0.08), 'darkwood', (side * (w / 2 + 0.04), 0, -0.04), walkable=True)
        rbox('Hatch_%s_frame_y%d' % (id_, side), p, rot, (w, 0.08, 0.08), 'darkwood', (0, side * (d / 2 + 0.04), -0.04), walkable=True)
    lid = rbox('Hatch_%s_lid' % id_, p, rot, (w, d, 0.09), lid_key, (0, 0, -0.045))
    lid['sunny_hatch'] = id_
    lid['sunny_access_slot'] = [xlo, xhi, ylo, yhi]
    lid['sunny_walkable'] = False
    lid['sunny_obstacle'] = False
    lid['sunny_hatch_mode'] = mode
    for dy in (-d / 2 + 0.14, d / 2 - 0.14):
        rbox('%s_hinge%d' % (id_, dy > 0 and 1 or 0), p, rot, (0.16, 0.24, 0.04), 'black',
             (w / 2 if mode=='lift' else w / 2 - 0.14, dy, .015 if mode=='lift' else 0.17))
    ring('%s_ring' % id_, L(p, rot, -w / 2 + 0.22, 0, .045 if mode=='lift' else 0.17), 0.085, 0.02, 'gold', 'Z')
    if grille:
        # N shows an airtight solid panel with a framed grid. Keep the seal
        # below its perimeter; no invented open grating admits rainwater.
        for dy in (-d/2+.035,d/2-.035):
            rbox(id_+'_grille_edge',p,rot,(w,.07,.025),'black',(0,dy,.0125),obstacle=False)
        for dx in (-w/2+.035,w/2-.035):
            rbox(id_+'_grille_edge',p,rot,(.07,d,.025),'black',(dx,0,.0125),obstacle=False)
        for i in range(1,5):
            rbox(id_+'_grille_x',p,rot,(.025,d-.10,.025),'black',(-w/2+w*i/5,0,.0125),obstacle=False)
        for i in range(1,4):
            rbox(id_+'_grille_y',p,rot,(w-.10,.025,.025),'black',(0,-d/2+d*i/4,.0125),obstacle=False)
        lid['sunny_airtight_grille'] = True
    spec = {
        'id': id_, 'kind': 'hatch', 'mode': mode, 'rooms': list(rooms),
        'pos': [p[0], p[1], p[2]], 'rot': rot,
        'width': w, 'depth': d, 'height': 0.09, 'thickness': 0.09, 'baseOffset': -0.045,
        'slide': [-math.sin(rot) * slide_sign * (d + 0.18), math.cos(rot) * slide_sign * (d + 0.18), 0.0],
        'node': lid.name,
    }
    if mode=='lift':
        spec.pop('slide')
        spec.update(hinge=[w/2,0],angle=math.pi/2)
    bpy.context.view_layer.update()
    for obj in list(bpy.data.objects):
        if obj.name.startswith(('Sunny_' + id_ + '_hinge','Sunny_' + id_ + '_grille')) or obj.name == 'Sunny_' + id_ + '_ring':
            world = obj.matrix_world.copy()
            obj.parent = lid
            obj.matrix_world = world
            obj['sunny_obstacle'] = False
    DOORS.append(spec)
    return spec


def cut_floor_slot(floor_obj, frame, level, centre, size, rot=0.0):
    """Remove a real rectangular opening through an authored floor."""
    w, d = size
    cx, cy = L(centre, rot)[:2]
    open_plan_slot(floor_obj, cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2)


# --------------------------------------------------------------------------
# stairs - rise is divided into real 0.185 m risers
# --------------------------------------------------------------------------
TARGET_RISE = 0.185
TARGET_GOING = 0.30


def stair_flight(name, p, rot, rise, run, width=1.45, rails=(True, True), stringer=True):
    """Straight flight rising `rise` m over `run` m along local +X from p.

    The number of risers is chosen so every tread is a normal human step, which
    is why this cannot be authored before the ship is enlarged.
    """
    n = max(2, int(round(rise / TARGET_RISE)))
    going = run / n
    tread_d = max(TARGET_GOING * 0.55, going)
    for i in range(n):
        x = run * (i + 0.5) / n
        z = rise * (i + 1) / n
        t = rbox('%s_tread%d' % (name, i), p, rot, (tread_d, width, 0.075), 'deck',
                 (x, 0, z - 0.037))
        t['sunny_stair'] = True
        t['sunny_walkable'] = True
        if stringer:
            rbox('%s_riser%d' % (name, i), p, rot, (0.05, width, rise / n), 'timber',
                 (run * i / n, 0, z - rise / (2 * n)), obstacle=False)
    if rails[0]:
        a, b = L(p, rot, 0, width / 2 - 0.03, 0), L(p, rot, run, width / 2 - 0.03, rise)
        rail = pole('%s_rail%d' % (name, 0), (a[0], a[1], a[2] + 0.98), (b[0], b[1], b[2] + 0.98),
                    0.032, 'white')
        rail['sunny_rail'] = True
        rail['sunny_obstacle'] = True
    if rails[1]:
        a, b = L(p, rot, 0, -width / 2 + 0.03, 0), L(p, rot, run, -width / 2 + 0.03, rise)
        rail = pole('%s_rail%d' % (name, 1), (a[0], a[1], a[2] + 0.98), (b[0], b[1], b[2] + 0.98),
                    0.032, 'white')
        rail['sunny_rail'] = True
        rail['sunny_obstacle'] = True
    return n


def switchback(name, p, rot, rise, run, width=1.40, gap=1.60, rails=True):
    """Two flights and a half landing; footprint is run x (width + gap)."""
    half = rise / 2
    separation = width + gap
    n1 = stair_flight(name + '_up', p, rot, half, run, width, rails=(rails, rails))
    landing = rbox(name + '_landing', p, rot, (1.5, separation + width, 0.16), 'deck',
                   (run + 0.70, -separation / 2, half - 0.08), walkable=True)
    start = L(p, rot, run, -separation, half)
    n2 = stair_flight(name + '_over', start, rot + math.pi, half, run, width, rails=(rails, rails))
    rbox(name + '_exit', p, rot, (1.5, width, 0.16), 'deck', (-0.70, -separation, rise - 0.08), walkable=True)
    return n1, n2, landing


# --------------------------------------------------------------------------
# aquarium
# --------------------------------------------------------------------------
def aquarium(name, p, size, water_depth=2.6, seed=0):
    """Glass-walled tank with its own water volume, rocks, coral and fish.

    The tank water is a separate closed volume inside the glass, which is what
    keeps the ocean outside the hull and the aquarium water inside its tank.
    """
    w, d, h = size
    # frame posts and rails
    for dx in (-1, 1):
        for dy in (-1, 1):
            peg('%s_post' % name, p, 0, (dx * w / 2, dy * d / 2, 0), 0.075, 'gold', height=h)
    for z in (0.08, h - 0.06):
        for dy in (-1, 1):
            rbox('%s_rail' % name, p, 0, (w, 0.10, 0.12), 'gold', (0, dy * d / 2, z))
        for dx in (-1, 1):
            rbox('%s_rail' % name, p, 0, (0.10, d, 0.12), 'gold', (dx * w / 2, 0, z))
    # glass panes (solid so the water reads as enclosed)
    for dy in (-1, 1):
        rbox('%s_glass' % name, p, 0, (w, 0.05, h - 0.2), 'glass', (0, dy * d / 2, h / 2))
    for dx in (-1, 1):
        rbox('%s_glass' % name, p, 0, (0.05, d, h - 0.2), 'glass', (dx * w / 2, 0, h / 2))
    rbox('%s_tankbed' % name, p, 0, (w, d, 0.12), 'cream', (0, 0, 0.06))
    # the water body itself
    rbox('%s_water' % name, p, 0, (w - 0.22, d - 0.22, water_depth), 'tankwater',
         (0, 0, water_depth / 2 + 0.10), obstacle=False)
    value = 9176 + seed * 104729
    for i in range(7):
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
        rx = (value % 1000) / 1000.0 - 0.5
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
        rz = (value % 1000) / 1000.0 - 0.5
        s = 0.30 + (value % 5) * 0.11
        sphere('%s_rock%d' % (name, i), (p[0] + rx * (w - 1.6), p[1] + rz * (d - 1.6), p[2] + s * 0.45),
               (s, s * 0.85, s * 0.7), 'mane' if i % 2 else 'cream')
    for i in range(10):
        a = i * 2.399
        px = p[0] + math.cos(a) * (w / 2 - 0.7) * (0.35 + 0.12 * (i % 4))
        py = p[1] + math.sin(a) * (d / 2 - 0.7) * (0.35 + 0.12 * (i % 3))
        base = p[2] + 0.14
        height = 0.55 + (i % 4) * 0.34
        for k in range(3):
            ang = a + k * 0.9
            pole('%s_coral%d_%d' % (name, i, k), (px, py, base),
                 (px + math.cos(ang) * 0.28, py + math.sin(ang) * 0.28, base + height * (1 - 0.2 * k)),
                 0.05, ('mane', 'red', 'pink')[k], radius2=0.025)
    for i in range(12):
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
        fx = p[0] + ((value % 1000) / 1000.0 - 0.5) * (w - 1.2)
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
        fy = p[1] + ((value % 1000) / 1000.0 - 0.5) * (d - 1.2)
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
        fz = p[2] + 0.5 + ((value % 1000) / 1000.0) * (water_depth - 0.9)
        key = ('mane', 'white', 'gold', 'red')[value % 4]
        rbox('%s_fish%d' % (name, i), (fx, fy, fz), value % 6, (0.30, 0.11, 0.16), key, obstacle=False)
        rbox('%s_tail%d' % (name, i), (fx, fy, fz), value % 6, (0.12, 0.05, 0.13), key, (-0.20, 0, 0), obstacle=False)


def curved_aquarium(name, p, outer=(6.5, 10.5), thickness=1.5, h=3.5):
    """Segmented elliptical tank following Oda's semicircular aquarium lounge.

    Each pane has a narrow collision box; water sectors are closed prisms inset
    from glass on all sides. The volume and panes share the same angular bounds.
    """
    count=24
    def point(a, rx, ry, z):
        return (p[0]+rx*math.cos(a),p[1]+ry*math.sin(a),p[2]+z)
    def prism(id_, a, b, rx, ry, thick, low, high, key, obstacle):
        verts=[point(t,x,y,z) for z in (low,high) for t,x,y in
               ((a,rx,ry),(b,rx,ry),(b,rx-thick,ry-thick),(a,rx-thick,ry-thick))]
        faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        obj=_merge('Sunny_'+id_,verts,faces,[key]*6)
        obj['sunny_authored']=True
        obj['sunny_feature']='Aquarium'
        obj['sunny_obstacle']=obstacle
        return obj
    for i in range(count):
        a=-math.pi/2+i*math.pi/count;b=a+math.pi/count
        ident=name+'_sector%d'%i
        rx,ry=outer
        prism(ident+'_glass',a,b,rx,ry,.045,.1,h-.1,'glass',True)
        prism(ident+'_glass_inner',a,b,rx-thickness,ry-thickness,.045,.1,h-.1,'glass',True)
        prism(ident+'_tankbed',a,b,rx,ry,thickness,0,.12,'cream',True)
        # Inset angles and radii avoid the glass and the sector end faces.
        water=prism(ident+'_water',a+.012,b-.012,rx-.12,ry-.12,thickness-.26,.14,2.8,'tankwater',False)
        water['sunny_tank_sector']=i
        for z in (.08,h-.06):
            for inset in (0,thickness):
                pole(ident+'_rail',point(a,rx-inset,ry-inset,z),point(b,rx-inset,ry-inset,z),.05,'gold')
        if i%4==0:
            pole(ident+'_post',point(a,rx-thickness,ry-thickness,0),point(a,rx-thickness,ry-thickness,h),.05,'gold')
        if i%2==0:
            ang=(a+b)/2
            q=point(ang,rx-thickness/2,ry-thickness/2,1.0+(i%3)*.55)
            body=sphere(ident+'_fish',q,(.32,.10,.15),('orange','white','gold')[i%3])
            body.rotation_euler.z=ang+math.pi/2
            eye=point(ang,rx-thickness/2-.06,ry-thickness/2-.06,1.04+(i%3)*.55)
            sphere(ident+'_eye',eye,(.028,.028,.028),'black')
            rbox(ident+'_tail',q,ang+math.pi/2,(.12,.05,.24),'orange',(-.34,0,0),obstacle=False)
        if i%3==0:
            q=point((a+b)/2,rx-.75,ry-.75,.25)
            sphere(ident+'_rock',q,(.25,.3,.2),'cream')
            pole(ident+'_coral',q,(q[0]+.15,q[1]-.1,q[2]+.7),.04,'pink',radius2=.02)


def den_den_mushi(name, p, rot=0.0):
    rbox(name + '_body', p, rot, (0.34, 0.30, 0.52), 'mane', (0, 0, 0.26))
    sphere(name + '_head', (p[0], p[1], p[2] + 0.66), (0.21, 0.21, 0.19), 'white')
    for dx in (-0.09, 0.09):
        sphere('%s_eye%s' % (name, dx > 0 and 'r' or 'l'), (p[0] + dx, p[1] - 0.17, p[2] + 0.70),
               (0.05, 0.03, 0.07), 'black')
    for dx in (-0.13, 0.13):
        rbox('%s_antenna%s' % (name, dx > 0 and 'r' or 'l'), p, rot, (0.03, 0.03, 0.20), 'black',
             (dx, 0, 0.84))


def dumbwaiter(name, p, rot=0.0, h=2.6):
    """Food lift built into the mast, connecting the kitchen to the aquarium bar."""
    for side in (-1, 1):
        rbox('%s_guide%s' % (name, side > 0 and 'r' or 'l'), p, rot, (0.07, 0.9, h), 'darkwood',
             (side * 0.52, 0, h / 2))
    rbox(name + '_car', p, rot, (0.92, 0.80, 0.06), 'timber', (0, 0, 1.05))
    rbox(name + '_hatch', p, rot, (1.10, 1.00, 0.08), 'white', (0, 0, 1.12))
    rpole(name + '_rope', p, rot, (0, 0, 1.10), (0, 0, h), 0.014, 'rope')


def mast_food_lift(mast, floor, mx, my, lower, upper):
    """Recess the two service openings and shared food car into the mast."""
    bpy.context.view_layer.update()
    # The shaft opens through the forward side, while the remaining cylindrical
    # wall and the three inner liners carry the rest of the mast envelope.
    open_volume_slot(mast,mx-1.50,mx+.52,my-.60,my+.60,lower+.68,upper+1.82)
    mast['sunny_rail']=True
    open_plan_slot(floor,mx-1.07,mx+.50,my-.56,my+.56)
    bottom=lower+.90;top=upper+.90;span=top-bottom
    # Enclosed shaft backing and side walls; collision follows their faces.
    for name,pos,size in (
        ('back',(mx+.50,my,(bottom+top+1.0)/2),(.07,1.2,span+1.0)),
        ('sideL',(mx-.30,my-.59,(bottom+top+1.0)/2),(1.60,.07,span+1.0)),
        ('sideR',(mx-.30,my+.59,(bottom+top+1.0)/2),(1.60,.07,span+1.0)),
        ('between',(mx-1.25,my,(lower+1.90+upper+.65)/2),(.08,1.20,upper+.65-(lower+1.90)))):
        obj=box('FoodLift_shaft_'+name,pos,size,'darkwood');obj['sunny_obstacle']=True;obj['sunny_rail']=True
    for side in (-1,1):
        pole('FoodLift_guide%d'%side,(mx+.33,my+side*.48,bottom-.05),
             (mx+.33,my+side*.48,top+1.15),.035,'gold')
    for z in (lower,upper):
        for side in (-1,1):
            box('FoodLift_frame_side',(mx-1.27,my+side*.62,z+1.31),(.12,.12,1.32),'timber')
        box('FoodLift_frame_top',(mx-1.27,my,z+1.97),(.12,1.36,.12),'timber')
        box('FoodLift_call',(mx-1.31,my+.78,z+1.05),(.09,.20,.20),'gold')
        text('FoodLift_call_label','E  LIFT',(mx-1.37,my+.78,z+1.32),.15,'white',(math.pi/2,0,-math.pi/2))
    # The platform and its low back/side lips travel together in one shaft.
    for name,pos,size in (
        ('car',(mx-.25,my,bottom),(1.45,1.04,.08)),
        ('car_back',(mx+.43,my,bottom+.23),(.08,1.04,.42)),
        ('car_left',(mx-.25,my-.48,bottom+.16),(1.45,.06,.28)),
        ('car_right',(mx-.25,my+.48,bottom+.16),(1.45,.06,.28))):
        part=box('FoodLift_'+name,pos,size,'timber')
        part['sunny_dynamic']=True;part['sunny_food_lift']=True
    # Small wine cupboard belongs to the lower mast, below the service sill.
    box('FoodLift_wine_back',(mx-1.20,my,lower+.36),(.08,1.10,.62),'darkwood')
    for z in (lower+.10,lower+.65):box('FoodLift_wine_shelf',(mx-1.32,my,z),(.35,1.10,.06),'timber')
    for i in range(5):
        pole('FoodLift_wine%d'%i,(mx-1.30,my-.42+i*.21,lower+.15),(mx-1.30,my-.42+i*.21,lower+.43),.045,'red')
    return dict(centre=[mx,my],bottom=bottom,top=top,travel=span,
                calls=[[mx-1.48,my,lower],[mx-1.48,my,upper]],
                opening=[mx-1.50,mx+.52,my-.60,my+.60],reference='R10/R11 mast service lift; reconstructed dimensions')


# --------------------------------------------------------------------------
# hull fitting in final metre space
# --------------------------------------------------------------------------
def _hull_sides(objects, x, z, centre):
    hull = next(o for o in objects if o.name == 'Line002')
    inv = hull.matrix_world.inverted()
    sides = []
    for direction in (-1, 1):
        hit, loc, _n, _i = hull.ray_cast(inv @ Vector((x, centre, z)),
                                         inv.to_3x3() @ Vector((0, direction, 0)))
        if not hit:
            return None
        sides.append((hull.matrix_world @ loc).y - direction * 0.22)
    return sides


def fit_floor(objects, name, f, x_lo, x_hi, level, centre=None):
    """Hull-fitted room floor spanning blueprint stations x_lo..x_hi."""
    centre = CENTRE_Y * S if centre is None else centre
    z = f.z(level)
    profile = []
    steps = max(6, int(abs(f.x(x_hi) - f.x(x_lo)) / 0.4))
    for i in range(steps + 1):
        x = f.x(x_lo + (x_hi - x_lo) * i / steps)
        sides = _hull_sides(objects, x, z, centre)
        if sides and sides[1] - sides[0] > 2.4:
            profile.append((x, *sides))
    if len(profile) < 6:
        raise RuntimeError('cannot fit %s to the hull' % name)
    outline = [(x, low) for x, low, _hi in profile] + [(x, high) for x, _low, high in reversed(profile)]
    return plan_floor(name, outline, z)


def rect_floor(name, f, x_lo, x_hi, y_lo, y_hi, level):
    return plan_floor(name, [(f.x(x_lo), f.y(y_lo)), (f.x(x_hi), f.y(y_lo)),
                             (f.x(x_hi), f.y(y_hi)), (f.x(x_lo), f.y(y_hi))], f.z(level))


def fore_hull_outline(objects, x_end, z, centre):
    """Rounded F1/F2 plan from actual hull sections, in final world metres.

    The supplied plans establish the rounded shape, not metric dimensions.
    Continue the last sourced section only across the existing aft door
    transfer where the imported upper hull ends; never invent a bow contour.
    """
    hull = next(o for o in objects if o.name == 'Line002')
    start = min((hull.matrix_world @ v.co).x for v in hull.data.vertices) + .22
    count = math.ceil((x_end-start)/.30)
    profile, ended = [], False
    for i in range(count+1):
        x = start+(x_end-start)*i/count
        sides = _hull_sides(objects, x, z+.015, centre)
        if sides and sides[1]-sides[0] > .65:
            if ended:
                raise RuntimeError('interrupted fore hull section at %.3f' % x)
            profile.append((x, *sides))
        elif profile:
            ended = True
    if len(profile) < 24 or x_end-profile[-1][0] > 2.5:
        raise RuntimeError('cannot trace complete forward enclosure')
    if profile[-1][0] < x_end-.001:
        profile.append((x_end, profile[-1][1], profile[-1][2]))
    return [(x, low) for x, low, _ in profile] + [(x, high) for x, _, high in reversed(profile)]


def inset_outline(outline, distance):
    """Inset a counterclockwise plan using intersecting offset edge lines."""
    result = []
    for i, point in enumerate(outline):
        p = Vector(point)
        before = (p-Vector(outline[i-1])).normalized()
        after = (Vector(outline[(i+1) % len(outline)])-p).normalized()
        a, b = Vector((-before.y, before.x)), Vector((-after.y, after.x))
        denominator = 1+a.dot(b)
        if denominator < .1:
            raise RuntimeError('folded forward plan corner')
        result.append(tuple(p+(a+b)*(distance/denominator)))
    return result


def curved_fore_lining(name, outline, z, height):
    """One joined 18 cm wall ring, supported inside its actual curved floor.

    Shared mitred corners replace overlapping straight wall boxes. The
    existing common door/headroom cuts operate on this physical mesh.
    """
    outer, inner = inset_outline(outline, .06), inset_outline(outline, .24)
    n = len(outline)
    levels = (z, z+.72, z+height)
    verts = [(x, y, level) for level in levels for ring in (outer, inner) for x, y in ring]
    faces, colours = [], []
    for row in range(2):
        low, high = row*2*n, (row+1)*2*n
        for i in range(n):
            j = (i+1) % n
            faces.extend(((low+i, low+j, high+j, high+i),
                          (low+n+j, low+n+i, high+n+i, high+n+j)))
            colours.extend(('cream', 'timber' if row == 0 else 'cream'))
    top = 4*n
    for i in range(n):
        j = (i+1) % n
        faces.extend(((j, i, n+i, n+j), (top+i, top+j, top+n+j, top+n+i)))
        colours.extend(('cream', 'cream'))
    obj = _merge('Sunny_'+name, verts, faces, colours)
    obj['sunny_authored'] = True
    obj['sunny_feature'] = name
    obj['sunny_obstacle'] = True
    return obj


# --------------------------------------------------------------------------
# the ship interior
# --------------------------------------------------------------------------
def fore_partition_span(outline, y, thickness):
    """Common supported X span of both wall faces inside the curved lining."""
    inner = inset_outline(outline, .24)
    spans = []
    for lateral in (y-thickness/2, y+thickness/2):
        intersections = []
        for a, b in zip(inner, inner[1:]+inner[:1]):
            if min(a[1], b[1]) <= lateral < max(a[1], b[1]):
                t = (lateral-a[1])/(b[1]-a[1])
                intersections.append(a[0]+t*(b[0]-a[0]))
        if len(intersections) != 2:
            raise RuntimeError('ambiguous fore partition support')
        spans.append((min(intersections), max(intersections)))
    return max(p[0] for p in spans), min(p[1] for p in spans)


def perimeter_lining(name, outline, z, height, key='cream', fore_ceiling=None, fore_limit=-9.0):
    """Closed, chord-aligned walls on an actual floor outline; no sampled gaps."""
    for i, (a, b) in enumerate(zip(outline, outline[1:] + outline[:1])):
        points = [a, b]
        if fore_ceiling is not None and (a[0] < fore_limit) != (b[0] < fore_limit):
            t = (fore_limit-a[0])/(b[0]-a[0])
            points.insert(1, (fore_limit, a[1]+t*(b[1]-a[1])))
        for j, (p, q) in enumerate(zip(points, points[1:])):
            dx, dy = q[0]-p[0], q[1]-p[1]
            length = math.hypot(dx, dy)
            actual_height = fore_ceiling-z if fore_ceiling is not None and (p[0]+q[0])/2 < fore_limit else height
            suffix = '' if len(points) == 2 else '_part%d'%j
            wall_run(name+'_%d'%i+suffix, ((p[0]+q[0])/2,(p[1]+q[1])/2,z),
                     math.atan2(dy,dx),length+.035,actual_height,key=key,thickness=.18)


def circular_lining(name, p, rx, ry, height, entrance=False, windows=True, wide_windows=False):
    """Continuous elliptical shell with real sash apertures and a common doorway cut."""
    count=48
    for i in range(count):
        a=(i-.5)*math.tau/count; b=(i+.5)*math.tau/count
        v0=(p[0]+rx*math.cos(a),p[1]+ry*math.sin(a))
        v1=(p[0]+rx*math.cos(b),p[1]+ry*math.sin(b))
        q=((v0[0]+v1[0])/2,(v0[1]+v1[1])/2,p[2])
        going=math.dist(v0,v1)+.035
        rot=math.atan2(v1[1]-v0[1],v1[0]-v0[0])
        window=(i%6 in (0,1,5) and i not in (23,24,25)) if wide_windows else (i%6==0 and i!=24)
        low,high=(.72,height-.18) if wide_windows else (1.15,2.25)
        sash=high-low
        if windows and window:
            rbox(name+'_window_base',q,rot,(going,.20,low),'cream',(0,0,low/2))
            rbox(name+'_window_head',q,rot,(going,.20,height-high),'cream',(0,0,(height+high)/2))
            for side in (-1,1):
                rbox(name+'_window_jamb',q,rot,(.09,.23,sash),'white',(side*(going/2-.045),0,(low+high)/2))
            rbox(name+'_glass',q,rot,(going-.18,.05,sash-.02),'glass',(0,0,(low+high)/2))
            rbox(name+'_mullion',q,rot,(.035,.08,sash),'black',(0,0,(low+high)/2))
            for fraction in ((1/3,2/3) if wide_windows else (.5,)):
                rbox(name+'_crossbar',q,rot,(going,.08,.035),'black',(0,0,low+sash*fraction))
        else:
            rbox(name+'_wall',q,rot,(going,.20,height),'cream',(0,0,height/2))
        rbox(name+'_dado',q,rot,(going,.23,.72),'timber',(0,0,.36))
    if entrance:
        bpy.context.view_layer.update()
        for obj in list(bpy.data.objects):
            if obj.name.startswith('Sunny_'+name):
                open_volume_slot(obj,p[0]-rx-.3,p[0]-rx+.6,p[1]-.775,p[1]+.775,p[2]-.15,p[2]+2.52)


def hut_roof(name, p):
    """Striped domed attic roof, closed above its timber ceiling."""
    verts,faces,colours=[],[],[]
    profile=((6.05,6.5,3.0),(5.95,6.4,3.25),(5.45,5.9,5.1),(4.9,5.4,5.72),(3.2,3.55,6.1),(.0,.0,6.22))
    n=48
    for rx,ry,z in profile:
        for i in range(n):
            a=i*math.tau/n;verts.append((p[0]+rx*math.cos(a),p[1]+ry*math.sin(a),p[2]+z))
    for row in range(len(profile)-1):
        for i in range(n):
            j=(i+1)%n
            faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
            colours.append('red' if (i//4)%2 else 'gold')
    obj=_merge('Sunny_'+name,verts,faces,colours);obj['sunny_authored']=True;obj['sunny_feature']='LibraryRoof';obj['sunny_rail']=True;obj['sunny_obstacle']=True
    return obj


def build_interiors(objects, vertex_bbox, shift, aft_snapshot=None):
    """Author every interior level, room, fixture and opening, in metres."""
    del DOORS[:]
    f = Frame(shift)
    centre = CENTRE_Y * S
    for obj in list(objects):
        number=int(obj.name[3:]) if obj.name.startswith('Box') and obj.name[3:].isdigit() else -1
        if obj.name in ('Cylinder002','Rectangle037','Rectangle038','Tube007') or 123 <= number <= 137:
            objects.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    rooms = []
    from sunny_details import dock_vehicle, tea_set, wall_art
    dock_solids=[]
    level_of = {
        'B1': f.z(LEVEL_B1), 'F1': f.z(LEVEL_F1), 'F2F': f.z(LEVEL_F2F),
        'F2A': f.z(LEVEL_F2A), 'F3G': f.z(LEVEL_F3G), 'F3L': f.z(LEVEL_F3L),
    }
    level_of['F3B'] = level_of['F3L'] + 3.05   # the attic bath over the library

    def P(xs, ys, level, dx=0.0, dy=0.0, dz=0.0):
        return f.p(xs, ys, level, dx, dy, dz)

    # ======================================================================
    # B1 - below deck: store, workshops, Soldier Dock turntable, energy room
    # ======================================================================
    B1 = level_of['B1']
    b1_floor = fit_floor(objects, 'InteriorFloor_lower', f, -12.8, 11.8, LEVEL_B1, centre)
    outline=[tuple((b1_floor.matrix_world @ v.co)[:2]) for v in b1_floor.data.vertices]
    b1_trim_outline = list(outline)
    # Join the existing storage perimeter to its actual ceiling. The former
    # 5.82m wall stopped 0.60m short, exposing preserved outboard hull trim.
    perimeter_lining('InteriorWall_B1',outline,B1,5.82,'timber',fore_ceiling=level_of['F1']-.36)
    b1_ceiling=plan_floor('B1_ceiling',outline,level_of['F1']-.18)
    b1_ceiling['sunny_walkable']=True;b1_ceiling['sunny_obstacle']=False

    cy = f.y(CENTRE_Y)
    # Oda's plan: fore storage, central radial dock, paired aft workshops.
    store_x = (f.x(-12.8), -9.0)
    dock = (-9.0, 8.5)
    shop = (8.5, 20.2)
    en = (20.2, f.x(11.8))
    for i, x in enumerate((-9.0, 8.5, 20.2)):
        offsets = (0.0,) if i == 0 else (-5.5, 5.5)
        wall_run('RoomPartition_b1_%d' % i, (x, cy, B1), math.pi/2, 25.0, 5.7,
                 openings=tuple((v, 1.4, 2.45) for v in offsets), thickness=.22)
        for j, offset in enumerate(offsets):
            door('B1_door%d_%d' % (i,j), (x,cy+offset,B1), math.pi/2, 1.4, 2.45,
                 rooms=('B1',), key='red')
    wall_run('RoomPartition_workshops', ((shop[0]+shop[1])/2,cy,B1), 0, shop[1]-shop[0],5.7,
             openings=((0,1.4,2.45),))
    door('WorkshopDoor', ((shop[0]+shop[1])/2,cy,B1), 0,1.4,2.45,
         rooms=("Usopp's Main Factory", "Franky's Weapon Development Room"),key='white')
    for i in range(9):
        crate('Store_crate%d'%i, (store_x[0]+2.5+(i%3)*1.05,-5.6+(i//3)*1.1,B1), .04*i,.78)
    for i in range(4):
        barrel('Store_barrel%d'%i, (store_x[1]-2-i*.78,7.0,B1))
    for i in range(7):
        sack('Store_sack%d'%i, (store_x[0]+5+(i%4)*.62,5+(i//4)*.7,B1))
    shelf_unit('Store_shelf', (store_x[1]-1,-7.6,B1),0,2.6,.5,2.2,4)
    rooms.append(dict(level='B1',name='Storage Room',x=store_x,y=(-9,10)))

    # Six radial channels beneath the lawn, concentric with exterior dock plates.
    dcentre=(f.x(-.35),cy)
    turn_r=7.8
    # Cut the native floor for the rotating chamber using its actual convex
    # boundary. The original fitted perimeter is retained separately for the
    # external mouth reveals and the fore trim ownership calculation.
    chamber_opening=[(dcentre[0]+turn_r*math.cos(i*math.tau/64),
                      cy+turn_r*math.sin(i*math.tau/64)) for i in range(64)]
    open_convex_plan_slot(b1_floor,chamber_opening)
    bpy.context.view_layer.update()
    original_shutters=[o for o in objects if o.name.startswith('Sunny_Dock1_shutter')]
    if len(original_shutters)!=2:
        raise RuntimeError('expected the two retained Dock mouth stations')
    mouth_stations=sorted(((sum((o.matrix_world@Vector(v)).y for v in o.bound_box)/8,
                            sum((o.matrix_world@Vector(v)).z for v in o.bound_box)/8) for o in original_shutters))
    dock_bed=B1-6.0
    dock_water=B1-4.7
    waiting_floor=dock_water+.45
    dock_roof=level_of['F1']-.18
    portal_height=2.85
    # Two actual transverse floor slots continue the chamber to the retained
    # mouths.  The replacement dock_bed and side walls below carry the water.
    from sunny_dock_transition import rings,subtract_frustum,make_shell,make_water
    outlet_sections=[]
    for end,mouth_z in mouth_stations:
        direction=-1 if end<cy else 1
        start=cy+direction*(turn_r-.12)
        sections=rings(dcentre[0],start,end-direction*.10,dock_bed,dock_roof,mouth_z,7.64)
        outlet_sections.append(sections)
        for a,b in zip(sections,sections[1:]):
            subtract_frustum(b1_floor,a,b)
            subtract_frustum(b1_ceiling,a,b)
    bed_disk=pole('Dock_water_bed',(dcentre[0],cy,dock_bed-.18),(dcentre[0],cy,dock_bed),turn_r,'timber',sides=64)
    bed_disk['sunny_walkable']=True
    centre_wall=dock_water_annulus('Dock_centre_wall',dcentre,2.12,2.30,dock_bed,waiting_floor-.06)
    finish(centre_wall,'Dock_centre_wall','timber',obstacle=True)
    centre_wall['sunny_rail']=True
    dock_water_annulus('Dock_water_chamber',dcentre,2.30,turn_r-.12,dock_bed+.02,dock_water)
    # Fixed perimeter is interrupted only at the two transverse outlets.
    # Small physical sections follow the actual circular chamber edge.
    for j in range(96):
        a=(j+.5)*math.tau/96
        if abs(math.cos(a))*turn_r < 2.95:
            continue
        point=(dcentre[0]+turn_r*math.cos(a),cy+turn_r*math.sin(a),dock_bed)
        rbox('Dock_outer_wall%d'%j,point,a+math.pi/2,(turn_r*math.tau/96+.03,.18,dock_roof-dock_bed),'timber',
             (0,0,(dock_roof-dock_bed)/2))
    for side,(end,mouth_z) in enumerate(mouth_stations):
        direction=-1 if end<cy else 1
        start=cy+direction*(turn_r-.12)
        length=abs(end-start)
        mid=(start+end)/2
        rbox('Dock_outlet%d_bed'%side,(dcentre[0],mid,dock_bed),0,(4.8,length,.18),'timber',(0,0,-.09),walkable=True)
        make_water('Dock_outlet%d_water'%side,outlet_sections[side],dock_water)
        make_shell('Dock_outlet%d_round_shell'%side,outlet_sections[side])
        for sign in (-1,1):
            rail=pole('Dock_outlet%d_guide%d'%(side,sign),
                      (dcentre[0]+sign*1.70,start+direction*.22,dock_water+.10),
                      (dcentre[0]+sign*1.70,end,dock_water+.10),.045,'darkwood')
            # This straight axial rail is thinner than the sectioned-wall
            # export's minimum face height. Its exact axis-aligned solid box
            # preserves collision rather than silently dropping every face.
            rail['sunny_obstacle']=True
            for j in range(5):
                yy=start+(end-start)*(j+.5)/5
                post=pole('Dock_outlet%d_guide_post%d_%d'%(side,sign,j),
                          (dcentre[0]+sign*1.70,yy,dock_bed),(dcentre[0]+sign*1.70,yy,dock_water+.10),.035,'darkwood')
                post['sunny_rail']=True;post['sunny_obstacle']=True
    waiting=pole('Dock_turntable_deck',(dcentre[0],cy,waiting_floor-.16),(dcentre[0],cy,waiting_floor),2.30,'deck',sides=64)
    waiting['sunny_walkable']=True
    pole('Dock_centre_support',(dcentre[0],cy,dock_bed),(dcentre[0],cy,waiting_floor-.16),.38,'darkwood',sides=24)['sunny_obstacle']=True
    pole('Dock_turntable_hub',(dcentre[0],cy,waiting_floor+.10),(dcentre[0],cy,waiting_floor+1.05),.26,'darkwood')
    for i in range(6):
        before=set(bpy.data.objects)
        # The selected sector must face the transverse hull apertures.  The
        # navigation system rotates sector i back to this initial direction.
        a=math.pi/2+i*math.tau/6
        rpole('Dock_capstan_spoke%d'%i,(dcentre[0],cy,waiting_floor),a,(0,0,1.0),(1.1,0,1.0),.035,'timber')
        contents=('Shiro Mokuba I','Mini Merry II','Shark Submerge III','Kurosai FR-U IV','Brachio Tank V','Inflatable Pool')[i]
        label=text('Dock_channel%d_label'%(i+1),str(i+1)+'  '+contents,
                   L((dcentre[0],cy,waiting_floor),a,2.44,0,portal_height+.20),.18,'white',(math.pi/2,0,a+math.pi/2))
        label['sunny_channel']=i+1
        # Physical radial partitions separate the tall water-bearing bays.
        # Segmenting them keeps rotated dynamic collision close to the mesh.
        edge=a+math.pi/6
        for j in range(16):
            start=2.30+j*(5.30/16)
            rbox('Dock_sector%d_wall%02d'%(i,j),(dcentre[0],cy,dock_bed),edge,(5.30/16+.01,.14,dock_roof-dock_bed),'timber',
                 (start+5.30/32,0,(dock_roof-dock_bed)/2))
        # Segmented moving guide rails have physical collision and are
        # supported from the wet bed; future vehicle deployment remains M10.
        for side in (-1,1):
            for j in range(10):
                start=3.35+j*.405
                rail=rpole('Dock_bay%d_guide%d_%02d'%(i,side,j),(dcentre[0],cy,dock_water),a,
                           (start,side*1.70,.10),(start+.405,side*1.70,.10),.045,'darkwood')
                rail['sunny_obstacle']=True
            for j in range(4):
                radius=3.50+j*1.15
                post=rpole('Dock_bay%d_guide_post%d_%d'%(i,side,j),(dcentre[0],cy,dock_bed),a,
                           (radius,side*1.70,0),(radius,side*1.70,dock_water-dock_bed+.10),.035,'darkwood')
                post['sunny_obstacle']=True
        portal=L((dcentre[0],cy,waiting_floor),a,2.30,0,0)
        portal_top=dock_roof
        for side in (-1,1):
            for j in range(3):
                rbox('Dock_portal%d_pier%d_%d'%(i,side,j),portal,a,(.18,.20,portal_top-waiting_floor),'timber',
                     (0,side*.725+side*(j+.5)*.20,(portal_top-waiting_floor)/2))
        upper_height=dock_roof-(waiting_floor+portal_height)
        for j in range(6):
            tangent=-.725+(j+.5)*1.45/6
            rbox('Dock_portal%d_upper%d'%(i,j),portal,a,(.18,1.45/6,upper_height),'timber',
                 (0,tangent,portal_height+upper_height/2))
        door_frame('Dock_portal%d_frame'%i,portal,a+math.pi/2,1.45,portal_height,.18,trim='darkwood',arched=True)
        # The numbered inner shutter shares the actual selector/lever state;
        # individual physical slats roll above the arched opening.
        gate_step=portal_height/14
        for j in range(14):
            z=(j+.5)*gate_step
            crown=max(0,z-(portal_height-1.45/2))
            width=1.45 if crown==0 else 2*math.sqrt(max(0,(1.45/2)**2-crown*crown))
            slat=rbox('Dock_inner_gate%d_%02d'%(i,j),portal,a,(.12,width,gate_step-.01),'timber',
                      (0,0,.10+z),obstacle=False)
            slat['sunny_inner_gate']=True;slat['sunny_inner_angle']=a
            slat['sunny_roll_top']=waiting_floor+.10+portal_height
            slat['sunny_roll_radius']=.22;slat['sunny_roll_travel']=portal_height+.30
        # Numerals are cut into the same horizontal bands as the shutter, so
        # they follow its real rolling motion rather than floating over it.
        number=text('Dock_inner_number_temp',str(i+1),L(portal,a,-.075,0,.55),1.55,'red',
                    (math.pi/2,0,a-math.pi/2))
        bpy.context.view_layer.update()
        for j in range(14):
            low=waiting_floor+.10+j*gate_step;high=low+gate_step
            verts,faces=[],[]
            for face in number.data.polygons:
                poly=[number.matrix_world@number.data.vertices[k].co for k in face.vertices]
                poly=clip_face(clip_face(poly,2,low,True),2,high,False)
                if len(poly)<3: continue
                offset=len(verts);verts+=poly;faces.append(tuple(range(offset,len(verts))))
            if faces:
                digit=finish(_mesh('Dock_inner_digit',verts,faces),'Dock_inner_digit%d_%02d'%(i,j),'red')
                digit['sunny_inner_digit']=True;digit['sunny_inner_angle']=a
                digit['sunny_inner_centre']=[portal[0],portal[1],waiting_floor+.10+(j+.5)*gate_step]
                digit['sunny_roll_top']=waiting_floor+.10+portal_height
                digit['sunny_roll_radius']=.22;digit['sunny_roll_travel']=portal_height+.30
        bpy.data.objects.remove(number,do_unlink=True)
        bx=dcentre[0]+math.cos(a)*5.3
        by=cy+math.sin(a)*5.3
        vehicle_z=dock_water-.55
        rbox('Dock_bay%d'%i,(bx,by,vehicle_z),a,(4.3,3.2,.08),'timber',(0,0,.10),obstacle=False)
        for dx in (-1.25,1.25):
            rbox('Dock_bay%d_support'%i,(bx,by,dock_bed),a,(.18,2.4,vehicle_z+.10-dock_bed),'darkwood',
                 (dx,0,(vehicle_z+.10-dock_bed)/2))
        w,d,h=dock_vehicle(i+1,(bx,by,vehicle_z),a)
        hx=(abs(math.cos(a))*w+abs(math.sin(a))*d)/2
        hy=(abs(math.sin(a))*w+abs(math.cos(a))*d)/2
        dock_solids.append(dict(name='DockVehicle%d'%(i+1),min=[bx-hx,by-hy,vehicle_z+.14],max=[bx+hx,by+hy,vehicle_z+h],channel=i+1))
        for obj in set(bpy.data.objects)-before:
            obj['sunny_dock_channel']=i+1
            obj['sunny_dynamic']=True
            if obj.get('sunny_obstacle') and not obj.get('sunny_inner_gate'):
                bpy.context.view_layer.update()
                v=[obj.matrix_world@Vector(corner) for corner in obj.bound_box]
                if obj.name.startswith('Sunny_Dock_portal') and obj.name.endswith('_frame_head'):
                    # Preserve each curved crown segment rather than placing
                    # one filled AABB across the real arched opening.
                    count=33
                    if len(obj.data.vertices)!=count*4:
                        raise RuntimeError('unexpected Dock arch crown topology')
                    for segment in range(count-1):
                        points=[obj.matrix_world@obj.data.vertices[(depth*2+radial)*count+index].co
                                for depth in range(2) for radial in range(2) for index in (segment,segment+1)]
                        lo=[min(q[k] for q in points) for k in range(3)]
                        hi=[max(q[k] for q in points) for k in range(3)]
                        if hi[2]-lo[2]<.045:
                            mid=(hi[2]+lo[2])/2;lo[2]=mid-.0225;hi[2]=mid+.0225
                        dock_solids.append(dict(name='%s_section%02d'%(obj.name,segment),min=lo,max=hi,channel=i+1,
                                                isFloor=False,footprint=[[q.x,q.y] for q in points]))
                    continue
                entry=dict(name=obj.name,min=[min(q[k] for q in v) for k in range(3)],max=[max(q[k] for q in v) for k in range(3)],channel=i+1,isFloor=False)
                # Rotate actual local bounding corners, not a pre-expanded
                # world AABB. This keeps rotating walls and supports close to
                # their actual geometry around the waiting room.
                entry['footprint']=[[q.x,q.y] for q in v]
                dock_solids.append(entry)
    rooms.append(dict(level='B1',name='Soldier Dock System',x=dock,y=(cy-11.4,cy+11.4)))

    # Franky's port workshop and Usopp's starboard workshop share the aft bay.
    for i,x in enumerate((11.0,14.5,18.0)):
        workbench('Factory_bench%d'%i,(x,-9.0,B1),0,2.5)
        tool_board('Factory_board%d'%i,(x,-9.5,B1),0,2.4,1.2)
        crate('Factory_crate%d'%i,(x,-2.2,B1),.06*i,.7)
        workbench('Weapons_bench%d'%i,(x,10.6,B1),math.pi,2.5)
        tool_board('Weapons_board%d'%i,(x,11.1,B1),math.pi,2.4,1.1)
    for i in range(4):
        barrel('Factory_oil%d'%i,(9.6+i*.78,-3.5,B1))
        rbox('Weapons_cola%d'%i,(9.6+i*.72,3.5,B1),0,(.42,.42,1.1),'red',(0,0,.55))
    workbench('Factory_boatstand',(17,-4,B1),0,2.2)
    cannon('Factory_cannon',(17,-4,B1+.9),0,.6)
    cannon('Weapons_prototype',(17,5.5,B1),0,1.15)
    rooms.append(dict(level='B1',name="Usopp's Main Factory",x=shop,y=(-11.5,cy)))
    rooms.append(dict(level='B1',name="Franky's Weapon Development Room",x=shop,y=(cy,13.2)))

    # --- Energy Room: below the aquarium bar, at the back, per reference --
    enx = (en[0] + en[1]) / 2
    for i in range(5):
        px = enx - 1.7 + i * 0.85
        rbox('Energy_tank%d' % i, (px, f.y(3.9), B1 + 1.05), 0.0, (0.62, 0.62, 2.1), 'red')
        sphere('Energy_tank%d_cap' % i, (px, f.y(3.9), B1 + 2.16), (0.22, 0.22, 0.2), 'gold')
        ring('Energy_tank%d_band' % i, (px, f.y(3.9), B1 + 1.6), 0.33, 0.035, 'gold', 'Z')
    rbox('Energy_manifold', (enx, f.y(4.7), B1 + 2.6), 0.0, (4.6, 0.34, 0.34), 'gold')
    for i in range(5):
        pole('Energy_pipe%d' % i, (enx - 1.7 + i * 0.85, f.y(4.7), B1 + 2.6),
             (enx - 1.7 + i * 0.85, f.y(3.9), B1 + 2.2), 0.09, 'gold')
    workbench('Energy_bench', (enx, f.y(-1.2), B1), math.pi / 2, 2.6)
    for i in range(6):
        rbox('Energy_gauge%d' % i, (enx - 1.2 + i * 0.48, f.y(-4.3), B1 + 1.65), 0.0,
             (0.26, 0.10, 0.26), 'white')
    rbox('Energy_control', (enx + 1.2, f.y(-4.2), B1 + 0.55), -math.pi / 2, (1.0, 0.6, 1.1), 'white')
    rbox('Energy_lever_base', (enx + 1.2, f.y(-4.2), B1 + 1.16), 0.0, (0.5, 0.4, 0.12), 'red')
    pole('Energy_lever', (enx + 1.2, f.y(-4.2), B1 + 1.2), (enx + 1.55, f.y(-4.2), B1 + 1.62), 0.05, 'black')
    rooms.append(dict(level='B1', name='Energy Room', x=en, y=(f.y(-4.6), f.y(5.0))))

    # ======================================================================
    # F1 - main deck level: men's quarters forward, aquarium bar aft
    # ======================================================================
    F1 = level_of['F1']
    fore_outline = fore_hull_outline(objects, f.x(-5.7), F1, centre)
    quarters = plan_floor('InteriorFloor_F1_fore', fore_outline, F1)
    aqua_floor = plan_floor('AquariumFloor_shell',
                            [(f.x(3.2), f.y(-5.8)), (f.x(10.3), f.y(-5.8)), (f.x(10.6), f.y(-5.1)),
                             (f.x(10.6), f.y(6.3)), (f.x(10.3), f.y(7.0)), (f.x(3.2), f.y(7.0))], F1)
    cy = f.y(CENTRE_Y)

    curved_fore_lining('ForeF1_shell',fore_outline,F1,level_of['F2F']-F1-.18)
    fore_ceiling=plan_floor('ForeF1_ceiling',fore_outline,level_of['F2F']-.18)
    fore_ceiling['sunny_walkable']=True;fore_ceiling['sunny_obstacle']=False

    # The wall ring owns the aft bulkhead; the common door cuts below retain
    # both entrances without layering a second wall over this same boundary.
    door('ForeDoor', (f.x(-5.7), f.y(4.1), F1), math.pi / 2, 1.45, 2.40, 'slide', 1,
         rooms=('F1', "Men's Quarters"), key='red')
    door('ForeDoorStarboard',(f.x(-5.7),f.y(-3.1),F1),math.pi/2,1.45,2.4,
         'slide',-1,rooms=('F1',"Men's Quarters"),key='red')

    # --- men's quarters: kotatsu, hung bunks, six lockers, posters -------
    q = (f.x(-12.4), f.x(-7.3))
    qy = (-7.2, 6.4)
    kx,ky=(q[0]+q[1])/2-.4,f.y(1.2)
    for floor in (quarters,):
        open_plan_slot(floor,kx-.95,kx+.95,ky-.95,ky+.95)
    plan_floor('Kotatsu_sunken_floor',[(kx-.95,ky-.95),(kx+.95,ky-.95),(kx+.95,ky+.95),(kx-.95,ky+.95)],F1-.42)
    kotatsu('Quarters_kotatsu', ((q[0] + q[1]) / 2 - 0.4, f.y(1.2), F1), 0.0)
    for i, yv in enumerate((-3.4, -1.1)):
        bunk('Quarters_bunk%d' % i, (q[0] + 2.0, f.y(yv), F1), 0.0)
    bunk('Quarters_bunk2', (q[0] + 2.0, 2.5, F1), 0.0)
    locker_bank('Quarters_lockers', (q[0]+.65,cy,F1), math.pi / 2, 6, 2.8, 1.95, 0.55)
    for i,crew in enumerate(('LUFFY','ZORO','USOPP','CHOPPER','FRANKY')):
        wall_art('Quarters_poster%d'%i,((q[0]+q[1])/2-2+(i%2)*1.1,qy[0]-1.39,F1+1.4+(i//2)*.82),math.pi,crew)
    # Keep the normal-sized chest inside the curved enclosure. Its former
    # scaled lateral station put it through the hull; room layout acceptance
    # remains a later phase.
    crate('Quarters_chest', (q[0] + 0.9, -6.2, F1), 0.0, 0.85, 'darkwood')
    # "there is also a door at both sides of each bedroom, which leads to a
    # narrow space containing a cannon"
    for side, yv in ((-1, qy[0] - 1.5), (1, qy[1] + 1.5)):
        lo, hi = fore_partition_span(fore_outline, yv, .18)
        lo, hi = max(q[0], lo), min(q[1], hi)
        door_x, wall_x = (q[0]+q[1])/2, (lo+hi)/2
        wall_run('RoomPartition_q_cannon', (wall_x, yv, F1), 0.0, hi-lo, 3.4,
                 openings=((door_x-wall_x, 1.0, 2.2),), key='cream', thickness=0.18)
        door('QuartersCannonDoor%d' % side, ((q[0] + q[1]) / 2, yv, F1), 0.0, 1.0, 2.2,
             'swing', side, rooms=("Men's Quarters", 'Gun Closet'), key='white')
        cannon('Quarters_cannon%d' % side, ((q[0] + q[1]) / 2 - 1.1, yv + side * 1.25, F1), side*math.pi/2, 0.8)
    rooms.append(dict(level='F1', name="Men's Quarters", x=q, y=qy))

    # men's washroom, with the alarm bell
    wash = (q[1]-1.5, q[1]+1.1)
    wall_run('RoomPartition_wash', ((wash[0] + wash[1]) / 2, qy[1] - 0.9, F1), 0.0,
             wash[1] - wash[0], 3.4, openings=((0.0, 1.0, 2.2),), key='cream', thickness=0.20)
    for x in wash:
        wall_run('RoomPartition_wash_side',(x,(qy[1]-.9+8.0)/2,F1),math.pi/2,8.0-(qy[1]-.9),3.4)
    wall_run('RoomPartition_wash_back',((wash[0]+wash[1])/2,8.0,F1),0,wash[1]-wash[0],3.4)
    door('MensWashDoor', ((wash[0] + wash[1]) / 2, qy[1] - 0.9, F1), 0.0, 1.0, 2.2,
         'slide', -1, rooms=("Men's Washroom",), key='white')
    sink('Wash_sink', (wash[1] - 0.9, qy[1] + 0.5, F1), math.pi)
    toothbrushes('Wash_toothbrushes', (wash[1] - 0.9, qy[1] + 0.72, F1 + 0.92), math.pi)
    rbox('Wash_bell', ((wash[0] + wash[1]) / 2, qy[1] - 0.82, F1 + 2.15), 0.0, (0.16, 0.1, 0.2), 'gold')
    rooms.append(dict(level='F1', name="Men's Washroom", x=wash, y=(qy[1] - 0.85, 8.0)))

    # --- aquarium bar: glass tank, viewing lounge, mast cupboard ----------
    aq = (8.65, f.x(10.6))
    aqua_floor = plan_floor('AquariumFloor_entry', [(aq[0], f.y(-5.8)), (aq[1], f.y(-5.8)),
                      (aq[1], f.y(7.0)), (aq[0], f.y(7.0))], F1)
    wall_run('RoomPartition_aqua_fwd', (aq[0], cy, F1), math.pi / 2, 25.6, 3.4,
             openings=((0, 1.55, 2.45),), key='cream', thickness=0.22, front_lintel_key='cream')
    door('AquariumDoor', (aq[0], cy, F1), math.pi / 2, 1.55, 2.45, 'slide', 1,
         rooms=('F1', 'Aquarium Bar'), key='red')
    tank_x0, tank_x1 = aq[1] - 3.6, aq[1] - 1.8
    for side in (-1, 1):
        aquarium('Aquarium_side%d' % side, ((aq[0] + 3.2 + tank_x0) / 2, cy + side * 11.2, F1),
                 (tank_x0 - aq[0] - 3.2, 1.6, 3.5), water_depth=2.7, seed=3 + side)
    curved_aquarium('Aquarium', (15.0,cy,F1))
    aquarium('Aquarium_passage_ceiling', ((tank_x1 + aq[1] - 0.2) / 2, cy, F1 + 2.35),
             (aq[1] - 0.2 - tank_x1, 16, 1.15), water_depth=0.85, seed=7)
    # bar counter and stools in the viewing lounge
    rbox('Aquarium_bar', ((aq[0] + tank_x0) / 2, f.y(4.6), F1), 0.0, (2.2, 0.7, 1.05), 'timber',
         (0, 0, 0.52), obstacle=True)
    rbox('Aquarium_bar_top', ((aq[0] + tank_x0) / 2, f.y(4.6), F1), 0.0, (2.4, 0.9, 0.07), 'deck',
         (0, 0, 1.08))
    for i in range(3):
        stool('Aquarium_stool%d' % i, ((aq[0] + tank_x0) / 2 - 0.8 + i * 0.8, f.y(3.5), F1))
    sofa('Aquarium_sofa', ((aq[0] + tank_x0) / 2, f.y(-3.6), F1), math.pi, 2.6)
    armchair('Aquarium_armchair', (aq[0] + 1.4, f.y(-1.2), F1), math.pi / 2)
    # The main mast continues through the lounge to the kitchen above.
    # Exterior-visible structural extension must join the actual enlarged mast.
    ma, mb = vertex_bbox(next(o for o in objects if o.name == 'Cylinder007'))
    mx, my = (ma.x+mb.x)/2, (ma.y+mb.y)/2
    mast=pole('InteriorMainMast',(mx,my,F1),(mx,my,ma.z+.025),(mb.y-ma.y)/2,'darkwood',sides=20)
    mast['sunny_obstacle']=True
    # "the aquarium surrounds the whole room and functions as a ceiling for a
    # passageway behind it" - a service passage under the tank, and the ladder
    # down to the Energy Room at the back of the room.
    pass_x = tank_x1 + 0.8
    door('AquariumPassageDoor', (tank_x1, cy - 9.2, F1), math.pi / 2, 1.15, 2.25, 'slide', 1,
         rooms=('Aquarium Bar', 'Aquarium Service Passage'), key='white')
    rooms.append(dict(level='F1', name='Aquarium Service Passage', x=(tank_x1, aq[1]), y=(cy - 9.8, cy + 9.8)))
    rooms.append(dict(level='F1', name='Aquarium Bar', x=aq, y=(f.y(-5.8), f.y(7.0)),
                      tank=dict(x=(tank_x0, tank_x1), y=(f.y(-5.2), f.y(6.0)))))

    # ======================================================================
    # F2 - women's quarters forward; dining, kitchen, pantry, sick bay aft
    # ======================================================================
    F2F = level_of['F2F']
    women_outline = fore_hull_outline(objects, -18.35, F2F, centre)
    plan_floor('InteriorFloor_F2_fore', women_outline, F2F)
    F2A = level_of['F2A']
    dining_floor = rect_floor('InteriorFloor_F2_aft', f, 3.2, 10.6, -6.0, 7.2, LEVEL_F2A)
    food_lift=mast_food_lift(mast,dining_floor,mx,my,F1,F2A)

    curved_fore_lining('ForeF2_shell',women_outline,F2F,2.80)
    wc=plan_floor('ForeF2_ceiling',women_outline,F2F+2.80)
    wc['sunny_walkable']=True;wc['sunny_obstacle']=False
    # women's quarters
    w = (f.x(-12.5), f.x(-8.6))
    wy_ = (-7.2, 6.4)
    door('WomensDoor', (-18.35, cy - 7.55, F2F), math.pi / 2, 1.15, 2.30,
         'slide', -1, rooms=("Women's Quarters",), key='red')
    bed('Womens_bed', (w[1] - 1.1, f.y(2.2), F2F), math.pi / 2, 1.85, 2.10)
    bookcase('Womens_books', (w[0] + 0.6, f.y(-0.2), F2F), math.pi / 2, w=2.2, d=0.36, h=2.1, seed=11)
    wardrobe('Womens_closet', (w[0] + 0.6, -4.0, F2F), math.pi / 2, 1.9, 2.1, 0.62, 4)
    desk('Womens_vanity', (w[1] - 1.0, f.y(-4.4), F2F), -math.pi / 2, 1.1, 0.5, 0.78)
    # Mirror belongs on the vanity's local back, with four separate border bars.
    mp=(w[1]-1.0,f.y(-4.4),F2F)
    rbox('Womens_mirror',mp,-math.pi/2,(.7,.035,.8),'glass',(0,.23,1.45))
    for x in (-.39,.39):rbox('Womens_mirror_side',mp,-math.pi/2,(.08,.06,.96),'gold',(x,.23,1.45))
    for z in (1.01,1.89):rbox('Womens_mirror_edge',mp,-math.pi/2,(.7,.06,.08),'gold',(0,.23,z))
    for x in (-.32,.32):rbox('Womens_mirror_support',mp,-math.pi/2,(.045,.045,.28),'gold',(x,.23,.9))
    sofa('Womens_sofa', ((w[0] + w[1]) / 2, f.y(-2.2), F2F), math.pi, 2.0, 'red')
    crate('Womens_treasure', (w[1] - 1.2, f.y(1.0), F2F), 0.0, 0.9, 'darkwood')
    for side, yv in ((-1, wy_[0] - 1.5), (1, wy_[1] + 1.5)):
        lo, hi = fore_partition_span(women_outline, yv, .18)
        lo, hi = max(w[0], lo), min(w[1], hi)
        door_x, wall_x = (w[0]+w[1])/2, (lo+hi)/2
        wall_run('RoomPartition_w_cannon', (wall_x, yv, F2F), 0.0, hi-lo, 2.8,
                 openings=((door_x-wall_x, 1.0, 2.15),), key='cream', thickness=0.18)
        door('WomensCannonDoor%d' % side, ((w[0] + w[1]) / 2, yv, F2F), 0.0, 1.0, 2.15,
             'swing', side, rooms=("Women's Quarters", 'Gun Closet'), key='white')
        cannon('Womens_cannon%d' % side, ((w[0] + w[1]) / 2 - 0.9, yv + side * 1.2, F2F), side*math.pi/2, 0.8)
    rooms.append(dict(level='F2F', name="Women's Quarters", x=w, y=wy_))

    # women's washroom, with the wine and tea cupboard
    ww = (w[1]-.5, w[1]+1.7)
    wall_run('RoomPartition_wwash', ((ww[0] + ww[1]) / 2, wy_[1] - 1.0, F2F), 0.0,
             ww[1] - ww[0], 2.8, openings=((0.0, 0.95, 2.15),), key='cream', thickness=0.20)
    for x in ww:
        wall_run('RoomPartition_wwash_side',(x,7.4,F2F),math.pi/2,4.0,2.8)
    wall_run('RoomPartition_wwash_back',((ww[0]+ww[1])/2,9.4,F2F),0,ww[1]-ww[0],2.8)
    door('WomensWashDoor', ((ww[0] + ww[1]) / 2, wy_[1] - 1.0, F2F), 0.0, 0.95, 2.15,
         'slide', -1, rooms=("Women's Washroom",), key='white')
    sink('WWash_sink', (ww[1] - 0.9, wy_[1] + 1.6, F2F), math.pi)
    shelf_unit('WWash_cupboard', ((ww[0] + ww[1]) / 2, wy_[1] + 1.9, F2F), 0.0, 1.3, 0.3, 1.8, 4)
    for i in range(6):
        rbox('WWash_bottle%d' % i, ((ww[0] + ww[1]) / 2 - 0.5 + (i % 3) * 0.5, wy_[1] + 1.85, F2F + .29 + (i // 3) * (1.6/3)),
             0.0, (0.13, 0.13, 0.3), ('red', 'cream', 'leaf')[i % 3])
    tea_set(((ww[0]+ww[1])/2,wy_[1]+1.85,F2F+.12+2*1.6/3+.02))

    rooms.append(dict(level='F2F', name="Women's Washroom", x=ww, y=(wy_[1]-1.0, wy_[1]+3.0)))

    from sunny_aft_envelope import build_aft_envelope, cut_aft_stair_access, closed_box_cut
    aft_skin,aft_enclosure=build_aft_envelope(objects,vertex_bbox,f,aft_snapshot,F2A,level_of['F3G'])
    aft_outline=aft_enclosure['outline']
    ac=plan_floor('AftF2_ceiling',aft_enclosure['ceilingOutline'],level_of['F3G']-.18)
    ac['sunny_walkable']=True;ac['sunny_obstacle']=False
    aft_enclosure['stairVolumes']=cut_aft_stair_access(objects,vertex_bbox,(aft_skin,ac))
    aq_outline=[(8.65,-11.6),(f.x(10.6),-11.6),(f.x(10.6),14),(8.65,14)]
    perimeter_lining('Aquarium_shell',aq_outline,F1,F2A-F1-.18)
    aqc=plan_floor('Aquarium_ceiling',aq_outline,F2A-.18)
    aqc['sunny_walkable']=True;aqc['sunny_obstacle']=False

    # Oda F2: port dining and starboard kitchen, infirmary/pantry behind them.
    aft=(12.3,24.8)
    rear=20.6
    wall_run('RoomPartition_bar', ((aft[0]+rear)/2,cy,F2A),0,rear-aft[0],3.1,
             openings=((-2.45,1.35,2.35),),key='cream',thickness=.18)
    door('DiningDoor', ((aft[0]+rear)/2-2.45,cy,F2A),0,1.35,2.35,
         rooms=('Dining Room','Kitchen'),key='white')
    # Serving bar opens above its counter and gives the two rooms visual contact.
    serving=(19.2,cy,F2A)
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Sunny_RoomPartition_bar'):
            open_volume_slot(obj,18.1,20.3,cy-.3,cy+.3,F2A+1.05,F2A+2.35)
    counter('Kitchen_serving_bar',serving,0,2.2,.55,1.0,4,'timber')
    for id_, yv in (('DiningEntrance',cy-4.2),('KitchenEntrance',cy+4.2)):
        wall_run('RoomPartition_'+id_,(aft[0],yv,F2A),math.pi/2,7.4,3.1,
                 openings=((0,1.35,2.3),),key='cream',thickness=.16,front_lintel_key='cream')
        entrance=door(id_,(aft[0],yv,F2A),math.pi/2,1.35,2.3,
                      rooms=('Aft Deck',id_),key='red',arched=True)
        # Keep the existing jamb walls and beam geometry. Fill only the old
        # square void's upper corners, with a matching physical arch cut.
        corners=rbox('RoomPartition_'+id_+'_arch_corners',(aft[0],yv,F2A),math.pi/2,
                     (1.35,.16,2.3),'cream',(0,0,1.15))
        from sunny_aft_envelope import closed_door_arch_cut
        closed_door_arch_cut(corners,entrance)
    table('Dining_table',(16.3,cy-5.6,F2A),0,6.4,1.3,.76)
    for i in range(8):
        x=13.6+i*.78
        chair('Dining_chair%d'%i,(x,cy-4.65,F2A),0)
        chair('Dining_chair%d'%(i+8),(x,cy-6.55,F2A),math.pi)
    sofa('Dining_sofa0',(16.4,cy-10.0,F2A),math.pi,2.2)
    sofa('Dining_sofa1',(16.4,cy-8.4,F2A),0,2.2)
    den_den_mushi('Dining_dendenmushi',(19.5,cy-9.5,F2A))
    rooms.append(dict(level='F2A',name='Dining Room',x=(aft[0],rear),y=(-11.5,cy)))
    # Preserve a continuous route along y=cy-4.2 and around the stair hatch.
    counter('Kitchen_counter',(15.5,cy+10.0,F2A),0,3.5,.72,.92,4)
    counter('Kitchen_counter2',(19.8,cy+8.9,F2A),-math.pi/2,2.0,.66,.92,3)
    stove('Kitchen_stove',(18.7,cy+10.0,F2A))
    fridge('Kitchen_fridge',(13.5,cy+1.9,F2A),math.pi/2)
    sink('Kitchen_sink',(13.0,cy+10.0,F2A))
    rooms.append(dict(level='F2A',name='Kitchen',x=(aft[0],rear),y=(cy,13.5)))
    wall_run('RoomPartition_pantry_sickbay',(rear,cy,F2A),math.pi/2,25.0,3.1,
             openings=((-5.0,1.15,2.25),(5.0,1.15,2.25)),thickness=.18)
    wall_run('RoomPartition_rear_split',((rear+aft[1])/2,cy,F2A),0,aft[1]-rear,3.1)
    for id_,off in (('PantryInDoor',5.0),('SickDoor',-5.0)):
        door(id_,(rear,cy+off,F2A),math.pi/2,1.15,2.25,rooms=('Pantry' if off>0 else 'Sick Bay',),key='white')
    plan_floor('InteriorFloor_F2_service',[(rear,-11.5),(aft[1],-11.5),(aft[1],13.5),(rear,13.5)],F2A)
    for i in range(3):
        shelf_unit('Pantry_shelf%d'%i,(24.0,cy+2+i*3,F2A),-math.pi/2,2.0,.4,2,4)
        sack('Pantry_sack%d'%i,(21.7,cy+9-i*.75,F2A))
        crate('Pantry_crate%d'%i,(22.8,cy+9-i*.8,F2A),.04*i,.72)
    door('PantryOutsideDoor',(24.65,cy+5.0,F2A),math.pi/2,1.1,2.25,rooms=('Pantry','Outside'),key='white')
    rooms.append(dict(level='F2A',name='Pantry',x=(rear,aft[1]),y=(cy,13.5)))
    medical_bed('Sick_bed',(23.5,cy-8.5,F2A),math.pi)
    desk('Sick_desk',(23.5,cy-2.5,F2A),-math.pi/2,1.5,.7)
    swivel_chair('Sick_chair',(22.6,cy-2.5,F2A),math.pi/2)
    shelf_unit('Sick_cabinet',(23.8,cy-11.0,F2A),math.pi,1.2,.36,2,5)
    rbox('Sick_poster',(24.5,cy-9,F2A+1.6),math.pi/2,(.7,.03,.9),'white')
    door('SickOutsideDoor',(24.65,cy-5,F2A),math.pi/2,1.1,2.25,rooms=('Sick Bay','Outside'),key='white')
    rooms.append(dict(level='F2A',name='Sick Bay',x=(rear,aft[1]),y=(-11.5,cy)))

    # ======================================================================
    # F3 - observation deck over the kitchen, circular library in the stern
    # ======================================================================
    F3G = level_of['F3G']
    F3L = level_of['F3L']
    outline = [(f.x(12.6) + 3 * S * math.cos(math.tau * i / 48),
                f.y(CENTRE_Y) + 3 * S * math.sin(math.tau * i / 48)) for i in range(48)]
    library = plan_floor('InteriorFloor_F3_library', outline, F3L)
    lcx, lcy = f.x(12.6), f.y(CENTRE_Y)
    lrad = 4.9
    circular_lining('Library_lining',(lcx,lcy,F3L),4.95,5.5,3.05,entrance=True,wide_windows=True)
    lc=plan_floor('Library_ceiling',[(lcx+4.95*math.cos(math.tau*i/48),lcy+5.5*math.sin(math.tau*i/48)) for i in range(48)],F3L+3.05)
    lc['sunny_walkable']=True;lc['sunny_obstacle']=False
    hut_roof('LibraryRoof',(lcx,lcy,F3L))
    door('LibraryDoor', (lcx-4.95, lcy, F3L), math.pi / 2, 1.45, 2.40, 'slide', 1,
         rooms=('Library', 'Stern Balcony'), key='red')
    for i in range(7):
        a = (-2.45,-1.8,-1.15,-.5,.15,.8,1.45)[i]
        bookcase('Library_books%d' % i,
                 (lcx + (lrad - 0.5) * math.cos(a), lcy + (lrad - 0.5) * math.sin(a), F3L),
                 a - math.pi / 2, 1.95, 0.4, 2.2, seed=20 + i)
    # Wall clock and mapping materials distinguish the reference library.
    pole('Library_clock',(lcx+4.80,lcy,F3L+2.50),(lcx+4.89,lcy,F3L+2.50),.25,'white')
    ring('Library_clock_rim',(lcx+4.77,lcy,F3L+2.50),.255,.025,'gold','X')
    pole('Library_clock_hour',(lcx+4.75,lcy,F3L+2.50),(lcx+4.75,lcy+.10,F3L+2.58),.012,'black')
    pole('Library_clock_minute',(lcx+4.74,lcy,F3L+2.50),(lcx+4.74,lcy-.02,F3L+2.70),.009,'black')
    for i in range(16):
        a = -2.55 + i * 5.1 / 15
        if 2.0 < a < 2.8:
            continue  # clear the port bath-stair entrance
        b = (lcx + (lrad - 0.85) * math.cos(a), lcy + (lrad - 0.85) * math.sin(a), F3L)
        bench('Library_bench%d'%i,b,a-math.pi/2,w=1.0,d=.42,h=.45)
    desk('Library_mapdesk', (lcx, lcy, F3L), 0.0, 1.7, 0.95)
    rbox('Library_chart',(lcx+.25,lcy,F3L+.80),0,(.62,.64,.008),'cream',obstacle=False)
    for i in range(3):
        sphere('Library_chart_island%d'%i,(lcx+.07+i*.17,lcy-.15+(i%2)*.27,F3L+.811),(.06,.09,.003),'leaf')
    for x in (-.02,.48):pole('Library_chart_meridian',(lcx+x,lcy-.28,F3L+.813),(lcx+x,lcy+.28,F3L+.813),.003,'gold')
    text('Library_shiplog_label','SHIP LOG',(lcx+.4,lcy-.26,F3L+.832),.06,'white',(0,0,0))
    sphere('Library_globe', (lcx - 0.2, lcy, F3L + 1.32), (0.26, 0.26, 0.26), 'glass')
    pole('Library_globestand', (lcx - 0.2, lcy, F3L + 0.78), (lcx - 0.2, lcy, F3L + 1.06), 0.05, 'gold')
    rbox('Library_shiplog', (lcx + 0.5, lcy - 0.2, F3L + 0.80), 0.4, (0.44, 0.32, 0.06), 'red')
    armchair('Library_chair', (lcx + 0.1, lcy + 1.3, F3L), math.pi)

    rooms.append(dict(level='F3L', name='Library', x=(lcx - lrad, lcx + lrad),
                      y=(lcy - lrad, lcy + lrad)))

    # "Above the library ... is the bath. From the ladder in the library, one
    # enters a front washroom with an accessible toilet before passing through a
    # door into the actual bath."
    bath_floor = F3L + 3.05
    brad = 4.6
    bath_outline = [(lcx + 4.5 * math.cos(math.tau * i / 40),
                     lcy + 5.0 * math.sin(math.tau * i / 40)) for i in range(40)]
    bath_deck = plan_floor('InteriorFloor_F3_bath', bath_outline, bath_floor)
    circular_lining('Bath_lining',(lcx,lcy,bath_floor),4.5,5.0,2.55)
    ceiling=plan_floor('Bath_ceiling',bath_outline,bath_floor+2.58)
    ceiling['sunny_walkable']=True
    ceiling['sunny_obstacle']=False
    bath_start = (lcx - 3.3, lcy + 2.9, F3L)
    stair_flight('BathStair', bath_start, 0.0, bath_floor - F3L, 4.4, 1.05, rails=(False, False))
    open_plan_slot(lc,bath_start[0]-.6,bath_start[0]+4.5,bath_start[1]-.65,bath_start[1]+.65)
    open_plan_slot(bath_deck, bath_start[0] - 0.6, bath_start[0] + 4.5, bath_start[1] - 0.65, bath_start[1] + 0.65)
    rbox('BathStair_landing', (bath_start[0] + 4.95, bath_start[1], bath_floor), 0.0,
         (1.5, 1.15, 0.12), 'deck', (0, 0, -0.06), walkable=True)
    for obj in objects:
        if obj.name == 'Cylinder002':
            open_volume_slot(obj, bath_start[0] - 0.6, bath_start[0] + 6.0, bath_start[1] - 0.65,
                             bath_start[1] + 0.65, F3L, bath_floor + 2.2)

    wall_run('RoomPartition_bath', (lcx, lcy + brad * 0.45, bath_floor), 0.0, 8.2, 2.55,
             openings=((0.0, 1.0, 2.1),), key='cream', thickness=0.16)
    door('BathDoor', (lcx, lcy + brad * 0.45, bath_floor), 0.0, 1.0, 2.1, 'slide', 1,
         rooms=('Bath Washroom', 'Bath'), key='white')
    bathtub('Bath_tub', (lcx - 0.4, lcy - brad * 0.45, bath_floor), 0.0)
    sink('Bath_wash_sink', (lcx + 2.0, lcy + 3.8, bath_floor), math.pi)
    toilet('Bath_wash_toilet', (lcx + 3.3, lcy + 2.3, bath_floor), math.pi)
    rooms.append(dict(level='F3B', name='Bath', x=(lcx - brad, lcx + brad),
                      y=(lcy-brad,lcy+brad*.45)))
    rooms.append(dict(level='F3B',name='Bath Washroom',x=(lcx-brad,lcx+brad),y=(lcy+brad*.45,lcy+brad)))

    # observation deck fittings that belong to the interior programme
    rooms.append(dict(level='F3G', name='Observation Deck', x=(f.x(4.6), f.x(10.2)),
                      y=(f.y(-6.0), f.y(7.2))))

    for spec in DOORS:
        x, y, z = spec['pos']
        across_x = abs(math.cos(spec['rot'])) > 0.5
        width = spec['width'] + 0.10
        dx, dy = (width / 2, 0.85) if across_x else (0.85, width / 2)
        for obj in list(bpy.data.objects):
            if obj.type=='MESH' and (obj.name.startswith(('Sunny_ForeF1_shell','Sunny_ForeF2_shell','Sunny_AftF2_shell','Sunny_Aquarium_shell')) or obj.name in ('Line002', 'Line006', 'Tube008.001', 'Cylinder002', '对象001', '对象002', '对象003')):
                if obj.get('sunny_aft_native_envelope'):
                    if spec['kind'] == 'door' and spec['id'] in ('DiningEntrance','KitchenEntrance'):
                        from sunny_aft_envelope import closed_door_arch_cut
                        closed_door_arch_cut(obj,spec)
                    elif spec['kind'] == 'door' and spec['id'] in ('PantryOutsideDoor','SickOutsideDoor'):
                        closed_box_cut(obj,(x-dx,x+dx,y-dy,y+dy,z-.15,z+spec['height']+.12))
                else:
                    open_volume_slot(obj, x-dx, x+dx, y-dy, y+dy, z-0.15, z+spec['height']+0.12)
    for level, name, x0, x1, y0, y1 in (
        ('F1', 'Men Starboard Cannon Closet', q[0], q[1], qy[1]+1.55, qy[1]+3.0),
        ('F1', 'Men Port Cannon Closet', q[0], q[1], qy[0]-3.0, qy[0]-1.55),
        ('F2F', 'Women Starboard Cannon Closet', w[0], w[1], wy_[1]+1.55, wy_[1]+3.0),
        ('F2F', 'Women Port Cannon Closet', w[0], w[1], wy_[0]-3.0, wy_[0]-1.55)):
        rooms.append(dict(level=level, name=name, x=(x0,x1), y=(y0,y1)))
    return {
        'dockCentre':[dcentre[0],cy,B1], 'dockSolids':dock_solids, 'dockWaterLevel':dock_water, 'foodLift':food_lift,
        'levels': level_of,
        'aftEnclosures': [aft_enclosure],
        'foreTrimVolumes': [dict(level=level, outline=outline, bottom=bottom, top=top)
            for level,outline,bottom,top in (
                ('B1',b1_trim_outline,B1-.12,F1),
                ('F1',fore_outline,F1-.12,F2F),
                ('F2F',women_outline,F2F-.12,F2F+2.80))],
        'foreEnclosures': [dict(level=level, outline=outline,
            reference='F1/F2 rounded plans; retained hull sections and existing aft door transfer in reconstructed metres')
            for level, outline in (('F1', fore_outline), ('F2F', women_outline))],
        'rooms': rooms,
        'doors': list(DOORS),
        'dockChannels':[dict(channel=i+1,contents=name) for i,name in enumerate(('Shiro Mokuba I','Mini Merry II','Shark Submerge III','Kurosai FR-U IV','Brachio Tank V','Inflatable Pool'))],
        'scale': S,
        'shift': shift,
    }
