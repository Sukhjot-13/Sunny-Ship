/** Shared heavy-job serialization; no product logic or assertion changes. */
import fs from 'node:fs'
import {spawn} from 'node:child_process'
const [label,separator,command,...args]=process.argv.slice(2)
if(separator!=='--'||!label||!command)throw Error('Usage: resource.mjs label -- command args...')
const lock='/private/tmp/sunny-model-trial-20261026-heavy.lock',queued=Date.now(),events='trial/results/resource-events.jsonl'
fs.mkdirSync('trial/results',{recursive:true})
const record=entry=>fs.appendFileSync(events,JSON.stringify({label,pid:process.pid,cwd:process.cwd(),time:new Date().toISOString(),...entry})+'\n')
/** A competing creator may own the file before its JSON write is complete. */
function readOwner(){
 try{const raw=fs.readFileSync(lock,'utf8');return raw?JSON.parse(raw):null}
 catch(error){if(error.code==='ENOENT'||error instanceof SyntaxError)return null;throw error}
}
record({event:'queued',harnessRevision:2,command:[command,...args]})
let acquired=false
while(!acquired){
 try{fs.writeFileSync(lock,JSON.stringify({pid:process.pid,cwd:process.cwd(),label,acquired:new Date().toISOString()}),{flag:'wx'});acquired=true}
 catch(error){
  if(error.code!=='EEXIST')throw error
  const owner=readOwner()
  if(owner){
   try{process.kill(owner.pid,0)}catch(e){
    if(e.code!=='ESRCH')throw e
    if(readOwner()?.pid===owner.pid){try{fs.unlinkSync(lock)}catch(e){if(e.code!=='ENOENT')throw e}}
   }
  }
  await new Promise(resolve=>setTimeout(resolve,1500))
 }
}
const started=Date.now();record({event:'started',queueMs:started-queued});console.log('Heavy job acquired:',label,'queueMs',started-queued)
/** Release only the lock owned by this wrapper. */
function release(){if(acquired&&readOwner()?.pid===process.pid){try{fs.unlinkSync(lock)}catch(e){if(e.code!=='ENOENT')throw e}}acquired=false}
const child=spawn(command,args,{stdio:'inherit',env:process.env})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{child.kill(signal);release()})
child.on('error',error=>{record({event:'error',error:error.message});release();process.exitCode=1})
child.on('close',(code,signal)=>{record({event:'finished',executionMs:Date.now()-started,queueMs:started-queued,exitCode:code,signal});release();process.exitCode=code??1})
