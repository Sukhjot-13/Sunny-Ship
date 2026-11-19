/** Physical-scale exterior finishes, isolated from the existing room materials. */
import * as THREE from 'three'

const textures = new Map(), finishes = new Map(), TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const fract = v => v - Math.floor(v)
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const wave = v => Math.sin(v * TAU)

/** Deterministic integer noise; no time-dependent grain or per-frame allocation. */
function hash(x, y, seed = 0) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Periodic smooth noise keeps every generated albedo/data tile seamless. */
function noise(u, v, fx, fy, seed = 0) {
  const x = u * fx, y = v * fy, ix = Math.floor(x), iy = Math.floor(y)
  const sx = smooth(0, 1, fract(x)), sy = smooth(0, 1, fract(y))
  const at = (ax, ay) => hash((ax % fx + fx) % fx, (ay % fy + fy) % fy, seed)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), sx),
    THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx),
    sy
  )
}

const profiles = {
  boards:        { size: 1024, period: [4.0, 1.2], coat: 0.14, coatRough: 0.36, env: 1.08, nScale: 1.15 },
  grain:         { size: 1024, period: [4.0, 0.8], coat: 0.20, coatRough: 0.34, env: 1.10, nScale: 1.10 },
  paintedBoards: { size: 1024, period: [4.0, 1.2], coat: 0.28, coatRough: 0.30, env: 1.18, nScale: 1.00 },
  paint:         { size: 512,  period: [2.2, 1.1], coat: 0.28, coatRough: 0.34, env: 1.15, nScale: 1.05 },
  bark:          { size: 512,  period: [1.0, 0.4], coat: 0.00, coatRough: 0.60, env: 0.90, nScale: 1.25 },
  metal:         { size: 512,  period: [1.8, 1.8], coat: 0.18, coatRough: 0.22, env: 1.55, nScale: 0.58, metalness: 0.92 },
  iron:          { size: 512,  period: [0.9, 0.9], coat: 0.05, coatRough: 0.45, env: 1.25, nScale: 0.85, metalness: 0.76 },
  rope:          { size: 512,  period: [0.22, 0.08], coat: 0.00, coatRough: 0.80, env: 0.85, nScale: 1.15 },
  lawn:          { size: 512,  period: [1.8, 1.8], coat: 0.00, coatRough: 0.85, env: 0.92, nScale: 1.35 },
  leaf:          { size: 512,  period: [1.0, 1.0], coat: 0.22, coatRough: 0.28, env: 1.12, nScale: 0.85 },
  fruit:         { size: 512,  period: [0.10, 0.10], coat: 0.28, coatRough: 0.25, env: 1.18, nScale: 1.00 },
  pot:           { size: 512,  period: [0.45, 0.45], coat: 0.24, coatRough: 0.38, env: 1.05, nScale: 0.70 },
  soil:          { size: 512,  period: [0.35, 0.35], coat: 0.00, coatRough: 0.90, env: 0.80, nScale: 1.20 },
  canvas:        { size: 512,  period: [0.18, 0.18], coat: 0.00, coatRough: 0.90, env: 0.85, nScale: 1.00 },
  roof:          { size: 512,  period: [1.4, 0.7], coat: 0.32, coatRough: 0.32, env: 1.18, nScale: 0.95 },
}

