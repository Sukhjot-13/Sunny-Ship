/** Room finishes on the existing meshes; no construction or palette changes. */
import * as THREE from 'three'
import { realisticTextureSet } from './realisticExterior.js'
import { applyAquariumFloorLight } from './aquariumFinish.js'

const maps = new Map(), materials = new Map(), TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const fract = v => v - Math.floor(v)
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const displayGamma = value => value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055

function ihash(x, y, seed = 0) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function pnoise(u, v, fx, fy, seed = 0) {
  const x = u * fx, y = v * fy, ix = Math.floor(x), iy = Math.floor(y)
  const sx = smooth(0, 1, fract(x)), sy = smooth(0, 1, fract(y))
  const at = (ax, ay) => ihash((ax % fx + fx) % fx, (ay % fy + fy) % fy, seed)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), sx),
    THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx),
    sy
  )
}

const profiles = {
  upholstery:   { period: [0.10, 0.10], roughness: 0.86, relief: 0.00018, sheen: 0.42, env: 0.22 },
  linen:        { period: [0.12, 0.12], roughness: 0.90, relief: 0.00014, sheen: 0.24, env: 0.22 },
  curtain:      { period: [0.14, 0.14], roughness: 0.88, relief: 0.00018, sheen: 0.38, env: 0.22 },
  tile:         { period: [0.32, 0.32], roughness: 0.28, relief: 0.00004, coat: 0.36, env: 0.28 },
  porcelain:    { period: [0.24, 0.24], roughness: 0.22, relief: 0.00002, coat: 0.48, env: 0.30 },
  paper:        { period: [0.18, 0.18], roughness: 0.92, relief: 0.00005, env: 0.20 },
  bookcloth:    { period: [0.06, 0.06], roughness: 0.80, relief: 0.00014, sheen: 0.18, env: 0.22 },
  leather:      { period: [0.12, 0.12], roughness: 0.50, relief: 0.00016, coat: 0.20, env: 0.32 },
  'bath-stone': { period: [1.10, 1.10], roughness: 0.34, relief: 0.0024,  coat: 0.32, env: 0.30 },
  marble:       { period: [1.60, 1.20], roughness: 0.24, relief: 0.00008, coat: 0.46, env: 0.34 },
  hessian:      { period: [0.16, 0.16], roughness: 0.94, relief: 0.00032, sheen: 0.14, env: 0.20 },
  rubber:       { period: [0.12, 0.12], roughness: 0.82, relief: 0.00020, env: 0.22 },
  vinyl:        { period: [0.16, 0.16], roughness: 0.44, relief: 0.00008, coat: 0.24, env: 0.28 },
  enamel:       { period: [0.36, 0.36], roughness: 0.36, relief: 0.00005, coat: 0.30, env: 0.30 },
  steel:        { period: [0.85, 0.85], roughness: 0.34, relief: 0.00007, coat: 0.08, env: 0.58 },
}

/** Multi-layered organic Calacatta marble veining (primary smoky rivers + fine capillaries). */
function marbleVein(u, v) {
  const w1 = pnoise(u, v, 3, 3, 11) - 0.5
  const w2 = pnoise(u, v, 7, 7, 23) - 0.5
  const w3 = pnoise(u, v, 19, 19, 37) - 0.5
  const bend = w1 * 0.42 + w2 * 0.18 + w3 * 0.06
  const primary = Math.pow(1 - Math.abs(Math.sin(TAU * (u * 1.5 - v * 2.0 + bend))), 10)
  const secondary = Math.pow(1 - Math.abs(Math.sin(TAU * (u * 3.0 - v * 5.0 + bend * 1.65 + 0.31))), 18)
  const capillary = Math.pow(1 - Math.abs(Math.sin(TAU * (u * 6.0 + v * 4.0 + bend * 2.1 + 0.17))), 26)
  return clamp(primary * 0.72 + secondary * 0.36 + capillary * 0.18)
}

/**
 * Honed Japanese onsen / ship-bathhouse natural polygonal stone mosaic
 * with crisp mortar grout channels and per-stone slate/mineral variation.
 */
