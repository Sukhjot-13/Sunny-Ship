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
    'ForeCabins': {
        'visual': ('Sunny_Quarters_', 'Sunny_Womens_', 'Sunny_Wash_', 'Sunny_WWash_', 'Sunny_ForeToilet'),
        'solids': ('Sunny_Quarters_', 'Sunny_Womens_', 'Sunny_Wash_', 'Sunny_WWash_', 'Sunny_ForeToilet'),
        'floor_bounds': None,
    },
    'LowerRoomsAndLookout': {
        'visual': ('Sunny_Store_', 'Sunny_Factory_', 'Sunny_Weapons_', 'Sunny_Energy_', 'Sunny_Vehicle',
                   'Sunny_Dock_turntable_', 'Sunny_Dock_capstan_', 'Sunny_SurveyGym_', 'Sunny_InteriorFloor_lower',
                   'Sunny_InteriorWall_B1_', 'Sunny_RoomPartition_workshops_',
                   'Sunny_RoomLamp_Usopps_Main_Factory_', 'Sunny_RoomLamp_Frankys_Weapon_Development_Room_'),
        'solids': ('Sunny_Store_', 'Sunny_Factory_', 'Sunny_Weapons_', 'Sunny_Energy_', 'Sunny_SurveyGym_'),
        'floor_bounds': None,
        'preserve_lower_floors': True,
        'interior_features': ('SurveyGym',),
    },
}


def lookout_floor_split(removed, added):
    """Verify the native one-cell rounding split before restoring the original box."""
    if not removed and not added:
        return None
    assert len(removed) == 1 and len(added) == 2, (len(removed), len(added))
    old = removed[0]
    left, right = sorted(added, key=lambda part: part['min'][0])
    assert -10.2 < old['min'][0] < old['max'][0] < -9.2
    assert .06 < old['min'][2] < old['max'][2] < .47
    assert 29.220 < old['max'][1] < 29.222
    assert left['name'] == old['name'] and right['name'] != old['name']
    assert left['min'][0] == old['min'][0] and right['max'][0] == old['max'][0]
    assert left['max'][0] == right['min'][0]
    for part in (left, right):
        for edge in ('min', 'max'):
            assert part[edge][2] == old[edge][2]
            assert abs(part[edge][1] - old[edge][1]) < .00011
    return old['name'], right['name']


def workshop_floor_cells(boxes, origin):
    """Expand packed B1 slabs into their original 40 cm support cells."""
    cells={}
    for box in boxes:
        low,high=box['min'],box['max']
        assert 4.6<low[0]<high[0]<24 and -16.4<low[2]<high[2]<14.1,box['name']
        assert abs(low[1]+47.3307)<.001 and abs(high[1]+47.1507)<.001,box['name']
        edges=[(point[axis]-origin[axis])/.4 for axis in (0,2) for point in (low,high)]
        indices=[round(edge) for edge in edges]
        assert all(abs(edge-index)<1e-5 for edge,index in zip(edges,indices)),box['name']
        x0,x1,z0,z1=indices
        for x in range(x0,x1):
            for z in range(z0,z1):
                assert (x,z) not in cells,box['name']
                cells[x,z]=(low[1],high[1])
    return cells


def lower_floor_artifacts(report):
    removed,added=([entry for entry in report['collision'][kind] if entry['isFloor']]
                   for kind in ('removed','added'))
    split=lookout_floor_split(*([box for box in batch if box['min'][1]>0] for batch in (removed,added)))
    previous,current=([box for box in batch if box['min'][1]<=0] for batch in (removed,added))
    original=workshop_floor_cells(previous,previous[0]['min']) if previous else {}
    if current:
        assert previous,'B1 floor gained cells'
        updated=workshop_floor_cells(current,previous[0]['min'])
        assert set(original)==set(updated),'B1 floor coverage changed'
        assert all(abs(a-b)<.0002 for cell in original for a,b in zip(original[cell],updated[cell])), 'B1 floor height changed'
    else:
        assert not original,'B1 floor lost cells'
    return split,len(original)


def verify_scope(report, scope):
    visual=report['visual']
    assert all(name.startswith(scope['visual']) for name in (*visual['removed'],*visual['updated']))
    retained_floors=lower_floor_artifacts(report) if scope.get('preserve_lower_floors') else None
    for entry in report['collision']['removed']+report['collision']['added']:
        if entry['isFloor']:
            if retained_floors is not None:
                continue
            assert scope['floor_bounds'] is not None and all(
                low<=entry['min'][axis] and entry['max'][axis]<=high
                for axis,(low,high) in enumerate(scope['floor_bounds'])),entry
        else:
            assert 'Line002' in entry['name'] or any(token in entry['name'] for token in scope['solids']),entry
    return retained_floors


def package(room, stage, previous, difference, archive):
    report=json.loads(difference.read_text())
    scope=SCOPES[room]
    retained_floors=verify_scope(report,scope)
    candidate=stage/'sunny-collision.glb';prior=previous/'sunny-collision.glb'
    assert report['collision']['sha256']==[hash_file(prior),hash_file(candidate)]
    new,old=read_box_glb(candidate),read_box_glb(prior)
    if retained_floors is not None:
        floor=lambda box:box[0].startswith('COLL_Floor')
        first=next(i for i,box in enumerate(new) if floor(box))
        new=new[:first]+[box for box in old if floor(box)]+[box for box in new[first:] if not floor(box)]
    result,protected=keep_hull(new,old)
    target_meta=stage/'ship-metadata.json'
    meta=json.loads(target_meta.read_text());baseline=json.loads((previous/'ship-metadata.json').read_text())
    if scope.get('interior_features'):
        meta['exterior']['features']=[name for name in meta['exterior']['features'] if name not in scope['interior_features']]
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
    result={'room':room,'protectedHullBoxes':protected,'unchangedMeshes':report['visual']['unchanged'],
            'collisionSha256':hash_file(candidate),'metadataSha256':hash_file(target_meta)}
    if retained_floors is not None:
        split,cells=retained_floors
        result.update(restoredWorkshopFloorCells=cells,restoredLookoutFloorBox=split[0] if split else None)
    print(json.dumps(result,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('room',choices=SCOPES)
    for argument in ('stage','previous','difference','archive'):
        parser.add_argument(argument,type=Path)
    options=parser.parse_args()
    package(options.room,options.stage,options.previous,options.difference,options.archive)