/** Neutral-balanced RGB albedo tint, physical relief in metres, and PBR roughness. */
function sample(role, u, v, x, y) {
  const fine = hash(x, y, 29) - 0.5
  const cloud = noise(u, v, 4, 4, 7) - 0.5
  const macro = noise(u, v, 2, 2, 41) - 0.5
  let r = 0.96, g = 0.96, b = 0.96, height = 0, rough = 0.65

  if (['boards', 'grain', 'paintedBoards', 'paint'].includes(role)) {
    const isBoards = role === 'boards' || role === 'paintedBoards'
    const isPainted = role === 'paint' || role === 'paintedBoards'
    const rows = 6
    const row = isBoards ? Math.floor(v * rows) : 0
    const rowTone = hash(row, 11, 3)
    const rowWarmth = hash(row, 23, 17) - 0.5
    const along = noise(u, v, 8, 4, 13) - 0.5

    // Wood knot and cathedral ring flow
    const du = fract(u - hash(row, 5, 8) + 0.5) - 0.5
    const dv = isBoards ? fract(v * rows) - 0.5 : v - 0.5
    const knot = Math.exp(-(du * du * 140 + dv * dv * 38))
    const warped = v + cloud * 0.018 + along * 0.011 + knot * wave(du * 2) * 0.015

    const fibres = noise(u, warped, 16, 192, 21) - 0.5
    const latewood = noise(u, warped, 8, 36, 23) - 0.5
    const cathedral = wave(warped * 7.0 + noise(u, warped, 3, 6, 53) * 0.85) * 0.25
    const pores = smooth(0.66, 0.88, noise(u, warped, 32, 256, 19))
    const rings = wave(Math.sqrt(du * du * 36 + dv * dv * 24) * 10) * knot
    const grain = fibres * 1.15 + latewood * 0.85 + cathedral * 0.45 - pores * 0.48 + rings * 0.22

    if (isPainted) {
      // Satin marine-painted & carved ship timber: fine hand-carved wood grain
      // subtly telegraphs through hand-brushed marine lacquer with soft weathering
      const brush = noise(u, v, 8, 112, 67) - 0.5
      const wear = noise(u, v, 8, 8, 71) - 0.5
      const base = 0.94 + grain * 0.068 + brush * 0.032 + cloud * 0.042 + macro * 0.028
      r = base + wear * 0.018
      g = base + wear * 0.009
      b = base - wear * 0.015
      height = grain * 0.00042 + brush * 0.00016 - pores * 0.00012
      rough = 0.42 + cloud * 0.14 + wear * 0.11 - grain * 0.055 + fine * 0.025
    } else {
      // Bare Adam-wood / oiled teak decking and massive masts
      const base = 0.84 + grain * 0.22 + cloud * 0.12 + along * 0.065 + macro * 0.05
      const warm = rowWarmth * 0.06 + grain * 0.035
      r = base * (1.0 + warm * 0.65)
      g = base * (1.0 + warm * 0.15)
      b = base * (1.0 - warm * 0.65)
      height = grain * 0.00068 - pores * 0.00026 - knot * 0.00018
      rough = 0.56 + cloud * 0.14 - grain * 0.09 + pores * 0.14 + fine * 0.025
    }

    if (isBoards) {
      const vLocal = fract(v * rows)
      const uOffset = fract(u * 1.5 + hash(row, 3) * 0.91)
      const edgeV = Math.min(vLocal, 1 - vLocal) / rows
      const edgeU = Math.min(uOffset, 1 - uOffset) * 2.6
      const minEdge = Math.min(edgeV, edgeU)
      const gap = 1 - smooth(0.0012, 0.0052, minEdge)
      const bevel = 1 - smooth(0.004, 0.013, minEdge)

      // Subtle shipwright trunnel pegs near staggered butt joints
      const pegDistU = Math.abs(Math.min(uOffset, 1 - uOffset) - 0.022)
      const pegDistV = Math.min(Math.abs(vLocal - 0.26), Math.abs(vLocal - 0.74))
      const peg = isPainted ? 0 : (1 - smooth(0.005, 0.012, Math.hypot(pegDistU * 2.2, pegDistV * 0.38)))

      // Distinct per-plank variation + dark pitch caulked seams
      const plankShade = isPainted ? (0.955 + rowTone * 0.065) : (0.82 + rowTone * 0.24)
      const caulk = gap * (isPainted ? 0.42 : 0.72) + bevel * (isPainted ? 0.07 : 0.12)
      r *= plankShade * (1 - caulk) * (1 - peg * 0.34)
      g *= plankShade * (1 - caulk * 1.03) * (1 - peg * 0.38)
      b *= plankShade * (1 - caulk * 1.08) * (1 - peg * 0.42)
      height -= gap * 0.0024 + bevel * 0.00065 + peg * 0.00045
      rough += gap * 0.30 + bevel * 0.08 + peg * 0.12
    }
  } else if (role === 'bark') {
    const ridge = wave(v * 21 + (noise(u, v, 5, 6, 8) - 0.5) * 1.1)
    const crack = Math.pow(0.5 + 0.5 * ridge, 7)
    const moss = smooth(0.62, 0.85, noise(u, v, 6, 6, 97))
    const base = 0.78 + cloud * 0.16 - crack * 0.28 + fine * 0.04
    r = base * (1.03 - moss * 0.06)
    g = base * (0.99 + moss * 0.05)
    b = base * (0.92 - moss * 0.04)
    height = ridge * 0.0014 - crack * 0.0024 + fine * 0.00018
    rough = 0.88 + crack * 0.09 + fine * 0.04
  } else if (role === 'metal' || role === 'iron') {
    // Clean, regal brushed & subtly hand-forged marine brass / blackened ship iron
    // (avoids large splotchy patches on broad collars while preserving warm metallic character)
    const brush = (noise(u, v, 6, 160, 3) - 0.5) * 0.72 + wave(v * 149 + cloud * 0.18) * 0.28
    const hammer = noise(u, v, 22, 22, 59) - 0.5
    const fineGrain = noise(u, v, 48, 48, 83) - 0.5
    const patina = smooth(0.54, 0.88, noise(u, v, 10, 10, 31) * 0.55 + noise(u, v, 26, 26, 73) * 0.45)
    const isIron = role === 'iron'
    const base = (isIron ? 0.88 : 0.97) + fine * 0.02 + hammer * 0.035 + fineGrain * 0.025 - patina * (isIron ? 0.12 : 0.07)
    r = base * (isIron ? 1.00 : 1.02 - patina * 0.02)
    g = base * (isIron ? 0.99 : 0.99 - patina * 0.025)
    b = base * (isIron ? 1.02 : 0.94 - patina * 0.04)
    height = hammer * (isIron ? 0.00038 : 0.00016) + brush * 0.00004 - patina * 0.00006
    rough = (isIron ? 0.44 : 0.21) + patina * (isIron ? 0.26 : 0.14) + cloud * 0.055 + fineGrain * 0.045 + brush * 0.025
  } else if (role === 'rope') {
    const strand = wave(u * 5 + v * 4)
    const subStrand = wave(u * 15 - v * 12)
    const fibres = wave(u * 31 + v * 103)
    const crevice = Math.pow(0.5 - 0.5 * strand, 3)
    const base = 0.85 + strand * 0.10 + subStrand * 0.04 - crevice * 0.18 + cloud * 0.07 + fine * 0.045
    r = base * 1.03
    g = base * 0.99
    b = base * 0.92
    height = strand * 0.0012 + subStrand * 0.00025 + fibres * 0.00012
    rough = 0.86 + crevice * 0.12 + cloud * 0.06
  } else if (role === 'lawn') {
    // Multi-scale lush sunlit grass turf: visible organic tufts from 15m + crisp blades up close
    const patch = noise(u, v, 3, 3, 19) - 0.5
    const tuft = noise(u, v, 14, 14, 9) - 0.5
    const subTuft = noise(u, v, 32, 32, 47) - 0.5
    const blade1 = Math.pow(0.5 + 0.5 * wave(u * 46 + noise(u, v, 12, 12, 4) * 2.5), 4)
    const blade2 = Math.pow(0.5 + 0.5 * wave((u * 0.65 + v * 0.76) * 58 + noise(u, v, 16, 14, 37) * 2.3), 4)
    const blades = Math.max(blade1, blade2 * 0.86)
    const base = 0.70 + patch * 0.15 + tuft * 0.18 + subTuft * 0.10 + blades * 0.28 + fine * 0.04
    // Warm sunlit golden-green blade tips vs rich deep emerald turf shadows
    r = base * (0.93 + blades * 0.16 + patch * 0.08 + tuft * 0.05)
    g = base * (1.04 + blades * 0.06)
    b = base * (0.84 - blades * 0.07 - patch * 0.06)
    height = blades * 0.0046 + tuft * 0.0022 + subTuft * 0.0010 + fine * 0.0002
    rough = 0.97 - blades * 0.25 + cloud * 0.06 - tuft * 0.05
  } else if (role === 'leaf') {
    const centre = Math.exp(-Math.pow((v - 0.5) / 0.018, 2))
    const vein = Math.exp(-Math.pow(wave(u * 9 + Math.abs(v - 0.5) * 7) / 0.12, 2))
    const base = 0.84 + cloud * 0.12 + centre * 0.10 + vein * 0.05
    r = base * (0.96 + centre * 0.08)
    g = base * 1.03
    b = base * 0.90
    height = centre * 0.0018 + vein * 0.00065
    rough = 0.36 + cloud * 0.14 + vein * 0.12
  } else if (role === 'fruit') {
    const dimple = Math.pow(noise(u, v, 48, 48, 91), 3)
    const pores = Math.pow(hash(x, y, 91), 5)
    const base = 0.93 + cloud * 0.05 - dimple * 0.06 - pores * 0.05
    r = base * 1.02; g = base * 0.99; b = base * 0.94
    height = -dimple * 0.00022 - pores * 0.00008
    rough = 0.36 + cloud * 0.09 + dimple * 0.14 + pores * 0.10
  } else if (role === 'pot') {
    // Glazed ceramic / painted terracotta with soft wheel-thrown ribs
    const rib = wave(v * 24 + cloud * 0.12) * 0.5
    const glaze = noise(u, v, 8, 8, 43) - 0.5
    const base = 0.94 + cloud * 0.04 + glaze * 0.03 + rib * 0.015 + fine * 0.012
    r = base; g = base; b = base * 0.98
    height = rib * 0.00018 + glaze * 0.00009 + fine * 0.00002
    rough = 0.40 + cloud * 0.12 + glaze * 0.08
  } else if (role === 'soil') {
    const clod = noise(u, v, 18, 18, 61) - 0.5
    const base = 0.74 + cloud * 0.16 + clod * 0.18 + fine * 0.14
    r = base * 1.04; g = base * 0.98; b = base * 0.90
    height = clod * 0.0022 + cloud * 0.0012 + fine * 0.0007
    rough = 0.84 + cloud * 0.10 - clod * 0.08
  } else if (role === 'canvas') {
    const warp = wave(u * 128), weft = wave(v * 128)
    const weave = warp * weft
    const slub = noise(u, v, 8, 36, 13) - 0.5
    const crease = noise(u, v, 3, 5, 77) - 0.5
    const base = 0.94 + weave * 0.032 + slub * 0.042 + crease * 0.03
    r = base * 1.01; g = base; b = base * 0.97
    height = weave * 0.000075 + slub * 0.000045
    rough = 0.87 + weave * 0.05 + slub * 0.04
  } else if (role === 'roof') {
    // Painted marine roof sheathing with horizontal lap joints & vertical ribs
    const rows = fract(v * 4)
    const lap = 1 - smooth(0.008, 0.028, Math.min(rows, 1 - rows))
    const ribEdge = Math.min(fract(u * 4), 1 - fract(u * 4))
    const rib = 1 - smooth(0.01, 0.035, ribEdge)
    const brush = noise(u, v, 10, 64, 55) - 0.5
    const base = 0.93 + cloud * 0.07 + brush * 0.035 - lap * 0.18 - rib * 0.12
    r = base * 1.01; g = base; b = base * 0.98
    height = -lap * 0.0012 - rib * 0.0008 + brush * 0.00015 + fine * 0.00002
    rough = 0.38 + cloud * 0.16 + lap * 0.22 + rib * 0.14
  }

  return [clamp(r, 0.14, 1), clamp(g, 0.14, 1), clamp(b, 0.14, 1), height, clamp(rough, 0.18, 0.98)]
}

