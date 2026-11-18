"""Retain exact previously approved physics outside one fitted room."""
import argparse
import json
import shutil
from pathlib import Path

from collision_glb import read_box_glb, write_box_glb
from package_aquarium_collision import hash_file
from package_library_checkpoint import keep_hull


SCOPES = {
    'Bath': {
        'visual': ('Sunny_Bath_', 'Sunny_InteriorFloor_F3_bath', 'Sunny_Library_ceiling', 'Sunny_RoomPartition_bath'),
        'solids': ('Bath', 'bath'),
        'floor_bounds': ((24.60, 34.40), (-26.30, -26.04), (-6.40, 3.35)),
    },
    'Dining': {
        'visual': ('Sunny_Dining_', 'Sunny_RoomLamp_Dining_Room_', 'Sunny_InteriorFloor_F2_aft'),
        'solids': ('Dining',),
        'floor_bounds': None,
    },
    'Kitchen': {
        'visual': ('Sunny_Kitchen_',),
        'solids': ('Kitchen',),
        'floor_bounds': None,
    },
    'AftService': {
        'visual': ('Sunny_Pantry_', 'Sunny_Sick_'),
        'solids': ('Sunny_Pantry_', 'Sunny_Sick_'),
        'floor_bounds': None,
    },
}


def verify_scope(report, scope):
    visual=report['visual']
    assert all(name.startswith(scope['visual']) for name in (*visual['removed'],*visual['updated']))
    for entry in report['collision']['removed']+report['collision']['added']:
        if entry['isFloor']:
            assert scope['floor_bounds'] is not None and all(
                low<=entry['min'][axis] and entry['max'][axis]<=high
                for axis,(low,high) in enumerate(scope['floor_bounds'])),entry
        else:
            assert 'Line002' in entry['name'] or any(token in entry['name'] for token in scope['solids']),entry


def package(room, stage, previous, difference, archive):
    report=json.loads(difference.read_text())
    verify_scope(report,SCOPES[room])
    candidate=stage/'sunny-collision.glb';prior=previous/'sunny-collision.glb'
    assert report['collision']['sha256']==[hash_file(prior),hash_file(candidate)]
    new,old=read_box_glb(candidate),read_box_glb(prior)
    result,protected=keep_hull(new,old)
    target_meta=stage/'ship-metadata.json'
    meta=json.loads(target_meta.read_text());baseline=json.loads((previous/'ship-metadata.json').read_text())
    assert meta['exterior']==baseline['exterior'] and meta['spawn']==baseline['spawn']
    def dock_key(record):return record['name'],tuple(record['min']),tuple(record['max'])
    assert sorted(meta['interiors']['dockSolids'],key=dock_key)==sorted(baseline['interiors']['dockSolids'],key=dock_key)
    assert {door['id']:door for door in meta['interiors']['doors']}=={door['id']:door for door in baseline['interiors']['doors']}
    meta['interiors']['doors']=baseline['interiors']['doors']
    meta['interiors']['dockSolids']=baseline['interiors']['dockSolids']
    meta['collision']['floorColliderBoxes']=sum(name.startswith('COLL_Floor') for name,_,_ in result)
    archive.mkdir(parents=True,exist_ok=False)
    shutil.copyfile(candidate,archive/'raw-sunny-collision.glb')
    shutil.copyfile(target_meta,archive/'raw-ship-metadata.json')
    pending=stage/'room-collision.pending.glb'
    write_box_glb(pending,result)
    assert read_box_glb(pending)==result
    pending.replace(candidate)
    target_meta.write_text(json.dumps(meta,indent=2))
    print(json.dumps({'room':room,'protectedHullBoxes':protected,'unchangedMeshes':report['visual']['unchanged'],
                      'collisionSha256':hash_file(candidate),'metadataSha256':hash_file(target_meta)},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('room',choices=SCOPES)
    for argument in ('stage','previous','difference','archive'):
        parser.add_argument(argument,type=Path)
    options=parser.parse_args()
    package(options.room,options.stage,options.previous,options.difference,options.archive)
