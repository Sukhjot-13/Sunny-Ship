"""Pose the two deployed square yards, preserving their sewn canvas and lashings."""
import math

import bpy
from mathutils import Matrix, Vector

ASSEMBLIES = (
    ('Cylinder003','Cylinder004','Plane004',49,-15),
    ('Cylinder007','Cylinder010','Plane005',38,-11),
)


def tie_to_rotated_yard(obj, transform):
    """Keep the guide end fixed and follow the yard's original attachment point."""
    low=min(vertex.co.z for vertex in obj.data.vertices)
    high=max(vertex.co.z for vertex in obj.data.vertices)
    start=obj.matrix_world@Vector((0,0,low))
    end=transform@obj.matrix_world@Vector((0,0,high))
    delta=end-start
    assert abs(low+high)<.0001 and high>low,'expected a centred authored rope cylinder'
    obj.matrix_world=(Matrix.Translation((start+end)/2) @
                      delta.to_track_quat('Z','Y').to_matrix().to_4x4() @
                      Matrix.Diagonal((1,1,delta.length/(high-low),1)))


def pose_square_rig(bounds):
    """Expose the deployed sail faces in the supplied quarter views."""
    fitted=[]
    for mast, yard, sail, yaw, tilt in ASSEMBLIES:
        mast_low,mast_high=bounds(bpy.data.objects[mast])
        yard_low,yard_high=bounds(bpy.data.objects[yard])
        pivot=(mast_low+mast_high)/2
        pivot.z=(yard_low.z+yard_high.z)/2
        transform=(Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(yaw),4,'Z') @
                   Matrix.Rotation(math.radians(tilt),4,'X') @ Matrix.Translation(-pivot))
        names=[yard,sail,*('Sunny_SailTie_'+sail+str(i) for i in range(13))]
        for name in names:
            obj=bpy.data.objects[name]
            obj.matrix_world=transform@obj.matrix_world
        if yard=='Cylinder004':
            tie_to_rotated_yard(bpy.data.objects['Sunny_Lookout_rope_yard_tie'],transform)
        fitted.append({'yard':yard,'sail':sail,'pivot':list(pivot),'yawDegrees':yaw,'tiltDegrees':tilt})
    bpy.context.view_layer.update()
    return fitted