/** Repeating filtered maps; colour conversion is confined to albedo. */
function makeTexture(data, size, period, color = false) {
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

const toSrgb = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055

/** Shared PBR maps are generated once; normal slopes use the real tile size. */
export function realisticTextureSet(role) {
  if (textures.has(role)) return textures.get(role)
  const profile = profiles[role]
  if (!profile) throw Error(`Unknown realistic exterior surface ${role}`)
  const { size, period } = profile
  const albedo = new Uint8Array(size * size * 4)
  const normal = new Uint8Array(size * size * 4)
  const roughness = new Uint8Array(size * size * 4)
  const heights = new Float32Array(size * size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x, j = i * 4
      const [tr, tg, tb, height, rough] = sample(role, x / size, y / size, x, y)
      albedo[j]     = Math.round(toSrgb(tr) * 255)
      albedo[j + 1] = Math.round(toSrgb(tg) * 255)
      albedo[j + 2] = Math.round(toSrgb(tb) * 255)
      albedo[j + 3] = 255
      const rByte = Math.round(rough * 255)
      roughness[j] = roughness[j + 1] = roughness[j + 2] = rByte
      roughness[j + 3] = 255
      heights[i] = height
    }
  }

  const at = (ax, ay) => heights[((ay + size) % size) * size + (ax + size) % size]
  const dxStep = 2 * period[0] / size
  const dyStep = 2 * period[1] / size
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
    map: makeTexture(albedo, size, period, true),
    normalMap: makeTexture(normal, size, period),
    roughnessMap: makeTexture(roughness, size, period),
    period,
    size,
  }
  textures.set(role, result)
  return result
}

