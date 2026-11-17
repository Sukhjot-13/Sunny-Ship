"""Rounded lawn crown study; exact botanical stations remain reconstruction."""
import math
import random
from mathutils import Vector


def shade_tree(name,p,seed=0):
    """Keep the rooted trunk; distribute attached foliage through a deep crown."""
    from sunny_exterior import pole
    from sunny_accuracy import leafy_shoot,merge_details
    rng=random.Random(seed);x,y,floor=p
    height=4.9
    trunk=pole(name+'_trunk',(x,y,floor),(x+.09,y,floor+height*.83),.24,'darkwood',radius2=.12,sides=14)
    trunk['sunny_obstacle']=True
    centre=floor+4.1
    tiers=(-.55,.0,.62,-.30,.85,.20,-.60,.50)
    for i,tier in enumerate(tiers):
        angle=i*math.tau/len(tiers)+.19*(seed%3)
        radius=1.7*math.sqrt(1-tier*tier)
        root=Vector((x+.05,y,floor+height*(.40+.045*i)))
        end=Vector((x+radius*math.cos(angle),y+radius*math.sin(angle),centre+1.65*tier))
        pole(name+'_branch',root,end,.10,'darkwood',radius2=.025)
        for j in range(10):
            direction=angle+(j-4.5)*.55
            start=root.lerp(end,.40+.60*j/9)
            tip=start+Vector((math.cos(direction)*.45,math.sin(direction)*.45,.10+.25*((j%3)-1)))
            pole(name+'_twig',start,tip,.022,'darkwood',radius2=.008)
            for shoot in range(3):
                base=start.lerp(tip,.20+.34*shoot)
                theta=direction+(shoot-1)*.95+rng.uniform(-.25,.25)
                extent=rng.uniform(.28,.48)
                shoot_end=base+Vector((math.cos(theta)*extent,math.sin(theta)*extent,rng.uniform(.10,.52)))
                leafy_shoot(name,base,shoot_end,.45,.22,rng,pairs=6)
    merge_details(name,('_leaves','_branch','_twig'))
    trunk['sunny_crown_reference']='R04/R13 rounded lawn mass; real attached branches/shoots, metre envelope reconstructed'
    return trunk
