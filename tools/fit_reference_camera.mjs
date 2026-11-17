/** Fit hull landmarks only; rig measurements remain independent predictions. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import * as T from 'three'
import {loadColliders} from '../tests/glb.mjs'
const models=process.env.REFERENCE_MODELS??'public/models'
const out=process.argv[2]??'/private/tmp/sunny-r02-camera-fit.json'
const boxes=loadColliders(path.join(models,'sunny.glb')),by=n=>boxes.find(o=>o.name===n)
const centre=n=>by(n).min.clone().add(by(n).max).multiplyScalar(.5)
const dock=by('Sunny_Dock1_rim'),dc=centre(dock.name),inner=process.argv.includes('--inner')
const radius=inner?7.49:(dock.max.y-dock.min.y)/2
const ring=Array.from({length:96},(_,i)=>new T.Vector3(dc.x+radius*Math.cos(i*Math.PI/48),dc.y+radius*Math.sin(i*Math.PI/48),dc.z))
const head=centre('Sphere001'),roof=centre('Sunny_LibraryRoof')
const r03=process.argv.includes('--r03'),width=r03?762:1002,height=r03?1200:1280
const observations=r03?{dockCentre:[385,1018],dockBounds:[315,947,452,1092],headCentre:[114,877],libraryRoofCentre:[621,817]}:
 {dockCentre:inner?[565,1092]:[558,1090],dockBounds:inner?[493,1009,638,1173]:[458,981,653,1198],headCentre:[135,803],libraryRoofCentre:[850,756]}
const camera=new T.PerspectiveCamera(62,width/height,.1,2000)
function pose(p){
 camera.position.set(p[0],p[1],p[2]);camera.up.set(0,1,0);camera.lookAt(p[6],p[3],-1.287)
 camera.rotateZ(p[5]);camera.fov=p[4];camera.updateProjectionMatrix();camera.updateMatrixWorld()
}
function project(v){const p=v.clone().project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2]}
function prediction(){
 const circle=ring.map(project)
 return {dockCentre:project(dc),dockBounds:[Math.min(...circle.map(p=>p[0])),Math.min(...circle.map(p=>p[1])),Math.max(...circle.map(p=>p[0])),Math.max(...circle.map(p=>p[1]))],headCentre:project(head),libraryRoofCentre:project(roof)}
}
function residual(p){
 if(p[0]>-5||p[0]<-400||p[2]<25||p[2]>450||p[1]<-160||p[1]>40||p[3]<-80||p[3]>80||p[4]<18||p[4]>130||Math.abs(p[5])>.30||Math.abs(p[6])>80)return 1e9
 pose(p);const fit=prediction();let score=0
 for(const [key,values]of Object.entries(observations))for(let i=0;i<values.length;i++)score+=((fit[key][i]-values[i])/(key==='dockBounds'?8:14))**2
 return score
}
function nelderMead(start){
 const n=start.length,steps=[12,10,12,8,8,.025,10],simplex=[start,...steps.map((step,i)=>start.map((v,j)=>v+(i===j?step:0)))].map(p=>({p,f:residual(p)}))
 const at=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)
 for(let iteration=0;iteration<3500;iteration++){
  simplex.sort((a,b)=>a.f-b.f)
  const best=simplex[0],worst=simplex.at(-1),middle=Array(n).fill(0)
  for(const row of simplex.slice(0,-1))row.p.forEach((v,i)=>middle[i]+=v/n)
  const reflected=at(middle,worst.p,-1),rf=residual(reflected)
  if(rf<best.f){const expanded=at(middle,reflected,2),ef=residual(expanded);simplex[n]=ef<rf?{p:expanded,f:ef}:{p:reflected,f:rf}}
  else if(rf<simplex[n-1].f)simplex[n]={p:reflected,f:rf}
  else{const contracted=at(middle,rf<worst.f?reflected:worst.p,.5),cf=residual(contracted)
   if(cf<Math.min(rf,worst.f))simplex[n]={p:contracted,f:cf}
   else for(let i=1;i<=n;i++){simplex[i].p=at(best.p,simplex[i].p,.5);simplex[i].f=residual(simplex[i].p)}
  }
 }
 return simplex.sort((a,b)=>a.f-b.f)[0]
}
const fits=[]
for(const fov of [35,60,90,115])for(const azimuth of [.35,.7])fits.push(nelderMead([-100*azimuth,-45,110,-8,fov,.02,0]))
fits.sort((a,b)=>a.f-b.f);const best=fits[0];pose(best.p)
const predictedRig=Object.fromEntries(['Cylinder003','Cylinder004','Cylinder007','Cylinder010','Cylinder006','Plane009','Plane010'].map(name=>[name,{world:centre(name).toArray(),pixel:project(centre(name))}]))
const source=r03?'stuff/images/Thousand_Sunny_pg.26.webp':'stuff/images/Thousand_Sunny_Digitally_Colored_Manga.webp'
const rigObservations=r03?{foreYard:[316,593],mainYard:[493,521]}:{foreYard:[424,277],mainYard:[645,190]}
const axisPlane=new T.Plane(new T.Vector3(0,0,1),1.1437085),ray=new T.Raycaster()
const inferredRig=Object.fromEntries(Object.entries(rigObservations).map(([name,p])=>{
 ray.setFromCamera(new T.Vector2(2*p[0]/width-1,1-2*p[1]/height),camera)
 return [name,{pixel:p,worldOnMastPlane:ray.ray.intersectPlane(axisPlane,new T.Vector3())?.toArray()}]
}))
const result={status:'camera study only; no geometry mutation',models,width,height,observations,dockCorrespondence:inner?'near opening edge; outer annulus excluded':'outer annulus',
 modelSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(models,'sunny.glb'))).digest('hex'),
 source,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
 parameters:{position:best.p.slice(0,3),target:[best.p[6],best.p[3],-1.287],fov:best.p[4],roll:best.p[5]},
 weightedScore:best.f,prediction:prediction(),predictedRig,inferredRig,allFits:fits,
 limitations:'Approximate hand-read hull centres and Dock silhouette. Drawing is stylised; roof/face correspondence is uncertain. No rig point is used in the fit. Compare independent rig predictions before choosing a geometry change.'}
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({weightedScore:best.f,parameters:result.parameters,prediction:result.prediction,predictedRig},null,2))
