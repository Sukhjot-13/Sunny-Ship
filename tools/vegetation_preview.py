"""Render the real vegetation authoring functions without rebuilding the ship.

blender -b --factory-startup --python-exit-code 1 --python tools/vegetation_preview.py -- --out /private/tmp/sunny-vegetation-preview
"""
import argparse
import json
import math
import os
import sys
import bpy
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
from sunny_accuracy import reference_tree
from sunny_exterior import box,pole


def preview(out):
    """Use unchanged pots/fruit and a measured-height garden guard for context."""
    os.makedirs(out,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for i,(x,y) in enumerate(((-1.1,.7),(0,-.8),(1.1,.7))):
        reference_tree('Mikan'+str(i),(x,y,0),citrus=True,seed=11+i)
    box('preview_deck',(0,0,-.08),(7,6,.16),'deck')
    for x in (-3,-1.5,0,1.5,3):box('preview_guard_post',(x,1.9,.695),(.08,.08,1.39),'white')
    box('preview_guard_top',(0,1.9,1.34),(6,.12,.10),'white')
    box('preview_guard_lower',(0,1.9,.35),(6,.08,.08),'white')
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Vegetation study sky');scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value=(.22,.27,.34,1)
    background.inputs['Strength'].default_value=.5
    bpy.ops.object.light_add(type='AREA',location=(2,-4,7))
    light=bpy.context.object;light.data.energy=1300;light.data.shape='DISK';light.data.size=6
    light.rotation_euler=(Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.light_add(type='SUN',location=(0,0,6))
    bpy.context.object.data.energy=1.6;bpy.context.object.rotation_euler=(.5,-.3,-.4)
    bpy.ops.object.camera_add(location=(5.2,-7.8,4.1))
    camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.3))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=43;scene.camera=camera
    scene.view_settings.view_transform='AgX'
    bpy.context.view_layer.update()
    records=[]
    for i in range(3):
        prefix='Sunny_Mikan'+str(i)
        leaves=[o for o in scene.objects if o.type=='MESH' and o.name.startswith(prefix+'_leaves_batch')]
        points=[o.matrix_world@v.co for o in leaves for v in o.data.vertices]
        assert len(leaves)==2,'leaf material batching must remain bounded'
        assert points and max(p.z for p in points)-min(p.z for p in points)>.8,'a crown needs depth rather than one leaf plane'
        assert 2.5<max(p.z for p in points)<3.4,'living shoots must stay within the reconstructed small-tree height'
        records.append(dict(id=prefix,leafVertices=len(points),
                            min=[min(p[k]for p in points)for k in range(3)],
                            max=[max(p[k]for p in points)for k in range(3)]))
    with open(os.path.join(out,'geometry.json'),'w')as f:json.dump(records,f,indent=2)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'vegetation.blend'))
    scene.render.filepath=os.path.join(out,'mikan.png');bpy.ops.render.render(write_still=True)
    print('VEGETATION_PREVIEW',out,flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]if '--'in sys.argv else[])
    preview(args.out)