function bathStoneMosaic(u, v) {
  const cells = 7, x = u * cells, y = v * cells
  let d1 = 9, d2 = 9, stoneTone = 0.5, stoneWarm = 0.5
  const seed = (a, b, off) => ihash((a % cells + cells) % cells, (b % cells + cells) % cells, off)
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const a = Math.floor(x) + col, b = Math.floor(y) + row
      const px = a + 0.18 + 0.64 * seed(a, b, 5)
      const py = b + 0.18 + 0.64 * seed(a, b, 19)
      const dist = Math.hypot((x - px) * 0.96, (y - py) * 1.04)
      if (dist < d1) {
        d2 = d1; d1 = dist
        stoneTone = seed(a, b, 41)
        stoneWarm = seed(a, b, 73)
      } else if (dist < d2) {
        d2 = dist
      }
    }
  }
  const edge = d2 - d1
  const grout = 1 - smooth(0.025, 0.075, edge)
  const bevel = 1 - smooth(0.06, 0.15, edge)
  const grain = pnoise(u, v, 24, 24, 91) - 0.5
  return { grout, bevel, stoneTone, stoneWarm, grain }
}

/** Cellular pebbled Morocco leather grain. */
function leatherCell(u, v) {
  const cells = 18, x = u * cells, y = v * cells
  let d1 = 9, d2 = 9
  const seed = (a, b, off) => ihash((a % cells + cells) % cells, (b % cells + cells) % cells, off)
  for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
    const a = Math.floor(x) + c, b = Math.floor(y) + r
    const dist = Math.hypot(x - a - 0.2 - 0.6 * seed(a, b, 7), y - b - 0.2 - 0.6 * seed(a, b, 29))
    if (dist < d1) { d2 = d1; d1 = dist } else if (dist < d2) d2 = dist
  }
  return smooth(0.03, 0.22, d2 - d1)
}

/** Colour-managed mipmapped maps; repetition is measured in metres. */
function texture(data, size, period, color = false) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / period[0], 1 / period[1])
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 8
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.needsUpdate = true
  return t
}

