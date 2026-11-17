import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const [stage,backup,priorFile,renderFile,deltaFile,receipt,url='http://localhost:5173']=process.argv.slice(2)
assert(stage&&backup&&priorFile&&renderFile&&deltaFile&&receipt,'Pass verified stage, new backup, prior/render/fixture JSON and output receipt')
const json=file=>JSON.parse(fs.readFileSync(file))
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const sha=file=>digest(fs.readFileSync(file))
const previous=json(priorFile).applied,render=json(renderFile),fixture=json(deltaFile)
const dimensions=json(path.join(stage,'reference','dimensions.json'))
assert(render.shots.length>1&&render.errors.length===0&&render.consoleErrors.length===0,'A verified native render is required')
assert.equal(sha(path.join(stage,'sunny.glb')),dimensions.workingVisualSha256)
assert.equal(sha(path.join(stage,'sunny-master.blend')),dimensions.sourceSha256)

const targets=['assets/sunny-master.blend','public/models/sunny.glb','public/models/sunny-collision.glb','public/models/ship-metadata.json',
 'assets/reference/sunny-reference.blend','assets/reference/sunny-reference.glb','assets/reference/dimensions.json']
const files=targets.map(target=>{
 const name=path.basename(target),source=path.join(stage,target.includes('/reference/')?'reference':'',name)
 const expected=sha(source)
 assert.equal(sha(target),previous[target],`Previous checkpoint changed: ${target}`)
 if(target.startsWith('public/models/')&&name!=='sunny-collision.glb')assert.equal(expected,render.assets[name],name)
 if(name==='sunny-collision.glb')assert.equal(expected,fixture.collisionSha256)
 return {target,name,source,expected,pending:target+'.room-pending'}
})

fs.mkdirSync(backup)
for(const {target,source,pending,expected} of files){
 const saved=path.join(backup,target)
 fs.mkdirSync(path.dirname(saved),{recursive:true})
 fs.copyFileSync(target,saved,fs.constants.COPYFILE_EXCL)
 fs.copyFileSync(source,pending,fs.constants.COPYFILE_EXCL)
 assert.equal(sha(pending),expected)
}
const moved=[],served={}
try{
 for(const file of files){
  fs.renameSync(file.pending,file.target);moved.push(file)
  assert.equal(sha(file.target),file.expected)
 }
 for(const file of files.filter(file=>file.target.startsWith('public/models/'))){
  const response=await fetch(new URL(`/models/${file.name}?room=${encodeURIComponent(render.roomName??'Aquarium')}`,url))
  assert(response.ok,`Preview cannot serve ${file.name}`)
  served[file.name]=digest(Buffer.from(await response.arrayBuffer()))
  assert.equal(served[file.name],file.expected,file.name)
 }
}catch(error){
 for(const file of moved.reverse())fs.copyFileSync(path.join(backup,file.target),file.target)
 throw error
}
fs.writeFileSync(receipt,JSON.stringify({backup,stage,url,applied:Object.fromEntries(files.map(file=>[file.target,file.expected])),served},null,2)+'\n')
console.log('PASS seven matching applied room files and three served runtime hashes')
