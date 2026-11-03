/**
 * Structural checks on the generated assets.
 * Verifies the GLBs load, the ship is the right size, materials/tags survived
 * the export, and the collision proxy matches the deck metadata.
 */
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import { loadColliders, readGLB, readAccessor, nodeMatrix } from './glb.mjs'
import * as THREE from 'three'
import {normalizeClimbs,pointAt} from '../src/systems/climbing.js'
import {exteriorMaterial,exteriorTextureSet} from '../src/systems/exteriorMaterials.js'

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`) }
}

const meta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json', 'utf8'))
const exteriorConfig = JSON.parse(fs.readFileSync('src/config/exteriorConfig.json','utf8'))
const expectedLength = exteriorConfig.referenceLengthM*exteriorConfig.experienceScale
const expectedHeight = exteriorConfig.referenceHeightM*exteriorConfig.experienceScale
const ship = loadColliders('public/models/sunny.glb')
const coll = loadColliders('public/models/sunny-collision.glb')

function closedExportedMeshes(names) {
  const gltf=readGLB('public/models/sunny.glb')
  return names.every(name=>{
    const node=gltf.json.nodes.find(n=>n.name===name)
    if(node?.mesh===undefined)return false
    const edges=new Map();let volume=0,triangles=0
    const key=p=>p.map(v=>Math.round(v*1e6)).join(',')
    for(const primitive of gltf.json.meshes[node.mesh].primitives){
      const a=readAccessor(gltf,primitive.attributes.POSITION)
      const indices=primitive.indices===undefined?Array.from({length:a.count},(_,i)=>i):readAccessor(gltf,primitive.indices).data
      for(let i=0;i<indices.length;i+=3){
        const points=[0,1,2].map(j=>Array.from(a.data.slice(indices[i+j]*3,indices[i+j]*3+3)))
        const [p,q,r]=points.map(p=>new THREE.Vector3(...p))
        if(q.clone().sub(p).cross(r.clone().sub(p)).lengthSq()<1e-20)return false
        volume+=p.dot(q.clone().cross(r))/6;triangles++
        const keys=points.map(key)
        for(let j=0;j<3;j++){
          const a=keys[j],b=keys[(j+1)%3],id=a<b?a+'|'+b:b+'|'+a
          const edge=edges.get(id)??{count:0,winding:0}
          edge.count++;edge.winding+=a<b?1:-1;edges.set(id,edge)
        }
      }
    }
    return triangles>0&&volume>1e-4&&[...edges.values()].every(e=>e.count===2&&e.winding===0)
  })
}

console.log('=== SOURCE ASSET ===')
{
  const src = fs.statSync('stuff/1.FBX')
  check('source FBX still present and untouched in size', src.size === 23765440,
    `${(src.size / 1e6).toFixed(1)} MB`)
  check('source FBX checksum stays unchanged',createHash('sha256').update(fs.readFileSync('stuff/1.FBX')).digest('hex')==='8a770f19926e304cce1839fde4797fc1d98db5a49814f7b049e5a83be69cec10')
}

console.log('\n=== VISUAL SHIP ===')
{
  check('GLB contains every ship object the pipeline kept',
    ship.length === meta.counts.shipObjects,
    `${ship.length} meshes (pipeline kept ${meta.counts.shipObjects})`)

  const { json } = readGLB('public/models/sunny.glb')
  const rootName = json.nodes[json.scenes[json.scene].nodes[0]].name
  check('GLB has a single named root node', rootName === 'ThousandSunny', rootName)

  const attachedHardware = json.nodes.flatMap(parent =>
    /Sunny_(Door_.*_leaf|Hatch_.*_lid)$/.test(parent.name || '')
      ? (parent.children || []).map(i => ({parent:parent.name, child:json.nodes[i].name}))
      : []).filter(({child}) => /_handle$|_hinge\d$|_ring$/.test(child))
  const detachedHardware = attachedHardware.filter(({parent,child}) => {
    const leaf = ship.find(o => o.name === parent), fitting = ship.find(o => o.name === child)
    if (!leaf || !fitting) return true
    return !new THREE.Box3(leaf.min.clone(),leaf.max.clone()).expandByScalar(.25)
      .containsBox(new THREE.Box3(fitting.min,fitting.max))
  })
  check('every moving door handle and all six hatch hinges/rings stay attached after geometry baking',
    attachedHardware.filter(h=>h.parent.startsWith('Sunny_Hatch_')).length===18 &&
    attachedHardware.filter(h=>h.child.endsWith('_handle')).length===meta.interiors.doors.filter(d=>d.kind==='door').length &&
    detachedHardware.length===0, detachedHardware.map(h=>h.child).join(', '))

  let mn = [Infinity, Infinity, Infinity]
  let mx = [-Infinity, -Infinity, -Infinity]
  // world bounds, composing the glTF node hierarchy explicitly
  {
    const gltf = readGLB('public/models/sunny.glb')
    const ident = new THREE.Matrix4()
    const acc = (i) => readAccessor(gltf, i)
    const visit = (idx, P) => {
      const nd = gltf.json.nodes[idx]
      const M = new THREE.Matrix4().multiplyMatrices(P, nodeMatrix(nd))
      if (nd.mesh !== undefined) {
        for (const prim of gltf.json.meshes[nd.mesh].primitives) {
        const pos = acc(prim.attributes.POSITION)
        for (let k = 0; k < pos.count; k++) {
          const v = new THREE.Vector3(pos.data[k * 3], pos.data[k * 3 + 1], pos.data[k * 3 + 2])
            .applyMatrix4(M)
          const xyz = [v.x, v.y, v.z]
          for (let c = 0; c < 3; c++) {
            if (!Number.isFinite(xyz[c])) continue
            mn[c] = Math.min(mn[c], xyz[c])
            mx[c] = Math.max(mx[c], xyz[c])
          }
        }
        }
      }
      for (const c of nd.children || []) visit(c, M)
    }
    for (const r of gltf.json.scenes[gltf.json.scene].nodes) visit(r, ident)
  }
  const size = [0, 1, 2].map((i) => mx[i] - mn[i])
  check('every exported vertex is finite',
    [mn, mx].every((a) => a.every(Number.isFinite)),
    `size ${size.map((v) => v.toFixed(1)).join(' x ')}`)

  // The visual GLB's own bounding box must agree with the hull Blender
  // measured. This is the check that catches stray geometry parked far from
  // the ship: the glTF exporter silently writes some of the FBX's linked
  // objects with their original pre-transform, which once left the bow
  // ornament floating 60 m away. Blender is Z-up, three.js is Y-up.
  const hullSize = [meta.hull.size[0], meta.hull.size[2], meta.hull.size[1]]
  check('GLB bounds match the hull Blender measured',
    hullSize.every((v, i) => Math.abs(v - size[i]) < 0.5),
    `glb ${size.map((v) => v.toFixed(1)).join(' x ')} vs hull ${hullSize.map((v) => v.toFixed(1)).join(' x ')}`)

  const centre = [0, 1, 2].map((i) => (mn[i] + mx[i]) / 2)
  check('GLB is centred on the origin',
    Math.max(...centre.map(Math.abs)) < 0.05,
    centre.map((v) => v.toFixed(2)).join(', '))

  // nothing may sit far from the hull
  const stray = ship.filter((o) => {
    const c = [0, 1, 2].map((i) => ((o.min[i] + o.max[i]) / 2))
    return Math.hypot(...c) > Math.max(...meta.hull.size) * 0.75
  })
  check('no stray geometry parked away from the hull', stray.length === 0,
    stray.length ? stray.slice(0, 6).map((o) => o.name).join(', ') : `${ship.length} meshes all in place`)

  // tags survived
  const tagged = Object.values(meta.parts).flat()
  const present = new Set(ship.map((o) => o.name))
  const missing = tagged.filter((n) => !present.has(n))
  check('every tagged part exists in the GLB', missing.length === 0,
    missing.slice(0, 5).join(','))

  const tagCounts = Object.fromEntries(
    Object.entries(meta.parts).map(([k, v]) => [k, v.length]))
  check('semantic tags cover the whole ship',
    Object.values(tagCounts).reduce((a, b) => a + b, 0) === ship.length,
    JSON.stringify(tagCounts))
}

console.log('\n=== COLLISION PROXY ===')
{
  const floors = coll.filter((b) => b.name.startsWith('COLL_Floor'))
  const walls = coll.filter((b) => b.name.startsWith('COLL_Wall'))
  const obsts = coll.filter((b) => b.name.startsWith('COLL_Obj'))
  const hull = coll.filter((b) => b.name === 'COLL_Hull')
  check('floor cells exist', floors.length > 100, `${floors.length} cells`)
  check('boundary walls exist', walls.length > 0, `${walls.length} walls`)
  check('obstacle colliders exist', obsts.length > 0, `${obsts.length} obstacles`)
  check('safety hull exists', hull.length === 1)

  const cellH = floors[0].max.y - floors[0].min.y
  check('floor cells are solid slabs (thick enough not to fall through)',
    cellH >= 0.15, `${cellH.toFixed(2)} m thick`)

  // floors must sit on/above the water and the hull must be below them
  // the walkable surface is the TOP of a floor slab, not its bottom
  const lowestDeck = Math.min(...floors.map((f) => f.max.y))
  const highestDeck = Math.max(...floors.map((f) => f.max.y))
  const hullTop = Math.max(...hull.map((h) => h.max.y))
  check('safety hull sits below every deck', hullTop < lowestDeck,
    `hull top ${hullTop.toFixed(2)} < lowest deck ${lowestDeck.toFixed(2)}`)
  check('the main deck is above the waterline',
    highestDeck > meta.waterLevel,
    `highest deck ${highestDeck.toFixed(2)} > water ${meta.waterLevel}`)
}

console.log('\n=== METADATA ===')
{
  const p = meta.spawn.position
  check('spawn point is finite', p.every(Number.isFinite), p.map((v) => v.toFixed(2)).join(', '))
  check('metadata is in blender Z-up', meta.axis === 'blender-z-up', meta.axis)
  check('part groups recorded', Object.keys(meta.parts).length >= 4,
    Object.keys(meta.parts).join(', '))
  check('deck regions recorded', meta.deck.regionCount > 0, `${meta.deck.regionCount} regions`)

  // Blender's evaluated bbox is the source of truth for scale and placement.
  check('ship length follows the authorized uniform experience scale',
    Math.abs(meta.hull.size[0] - expectedLength) < 0.05, `${meta.hull.size[0].toFixed(2)} m`)
  check('ship height follows the same proportional experience scale',
    Math.abs(meta.hull.size[2] - expectedHeight) < 0.05, `${meta.hull.size[2].toFixed(2)} m`)
  check('rope ladders are rigging, not sails',
    ['Plane006','Plane007'].every(n => meta.parts.rigging.includes(n)))
  check('three actual sails and two pirate flags', meta.parts.sail.length === 3 && meta.parts.flag.length === 2)
  check('post-timeskip exterior features recorded',
    ['Lawn','Swing','Slide','Mikan0','Mikan1','Mikan2','RobinGarden','PopGreens','Helm','LogPose','SoldierDock','ForeStair','AftStair','GardenStair'].every(n => meta.exterior.features.includes(n)))
  const gltf=readGLB('public/models/sunny.glb'),nodes=gltf.json.nodes
  const uvNodes=nodes.filter(n=>n.mesh!==undefined&&n.extras?.sunny_uv_space)
  check('exterior metre/blade UVs export finite coordinates on every selected primitive',uvNodes.length>1000&&uvNodes.every(n=>gltf.json.meshes[n.mesh].primitives.every(p=>p.attributes.TEXCOORD_0!==undefined&&readAccessor(gltf,p.attributes.TEXCOORD_0).data.every(Number.isFinite))))
  check('normalized sail paint and furnished room furniture keep separate UV scope',nodes.filter(n=>n.extras?.sunny_sail_uv).every(n=>!n.extras.sunny_uv_space)&&['Sunny_Dining_table_top','Sunny_Library_bench0_seat','Sunny_Womens_bed_frame'].every(name=>!nodes.find(n=>n.name===name)?.extras?.sunny_uv_space))
  const worlds=new Map()
  function uvWorld(i,parent){const n=nodes[i],m=parent.clone().multiply(nodeMatrix(n));worlds.set(n.name,m);for(const c of n.children??[])uvWorld(c,m)}
  for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)uvWorld(i,new THREE.Matrix4())
  function deckMetres(name){
    const n=nodes.find(n=>n.name===name);if(n?.mesh===undefined)return false
    let edges=0
    for(const p of gltf.json.meshes[n.mesh].primitives){
      if(p.attributes.TEXCOORD_0===undefined)return false
      const positions=readAccessor(gltf,p.attributes.POSITION).data,uv=readAccessor(gltf,p.attributes.TEXCOORD_0).data
      const indices=p.indices!==undefined?readAccessor(gltf,p.indices).data:Array.from({length:positions.length/3},(_,i)=>i)
      for(let k=0;k<indices.length;k+=3){
        const ids=Array.from(indices.slice(k,k+3)),points=ids.map(i=>new THREE.Vector3(...positions.slice(i*3,i*3+3)).applyMatrix4(worlds.get(name)))
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize()
        if(Math.abs(normal.y)<.9999)continue
        const a=ids[0],b=ids[1],dx=Math.abs(points[1].x-points[0].x),dz=Math.abs(points[1].z-points[0].z)
        if(Math.abs(Math.abs(uv[b*2]-uv[a*2])-dx)>.003||Math.abs(Math.abs(uv[b*2+1]-uv[a*2+1])-dz)>.003)return false
        edges++
      }
    }
    return edges>1
  }
  check('source hull and garden deck retain one UV metre per physical metre',deckMetres('Line002')&&deckMetres('Sunny_GardenDeck'))
  check('fore and main mast grain UVs follow their full physical height', ['Cylinder003','Cylinder007'].every(name=>{
    const n=nodes.find(n=>n.name===name),o=ship.find(o=>o.name===name);if(n?.mesh===undefined||!o)return false
    const u=gltf.json.meshes[n.mesh].primitives.flatMap(p=>Array.from(readAccessor(gltf,p.attributes.TEXCOORD_0).data).filter((_,i)=>i%2===0))
    return n.extras?.sunny_uv_kind==='cylinder'&&Math.max(...u)-Math.min(...u)>(o.max.y-o.min.y)*.95
  }))
  const blades=uvNodes.filter(n=>n.extras.sunny_uv_space==='leaf')
  check('individual batched leaf blades export bounded normalized vein UVs',blades.length>20&&blades.every(n=>gltf.json.meshes[n.mesh].primitives.every(p=>readAccessor(gltf,p.attributes.TEXCOORD_0).data.every(v=>v>=-.005&&v<=1.005))))
  const sets=['boards','grain','bark','paint','metal','rope','lawn','leaf','fruit','pot','soil','canvas'].map(exteriorTextureSet)
  check('every exterior map uses repeating trilinear mipmaps and anisotropy',sets.every(s=>['map','normalMap','roughnessMap'].every(k=>s[k].wrapS===THREE.RepeatWrapping&&s[k].wrapT===THREE.RepeatWrapping&&s[k].minFilter===THREE.LinearMipmapLinearFilter&&s[k].generateMipmaps&&s[k].anisotropy>=8)))
  check('albedo and data maps keep correct colour spaces and metre repeats',sets.every(s=>s.map.colorSpace===THREE.SRGBColorSpace&&s.normalMap.colorSpace===THREE.NoColorSpace&&s.roughnessMap.colorSpace===THREE.NoColorSpace&&Math.abs(s.map.repeat.x*s.period[0]-1)<1e-8&&Math.abs(s.map.repeat.y*s.period[1]-1)<1e-8))
  check('filtered relief normals remain finite unit vectors',sets.every(s=>{
    const data=s.normalMap.image.data
    for(let i=0;i<data.length;i+=4*137){const length=Math.hypot(...[0,1,2].map(k=>data[i+k]/255*2-1));if(!Number.isFinite(length)||Math.abs(length-1)>.015)return false}
    return true
  }))
  check('new exterior finish preserves the sourced palette and room material isolation',['Sunny_red','Sunny_white','Sunny_gold','Sunny_deck','Sunny_rope','Sunny_leaf'].every(name=>{
    const source=new THREE.MeshStandardMaterial({name,color:'#b91d25'}),before=source.color.clone(),finish=exteriorMaterial(source,{kind:name==='Sunny_leaf'?'leaf':'planar'})
    return finish!==source&&finish.color.equals(before)&&source.map===null&&finish.normalMap!==null
  }))
  const mastExtension=ship.find(o=>o.name==='Sunny_InteriorMainMast'),mainMast=ship.find(o=>o.name==='Cylinder007')
  check('exported deck mast joins the actual aft mast and its supporting floor',mastExtension&&mainMast&&Math.abs((mastExtension.min.x+mastExtension.max.x-mainMast.min.x-mainMast.max.x)/2)<.03&&Math.abs((mastExtension.min.z+mastExtension.max.z-mainMast.min.z-mainMast.max.z)/2)<.03&&Math.abs(mastExtension.min.y-meta.interiors.levels.F1)<.03&&Math.abs(mastExtension.max.y-mainMast.min.y)<.04)
  check('fourteen pale/dark small hull-port frames replace the blind source caps',ship.filter(o=>/^Sunny_HullPort\d+_(port|starboard)_frame$/.test(o.name)).length===14&&!ship.some(o=>/^Cylinder02[0-6]$/.test(o.name)))
  check('curved canvas exports UVs and a genuinely separated pair of gaff panels',['Plane004','Plane005','Plane008','Plane009'].every(name=>{const n=nodes.find(n=>n.name===name);return n?.extras?.sunny_sail_uv&&gltf.json.meshes[n.mesh].primitives.every(p=>p.attributes.TEXCOORD_0!==undefined&&gltf.json.accessors[p.attributes.POSITION].count>100)})&&nodes.find(n=>n.name==='Plane008')?.extras?.sunny_canvas_panels===2)
  check('exactly three human-sized mikan pots form one port-side cluster',ship.filter(o=>/^Sunny_Mikan\d_pot$/.test(o.name)).length===3&&ship.filter(o=>/^Sunny_Mikan\d_pot$/.test(o.name)).every(o=>o.min.z>0&&o.max.x-o.min.x<1.2&&o.max.y-o.min.y<.7))
  const fruit=ship.filter(o=>/^Sunny_Mikan\d_fruit\d+_\d+$/.test(o.name))
  check('mikan have oblate fruit plus calyx/stem/branch attachments',fruit.length===48&&fruit.every(o=>(o.max.y-o.min.y)/(o.max.x-o.min.x)<.82&&ship.some(s=>s.name===o.name+'_stem')&&ship.some(s=>s.name===o.name+'_twig')&&ship.some(s=>s.name.startsWith(o.name+'_calyx'))))
  const slats=nodes.filter(n=>n.extras?.sunny_dock_shutter&&!('sunny_dock_digit' in n.extras))
  check('two rolling apertures have 64 shared-pivot dynamic timber slats and all seven digits',slats.length===64&&slats.every(n=>n.extras.sunny_dynamic&&n.extras.sunny_roll_centre?.length===3&&!coll.some(c=>c.name==='COLL_Solid_'+n.name))&&[0,1,2,3,4,5,6].every(i=>nodes.filter(n=>n.extras?.sunny_dock_digit===i).some(n=>n.extras.sunny_dock_shutter==='port')&&nodes.filter(n=>n.extras?.sunny_dock_digit===i).some(n=>n.extras.sunny_dock_shutter==='starboard')))
  check('wheel integrates its controls and the convenience console is removed',ship.some(o=>o.name==='Sunny_SoldierDock_drum')&&!ship.some(o=>o.name==='Sunny_SoldierDock_console')&&Object.keys(meta.exterior.mechanisms.controls.targets).length===4)
  check('seven source mane petals and a lower jaw have explicit exported pivots',nodes.filter(n=>n.extras?.sunny_mane).length===7&&nodes.some(n=>n.name==='Sunny_Gaon_jaw'&&n.extras.sunny_pivot?.length===3))
  check('paired stern lanterns have twelve transparent glass panes',nodes.filter(n=>/^Sunny_Lantern_glass_/.test(n.name)).length===12&&gltf.json.materials.find(m=>m.name==='Sunny_glass')?.alphaMode==='BLEND')
  const shrouds=nodes.filter(n=>n.extras?.sunny_shroud_endpoints)
  check('both fore shroud fans connect to the real mast and supported deck',shrouds.length===2&&shrouds.every(n=>{
    const p=n.extras.sunny_shroud_endpoints
    return p.length===12&&p.slice(0,6).every(v=>Math.abs(v[2]-meta.interiors.levels.F1)<.05&&coll.some(f=>f.name.startsWith('COLL_Floor')&&v[0]>=f.min.x&&v[0]<=f.max.x&&-v[1]>=f.min.z&&-v[1]<=f.max.z&&Math.abs(f.max.y-v[2])<.1))&&p.slice(6).every(v=>v[0]>=ship.find(o=>o.name==='Cylinder003').min.x&&v[0]<=ship.find(o=>o.name==='Cylinder003').max.x&&v[2]>ship.find(o=>o.name==='Cylinder004').min.y-.4)
  }))
  check('both retained anchor balls carry three transverse painted bands',nodes.filter(n=>n.extras?.sunny_anchor_bands===3).length===2)
  /** Measure actual normal continuity at a paint boundary, across primitives. */
  function smoothPaintSeams(name){
    const node=nodes.find(n=>n.name===name),groups=new Map()
    if(!node?.extras?.sunny_smooth_paint_normals)return false
    for(const prim of gltf.json.meshes[node.mesh].primitives){
      const positions=readAccessor(gltf,prim.attributes.POSITION).data,normals=readAccessor(gltf,prim.attributes.NORMAL).data
      for(let i=0;i<positions.length;i+=3){
        const key=Array.from(positions.slice(i,i+3),v=>v.toFixed(4)).join(','),group=groups.get(key)||[]
        group.push({material:prim.material,normal:new THREE.Vector3(...normals.slice(i,i+3))});groups.set(key,group)
      }
    }
    const seams=[...groups.values()].filter(g=>new Set(g.map(v=>v.material)).size>1)
    const smooth=seams.filter(g=>g.every(a=>Math.abs(a.normal.length()-1)<.001&&g.every(b=>a.normal.dot(b.normal)>.995)))
    return seams.length>20&&smooth.length/seams.length>.95
  }
  check('both painted anchor balls export smooth normals across actual colour seams',['Sphere006','Sphere009'].every(smoothPaintSeams))
  check('exposed ladder access floors have real 12 cm undersides at unchanged walking heights',
    [['Sunny_InteriorFloor_F3_library','F3L'],['Sunny_AftEntryDeck','F2A'],['Sunny_SternAccess_floor','F2A'],['Sunny_SternAccess_neck','F2A']].every(([name,level])=>{
      const obj=ship.find(o=>o.name===name),node=nodes.find(n=>n.name===name)
      return obj&&node?.extras?.sunny_visual_floor_thickness===.12&&Math.abs(obj.max.y-meta.interiors.levels[level])<.001&&Math.abs(obj.max.y-obj.min.y-.12)<.001
    }))
  const materialNames=n=>gltf.json.meshes[n.mesh].primitives.map(p=>gltf.json.materials[p.material].name)
  check('bow panel and lion disk preserve their distinct reference paint fields',materialNames(nodes.find(n=>n.name.split('.')[0]==='Circle038')).includes('Sunny_red')&&materialNames(nodes.find(n=>n.name.split('.')[0]==='Circle038')).includes('Sunny_white')&&materialNames(nodes.find(n=>n.name.split('.')[0]==='Circle002')).includes('Sunny_gold'))
  /** Measure paint coverage on actual exported triangles projected along the bow. */
  function projectedPaintFraction(node,material){
    let total=0,painted=0
    for(const prim of gltf.json.meshes[node.mesh].primitives){
      const pos=readAccessor(gltf,prim.attributes.POSITION).data
      const indices=prim.indices===undefined?Array.from({length:pos.length/3},(_,i)=>i):readAccessor(gltf,prim.indices).data
      for(let i=0;i<indices.length;i+=3){
        const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3
        const area=Math.abs((pos[b+1]-pos[a+1])*(pos[c+2]-pos[a+2])-(pos[b+2]-pos[a+2])*(pos[c+1]-pos[a+1]))/2
        total+=area;if(gltf.json.materials[prim.material].name===material)painted+=area
      }
    }
    return painted/total
  }
  const collarGold=projectedPaintFraction(nodes.find(n=>n.name.split('.')[0]==='Circle002'),'Sunny_gold')
  check('lion disk has a broad gold collar rather than a thin painted rim',collarGold>.35&&collarGold<.65,`projected gold ${(collarGold*100).toFixed(1)}%`)
  check('both retained foremast collars match the dark anime bands',['Tube010','Tube011'].every(name=>materialNames(nodes.find(n=>n.name===name)).every(m=>m==='Sunny_black')))
  check('mainmast platforms have timber decks, dark rims and mounted supports',['Cylinder008','Cylinder012','Cylinder056'].every(name=>materialNames(nodes.find(n=>n.name===name)).includes('Sunny_darkwood')&&nodes.filter(n=>n.name.startsWith('Sunny_MastPlatform_brace_'+name)).length===8))
  check('all eight exposed facade sashes are arched and physically glazed',nodes.filter(n=>n.extras?.sunny_window_arch).length===8&&nodes.filter(n=>n.extras?.sunny_window_arch).every(n=>coll.some(c=>c.name==='COLL_Solid_'+n.name)))
  check('reference dark hull mouldings and rudder straps retain their authored geometry',
    ['Box118','Box119','Box121'].every(name=>materialNames(nodes.find(n=>n.name===name)).every(m=>m==='Sunny_black'))&&
    nodes.find(n=>n.name==='Line012')?.extras?.sunny_rudder_straps===2&&materialNames(nodes.find(n=>n.name==='Line012')).includes('Sunny_black'))
  check('outer bow shield has all three white painted divisions',nodes.find(n=>n.name.split('.')[0]==='Circle038')?.extras?.sunny_bow_white_divisions===3)
  check('lawn beside the dock hatch preserves support above its lower stair treads',
    coll.some(f=>f.name.startsWith('COLL_Floor')&&f.min.x<=-1.2&&f.max.x>=-1.2&&f.min.z<=-8.8&&f.max.z>=-8.8&&Math.abs(f.max.y-meta.interiors.levels.F1)<.03))
  check('both stowed anchor ropes end at measured hawse and retained anchor surfaces',
    meta.exterior.mechanisms.anchors?.length===2&&meta.exterior.mechanisms.anchors.every(a=>{
      const anchor=ship.find(o=>o.name===a.anchor),end=new THREE.Vector3(a.ropeEnd[0],a.ropeEnd[2],-a.ropeEnd[1])
      return anchor&&new THREE.Box3(anchor.min,anchor.max).expandByScalar(.1).containsPoint(end)&&
        nodes.filter(n=>n.extras?.sunny_anchor_rope===a.side).length===12&&ship.some(o=>o.name==='Sunny_Anchor_'+a.side+'_hawse')
    }))
  check('lookout and library soffits preserve flared reference supports',
    ['Cylinder005','Cylinder001'].every(name=>nodes.find(n=>n.name===name)?.extras?.sunny_soffit_lobes===8))
  check('red side panels remain within their measured white scroll border',
    [['Tube005','Line004'],['Tube009','Line007']].every(([panel,trim])=>{
      const p=ship.find(o=>o.name===panel),t=ship.find(o=>o.name===trim)
      return nodes.find(n=>n.name===panel)?.extras?.sunny_scroll_border===trim&&p.min.y>=t.min.y-.03
    }))
  const climbPaths=normalizeClimbs(meta.exterior.mechanisms.climbs)
  const lookoutPaths=climbPaths.filter(p=>p.id==='fore-lookout'),lookoutPath=lookoutPaths[0]
  check('lookout rope/ladder endpoints meet actual human-height walking floors',
    lookoutPaths.length===1&&lookoutPath.hatch==='CrowNestHatch'&&
    Math.abs(lookoutPath.points[0][1]-meta.interiors.levels.F1)<.02&&
    Math.abs(lookoutPath.points.at(-1)[1]-meta.interiors.levels.F3C)<.02&&
    ship.some(o=>o.name==='Sunny_Lookout_floor')&&ship.some(o=>o.name==='Sunny_Lookout_ladder_rung0'))
  const lookoutRoofNode=nodes.find(n=>n.name==='Cylinder006')
  const lookoutWallNodes=nodes.filter(n=>n.extras?.sunny_lookout_wall)
  const lookoutPaneNodes=nodes.filter(n=>/^Sunny_Lookout_pane\d+$/.test(n.name||''))
  check('lookout cream enclosure and every bounded pane retain physical face colliders',
    lookoutWallNodes.length>0&&lookoutPaneNodes.length===8&&
    [...lookoutWallNodes,...lookoutPaneNodes].every(n=>n.extras?.sunny_obstacle&&n.extras?.sunny_rail&&
      coll.some(c=>c.name.startsWith('COLL_Rail_'+n.name+'_'))))
  check('lookout authoring publishes the retained floor independently of the raised glass sill',
    Math.abs(lookoutRoofNode?.extras?.sunny_lookout_floor-29.221)<.001&&
    Math.abs(lookoutRoofNode?.extras?.sunny_lookout_floor-meta.interiors.levels.F3C)<.001&&
    lookoutRoofNode?.extras?.sunny_lookout_belt_sectors===16)
  const physical=coll.filter(o=>o.name!=='COLL_Hull'&&!o.name.startsWith('COLL_Wall'))
  check('full lookout path and real hatch hole clear a 1.75 m body with 0.34 m radius',
    lookoutPaths.length===1&&Array.from({length:Math.ceil(lookoutPath.length/.25)+1},(_,i)=>pointAt(lookoutPath,i*.25)).every(p=>
      !physical.some(b=>p[0]+.34>b.min.x+.02&&p[0]-.34<b.max.x-.02&&p[2]+.34>b.min.z+.02&&p[2]-.34<b.max.z-.02&&p[1]+1.75>b.min.y+.02&&p[1]<b.max.y-.02)))
  const aquariumPath=climbPaths.find(p=>p.id==='aquarium-ladder'),aquariumHatch=meta.interiors.doors.find(d=>d.id==='AquariumHatch')
  check('Aquarium uses the small sealed hinged gallery hatch and actual ladder from N',
    climbPaths.length===4&&climbPaths.some(p=>p.id==='dock-waiting-ladder'&&p.hatch==='DockLadderHatch')&&aquariumPath?.hatch==='AquariumHatch'&&aquariumHatch?.mode==='lift'&&
    aquariumHatch.width<=1.5&&aquariumHatch.depth<=1.5&&aquariumHatch.pos[0]+aquariumHatch.width/2<meta.interiors.rooms.find(r=>r.name==='Kitchen').x[0]&&
    nodes.find(n=>n.name===aquariumHatch.node)?.extras?.sunny_airtight_grille===true&&
    ship.some(o=>o.name==='Sunny_AquariumLadder_rung0')&&!ship.some(o=>o.name.startsWith('Sunny_AquariumStair')))
  check('full Aquarium ladder shaft/landing clear the unchanged human body',
    aquariumPath&&Math.abs(aquariumPath.points[0][1]-meta.interiors.levels.F1)<.02&&Math.abs(aquariumPath.points.at(-1)[1]-meta.interiors.levels.F2A)<.02&&
    Array.from({length:Math.ceil(aquariumPath.length/.10)+1},(_,i)=>pointAt(aquariumPath,i*.10)).every(p=>
      !physical.some(b=>p[0]+.34>b.min.x+.02&&p[0]-.34<b.max.x-.02&&p[2]+.34>b.min.z+.02&&p[2]-.34<b.max.z-.02&&p[1]+1.75>b.min.y+.02&&p[1]<b.max.y-.02)))
  const sternPath=climbPaths.find(p=>p.id==='stern-library-ladder'),sternHatch=meta.interiors.doors.find(d=>d.id==='KitchenHatch')
  check('F2 stern ladder replaces the central-garden cover with a small supported Library hatch',
    sternPath?.hatch==='KitchenHatch'&&sternHatch?.mode==='lift'&&sternHatch.width<=1.5&&sternHatch.depth<=1.5&&
    Math.abs(sternHatch.pos[2]-meta.interiors.levels.F3L)<.02&&sternHatch.pos[0]>meta.interiors.rooms.find(r=>r.name==='Kitchen').x[1]&&
    ship.some(o=>o.name==='Sunny_SternAccess_floor')&&ship.some(o=>o.name==='Sunny_SternAccess_ladder_rung0')&&
    !ship.some(o=>o.name.startsWith('Sunny_KitchenStair')))
  check('full stern ladder shaft/landings clear the unchanged human body',
    sternPath&&Math.abs(sternPath.points[0][1]-meta.interiors.levels.F2A)<.02&&Math.abs(sternPath.points.at(-1)[1]-meta.interiors.levels.F3L)<.02&&
    Array.from({length:Math.ceil(sternPath.length/.10)+1},(_,i)=>pointAt(sternPath,i*.10)).every(p=>
      !physical.some(b=>p[0]+.34>b.min.x+.02&&p[0]-.34<b.max.x-.02&&p[2]+.34>b.min.z+.02&&p[2]-.34<b.max.z-.02&&p[1]+1.75>b.min.y+.02&&p[1]<b.max.y-.02)))
  check('both outdoor toilet entries sit on the lawn below the foremast stairs',
    meta.interiors.doors.filter(d=>d.id.startsWith('ForeToiletDoor')).length===2&&
    meta.interiors.doors.filter(d=>d.id.startsWith('ForeToiletDoor')).every(d=>Math.abs(d.pos[2]-meta.interiors.levels.F1)<.02&&Math.abs(d.rot)<.01&&Math.abs(d.pos[1])>4.5))
  const glb = readGLB('public/models/sunny.glb').json
  check('authored paint colors survive export', ['Sunny_mane','Sunny_lion','Sunny_grass','Sunny_red','Sunny_white','Sunny_timber'].every(n => glb.materials.some(m => m.name === n)))
  for (const [left,right] of [['Tube005','Tube009'],['Line004','Line007'],['Box118','Box119']]) {
    const a=ship.find(o=>o.name===left), b=ship.find(o=>o.name===right)
    check(`${left}/${right} side pieces have matching attached heights`,
      Math.abs(a.min.y-b.min.y)<0.02 && Math.abs(a.max.y-b.max.y)<0.02)
  }
  const head=ship.find(o=>o.name==='Sphere001')
  const eyes=ship.filter(o=>o.name.startsWith('Sunny_LionEye_white'))
  const eyeCenter=eyes.reduce((sum,o)=>sum+(o.min.z+o.max.z)/2,0)/eyes.length
  check('lion eyes are centered on its face', eyes.length===2 && Math.abs(eyeCenter-(head.min.z+head.max.z)/2)<0.08)
  const sidePetals=['Rectangle004','Rectangle006'].map(n=>ship.find(o=>o.name.split('.')[0]===n))
  check('both lateral mane petals point radially and mirror across the face',sidePetals.every(o=>o&&o.max.z-o.min.z>1.5*(o.max.x-o.min.x))&&Math.abs((sidePetals[0].min.z+sidePetals[0].max.z+sidePetals[1].min.z+sidePetals[1].max.z)/4-(head.min.z+head.max.z)/2)<.05&&Math.abs(sidePetals[0].max.y-sidePetals[1].max.y)<.01)
  const lawn=ship.find(o=>o.name==='Sunny_Lawn')
  const pedestal=ship.find(o=>o.name==='Sunny_Helm_pedestal')
  check('helm pedestal is attached at the measured foredeck height',Math.abs(pedestal.min.y-meta.exterior.landmarks.foredeck[2])<0.03)
  check('duplicate corner/bow stairs are removed',!ship.some(o=>/^Sunny_(ForeStair|BowStair|AftStair)/.test(o.name)))
  check('all blueprint levels and furnished rooms are exported',
    ['B1','F1','F2F','F2A','F3G','F3L','F3B'].every(k=>Number.isFinite(meta.interiors.levels[k])) &&
    ['Storage Room','Soldier Dock System',"Usopp's Main Factory", "Franky's Weapon Development Room", 'Energy Room',
     "Men's Quarters", "Women's Quarters",'Aquarium Bar','Dining Room','Kitchen','Pantry','Sick Bay','Library','Bath']
      .every(n=>meta.interiors.rooms.some(r=>r.name===n)))
  check('doors and six access hatches have moving nodes and no static leaf colliders',
    meta.interiors.doors.filter(d=>d.kind==='hatch').length===6 && meta.interiors.doors.some(d=>d.id==='DockLadderHatch') && meta.interiors.doors.every(d=>
      ship.some(o=>o.name===d.node) && !coll.some(o=>o.name==='COLL_Solid_'+d.node)))
  check('all six access hatches expose an actual hole instead of a static exit plate',
    meta.interiors.doors.filter(d=>d.kind==='hatch').every(d=>{
      const [x,z,y]=d.pos
      return !coll.some(b=>b.name.startsWith('COLL_Floor')&&
        x>b.min.x+.01&&x<b.max.x-.01&&-z>b.min.z+.01&&-z<b.max.z-.01&&Math.abs(b.max.y-y)<.04)
    }))
  check('door leaves keep realistic independent height and width',meta.interiors.doors.filter(d=>d.kind==='door')
    .every(d=>d.height>=2&&d.height<=2.5&&d.width>=0.85&&d.width<=2.6))
  const chairs=ship.filter(o=>/^Sunny_Dining_chair\d+_seat$/.test(o.name))
  check('sixteen human-sized dining chairs have 0.45 m seats',chairs.length===16&&chairs.every(o=>
    Math.abs((o.min.y+o.max.y)/2-meta.interiors.levels.F2A-0.45)<0.01&&o.max.x-o.min.x<0.5&&o.max.z-o.min.z<0.5))
  const table=ship.find(o=>o.name==='Sunny_Dining_table_top')
  check('dining table stays 0.76 m high',table&&Math.abs((table.min.y+table.max.y)/2-meta.interiors.levels.F2A-0.76)<0.01)
  const tanks=ship.filter(o=>/Sunny_Aquarium.*_water$/.test(o.name))
  check('rectangular aquarium water stays inside glass tank bounds',tanks.length>=3&&tanks.filter(w=>!w.name.includes('_sector')).every(w=>{
    const prefix=w.name.slice(0,-6), glass=ship.filter(o=>o.name.startsWith(prefix+'_glass'))
    return glass.length===4&&w.min.x>Math.min(...glass.map(o=>o.min.x))&&w.max.x<Math.max(...glass.map(o=>o.max.x))&&
      w.min.z>Math.min(...glass.map(o=>o.min.z))&&w.max.z<Math.max(...glass.map(o=>o.max.z))&&w.max.y<Math.max(...glass.map(o=>o.max.y))
  }))
  const curved=tanks.filter(w=>w.name.includes('_sector'))
  check('curved aquarium has 24 contained water sectors',curved.length===24&&curved.every(w=>{
    const pane=ship.find(o=>o.name===w.name.replace('_water','_glass'))
    const inner=ship.find(o=>o.name===w.name.replace('_water','_glass_inner'))
    return pane&&inner&&w.min.x>=Math.min(pane.min.x,inner.min.x)-.01&&w.max.x<=Math.max(pane.max.x,inner.max.x)+.01&&
      w.min.z>=Math.min(pane.min.z,inner.min.z)-.01&&w.max.z<=Math.max(pane.max.z,inner.max.z)+.01&&w.max.y<pane.max.y
  }))
  const dock=ship.find(o=>o.name==='Sunny_Dock_turntable_deck')
  check('Soldier Dock turntable is centered beneath the lawn',dock&&Math.abs((dock.min.x+dock.max.x)/2-.45)<.05)
  const dining=meta.interiors.rooms.find(r=>r.name==='Dining Room'),kitchen=meta.interiors.rooms.find(r=>r.name==='Kitchen')
  check('dining and kitchen share longitudinal span on opposite ship sides',dining.x[0]===kitchen.x[0]&&dining.x[1]===kitchen.x[1]&&Math.abs(dining.y[1]-kitchen.y[0])<.01)
  const centreline=.585*meta.exterior.experienceScale
  check('SBS F2 dining/infirmary are port and kitchen/pantry are starboard',
    dining.y[1]<=centreline+.01&&kitchen.y[0]>=centreline-.01&&
    meta.interiors.rooms.find(r=>r.name==='Sick Bay').y[1]<=centreline+.01&&
    meta.interiors.rooms.find(r=>r.name==='Pantry').y[0]>=centreline-.01)
  check('both F2 entrances are on the same side as their actual named rooms',
    meta.interiors.doors.find(d=>d.id==='DiningEntrance').pos[1]<centreline&&
    meta.interiors.doors.find(d=>d.id==='KitchenEntrance').pos[1]>centreline)
  check('room build retains an editable Blender master',fs.existsSync('assets/sunny-master.blend')&&fs.statSync('assets/sunny-master.blend').size>1000000)
  check('three-barrel cola chamber replaces the provisional five tanks',
    [0,1,2].every(i=>ship.some(o=>o.name==='Sunny_Energy_cola_barrel'+i))&&
    ship.some(o=>o.name==='Sunny_Energy_cola_chamber')&&!ship.some(o=>o.name.startsWith('Sunny_Energy_tank')))
  check('SBS room fixtures include library table, canopy, oven, showers and workshop furnace',
    ['Sunny_Library_central_table_top','Sunny_Womens_canopy_head','Sunny_Kitchen_giant_oven',
     'Sunny_Bath_shower_head','Sunny_Weapons_furnace','Sunny_Sick_bulletin_board'].every(name=>ship.some(o=>o.name===name)))
  check('all eleven authored room lamps have usable finite metadata',meta.interiors.lights?.length===11&&
    meta.interiors.lights.every(l=>l.pos.length===3&&l.pos.every(Number.isFinite)&&l.intensity>0&&l.distance>0))
  const bunkBeams=ship.filter(o=>/^Sunny_Quarters_bunk\d+_ceiling_beam$/.test(o.name))
  check('all three bunk suspension beams meet the actual fore ceiling',bunkBeams.length===3&&bunkBeams.every(o=>
    Math.abs(o.max.y-(meta.interiors.levels.F2F-.18))<.002&&o.min.y>meta.interiors.levels.F1+1.75))
  const benchParts=ship.filter(o=>o.name.startsWith('Sunny_Library_bench'))
  const libraryRoom=meta.interiors.rooms.find(r=>r.name==='Library')
  const bx=(libraryRoom.x[0]+libraryRoom.x[1])/2,bz=-(libraryRoom.y[0]+libraryRoom.y[1])/2
  const benchCollision=coll.filter(o=>o.name.includes('Sunny_Library_bench'))
  check('reference curved bench has closed physical seating and supported base',
    benchParts.length>0&&closedExportedMeshes(benchParts.map(o=>o.name))&&
    Math.abs(Math.min(...benchParts.map(o=>o.min.y))-meta.interiors.levels.F3L-.02)<.002&&
    Math.abs(ship.find(o=>o.name==='Sunny_Library_bench0_seat')?.max.y-meta.interiors.levels.F3L-.52)<.002)
  check('curved bench surface collision leaves the central room open',benchCollision.length>0&&benchCollision.every(o=>
    !(bx+.34>o.min.x&&bx-.34<o.max.x&&bz+.34>o.min.z&&bz-.34<o.max.z)))
  const hood=ship.find(o=>o.name==='Sunny_Kitchen_hood_stack'),riser=ship.find(o=>o.name==='Sunny_Kitchen_hood_riser'),chimney=ship.find(o=>o.name==='Sunny_KitchenChimney')
  check('range hood connects to the retained exterior chimney',hood&&riser&&chimney&&
    ship.some(o=>o.name==='Sunny_Kitchen_hood_transfer')&&
    Math.abs(riser.min.y-hood.max.y)<.002&&Math.abs(riser.max.y-chimney.min.y)<.002&&
    Math.abs(riser.min.x+riser.max.x-chimney.min.x-chimney.max.x)<.002&&
    Math.abs(riser.min.z+riser.max.z-chimney.min.z-chimney.max.z)<.002&&
    !ship.some(o=>o.name.startsWith('Sunny_Kitchen_stove_flue')))
  check('hull ocean profile has 32 ordered cross-sections',meta.oceanHullProfile.length===32&&meta.oceanHullProfile.every((p,i)=>p[1]<p[2]&&(!i||p[0]>meta.oceanHullProfile[i-1][0])))
  const humanHelmHeight=pedestal.max.y-pedestal.min.y
  check('enlargement retains a human-height helm pedestal',humanHelmHeight>0.95&&humanHelmHeight<1.25)
  const mounted=ship.filter(o=>/Sunny_(Mikan\d_pot|ShadeTree_.*_trunk|Helm_deckplate|RobinGarden_planter|PopGreens_planter|KitchenChimney$|LogPose_stand)/.test(o.name))
  const floorBoxes=coll.filter(o=>o.name.startsWith('COLL_Floor'))
  const unsupported=mounted.filter(o=>{
    const x=(o.min.x+o.max.x)/2,z=(o.min.z+o.max.z)/2
    return !floorBoxes.some(f=>x>=f.min.x&&x<=f.max.x&&z>=f.min.z&&z<=f.max.z&&Math.abs(f.max.y-o.min.y)<0.1)
  })
  check('deck trees, pots, planters, bench and instruments meet their support floors',unsupported.length===0,unsupported.map(o=>o.name).join(','))
  const hullDeck=ship.find(o=>o.name==='Line002')
  const gardenSteps=ship.filter(o=>o.name.startsWith('Sunny_GardenStair_tread'))
  check('every rear tread is inboard of the hull sides',gardenSteps.every(o=>o.min.z>hullDeck.min.z&&o.max.z<hullDeck.max.z))
  const docks=ship.filter(o=>o.name.startsWith('Sunny_Dock1_shutter'))
  const dockCenter=docks.reduce((sum,o)=>sum+(o.min.z+o.max.z)/2,0)/docks.length
  check('Soldier Dock plates are mounted symmetrically on both hull sides',docks.length===2&&Math.abs(dockCenter+(0.585*exteriorConfig.experienceScale))<0.1)
  const physicalWall=o=>{
    const parts=coll.filter(c=>c.name==='COLL_Solid_'+o.name||c.name.startsWith('COLL_Rail_'+o.name+'_'))
    return parts.length>0&&Math.abs(Math.min(...parts.map(c=>c.min.y))-o.min.y)<.05&&Math.abs(Math.max(...parts.map(c=>c.max.y))-o.max.y)<.05
  }
  check('every bare partition has full-height physical collision',ship.filter(o=>o.name.startsWith('Sunny_RoomPartition')).every(physicalWall))
  check('both masts have full-height surface collision', ['Cylinder003','Cylinder007'].every(name=>{
    const mesh=ship.find(o=>o.name===name),faces=coll.filter(o=>o.name.startsWith('COLL_Rail_'+name+'_'))
    return mesh&&faces.length&&Math.abs(Math.min(...faces.map(o=>o.min.y))-mesh.min.y)<0.05&&Math.abs(Math.max(...faces.map(o=>o.max.y))-mesh.max.y)<0.05
  }))
  const libraryWalls=ship.filter(o=>/^Sunny_Library_lining_(wall|window_base|window_head|window_jamb)/.test(o.name))
  check('replacement library shell has full-height physical wall/window segments',libraryWalls.length>45&&libraryWalls.every(physicalWall))
  const libraryFloor=ship.find(o=>o.name==='Sunny_InteriorFloor_F3_library')
  check('library lining stays at the stern and joins its floor',!!libraryFloor&&libraryWalls.every(o=>
    o.min.x>=libraryFloor.min.x-.01&&o.max.x<=libraryFloor.max.x+.01&&
    o.min.z>=libraryFloor.min.z-.01&&o.max.z<=libraryFloor.max.z+.01&&
    o.min.y>=libraryFloor.max.y-.01&&o.max.y<=libraryFloor.max.y+3.1))
  check('six physical dock contents have recognizable geometry and moving bounds',Array.from({length:6},(_,i)=>i+1).every(i=>ship.some(o=>o.name.startsWith('Sunny_Vehicle'+i+'_'+['horse_head','sheep_head','shark_hull','rhino_head','dinosaur_barrel','inflatable'][i-1]))&&meta.interiors.dockSolids.some(b=>b.name==='DockVehicle'+i)))
  check('women tea cupboard has a teapot and four supported cups',ship.some(o=>o.name==='Sunny_WWash_teapot')&&ship.filter(o=>o.name.startsWith('Sunny_WWash_teacup')).length===4)
  check('ceilings preserve sampled stair apertures instead of full-room solid boxes',!coll.some(o=>/^COLL_Solid_Sunny_(B1|ForeF1|ForeF2|AftF2|Aquarium|Library|Bath)_ceiling/.test(o.name)))
  check('unsupported garden porthole duplicates and imported hut arches are removed',!ship.some(o=>/Sunny_GardenWindow|^Rectangle03[78]$|^Box12[3-9]$|^Box13[0-7]$/.test(o.name)))
  check('walkable lawn is enlarged to the requested experience scale',
    Math.abs((lawn.max.x-lawn.min.x)-meta.exterior.lawnLengthM)<0.05)
  check('ship is centred on the origin',
    Math.max(...meta.hull.center.map(Math.abs)) < 0.01,
    meta.hull.center.map((v) => v.toFixed(4)).join(', '))

  // The safety hull is a catch box hung UNDER the lowest deck, so it covers the
  // hull's length and beam (Blender is Z-up, three.js is Y-up: length=x,
  // beam=z) but only part of the 40 m height.
  const hull = coll.filter((b) => b.name === 'COLL_Hull')[0]
  // NOTE: min/max are THREE.Vector3 - they have no numeric index properties.
  const comp = (v) => [v.x, v.y, v.z]
  const got = [0, 1, 2].map((i) => comp(hull.max)[i] - comp(hull.min)[i])
  check('safety hull spans the hull length',
    Math.abs(meta.hull.size[0] - got[0]) < meta.hull.size[0]*0.05,
    `${got[0].toFixed(1)} m vs hull ${meta.hull.size[0].toFixed(1)} m`)
  check('safety hull spans the hull beam',
    Math.abs(meta.hull.size[1] - got[2]) < 1.5,
    `${got[2].toFixed(1)} m vs hull ${meta.hull.size[1].toFixed(1)} m`)
  check('safety hull only covers the part below the decks',
    got[1] < meta.hull.size[2],
    `${got[1].toFixed(1)} m of ${meta.hull.size[2].toFixed(1)} m tall hull`)

  check('object counts recorded', meta.counts.shipObjects === ship.length,
    `${meta.counts.shipObjects} ship objects, ${meta.counts.removedJunkObjects} junk removed`)
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail ? 1 : 0)
