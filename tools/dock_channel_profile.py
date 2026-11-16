"""Reference-informed cross sections for the Dock mouth transition.

All coordinates are final metres in Blender's X/Z cross-section. The inner
section is a rounded, tall bay; the outer section is the actual circular C02
clearance. The wet bed/side width interpolate continuously; the crown stays below the lawn until the outboard mouth flare.
"""
import math

CROWN_TRANSITION_START = .75


def section_profile(cx, bed, roof, mouth_z, mouth_radius, t, count=64):
    if not 0 <= t <= 1 or count < 16 or count % 4:
        raise ValueError('invalid channel station or profile resolution')
    # The bay has vertical sides, a flat wet bed and a semicircular crown.
    # Its lower half follows the bed from one side to the other. At the mouth
    # that flat bed transitions to the retained round reveal.
    # R04/R14 combine an uninterrupted lawn with round outboard mouths.
    # A linear rise from the bay exposed the channel roof through that lawn.
    # Keep its arch below the deck, then flare in the last outboard quarter.
    # This normalized transition is reconstructed; the endpoint is retained.
    u=max(0.,min(1.,(t-CROWN_TRANSITION_START)/(1-CROWN_TRANSITION_START)))
    crown=roof+(mouth_z+mouth_radius-roof)*(u*u*(3-2*u))
    arch_radius=2.80+(mouth_radius-2.80)*t
    spring=crown-arch_radius
    points=[]
    for i in range(count):
        a=math.tau*i/count
        c,s=math.cos(a),math.sin(a)
        ix=2.80*c
        iz=roof-2.80+2.80*s if s>=0 else bed
        ox=mouth_radius*c
        oz=mouth_z+mouth_radius*s
        height=spring+arch_radius*s if s>=0 else (1-t)*iz+t*oz
        points.append((cx+(1-t)*ix+t*ox,height))
    return points


def half_width_at(points,z,cx):
    """Measure the polygon's actual horizontal slice, not its bounding box."""
    xs=[]
    for (x0,z0),(x1,z1) in zip(points,points[1:]+points[:1]):
        if min(z0,z1)<=z<=max(z0,z1) and abs(z1-z0)>1e-9:
            xs.append(x0+(x1-x0)*(z-z0)/(z1-z0))
    if len(xs)<2:return None
    return min(cx-min(xs),max(xs)-cx)