const outdoorFeatures = /^(?:AftEntryDeck|AftF2|AftFacade|AftFrontOrnament\d+|AquariumFrontPort\d+|AftEntrance|Anchor|AquariumDoorApproach|AquariumLadder|AquariumWindow|CoupDeBurst|DiningWindow|Dock1|DockNumber|DockSlat|ForedeckSupport|ForeEntryTunnel|ForePortGallery|ForeFrontPort\d+|ForeFacade\w*|ForeLanding|ForeUpperLanding|ForeStair|AftStair|ForePortRail|ForeStarRail|ForeUpperRail|ForeDoorApproach|ForeStarboardDoorApproach|WomensDoorApproach|Gaon|GardenDeck|GardenStair|Helm|HullPort\d+|HullPortCloset|KitchenChimney|Lantern|Lawn|LawnSidewalk-?1|LibraryRoof|LionEye|LionSmile|LogPose|Lookout|MastPlatform|Mikan\d+|Paddle|PopGreens|RobinGarden|SailTie|ShadeTree|Slide|SoldierDock|SternAccess|SternBalcony|Swing|Usopp)$/

/** Protect authored room finishes/furniture while upgrading actual exterior. */
export function usesRealisticExterior(tags, name) {
  if (!tags.sunny_uv_space) return false
  if (!name.startsWith('Sunny_')) return true
  if (name.startsWith('Sunny_Library_lining_glass')) return true
  return outdoorFeatures.test(tags.sunny_feature ?? '') || /Sunny_(?:Door|Hatch)_(?:WomensDoor|ForeDoor|ForeToiletDoor|AquariumDoor|AftEntrance|PantryOutsideDoor|SickOutsideDoor|LibraryDoor|SternAccessDoor|CrowNestHatch|KitchenHatch|DockLadderHatch)/.test(name)
}

