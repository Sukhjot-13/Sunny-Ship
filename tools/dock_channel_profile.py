"""Reference-informed cross sections for the Dock mouth transition.

All coordinates are final metres in Blender's X/Z cross-section. The inner
section is a rounded, tall bay; the outer section is the actual circular C02
clearance. Linear interpolation gives a continuous loft between stations.
"""
import math


def section_profile(cx, bed, roof, mouth_z, mouth_radius, t, count=64):
    if not 0 <= t <= 1 or count < 16 or count % 4:
        raise ValueError('invalid channel station or profile resolution')
    # The bay has vertical sides, a flat wet bed and a semicircular crown.
    # Its lower half follows the bed from one side to the other. At the mouth
    # that flat bed transitions to the retained round reveal.
    spring=roof-2.80
    points=[]
    for i in range(count):
        a=math.tau*i/count
        c,s=math.cos(a),math.sin(a)
        ix=2.80*c
        iz=spring+2.80*s if s>=0 else bed
        ox=mouth_radius*c
        oz=mouth_z+mouth_radius*s
        points.append((cx+(1-t)*ix+t*ox,(1-t)*iz+t*oz))
    return points


def half_width_at(points,z,cx):
    """Measure the polygon's actual horizontal slice, not its bounding box."""
    xs=[]
    for (x0,z0),(x1,z1) in zip(points,points[1:]+points[:1]):
        if min(z0,z1)<=z<=max(z0,z1) and abs(z1-z0)>1e-9:
            xs.append(x0+(x1-x0)*(z-z0)/(z1-z0))
    if len(xs)<2:return None
    return min(cx-min(xs),max(xs)-cx)