/** Cache fabric, stone, marble, steel, paper and ceramic maps; wood/brass share exterior data. */
export function interiorTextureSet(role) {
  if (!profiles[role]) return realisticTextureSet(role)
  if (maps.has(role)) return maps.get(role)
  const p = profiles[role], size = 512, count = size * size
  const albedo = new Uint8Array(count * 4)
  const normal = new Uint8Array(count * 4)
  const roughness = new Uint8Array(count * 4)
  const height = new Float32Array(count)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, i = y * size + x, j = i * 4
      const fine = ihash(x, y, 17) - 0.5
      const cloud = pnoise(u, v, 5, 5, 3) - 0.5
      const med = pnoise(u, v, 14, 14, 9) - 0.5
      let tr = 0.96, tg = 0.96, tb = 0.96, hVal = 0, rVal = p.roughness

      if (role === 'upholstery' || role === 'linen' || role === 'curtain' || role === 'bookcloth' || role === 'hessian') {
        const freq = role === 'hessian' ? 32 : role === 'bookcloth' ? 72 : 56
        const warp = Math.sin(TAU * u * freq + med * 0.4)
        const weft = Math.sin(TAU * v * freq + cloud * 0.4)
        const twill = Math.sin(TAU * (u * freq * 0.5 + v * freq * 0.5))
        const weave = role === 'upholstery' ? twill * 0.55 + warp * weft * 0.45 : warp * weft
        const nap = role === 'curtain' ? Math.sin(TAU * u * 3 + cloud * 0.8) * 0.08 : cloud * 0.08
        const slub = pnoise(u, v, 8, 42, 61) - 0.5
        const amp = role === 'hessian' ? 0.16 : role === 'upholstery' ? 0.095 : 0.075
        const base = 0.92 + weave * amp + nap + slub * 0.045 + fine * 0.025
        tr = base * (role === 'hessian' ? 1.03 : 1.01)
        tg = base
        tb = base * (role === 'hessian' ? 0.94 : 0.98)
        hVal = (weave * 0.72 + slub * 0.28) * p.relief
        rVal = p.roughness + weave * 0.055 + cloud * 0.06
      } else if (role === 'bath-stone') {
        const st = bathStoneMosaic(u, v)
        const base = st.grout > 0.5
          ? 0.58 + st.grain * 0.06
          : 0.76 + st.stoneTone * 0.22 + st.grain * 0.08 - st.bevel * 0.06
        const stoneT = 1 - st.grout
        tr = base * (1 + (st.stoneWarm - 0.5) * 0.08 * stoneT)
        tg = base * (1 + (st.stoneWarm - 0.5) * 0.02 * stoneT)
        tb = base * (1 + (0.5 - st.stoneWarm) * 0.12 * stoneT)
        hVal = (1 - st.grout * 0.85 - st.bevel * 0.22 + st.grain * 0.18) * p.relief
        rVal = THREE.MathUtils.lerp(0.24 + st.stoneTone * 0.16 + st.grain * 0.06, 0.88, st.grout)
      } else if (role === 'marble') {
        const vein = marbleVein(u, v)
        const mineral = pnoise(u, v, 10, 10, 47) - 0.5
        const base = 0.97 + mineral * 0.045 - vein * 0.40
        tr = base + vein * 0.03
        tg = base + vein * 0.015
        tb = base - vein * 0.01
        hVal = (-vein * 0.55 + mineral * 0.45) * p.relief
        rVal = p.roughness + vein * 0.16 + cloud * 0.05
      } else if (role === 'tile' || role === 'porcelain') {
        const glazeWave = pnoise(u, v, 6, 6, 33) - 0.5
        const speck = pnoise(u, v, 32, 32, 71) - 0.5
        const base = 0.965 + glazeWave * 0.032 + speck * 0.015 + fine * 0.008
        tr = base * 1.005; tg = base; tb = base * 0.99
        hVal = (glazeWave * 0.75 + speck * 0.25) * p.relief
        rVal = p.roughness + glazeWave * 0.075 + speck * 0.035
      } else if (role === 'leather') {
        const cell = leatherCell(u, v)
        const crease = pnoise(u, v, 6, 6, 51) - 0.5
        const base = 0.88 + cell * 0.11 + crease * 0.08 + fine * 0.02
        tr = base * 1.03; tg = base * 0.99; tb = base * 0.94
        hVal = (cell * 0.78 + crease * 0.22) * p.relief
        rVal = p.roughness + (1 - cell) * 0.16 + crease * 0.08
      } else if (role === 'paper') {
        const rag = pnoise(u, v, 24, 24, 15) - 0.5
        const fox = pnoise(u, v, 4, 4, 89) - 0.5
        const base = 0.95 + rag * 0.045 + fox * 0.04 + fine * 0.02
        tr = base * 1.02; tg = base; tb = base * 0.95
        hVal = (rag * 0.65 + fine * 0.35) * p.relief
        rVal = p.roughness + rag * 0.045 + fox * 0.04
      } else if (role === 'steel') {
        // Clean industrial brushed shipyard steel (zero blotchy camo patches)
        const brush = (pnoise(u, v, 6, 128, 13) - 0.5) * 0.75 + Math.sin(TAU * v * 110 + cloud * 0.15) * 0.25
        const mill = pnoise(u, v, 10, 10, 27) - 0.5
        const base = 0.92 + brush * 0.045 + mill * 0.04 + fine * 0.015
        tr = base * 0.99; tg = base; tb = base * 1.02
        hVal = (brush * 0.6 + mill * 0.4) * p.relief
        rVal = p.roughness + mill * 0.09 + brush * 0.045
      } else if (role === 'rubber') {
        const stipple = pnoise(u, v, 40, 40, 67) - 0.5
        const base = 0.91 + stipple * 0.08 + cloud * 0.04 + fine * 0.03
        tr = tg = tb = base
        hVal = (stipple * 0.8 + fine * 0.2) * p.relief
        rVal = p.roughness + stipple * 0.08 + cloud * 0.05
      } else {
        // vinyl & enamel: clean satin marine painted metal / vinyl grain
        const micro = pnoise(u, v, 28, 28, 43) - 0.5
        const base = 0.955 + cloud * 0.035 + micro * 0.025 + fine * 0.01
        tr = base; tg = base; tb = base * 0.995
        hVal = (micro * 0.65 + cloud * 0.35) * p.relief
        rVal = p.roughness + cloud * 0.075 + micro * 0.04
      }

      albedo[j]     = Math.round(displayGamma(clamp(tr, 0.15, 1)) * 255)
      albedo[j + 1] = Math.round(displayGamma(clamp(tg, 0.15, 1)) * 255)
      albedo[j + 2] = Math.round(displayGamma(clamp(tb, 0.15, 1)) * 255)
      albedo[j + 3] = 255
      const rByte = Math.round(clamp(rVal, 0.16, 0.98) * 255)
      roughness[j] = roughness[j + 1] = roughness[j + 2] = rByte
      roughness[j + 3] = 255
      height[i] = hVal
    }
  }

  const at = (ax, ay) => height[((ay + size) % size) * size + (ax + size) % size]
  const dxStep = 2 * p.period[0] / size
  const dyStep = 2 * p.period[1] / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = -(at(x + 1, y) - at(x - 1, y)) / dxStep
      const ny = -(at(x, y + 1) - at(x, y - 1)) / dyStep
      const len = Math.hypot(nx, ny, 1), j = (y * size + x) * 4
      normal[j]     = Math.round((nx / len * 0.5 + 0.5) * 255)
      normal[j + 1] = Math.round((ny / len * 0.5 + 0.5) * 255)
      normal[j + 2] = Math.round((1 / len * 0.5 + 0.5) * 255)
      normal[j + 3] = 255
    }
  }

  const result = {
    map: texture(albedo, size, p.period, true),
    normalMap: texture(normal, size, p.period),
    roughnessMap: texture(roughness, size, p.period),
    period: p.period,
    size,
  }
  maps.set(role, result)
  return result
}

