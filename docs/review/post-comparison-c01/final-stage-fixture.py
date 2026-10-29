"""Cheap final-stage trim check on a disposable master copy; never saves production."""
import sys, os, json
sys.path.insert(0,os.path.join(os.getcwd(),'tools'))
import bpy
from sunny_fore_trim import reconcile_fore_trim
from sunny_uv import prepare_exterior_uvs
from sunny_surfaces import smooth_painted_normals
meta=json.load(open('public/models/ship-metadata.json'))
bpy.ops.wm.open_mainfile(filepath=os.path.abspath('assets/sunny-master.blend'))
objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name.split('.')[0] in ('Circle038','Box118','Box119','Line004','Line007')]
reconcile_fore_trim(objects,meta['interiors'])
for o in objects:smooth_painted_normals(o)
prepare_exterior_uvs(objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath('docs/review/post-comparison-c01/final-stage-fixture.glb'),export_format='GLB',use_selection=True,export_extras=True)
print('Final stage fixture exported; production untouched')
