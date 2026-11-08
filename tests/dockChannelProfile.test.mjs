/** Geometry-design probe; this does not claim the profile is built in the ship. */
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
const result=spawnSync('python3',['-c',`import json,sys
sys.path.insert(0,'tools')
from dock_channel_profile import section_profile,half_width_at
cx=.495;bed=-53.150717;roof=-40.730717;cz=-45.94072;r=7.64;water=-51.850717
rows=[]
for t in (0,.25,.5,.75,1):
 p=section_profile(cx,bed,roof,cz,r,t)
 rows.append(dict(t=t,water=half_width_at(p,water,cx),centre=half_width_at(p,cz,cx),top=max(z for x,z in p),bottom=min(z for x,z in p),points=p))
print(json.dumps(rows))`],{encoding:'utf8'})
assert.equal(result.status,0,result.stderr)
const rows=JSON.parse(result.stdout)
assert(rows.every(r=>r.water>2),'the wet section clears both guide rails')
assert(Math.abs(rows.at(-1).centre-7.64)<1e-6,'outer section meets full C02 clear radius')
assert(Math.abs(rows.at(-1).top-(-45.94072+7.64))<1e-6,'outer crown meets the circular reveal')
assert(rows.every((r,i)=>!i||r.centre>=rows[i-1].centre),'transition opens continuously toward the mouth')
for(const r of rows)assert.equal(r.points.length,64)
console.log('PASS candidate continuous rounded cross-section profile; not yet applied to ship')
