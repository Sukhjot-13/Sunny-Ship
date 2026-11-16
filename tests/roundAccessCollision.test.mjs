/** Compare circular bore clipping against independent point/body geometry. */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
const r=spawnSync('python3',['-c',`import sys,math
sys.path.insert(0,'tools')
from round_access_collision import clip_round_access
slot=dict(x=0,z=0,radius=.7,bottom=0,top=3)
boxes=[('COLL_Floor_fixture',(-1.5,1,-1.5),(1.5,2,1.5)),('COLL_Solid_keep',(-1,1,-1),(1,2,1)),('COLL_Floor_below',(-1,-2,-1),(1,-1,1))]
result=clip_round_access(boxes,[slot])
assert result==clip_round_access(result,[slot]),'clipping must be idempotent'
assert boxes[1] in result and boxes[2] in result,'other solids and lower floor stay unchanged'
floor=[(a,b) for name,a,b in result if name.startswith('COLL_Floor_fixture')]
def supported(x,z):return any(a[0]-1e-8<=x<=b[0]+1e-8 and a[2]-1e-8<=z<=b[2]+1e-8 for a,b in floor)
for i in range(101):
 for j in range(101):
  x=-1.5+i*.03;z=-1.5+j*.03;d=math.hypot(x,z)
  if d<.699:assert not supported(x,z),'phantom floor remains inside bore'
  if d>.741:assert supported(x,z),'floor outside conservative coaming edge was lost'
assert not any(a[0]<.34 and b[0]>-.34 and a[2]<.34 and b[2]>-.34 for a,b in floor),'normal body must clear centre shaft'
print('PASS 10,201 independent floor/bore points, full-body centre clearance, retained solids/lower layer and idempotence')`],{encoding:'utf8'})
assert.equal(r.status,0,r.stdout+r.stderr);console.log(r.stdout.trim())
