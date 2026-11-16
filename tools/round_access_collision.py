"""Cut real round access bores out of coarse floor boxes, in Three Y-up metres."""
import math


def _piece(name,low,high,x0,x1,z0,z1):
    if x1-x0>1e-8 and z1-z0>1e-8 and high[1]-low[1]>1e-8:
        return (name,(x0,low[1],z0),(x1,high[1],z1))
    return None


def subtract_round_floor(box,slot,spacing=.04):
    """Keep floor outside a circular bore using conservative narrow strips.

    Only the round aperture is removed. Full rectangles beyond its envelope
    are retained, and strip edges cannot reintroduce an invisible square cell
    into the shaft. The small conservative edge lies under its actual coaming.
    """
    name,low,high=box
    cx,cz,r=slot['x'],slot['z'],slot['radius']
    dx=max(low[0]-cx,0,cx-high[0]);dz=max(low[2]-cz,0,cz-high[2])
    if (not name.startswith('COLL_Floor') or high[1]<=slot['bottom'] or low[1]>=slot['top'] or dx*dx+dz*dz>=r*r-1e-10):
        return [box]
    result=[]
    def add(lo,hi,x0,x1,z0,z1):
        piece=_piece(name+'_Round%d'%len(result),lo,hi,x0,x1,z0,z1)
        if piece:result.append(piece)
    if low[1]<slot['bottom']:
        add(low,(high[0],slot['bottom'],high[2]),low[0],high[0],low[2],high[2])
    if high[1]>slot['top']:
        add((low[0],slot['top'],low[2]),high,low[0],high[0],low[2],high[2])
    lo=(low[0],max(low[1],slot['bottom']),low[2]);hi=(high[0],min(high[1],slot['top']),high[2])
    add(lo,hi,low[0],min(high[0],cx-r),low[2],high[2])
    add(lo,hi,max(low[0],cx+r),high[0],low[2],high[2])
    left,right=max(low[0],cx-r),min(high[0],cx+r)
    count=max(1,math.ceil((right-left)/spacing))
    for i in range(count):
        x0=left+(right-left)*i/count;x1=left+(right-left)*(i+1)/count
        nearest=max(x0-cx,0,cx-x1)
        half=math.sqrt(max(0,r*r-nearest*nearest))
        add(lo,hi,x0,x1,low[2],min(high[2],cz-half))
        add(lo,hi,x0,x1,max(low[2],cz+half),high[2])
    return result


def access_slots(doors,climbs):
    """Use actual registered round hatch diameters and their physical climb span."""
    result=[]
    for hatch in doors:
        if hatch.get('kind')!='hatch' or hatch.get('shape')!='round':continue
        path=next((p for p in climbs if p.get('hatch')==hatch['id']),None)
        if path is None:raise ValueError('round hatch needs its actual shaft path')
        result.append(dict(x=hatch['pos'][0],z=-hatch['pos'][1],radius=hatch['width']/2,
                           bottom=min(p[2] for p in path['points'])+.02,top=hatch['pos'][2]+.20))
    return result


def clip_round_access(boxes,slots):
    """Apply each actual shaft to all floor layers without changing other solids."""
    result=boxes
    for slot in slots:
        result=[piece for box in result for piece in subtract_round_floor(box,slot)]
    return result
