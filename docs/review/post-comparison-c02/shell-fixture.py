"""Disposable C02 local closed reveal fixture; never saves original ship/master."""
import os,sys,json,math
sys.path.insert(0,os.path.join(os.getcwd(),'tools'))
import bpy,bmesh
from sunny_accuracy import dock_outlet_shell
meta=json.load(open('public/models/ship-metadata.json'))
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('assets/sunny-master.blend'))
outline=meta['interiors']['foreTrimVolumes'][0]['outline']
result=[]
for opening in meta['exterior']['mechanisms']['dockOpenings']:
 side=opening['side'];direction=-1 if side=='port' else 1
 obj=dock_outlet_shell(side,opening['centre'],opening['radius'],outline,direction)
 bm=bmesh.new();bm.from_mesh(obj.data)
 assert all(len(e.link_faces)==2 for e in bm.edges), 'real shell must be closed'
 volume=bm.calc_volume(signed=True);assert volume>0,'outward closed shell winding'
 result.append(dict(side=side,vertices=len(bm.verts),faces=len(bm.faces),closed=True,volume=volume))
 bm.free()
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=os.path.abspath('docs/review/post-comparison-c02/shell-fixture-'+side+'.glb'),export_format='GLB',use_selection=True,export_extras=True)
json.dump(result,open('docs/review/post-comparison-c02/shell-fixture.json','w'),indent=2)
print('PASS C02 closed local aperture reveal fixture',result)
