/** Actual rectangular coverage, winding, holes and invalid-outline rejection. */
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const result=JSON.parse(execFileSync('python3',['-c',`
import sys,json
sys.path.insert(0,'tools')
from floor_collision import rectangular_floor_boxes
def face(x0,x1,y0,y1):return [(x0,y0,3),(x1,y0,3),(x1,y1,3),(x0,y1,3)]
faces=[face(0,1,0,4),face(3,4,0,4),face(1,3,0,1),face(1,3,3,4)]
invalid=[list(reversed(face(0,1,0,1))),[(0,0,3),(1,0,3),(1,1,3)],
 [(0,0,3),(2,0,3),(2,1,3),(1,1,3),(1,2,3),(0,2,3)],
 [(0,0,3),(1,0,3),(1,1,4),(0,1,4)],[(0,0,3)]*4]
print(json.dumps(dict(boxes=rectangular_floor_boxes('fixture',faces),invalid=rectangular_floor_boxes('bad',invalid))))
`],{encoding:'utf8'}))
assert.equal(result.boxes.length,4);assert.equal(result.invalid.length,0)
let samples=0
for(let x=.025;x<4;x+=.05)for(let y=.025;y<4;y+=.05){
 const coverage=result.boxes.some(([,lo,hi])=>x>=lo[0]&&x<=hi[0]&&-y>=lo[2]&&-y<=hi[2])
 assert.equal(coverage,!(x>1&&x<3&&y>1&&y<3),'preserve aperture and real surrounding support');samples++
}
for(const [,lo,hi]of result.boxes){assert.equal(hi[1],3);assert(Math.abs(lo[1]-2.88)<1e-9)}
console.log('PASS',samples,'independent floor/aperture samples, winding and invalid-outline rejection')
