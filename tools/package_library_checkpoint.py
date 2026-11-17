"""Apply the verified Library delta while preserving the previous Aquarium proxy."""
import argparse
import json
import shutil
from pathlib import Path

from collision_glb import read_box_glb, write_box_glb
from package_aquarium_collision import hash_file


def keep_hull(candidate, previous):
    def shared(name):
        return name.startswith('COLL_Rail_Line002_')
    result=[];inserted=False
    protected=[box for box in previous if shared(box[0])]
    for record in candidate:
        if shared(record[0]):
            if not inserted:
                result.extend(protected)
                inserted=True
        else:
            result.append(record)
    assert inserted and protected
    return result,len(protected)


def package(stage, previous, visual_diff, physical_diff, archive):
    visual=json.loads(visual_diff.read_text())
    physical=json.loads(physical_diff.read_text())
    allowed=('Sunny_Library_', 'Sunny_RoomLamp_Library_', 'Sunny_InteriorFloor_F3_library', 'Sunny_InteriorFloor_F3_bath',
             'Sunny_BathStair_', 'Sunny_Bath_lining_', 'Sunny_Hatch_BathLadderHatch_', 'Sunny_BathLadderHatch_',
             'Sunny_BathWCDoor_frame_', 'Sunny_RoomPartition_bath_')
    assert all(name.startswith(allowed) for name in (*visual['removed'],*visual['updated']))
    assert not (set(visual['removed'])|set(visual['updated']))&{'Line002','Cylinder002'}
    for entry in physical['removed']+physical['added']:
        if entry['isFloor']:
            assert entry['min'][0]>24 and entry['max'][0]<34 and entry['max'][1]>-29.4 and entry['max'][1]<-25.8
        else:
            assert 'Line002' in entry['name'] or any(token in entry['name'] for token in ('Library','Bath','bath'))
    current=stage/'sunny-collision.glb'
    old=previous/'sunny-collision.glb'
    raw=read_box_glb(current)
    existing=read_box_glb(old)
    assert physical['counts']==[len(existing),len(raw)]
    archive.mkdir(parents=True,exist_ok=False)
    shutil.copyfile(current,archive/'raw-sunny-collision.glb')
    shutil.copyfile(stage/'ship-metadata.json',archive/'raw-ship-metadata.json')
    boxes,protected=keep_hull(raw,existing)
    meta_path=stage/'ship-metadata.json';meta=json.loads(meta_path.read_text())
    prior=json.loads((previous/'ship-metadata.json').read_text())
    opening=next(spec for spec in meta['interiors']['doors'] if spec['id']=='BathLadderHatch')
    old_doors={spec['id']:spec for spec in prior['interiors']['doors']}
    assert old_doors=={spec['id']:spec for spec in meta['interiors']['doors'] if spec['id']!=opening['id']}
    meta['interiors']['doors']=prior['interiors']['doors']+[opening]
    def dock_key(record):
        return record['name'],tuple(record['min']),tuple(record['max'])
    assert sorted(meta['interiors']['dockSolids'],key=dock_key)==sorted(prior['interiors']['dockSolids'],key=dock_key)
    meta['interiors']['dockSolids']=prior['interiors']['dockSolids']
    assert meta['exterior']['mechanisms']['climbs'][:-1]==prior['exterior']['mechanisms']['climbs']
    assert meta['exterior']['mechanisms']['climbs'][-1]['hatch']==opening['id']
    assert meta['spawn']==prior['spawn']
    meta['collision']['floorColliderBoxes']=sum(name.startswith('COLL_Floor') for name,_,_ in boxes)
    target=stage/'library-collision.pending.glb'
    write_box_glb(target,boxes)
    assert read_box_glb(target)==boxes
    target.replace(current)
    meta_path.write_text(json.dumps(meta,indent=2))
    print(json.dumps({'protectedSharedHullBoxes':protected,'verifiedUnchangedMeshes':visual['unchanged'],
                      'prior':hash_file(old),'packaged':hash_file(current),'metadata':hash_file(meta_path)},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for item in ('stage','previous','visual_diff','physical_diff','archive'):
        parser.add_argument(item,type=Path)
    options=parser.parse_args()
    package(options.stage,options.previous,options.visual_diff,options.physical_diff,options.archive)
