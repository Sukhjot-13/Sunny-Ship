import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const [roomName,out,url='http://localhost:5174']=process.argv.slice(2)
assert(roomName&&out,'Pass room name, output directory and optional preview URL')
fs.mkdirSync(out,{recursive:true})
const asset=async name=>{
 const response=await fetch(new URL(`/models/${name}`,url));assert(response.ok)
 return Buffer.from(await response.arrayBuffer())
}
const [visual,metaBytes]=await Promise.all(['sunny.glb','ship-metadata.json'].map(asset))
const meta=JSON.parse(metaBytes)
const foreCabins=["Men's Quarters","Women's Quarters","Men's Washroom","Women's Washroom",
 'Men Starboard Cannon Closet','Men Port Cannon Closet','Women Starboard Cannon Closet','Women Port Cannon Closet',
 'Fore Port Toilet','Fore Starboard Toilet']
const lowerRooms=['Storage Room',"Usopp's Main Factory","Franky's Weapon Development Room",
 'Energy Room','Soldier Dock System',"Crow's Nest and Gym"]
const hatch=meta.interiors.doors.find(door=>door.id==='CrowNestHatch')
const lookout=hatch&&{
 name:"Crow's Nest and Gym",level:'F3C',x:[hatch.pos[0]-6.43,hatch.pos[0]+1.73],
 y:[hatch.pos[1]-3.96,hatch.pos[1]+1.76],
}
const region=name=>meta.interiors.rooms.find(room=>room.name===name)??(name===lookout?.name?lookout:undefined)
const roomFloor=room=>room.name==='Soldier Dock System'?meta.interiors.dockWaterLevel+.45:meta.interiors.levels[room.level]
const groups={Bath:['Bath Washroom','Bath Toilet'],'Fore Cabins':foreCabins,'Lower Rooms':lowerRooms}
const room=region(roomName==='Bath'?roomName:(groups[roomName]?.[0]??roomName))
assert(room,`Unknown room: ${roomName}`)
const x=(room.x[0]+room.x[1])/2,z=-(room.y[0]+room.y[1])/2,floor=roomFloor(room)
const views={
 Library:[['door-view',[-4.12,1.64,0],[3.3,1.38,0],76],['survey-books',[-1.35,1.67,2.0],[3.3,1.22,-.75],68],
  ['bench-and-windows',[-2.15,1.67,-1.70],[1.7,1.1,4.1],72],['from-desk',[3.33,1.68,1.25],[-2.8,1.08,0],72]],
 Bath:[['bath',[1.7,1.68,-.55],[-1,1.0,2.7],72],['shower',[2.35,1.65,2.9],[-2.3,1.0,2.2],68]],
 'Bath Washroom':[['entrance',[-1.95,1.66,.04],[1.2,1.28,.60],74]],
 'Bath Toilet':[['toilet',[-.11,1.50,.20],[.44,.58,-.21],74]],
 'Dining Room':[['from-entry',[-3.28,1.68,-4.02],[.65,1.21,-.34],78],['table-and-seating',[.2,1.69,-2.47],[.58,.92,1.66],76]],
 Kitchen:[['galley',[-3.25,1.68,3.58],[1.77,1.30,-.53],80],['appliances',[-1.87,1.68,-.36],[1.6,1.2,-3.45],75]],
 Pantry:[['stores',[-1.44,1.66,1.45],[1.15,1.38,-1.20],72],['outer-door',[-1.23,1.66,1.108],[1.8,1.27,1.108],74]],
 'Sick Bay':[['bed-and-entry',[-1.32,1.68,-.02],[1.26,1.12,2.04],78],
  ['workstation',[1.18,1.62,1.48],[-1.46,1.19,1.77],74],['passage',[-1.42,1.66,-1.392],[1.75,1.35,-1.392],73]],
 "Men's Quarters":[['mens-room',[3.2,1.65,-.68],[-2.8,1.20,.95],76],
  ['bunks',[-.80,1.55,3.41],[-3.1,1.23,-.55],75]],
 "Women's Quarters":[['womens-room',[2.74,1.64,-.86],[-2.48,1.17,1.65],78],
  ['canopy',[-.26,1.60,-3.40],[2.57,1.15,-5.20],72]],
 "Men's Washroom":[['mens-wash',[-.54,1.61,.36],[.84,1.16,-.04],72]],
 "Women's Washroom":[['womens-wash',[.22,1.63,.87],[-.18,1.24,-.80],75]],
 'Fore Port Toilet':[['port-toilet',[.48,1.47,.38],[-.39,.83,-.04],69]],
 'Fore Starboard Toilet':[['starboard-toilet',[.48,1.47,-.38],[-.39,.83,.04],69]],
 'Fore Cabins':[],
 'Lower Rooms':[],
 'Storage Room':[['dry-storage',[-3.1,1.64,-1.18],[-6.15,.89,-3.87],76],
  ['spare-stores',[7.30,1.65,9.18],[9.50,1.02,8.12],69]],
 "Usopp's Main Factory":region("Usopp's Main Factory").workshopLayout?.aisle
  ?[['factory',[-2.54,1.65,-1.53],[.30,1.22,-3.50],76]]
  :[['factory',[-2.54,1.65,1.61],[.30,1.22,3.61],76]],
 "Franky's Weapon Development Room":region("Franky's Weapon Development Room").workshopLayout?.aisle
  ?[['development-room',[-1.82,1.64,.90],[2.30,1.21,3.31],79]]
  :[['development-room',[-1.82,1.64,-.89],[2.30,1.21,-3.36],79]],
 'Energy Room':[['boiler-room',[-1.65,1.66,-4.88],[.16,1.48,-8.34],76],
  ['boiler-controls',[.125,1.59,-1.96],[.125,.88,-3.85],62]],
 'Soldier Dock System':[['dock-waiting-platform',[1.66,1.58,.92],[-.05,1.13,-.84],78],
  ['dock-channel-one',[1.25,1.39,-3.22],[.73,.47,-5.29],73]],
 "Crow's Nest and Gym":[['survey-optics',[.29,1.58,1.31],[-2.33,1.20,-.28],73],
  ['training-area',[-1.54,1.61,-.83],[.72,1.02,2.26],75]],
}
for(const name of foreCabins.filter(name=>name.includes('Cannon Closet'))){
 const closet=meta.interiors.rooms.find(room=>room.name===name)
 if(!closet)continue
 const direction=closet.y[0]>0?-1:1
 views[name]=[[name.toLowerCase().replaceAll(' ','-'),[.43,1.36,0],[-1.10,.54,.50*direction],65]]
}
assert(views[roomName],`No camera study configured for ${roomName}`)
const point=([dx,dy,dz])=>[x+dx,floor+dy,z+dz]
if(room.libraryLayout)views.Library.push(['bath-ladder',[-.44,1.66,.75],[-2.16,1.58,-2.83],68])
if(room.diningLayout)views['Dining Room'].push(['table-length',[-3.39,1.61,-.96],[2.51,1.13,.74],76])
if(room.galleyLayout)views.Kitchen.push(['prep-aisle',[-2.26,1.65,-1.30],[2.42,1.18,-3.74],78])
if(groups[roomName]){
 for(const name of groups[roomName]){
  const linked=region(name)
  const offsetX=(linked.x[0]+linked.x[1])/2-x,offsetZ=-(linked.y[0]+linked.y[1])/2-z
  const offsetY=roomFloor(linked)-floor
  const offset=([dx,dy,dz])=>[dx+offsetX,dy+offsetY,dz+offsetZ]
  for(const [label,eye,focus,fov] of views[name])views[roomName].push([label,offset(eye),offset(focus),fov])
 }
}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const errors=[],consoleErrors=[],shots=[]
let bathWater=false
let surfaceRoles=null
const lowerSurfaceRoles={
 Sunny_Store_hessian_sack:'hessian',
 Sunny_Factory_assembly_table_top:'grain',
 Sunny_Weapons_furnace:'iron',
 Sunny_Energy_control_box:'enamel',
 Sunny_Vehicle3_shark_hull:'enamel',
 Sunny_Vehicle4_front_wheel:'rubber',
 Sunny_SurveyGym_training_bar:'steel',
}
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.waitForFunction(()=>!document.body.innerText.includes('Click to Explore'),{timeout:10000})
 await page.evaluate(async()=>{
  const moduleURL=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/deps/@react-three_fiber.js'))
  const {_roots}=await import(moduleURL)
  window.__roomReview=_roots.get(document.querySelector('canvas')).store.getState()
  window.__roomReview.controls.enabled=false
 })
 const filter=process.env.ROOM_VIEW_FILTER
 const requested=views[roomName].filter(([name])=>!filter||name.includes(filter))
 assert(requested.length,'The room camera filter selected no views')
 for(const [name,eye,focus,fov] of requested){
  const camera=point(eye),target=point(focus)
  await page.evaluate(({camera,target,fov})=>{
   const scene=window.__roomReview
   scene.camera.position.set(...camera);scene.camera.lookAt(...target);scene.camera.fov=fov
   scene.camera.updateProjectionMatrix();scene.camera.updateMatrixWorld()
  },{camera,target,fov})
  await new Promise(resolve=>setTimeout(resolve,750))
  await page.screenshot({path:path.join(out,`${name}.png`)})
  shots.push({name,camera,target,fov})
 }
 if(room.bathLayout)bathWater=await page.evaluate(()=>{
  const tub=window.__ship.getObjectByName('Sunny_Bath_tub_water')
  let animated=false
  tub?.traverse(node=>{if(node.isMesh&&node.material.userData.bathOwned)animated=true})
  return animated
 })
 if(room.galleyLayout)surfaceRoles=await page.evaluate(()=>{
  const parts=['serving_island_marble','serving_island_base','sink_bowl','fridge_body']
  return Object.fromEntries(parts.map(part=>{
   const roles=[]
   window.__ship.getObjectByName('Sunny_Kitchen_'+part)?.traverse(node=>{
    if(node.isMesh&&node.material.isMeshPhysicalMaterial)roles.push(node.material.userData.interiorSurface)
   })
   return [part,[...new Set(roles)]]
  }))
 })
 if(roomName==='Lower Rooms'&&meta.interiors.lookoutRoom){
  surfaceRoles=await page.evaluate(names=>Object.fromEntries(names.map(name=>{
   const mesh=window.__ship.getObjectByName(name)
   return [name,mesh?.material?.userData?.interiorSurface??null]
  })),Object.keys(lowerSurfaceRoles))
 }
} finally {await browser.close()}
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({roomName,url,shots,errors,consoleErrors,bathWater,surfaceRoles,
 assets:{'sunny.glb':sha(visual),'ship-metadata.json':sha(metaBytes)},note:'Actual renderer, inspection camera only. Keyboard routes are verified separately.'},null,2)+'\n')
assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[])
if(room.bathLayout)assert(bathWater,'The actual Bath material must use moving water')
if(room.galleyLayout)assert.deepEqual(surfaceRoles,{
 serving_island_marble:['marble'],serving_island_base:['grain'],sink_bowl:['steel'],fridge_body:['porcelain'],
})
if(roomName==='Lower Rooms'&&meta.interiors.lookoutRoom)assert.deepEqual(surfaceRoles,lowerSurfaceRoles)
console.log(`PASS ${roomName} actual renderer: ${shots.length} views`)
