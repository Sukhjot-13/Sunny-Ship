/** Selected actual exported pads must face the retained transverse mouth axis. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {loadColliders} from './glb.mjs'
import {channelAngle,rotatePoint} from '../src/systems/navigation.js'

const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const pads=loadColliders('public/models/sunny.glb')
const centre=[meta.interiors.dockCentre[0],meta.interiors.dockCentre[2],-meta.interiors.dockCentre[1]]
for(let channel=1;channel<=6;channel++){
 const pad=pads.find(o=>o.name===`Sunny_Dock_bay${channel-1}`)
 assert(pad,`missing exported bay ${channel}`)
 const point=[(pad.min.x+pad.max.x)/2,(pad.min.y+pad.max.y)/2,(pad.min.z+pad.max.z)/2]
 const aligned=rotatePoint(point,channelAngle(channel),centre)
 assert(Math.abs(aligned[0]-centre[0])<.02,`bay ${channel} misses mouth axis`)
 assert(aligned[2]<centre[2]-5,`bay ${channel} faces wrong side`)
 if(channel===2)assert(Math.abs(point[0]-centre[0])>1,'negative control: unrotated bay 2 must be misaligned')
}
console.log('PASS all six exported selected bay centres align with the transverse mouth axis')