/** Surface identity comes from material and fitting context, never random colour. */
export function exteriorSurfaceRole(source, { wood = 'grain', name = '', feature = '' } = {}) {
  const label = source.name.replace('Sunny_', '')
  if (label === 'glass' || label === 'tankwater') return 'glass'
  if (label === 'rope' || label === 'tarred_rope') return 'rope'
  if (/^leaf/.test(label)) return 'leaf'
  if (label === 'grass') return 'lawn'
  if (label === 'orange') return 'fruit'
  if (label === 'soil') return 'soil'
  if (name.includes('_pot')) return 'pot'
  if (label === 'roof' || feature === 'LibraryRoof' || name.startsWith('Sunny_Bath_roof')) return 'roof'
  if (['gold', 'brass'].includes(label)) return /Lion|Mane|Sphere001/.test(name) ? 'paint' : 'metal'
  if ((/Anchor|Lantern|Cannon/.test(feature + name) || label === 'black') && label === 'black' && /Anchor|Lantern|Gaon|Cannon|Chimney/.test(feature + name)) return 'iron'
  if (['deck', 'timber', 'darkwood'].includes(label)) return ['boards', 'bark'].includes(wood) ? wood : 'grain'
  return wood === 'boards' ? 'paintedBoards' : 'paint'
}

/**
 * Subtle deterministic exterior shader realism:
 * - prime-ratio macro anti-tiling variation in UV space (zero swimming),
 * - architectural hemisphere cavity grounding on downward undersides,
 * - waterline dampness & sea-spray sheen on lower hull timber & paint.
 */
