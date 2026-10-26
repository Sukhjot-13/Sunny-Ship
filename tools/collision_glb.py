"""Fast, deterministic GLB export for the axis-aligned collision boxes.

Unlike visual ship meshes, every proxy entry is a box. Writing that contract
straight to glTF avoids Blender's expensive generic scene evaluation per object.
Coordinates supplied here are already glTF/Three Y-up world coordinates.
"""
import json
import struct


def write_box_glb(path, boxes):
    """Write (name, min_xyz, max_xyz) boxes, preserving one named mesh per box."""
    indices = (0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
               0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5,
               2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7)
    binary = bytearray(struct.pack('<36H', *indices))
    nodes, meshes = [], []
    accessors = [dict(bufferView=0, componentType=5123, count=36, type='SCALAR')]
    for i, (name, low, high) in enumerate(boxes):
        if any(not (low[k] < high[k]) for k in range(3)):
            raise ValueError('Invalid collision box: ' + name)
        x0, y0, z0 = low
        x1, y1, z1 = high
        vertices = (x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0,
                    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1)
        binary.extend(struct.pack('<24f', *vertices))
        accessors.append(dict(bufferView=1, byteOffset=i*96, componentType=5126,
                              count=8, type='VEC3', min=list(low), max=list(high)))
        meshes.append(dict(name=name, primitives=[dict(attributes={'POSITION':i+1}, indices=0)]))
        nodes.append(dict(name=name, mesh=i))
    gltf = dict(asset={'version':'2.0', 'generator':'Sunny axis-aligned collision proxy'},
                scene=0, scenes=[{'nodes':list(range(len(nodes)))}], nodes=nodes, meshes=meshes,
                accessors=accessors, buffers=[{'byteLength':len(binary)}],
                bufferViews=[dict(buffer=0, byteOffset=0, byteLength=72, target=34963),
                             dict(buffer=0, byteOffset=72, byteLength=len(binary)-72, target=34962)])
    encoded = json.dumps(gltf, separators=(',',':')).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    with open(path, 'wb') as out:
        out.write(struct.pack('<4sII', b'glTF', 2, 12+8+len(encoded)+8+len(binary)))
        out.write(struct.pack('<II', len(encoded), 0x4e4f534a)); out.write(encoded)
        out.write(struct.pack('<II', len(binary), 0x004e4942)); out.write(binary)
