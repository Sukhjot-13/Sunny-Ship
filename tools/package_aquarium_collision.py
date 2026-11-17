"""Keep the verified hull boxes verbatim except where the inner bay opens."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

from collision_glb import read_box_glb, write_box_glb


def hash_file(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def subtract_box(record, cut):
    name, low, high = record
    if any(high[axis] <= clip_low or low[axis] >= clip_high for axis, (clip_low, clip_high) in enumerate(cut)):
        return [record]
    result = []
    low, high = list(low), list(high)
    for axis, (clip_low, clip_high) in enumerate(cut):
        if low[axis] < clip_low:
            edge = high.copy(); edge[axis] = clip_low
            result.append((f'{name}_aquarium{len(result)}', tuple(low), tuple(edge)))
            low[axis] = clip_low
        if high[axis] > clip_high:
            edge = low.copy(); edge[axis] = clip_high
            result.append((f'{name}_aquarium{len(result)}', tuple(edge), tuple(high)))
            high[axis] = clip_high
    return result


def package(stage, previous, scope_report, archive):
    current, prior = stage/'sunny-collision.glb', previous/'sunny-collision.glb'
    report = json.loads(scope_report.read_text())
    assert report['hull']['sameHull']
    assert (hash_file(prior), hash_file(current)) == (report['collision']['before'], report['collision']['after'])
    meta_path = stage/'ship-metadata.json'
    meta = json.loads(meta_path.read_text())
    previous_meta = json.loads((previous/'ship-metadata.json').read_text())
    for key in ('doors', 'dockSolids'):
        assert sorted(map(json.dumps,meta['interiors'][key])) == sorted(map(json.dumps,previous_meta['interiors'][key]))
        meta['interiors'][key] = previous_meta['interiors'][key]
    room = next(room for room in meta['interiors']['rooms'] if room['name']=='Aquarium Bar')
    axial, transverse, vertical = room['lounge']['entryBay']
    cut = (axial, vertical, [-transverse[1],-transverse[0]])
    old, raw = read_box_glb(prior), read_box_glb(current)
    hull = lambda name: name.startswith('COLL_Rail_Line002_')
    existing_hull = [box for box in old if hull(box[0])]
    new_hull = [piece for box in existing_hull for piece in subtract_box(box,cut)]
    touched = sum(subtract_box(box,cut)!=[box] for box in existing_hull)
    assert 0<touched<len(existing_hull)
    assert all(all(high[axis]>low[axis] for axis in range(3)) for _,low,high in new_hull)

    archive.mkdir(parents=True,exist_ok=True)
    raw_archive = archive/'raw-sunny-collision.glb'
    assert not raw_archive.exists()
    shutil.copyfile(current,raw_archive)
    result = []
    inserted = False
    for record in raw:
        if hull(record[0]):
            if not inserted:
                result.extend(new_hull)
                inserted=True
        else:
            result.append(record)
    assert inserted
    meta['collision']['floorColliderBoxes'] = sum(name.startswith('COLL_Floor') for name,_,_ in result)
    staged_collision = stage/'aquarium-collision.pending.glb'
    write_box_glb(staged_collision,result)
    assert read_box_glb(staged_collision)==result
    staged_collision.replace(current)
    meta_path.write_text(json.dumps(meta,indent=2))
    return {'inheritedHullBoxes':len(existing_hull),'cutHullBoxes':touched,'keptHullBoxes':len(existing_hull)-touched,
            'hullAfter':len(new_hull),'collisionBoxes':len(result),'cut':cut,'raw':hash_file(raw_archive),
            'packaged':hash_file(current),'metadata':hash_file(meta_path)}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for positional in ('stage','previous','scope_report','archive'):
        parser.add_argument(positional,type=Path)
    args=parser.parse_args()
    result=package(args.stage,args.previous,args.scope_report,args.archive)
    print(json.dumps(result,indent=2))
