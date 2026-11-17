"""Compare real current/proposed lawn crowns without rebuilding the ship."""
import os,sys,json,argparse
import bpy
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
from sunny_accuracy import reference_tree
from sunny_shade import shade_tree
from sunny_exterior import box


def preview(out):
    os.makedirs(out,exist_ok=True);reports=[]
    for phase,builder in [('current',reference_tree),('rounded',shade_tree)]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        builder('ShadeTree_study',(0,0,0),seed=3)
        box('study_deck',(0,0,-.08),(9,9,.16),'deck')
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
        scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
        scene.world=bpy.data.worlds.new('Shade study sky');scene.world.use_nodes=True
        scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.22,.27,.34,1)
        scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.5
        bpy.ops.object.light_add(type='AREA',location=(2,-4,9));light=bpy.context.object
        light.data.energy=1500;light.data.size=6;light.rotation_euler=(Vector((0,0,3))-light.location).to_track_quat('-Z','Y').to_euler()
        bpy.ops.object.camera_add(location=(9,-12,7));camera=bpy.context.object
        camera.rotation_euler=(Vector((0,0,3.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=47;scene.camera=camera
        bpy.context.view_layer.update()
        leaves=[o for o in scene.objects if o.type=='MESH' and '_leaves_batch' in o.name]
        points=[o.matrix_world@v.co for o in leaves for v in o.data.vertices]
        minimum=[min(p[i]for p in points)for i in range(3)];maximum=[max(p[i]for p in points)for i in range(3)]
        reports.append(dict(phase=phase,leafBatches=len(leaves),min=minimum,max=maximum,depthToWidth=(maximum[2]-minimum[2])/max(maximum[i]-minimum[i]for i in (0,1))))
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,phase+'.blend'))
        scene.render.filepath=os.path.join(out,phase+'.png');bpy.ops.render.render(write_still=True)
    with open(os.path.join(out,'geometry.json'),'w')as stream:json.dump(reports,stream,indent=2)
    print('SHADE_STUDY',json.dumps(reports),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]if '--'in sys.argv else[]);preview(args.out)