/** Upgrade authored rooms/furniture only after the exterior classifier has declined. */
export function usesRealisticInterior(tags, name) {
  return !!tags.sunny_authored && name.startsWith('Sunny_') && (tags.sunny_fabric ||
    /^(?:Aquarium|B1$|Bath|Dining|AftRearWindow|AftSideWindow|Dock$|Energy|Factory|ForeF1|ForeF2|ForeToilet|Interior|Kitchen$|Kotatsu|Library$|Pantry|Quarters|RoomLamp|RoomPartition|Sick|StorageStair|Store|SurveyGym|Vehicle|Wash|Weapons|Womens|WorkshopPortCover|WWash)/.test(tags.sunny_feature ?? '') ||
    /^Sunny_(?:Door|Hatch)_/.test(name))
}

/** Retain the authored surface identity and existing patterned colour regions. */
export function interiorSurfaceRole(source, { name = '', wood = 'grain', fabric = false } = {}) {
  const label = source.name.replace('Sunny_', '')
  if (label === 'lamp_glow') return 'lamp'
  if (label === 'tankwater') return 'water'
  if (label === 'bath_water') return 'bath-water'
  if (label === 'bath_stone') return 'bath-stone'
  if (label === 'bath_pipe') return 'steel'
  if (/^bath_(?:jade|porcelain|enamel|tile)$/.test(label)) return 'porcelain'
  if (/^bath_(?:cedar|amber)$/.test(label)) return 'boards'
  if (label === 'dining_floor_oak') return 'boards'
  if (/^dining_(?:oak|walnut)$/.test(label)) return 'grain'
  if (label === 'kitchen_marble') return 'marble'
  if (label === 'kitchen_enamel' || label === 'kitchen_oven_glaze') return 'porcelain'
  if (label === 'kitchen_steel') return 'steel'
  if (label === 'kitchen_walnut') return 'grain'
  if (/^cloth_pantry_/.test(label)) return 'hessian'
  if (/^pantry_(?:oak|endgrain)$/.test(label)) return 'grain'
  if (label === 'pantry_ceramic' || label === 'sick_powdercoat') return 'porcelain'
  if (/^cloth_sick_/.test(label)) return 'linen'
  if (label === 'sick_cork') return 'paper'
  if (/^quarters_(?:oak|walnut)$/.test(label)) return 'grain'
  if (/^cloth_(?:quarters|womens)_/.test(label)) return 'linen'
  if (label === 'quarters_cannon_iron') return 'iron'
  if (label === 'quarters_porcelain' || label === 'quarters_locker_enamel' || label === 'womens_wardrobe_enamel') return 'porcelain'
  if (/^(?:workshop_(?:maple|oak)|lookout_(?:ash|wood_trim))$/.test(label)) return 'grain'
  if (label === 'dock_deck_oak') return 'boards'
  if (label === 'workshop_cast_iron' || label === 'lookout_training_iron') return 'iron'
  if (label === 'workshop_steel' || label === 'lookout_optic_metal') return 'steel'
  if (label === 'workshop_copper') return 'brass'
  if (label === 'dock_rubber' || label === 'lookout_mat') return 'rubber'
  if (/^dock_pool_vinyl_/.test(label)) return 'vinyl'
  if (/^dock_(?:porcelain_paint|marine_(?:blue|red))$/.test(label) || label === 'workshop_painted_steel') return 'enamel'
  if (label === 'glass') return /mirror/i.test(name) ? 'mirror' : 'glass'
  if (/^tile_/.test(label)) return 'tile'
  if (label === 'paper' || label.startsWith('paper_')) return 'paper'
  if (/^library_binding\d+$/.test(label)) return 'bookcloth'
  if (label === 'library_leather' || label === 'library_log') return 'leather'
  if (/^library_(?:walnut|oak|inlay|casing)$/.test(label)) return label === 'library_casing' ? 'boards' : 'grain'
  if (label === 'linen') return 'linen'
  if (label.startsWith('upholstery_')) return 'upholstery'
  if (label === 'cloth_aquarium') return 'curtain'
  if (label === 'cloth_aqua' || fabric) return /curtain|canopy/i.test(name) ? 'curtain' : 'linen'
  if (/cushion|mattress|pillow|blanket|quilt|sofa|armchair/i.test(name) && !['timber', 'deck', 'darkwood', 'gold', 'brass', 'black', 'steel'].includes(label)) return 'upholstery'
  if (['gold', 'brass'].includes(label)) return 'brass'
  if (label === 'steel') return 'steel'
  if (label === 'black' && /cannon|barrel|furnace|boiler|oven|stove|machine/i.test(name)) return 'iron'
  if (['deck', 'timber', 'darkwood'].includes(label)) return wood === 'boards' || /InteriorFloor|_ceiling|_floor/.test(name) ? 'boards' : 'grain'
  if (label === 'white' && /sink|basin|toilet|bath_(?:tub|rim)|plate|dish|cup|teapot|bowl|bottle|jar/i.test(name)) return 'porcelain'
  if (label === 'rope') return 'rope'
  if (label === 'grass') return 'lawn'
  if (/^leaf/.test(label)) return 'leaf'
  if (label === 'soil') return 'soil'
  if (label === 'orange') return 'fruit'
  return 'paint'
}

