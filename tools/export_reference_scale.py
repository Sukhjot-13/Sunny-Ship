"""Export a static 1x inspection copy without changing the 2.2x working master.

Run: npm run assets:reference
The source master, source FBX, runtime assets, human controller and collisions
remain unchanged. The root scale is reversible; 39/56 m are configured project
targets, not metre measurements extracted from the supplied perspective drawings.
"""
import bpy
import json
import os
import math
import hashlib
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG=json.load(open(os.path.join(ROOT,'src/config/exteriorConfig.json')))
OUT=os.path.join(ROOT,'assets','reference')


def measure(objects):
    """Measure real evaluated world-space vertices, independent of cached bounds."""
    low=Vector((math.inf,)*3);high=Vector((-math.inf,)*3)
    for obj in objects:
        for vertex in obj.data.vertices:
            point=obj.matrix_world@vertex.co;low=Vector(map(min,low,point));high=Vector(map(max,high,point))
    return {'min':list(low),'max':list(high),'size':list(high-low)}


def export_reference():
    """Create a linked-transform Blender copy, static GLB and dimension receipt."""
    source=os.path.join(ROOT,'assets/sunny-master.blend')
    bpy.ops.wm.open_mainfile(filepath=source)
    root=bpy.data.objects.get('ThousandSunny')
    if root is None:raise RuntimeError('working master has no authoritative ship root')
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    if not objects:raise RuntimeError('working master has no ship geometry')
    for obj in objects:
        parent=obj.parent
        while parent and parent!=root:parent=parent.parent
        if parent!=root:raise RuntimeError('unscaled orphan: '+obj.name)
    bpy.context.view_layer.update();working=measure(objects)
    factor=1/CONFIG['experienceScale']
    root.scale*=factor
    root['sunny_working_scale']=CONFIG['experienceScale']
    root['sunny_reference_scale']=1.0
    root['sunny_static_reference_copy']=True
    root['sunny_scale_note']='Uniform 1x inspection copy; original lawn redistribution and reconstructed details retained'
    bpy.context.view_layer.update();reference=measure(objects)
    for before,after in zip(working['size'],reference['size']):
        if abs(after-before*factor)>.0001:raise RuntimeError('nonuniform reference scale')
    os.makedirs(OUT,exist_ok=True)
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'sunny-reference.blend'),compress=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects+[root]:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'sunny-reference.glb'),export_format='GLB',
                              use_selection=True,export_yup=True,export_extras=True)
    receipt={'source':'assets/sunny-master.blend',
             'sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),
             'workingVisualSha256':hashlib.sha256(open(os.path.join(ROOT,'public/models/sunny.glb'),'rb').read()).hexdigest(),
             'workingScale':CONFIG['experienceScale'],
             'referenceScale':1,'rootMultiplier':factor,'workingBoundsBlender':working,
             'referenceBoundsBlender':reference,
             'configuredTargetsM':{'length':CONFIG['referenceLengthM'],'height':CONFIG['referenceHeightM']},
             'dimensionAuthority':'configured project targets; supplied perspective/plan images do not establish exact metre dimensions',
             'limitations':['Static inspection copy; runtime mechanism metadata remains in working coordinates',
                            'Earlier central lawn redistribution and upper-rig height correction are shape changes retained in both copies',
                            'Uniform scale reversal does not prove exact match to all perspective reference proportions'],
             'restoreWorkingScale':'Use assets/sunny-master.blend; or multiply ThousandSunny root scale in this copy by 2.2'}
    with open(os.path.join(OUT,'dimensions.json'),'w') as f:json.dump(receipt,f,indent=2)
    print('REFERENCE_SCALE_VERIFIED',json.dumps(receipt),flush=True)


if __name__=='__main__':export_reference()