function installExteriorWeathering(material, role, waterY) {
  const hasWater = Number.isFinite(waterY)
  const allowWet = ['boards', 'grain', 'paintedBoards', 'paint', 'metal', 'iron'].includes(role)
  const isMetal = role === 'metal' || role === 'iron'
  material.customProgramCacheKey = () => `ext-realistic-v3:${role}:${hasWater && allowWet ? 1 : 0}`
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uExtWaterY = { value: hasWater ? waterY : -1e6 }
    shader.uniforms.uExtAllowWet = { value: hasWater && allowWet ? 1.0 : 0.0 }
    shader.uniforms.uExtIsMetal = { value: isMetal ? 1.0 : 0.0 }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vExtWorldPos;
        varying vec3 vExtWorldNormal;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vExtWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vExtWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vExtWorldPos;
        varying vec3 vExtWorldNormal;
        uniform float uExtWaterY;
        uniform float uExtAllowWet;
        uniform float uExtIsMetal;
        float extMacroWave(vec2 p) {
          float w1 = sin(p.x * 0.71 + sin(p.y * 0.43) * 1.3) * cos(p.y * 0.63 - sin(p.x * 0.37));
          float w2 = sin((p.x + p.y) * 0.29 + 1.7) * cos((p.x - p.y) * 0.23 - 0.9);
          return w1 * 0.55 + w2 * 0.45;
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          #ifdef USE_MAP
            float macroVar = extMacroWave(vMapUv);
            diffuseColor.rgb *= 1.0 + macroVar * (uExtIsMetal > 0.5 ? 0.055 : 0.048);
          #endif
          // Architectural hemisphere grounding: undersides darken gently for crisp 3D depth
          float upDot = clamp(normalize(vExtWorldNormal).y, -1.0, 1.0);
          float grounding = mix(0.84, 1.03, smoothstep(-0.75, 0.65, upDot));
          diffuseColor.rgb *= grounding;

          // Sea-spray & waterline dampness hugging the base of the hull
          if (uExtAllowWet > 0.5) {
            float aboveWater = vExtWorldPos.y - uExtWaterY;
            float wet = (1.0 - smoothstep(-0.2, 2.5, aboveWater)) * smoothstep(-6.0, -0.5, aboveWater);
            diffuseColor.rgb *= mix(1.0, 0.70, wet * (1.0 - uExtIsMetal * 0.65));
          }
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          #ifdef USE_MAP
            float macroRough = extMacroWave(vMapUv * 1.17 + vec2(3.1, 7.4));
            roughnessFactor = clamp(roughnessFactor + macroRough * 0.075, 0.14, 0.99);
          #endif
          if (uExtAllowWet > 0.5) {
            float aboveWater = vExtWorldPos.y - uExtWaterY;
            float wet = (1.0 - smoothstep(-0.2, 2.4, aboveWater)) * smoothstep(-6.0, -0.5, aboveWater);
            roughnessFactor = mix(roughnessFactor, max(0.12, roughnessFactor * 0.36), wet);
          }
        }`)
  }
}

/** Physical finish with unchanged source palette; legacy room cache stays separate. */
export function realisticExteriorMaterial(source, options = {}) {
  const role = exteriorSurfaceRole(source, options)
  const waterKey = Number.isFinite(options.waterY) ? Math.round(options.waterY * 10) : 'none'
  const key = `${source.name}:${source.color.getHexString()}:${role}:${waterKey}`
  if (finishes.has(key)) return finishes.get(key)
  const profile = profiles[role]
  const isDarkPaint = (role === 'paint' || role === 'paintedBoards') && (source.color.r + source.color.g + source.color.b) < 0.25
  const m = new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: source.color.clone(),
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: profile?.metalness ?? 0,
    clearcoat: isDarkPaint ? 0.06 : (profile?.coat ?? 0.3),
    clearcoatRoughness: isDarkPaint ? 0.58 : (profile?.coatRough ?? 0.34),
    envMapIntensity: isDarkPaint ? 0.65 : (profile?.env ?? 1.15),
  })
  if (role === 'glass') {
    m.transparent = true
    m.opacity = 0.24
    m.roughness = 0.045
    m.depthWrite = false
    m.ior = 1.52
    m.reflectivity = 1.0
    m.clearcoat = 1.0
    m.clearcoatRoughness = 0.04
    m.envMapIntensity = 2.1
  } else {
    const set = realisticTextureSet(role)
    m.map = set.map
    m.normalMap = set.normalMap
    m.roughnessMap = set.roughnessMap
    m.normalScale.setScalar(profile?.nScale ?? 0.9)
    if (role === 'leaf') {
      m.sheen = 0.24
      m.sheenColor.copy(source.color).lerp(new THREE.Color('#d8e88a'), 0.35)
      m.sheenRoughness = 0.72
    } else if (role === 'lawn') {
      m.sheen = 0.38
      m.sheenColor.set('#9ec954')
      m.sheenRoughness = 0.78
    }
    installExteriorWeathering(m, role, options.waterY)
  }
  m.userData.exteriorSurface = role
  m.userData.finishVersion = 3
  finishes.set(key, m)
  return m
}