/** Add metric projection attributes to a private clone, retaining every shape/index/UV. */
export function interiorGeometry(mesh) {
  const g = mesh.geometry.clone(), p = g.getAttribute('position'), n = g.getAttribute('normal')
  const position = new Float32Array(p.count * 3), normal = new Float32Array(p.count * 3)
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld), v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).toArray(position, i * 3)
    if (n) v.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize().toArray(normal, i * 3)
    else { normal[i * 3] = 0; normal[i * 3 + 1] = 1; normal[i * 3 + 2] = 0 }
  }
  g.setAttribute('interiorPosition', new THREE.BufferAttribute(position, 3))
  g.setAttribute('interiorNormal', new THREE.BufferAttribute(normal, 3))
  return g
}

/** The physical floor grid was authored in these same global source metres. */
export function interiorTileSize(name) {
  if (/Aquarium/.test(name)) return 0.75
  if (/library/i.test(name)) return 0.65
  if (/bath|service/i.test(name)) return 0.55
  return 0.65
}

/** Seamless three-axis PBR projection with subtle architectural grounding & crisp tile joints. */
export function applyInteriorProjection(shader, set, tileSize = 0) {
  Object.assign(shader.uniforms, {
    iAlbedo: { value: set.map },
    iNormal: { value: set.normalMap },
    iRoughness: { value: set.roughnessMap },
    iPeriod: { value: new THREE.Vector2(...set.period) },
    iTile: { value: tileSize },
  })
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
 attribute vec3 interiorPosition,interiorNormal;
 varying vec3 vInteriorPosition,vInteriorNormal;`)
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
 vInteriorPosition=interiorPosition;vInteriorNormal=interiorNormal;`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
 uniform sampler2D iAlbedo,iNormal,iRoughness;
 uniform vec2 iPeriod;
 uniform float iTile;
 varying vec3 vInteriorPosition,vInteriorNormal;
 vec3 interiorWeights(){vec3 w=pow(abs(normalize(vInteriorNormal)),vec3(6.));return w/max(dot(w,vec3(1.)),.0001);}
 vec4 interiorSample(sampler2D t){
  vec3 w=interiorWeights();
  return texture2D(t,vInteriorPosition.zy/iPeriod)*w.x+texture2D(t,vInteriorPosition.xz/iPeriod)*w.y+texture2D(t,vInteriorPosition.xy/iPeriod)*w.z;
 }
 vec2 interiorSlope(vec3 n){return -n.xy/max(n.z,.2);}
 vec3 interiorRelief(vec3 surfNormal,float face){
  vec3 w=interiorWeights(),p=vInteriorPosition;
  vec2 a=interiorSlope(texture2D(iNormal,p.zy/iPeriod).xyz*2.-1.);
  vec2 b=interiorSlope(texture2D(iNormal,p.xz/iPeriod).xyz*2.-1.);
  vec2 c=interiorSlope(texture2D(iNormal,p.xy/iPeriod).xyz*2.-1.);
  vec2 dh=vec2(dot(a,dFdx(p.zy))*w.x+dot(b,dFdx(p.xz))*w.y+dot(c,dFdx(p.xy))*w.z,
               dot(a,dFdy(p.zy))*w.x+dot(b,dFdy(p.xz))*w.y+dot(c,dFdy(p.xy))*w.z);
  vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,surfNormal),r2=cross(surfNormal,dx);
  float det=dot(dx,r1)*face;
  return normalize(abs(det)*surfNormal-sign(det)*(dh.x*r1+dh.y*r2));
 }
 float interiorJoint(){
  if(iTile<=0.)return 0.;
  vec2 uv=vInteriorPosition.xz/iTile,edge=min(fract(uv),1.-fract(uv))*iTile;
  float distanceToJoint=min(edge.x,edge.y),aa=max(length(fwidth(vInteriorPosition.xz))*.5,.0002);
  return (1.-smoothstep(.0018-aa,.0042+aa,distanceToJoint))*smoothstep(.85,.98,abs(normalize(vInteriorNormal).y));
 }
 float interiorMacro(){
  vec3 p=vInteriorPosition;
  return sin(p.x*.53+p.z*.37)*cos(p.z*.47-p.y*.61)*.035;
 }`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `diffuseColor*=interiorSample(iAlbedo);
 float intJoint=interiorJoint();
 float intGround=mix(.84,1.02,smoothstep(-.85,.65,normalize(vInteriorNormal).y));
 diffuseColor.rgb*=intGround*(1.+interiorMacro())*(1.-intJoint*.46);`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `float roughnessFactor=roughness*interiorSample(iRoughness).g;
 roughnessFactor=clamp(mix(roughnessFactor,.90,interiorJoint())+interiorMacro()*.6,.14,.99);`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `normal=interiorRelief(normal,faceDirection);`)
}

/** Separate cached room materials; source/exterior instances are never modified. */
export function realisticInteriorMaterial(source, options = {}) {
  const role = interiorSurfaceRole(source, options)
  const projected = !options.uv || role === 'tile'
  const tile = role === 'tile' ? interiorTileSize(options.name ?? '') : 0
  const aquariumFloor = !!options.aquarium && role === 'tile' && /^Sunny_AquariumFloor/.test(options.name)
  const aquariumCeiling = !!options.aquarium && options.name === 'Sunny_Aquarium_ceiling'
  const libraryFloor = !!options.library && role === 'tile' && /^Sunny_InteriorFloor_F3_library/.test(options.name)
  const bathWater = !!options.bath && role === 'bath-water'
  const key = [source.name, source.color.getHexString(), role, projected, tile, aquariumCeiling, libraryFloor, bathWater].join(':')
  if (!aquariumFloor && !bathWater && materials.has(key)) return materials.get(key)

  const shared = role === 'brass' ? 'metal' : ['water', 'bath-water', 'glass', 'mirror', 'lamp'].includes(role) ? null : role
  const profile = profiles[role]
  const isMetal = ['brass', 'steel', 'iron', 'mirror'].includes(role)
  // Restrain outdoor sky-IBL intensity on interior walls/floors so outdoor sun never glares indoors
  const envInt = role === 'mirror' ? 0.92
    : role === 'glass' ? 1.45
    : role === 'brass' ? 0.68
    : role === 'steel' ? 0.56
    : role === 'iron' ? 0.45
    : (profile?.env ?? (['grain', 'boards'].includes(role) ? 0.24 : 0.22))

  const m = new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: source.color.clone(),
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: isMetal ? (role === 'mirror' ? 1 : role === 'iron' ? 0.72 : 0.84) : 0,
    clearcoat: profile?.coat ?? (['grain', 'boards'].includes(role) ? 0.14 : role === 'paint' ? 0.10 : 0),
    clearcoatRoughness: 0.36,
    envMapIntensity: envInt,
  })

  if (aquariumCeiling) m.color.multiplyScalar(0.22)

  if (shared) {
    const set = interiorTextureSet(shared)
    if (projected) {
      m.onBeforeCompile = shader => {
        applyInteriorProjection(shader, set, tile)
        if (aquariumFloor) applyAquariumFloorLight(shader, options.aquarium)
        if (libraryFloor) applyLibraryDaylight(shader, options.library)
      }
      m.customProgramCacheKey = () => `interior-metric-v2${aquariumFloor ? ':aquarium-light' : libraryFloor ? ':library-light' : ''}`
    } else {
      m.map = set.map
      m.normalMap = set.normalMap
      m.roughnessMap = set.roughnessMap
      m.normalScale.setScalar(role === 'paint' ? 0.55 : role === 'boards' ? 1.05 : 0.85)
    }
    if (profile?.sheen) {
      m.sheen = profile.sheen
      m.sheenColor.copy(source.color).lerp(new THREE.Color('#fff2dc'), 0.25)
      m.sheenRoughness = 0.84
    }
  } else if (role === 'lamp') {
    m.roughness = 0.26
    m.emissive.copy(source.color)
    m.emissiveIntensity = 2.15
  } else if (role === 'mirror') {
    m.roughness = 0.045
    m.color.setRGB(0.92, 0.94, 0.96)
    m.clearcoat = 1
  } else if (bathWater) {
    m.transparent = true
    m.opacity = 0.76
    m.depthWrite = false
    m.roughness = 0.10
    m.ior = 1.333
    m.clearcoat = 1.0
    m.clearcoatRoughness = 0.05
    m.envMapIntensity = 0.78
    m.onBeforeCompile = shader => applyBathWater(shader, options.bath)
    m.customProgramCacheKey = () => `bath-water-v2`
  } else {
    m.transparent = true
    m.opacity = role === 'water' ? 0.16 : 0.20
    m.depthWrite = false
    m.roughness = role === 'water' ? 0.07 : 0.055
    m.ior = 1.5
    m.clearcoat = 1
    m.clearcoatRoughness = 0.06
  }

  m.userData = { interiorSurface: role, interiorProjection: projected ? 'metric' : 'authored-uv', finishVersion: 2 }
  if (aquariumFloor) m.userData.aquariumOwned = true
  else if (bathWater) m.userData.bathOwned = true
  else materials.set(key, m)
  return m
}

export function applyBathWater(shader, bath) {
  shader.uniforms.bathTime = bath.time
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
 attribute vec3 interiorPosition;
 varying vec3 vBathPosition;`)
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
 vBathPosition=interiorPosition;`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
 varying vec3 vBathPosition;
 uniform float bathTime;`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
 vec2 rp=vBathPosition.xz;
 vec2 warp=rp+vec2(sin(rp.y*2.4+bathTime*.8),cos(rp.x*2.1-bathTime*.7))*.22;
 float r1=sin(warp.x*6.8+warp.y*2.9+bathTime*1.35)+sin(warp.y*7.9-warp.x*2.3-bathTime*1.12);
 float r2=sin(warp.x*11.4-warp.y*8.6+bathTime*1.85);
 float caustic=pow(max(0.,1.-abs(r1)*.52),4.5)*.72+pow(max(0.,r2*.5+.5),6.)*.28;
 diffuseColor.rgb+=vec3(.055,.22,.19)*caustic+vec3(.04,.05,.04)*pow(caustic,2.);`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
 normal=normalize(normal+vec3(dFdx(r1+r2*.4),dFdy(r1+r2*.4),0.)*.22);`)
}

export function applyLibraryDaylight(shader, layout) {
  const [x, y] = layout.centre
  shader.uniforms.libraryCentre = { value: new THREE.Vector2(x, -y) }
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
 uniform vec2 libraryCentre;`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
 vec2 direction=(vInteriorPosition.xz-libraryCentre)/vec2(4.95,5.50);
 float radius=length(direction);
 float windows=cos(8.*atan(direction.y,direction.x));
 float wash=smoothstep(.24,.89,radius)*(.25+.75*smoothstep(-.32,.87,windows));
 // Warm Golden Hour sunlit window pools contrasting with cool azure sky shade
 diffuseColor.rgb*=vec3(.88,.87,.88)+vec3(.24,.17,.08)*wash;
 diffuseColor.rgb+=vec3(.026,.020,.010)*wash;`)
}
