import {readFile,stat} from 'node:fs/promises'
import {join} from 'node:path'
import {gzip} from 'node:zlib'
import {promisify} from 'node:util'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
import {PACKED_COLLISION_FILE,encodePackedCollision} from '../src/systems/packedCollision.js'

const compress=promisify(gzip)

/** Derive the runtime asset from the current authoring proxy for dev and builds. */
export function packedCollisionPlugin(){
 let source,revision,payload
 async function load(){
  const info=await stat(source)
  const key=`${info.ino}:${info.mtimeMs}:${info.size}`
  if(revision!==key){
   revision=key
   payload=readFile(source).then(bytes=>encodePackedCollision(decodeCollisionBoxes(bytes))).then(compress)
    .catch(error=>{
     if(revision===key){revision=undefined;payload=undefined}
     throw error
    })
  }
  return payload
 }
 return {
  name:'sunny-packed-collision',
  configResolved(config){source=join(config.publicDir,'models','sunny-collision.glb')},
  configureServer(server){
   server.middlewares.use(async(req,res,next)=>{
    if((req.method!=='GET'&&req.method!=='HEAD')||req.url?.split('?',1)[0]!=='/'+PACKED_COLLISION_FILE)return next()
    try{
     const bytes=await load()
     res.setHeader('Content-Type','application/gzip')
     res.setHeader('Content-Length',bytes.length)
     res.setHeader('Cache-Control','no-cache')
     res.end(req.method==='GET'?bytes:undefined)
    }catch(error){next(error)}
   })
  },
  async generateBundle(){
   this.emitFile({type:'asset',fileName:PACKED_COLLISION_FILE,source:await load()})
  },
 }
}
