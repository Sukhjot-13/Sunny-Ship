/**
 * Procedural PBR materials.
 *
 * The source FBX ships 152 materials that are ALL pure black, with no
 * textures and no vertex colours - there is nothing to preserve, so these are
 * generated in code. Colours are accurate to the anime design (cream-green
 * hull, coral trim, plank deck, canvas sails, gold lion) and each one adds
 * procedural surface detail + physically sane roughness/metalness.
 *
 * These are deliberately parameterised so a Blender artist can replace any
 * individual material later without touching call sites.
 */
import * as THREE from 'three'

const cache = new Map()

/** One repeatable micro-detail texture shared by the ship's PBR surfaces. */
let detailTexture
export function surfaceNoiseTexture() {
  if (detailTexture) return detailTexture
  const size=256, data=new Uint8Array(size*size*4)
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const value=Math.round(255*(hash(x,y)*0.35+hash(Math.floor(x/4),Math.floor(y/4))*0.35+hash(Math.floor(x/16),Math.floor(y/16))*0.3))
    const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255
  }
  detailTexture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
  detailTexture.wrapS=detailTexture.wrapT=THREE.RepeatWrapping
  detailTexture.magFilter=THREE.LinearFilter;detailTexture.minFilter=THREE.LinearMipmapLinearFilter
  detailTexture.generateMipmaps=true;detailTexture.needsUpdate=true
  return detailTexture
}

/** Stable authored base colours. Fine procedural detail is paused for geometry QA. */
export function authoredMaterial(source,{solid=false,vertical=false}={}) {
  const key=`authored-${source.name}-${solid}-${vertical}`
  if(cache.has(key)) return cache.get(key)
  const mat=source.clone()
  mat.name=source.name;mat.side=THREE.DoubleSide
  const timber=/Sunny_(deck|timber|darkwood)/.test(source.name)
  const lawn=/Sunny_grass/.test(source.name)
  const glass=/Sunny_glass/.test(source.name)
  const water=/Sunny_tankwater/.test(source.name)
  const gold=/Sunny_gold/.test(source.name)
  mat.roughness=timber?0.66:lawn?0.95:gold?0.46:0.54
  if(gold) mat.metalness=0.6
  if(glass||water){mat.transparent=true;mat.opacity=water?0.16:0.22;mat.roughness=0.16;mat.depthWrite=false}
  // The previous procedural grain/relief alias at grazing camera angles while
  // walking. Keep this base-colour pass free of subpixel noise until geometry
  // and access are approved; legacy material helpers remain available below.
  cache.set(key,mat)
  return mat
}

function base(name, params) {
  if (cache.has(name)) return cache.get(name)
  const m = new THREE.MeshStandardMaterial({ name, ...params })
  cache.set(name, m)
  return m
}

/** Wood: plank/grain structure, used for the deck and masts. */
export function woodMaterial({ color, dark, repeat = [2, 2], plankScale = 8 } = {}) {
  const key = `wood-${color}-${dark}-${repeat}-${plankScale}`
  if (cache.has(key)) return cache.get(key)

  const mat = base(key, {
    color: new THREE.Color(color),
    roughness: 0.78,
    metalness: 0.0,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWoodDark = { value: new THREE.Color(dark) }
    shader.uniforms.uPlankScale = { value: plankScale }
    shader.uniforms.uGrain = { value: new THREE.Color('#ffffff') }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vObjPos;`
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vObjPos = position;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vObjPos;
       uniform vec3 uWoodDark;
       uniform float uPlankScale;
       uniform float uGrain;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       {
         // plank rows across the dominant horizontal axis
         float row = vObjPos.y * uPlankScale;
         float plankId = floor(row);
         float plankGap = smoothstep(0.0, 0.06, fract(row)) *
                          smoothstep(0.0, 0.06, 1.0 - fract(row));
         // stagger the plank tone per row so it reads as separate boards
         float tone = fract(sin(plankId * 12.9898) * 43758.5453);
         vec3 plankCol = mix(uWoodDark, vec3(1.0), 0.25 + tone * 0.35);

         // long grain streaks along the plank
         float grain = sin((vObjPos.x * 26.0 + vObjPos.z * 9.0) + tone * 6.28);
         grain = smoothstep(0.55, 1.0, grain);

         vec3 wood = mix(plankCol * 0.82, plankCol, grain);
         wood = mix(vec3(0.18, 0.12, 0.07), wood, plankGap);

         diffuseColor.rgb *= wood;
       }`
    )

    // vary roughness so the seams and grain catch light differently
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       {
         float row = vObjPos.y * uPlankScale;
         float plankId = floor(row);
         float tone = fract(sin(plankId * 12.9898) * 43758.5453);
         float grain = sin((vObjPos.x * 26.0 + vObjPos.z * 9.0) + tone * 6.28);
         grain = smoothstep(0.55, 1.0, grain);
         roughnessFactor = clamp(roughnessFactor + (0.5 - tone) * 0.14 - grain * 0.06, 0.35, 1.0);
       }`
    )
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/**
 * The main ship surface material.
 *
 * The source model merges the hull sides and the deck planking into a handful
 * of very large meshes, so no per-object material assignment can separate
 * them. Instead this shader decides per-fragment:
 *
 *   - upward-facing surfaces near deck height  -> timber planking
 *   - everything else                          -> cream/green painted hull
 *
 * That matches how the Thousand Sunny actually looks: pale planked deck
 * inside, cream-green painted topsides and bulwarks outside.
 */
export function shipSurfaceMaterial({
  deckY = 0,
  waterY = -14,
  hullColor = '#9c1d24',
  hullSeam = '#6f1219',
  hullTrim = '#f4eee2',
  hullWood = '#c79a62',
  deckColor = '#c79a62',
  deckDark = '#8a6134',
  plankWidth = 0.78,
  rowLength = 3.1,
  metalness = 0.02,
  roughness = 0.66,
} = {}) {
  const key = `ship-${waterY}-${hullColor}-${deckColor}-${plankWidth}`
  if (cache.has(key)) return cache.get(key)

  const mat = base(key, {
    color: new THREE.Color(hullColor),
    roughness,
    metalness,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterY = { value: waterY }
    shader.uniforms.uHull = { value: new THREE.Color(hullColor) }
    shader.uniforms.uHullSeam = { value: new THREE.Color(hullSeam) }
    shader.uniforms.uHullTrim = { value: new THREE.Color(hullTrim) }
    shader.uniforms.uHullWood = { value: new THREE.Color(hullWood) }
    shader.uniforms.uDeck = { value: new THREE.Color(deckColor) }
    shader.uniforms.uDeckDark = { value: new THREE.Color(deckDark) }
    shader.uniforms.uPlankW = { value: plankWidth }
    shader.uniforms.uRowL = { value: rowLength }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>',
        '#include <common>\n varying vec3 vWPos;\n varying vec3 vWNrm;')
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vWNrm = normalize(mat3(modelMatrix) * objectNormal);')

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm;
        uniform float uWaterY, uPlankW, uRowL;
        uniform vec3 uHull, uHullSeam, uHullTrim, uHullWood, uDeck, uDeckDark;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          // ---- is this a deck surface? any up-facing timber surface above
          //      the waterline. Testing against one exact deck height left the
          //      ship's other three deck levels rendering as bare hull.
          float upness = smoothstep(0.50, 0.85, vWNrm.y);
          float aboveWater = smoothstep(uWaterY + 0.3, uWaterY + 2.2, vWPos.y);
          float isDeck = clamp(upness * aboveWater, 0.0, 1.0);

          // ---- timber planking (XZ plane)
          float row = vWPos.z / uPlankW;
          float rowId = floor(row), rowF = fract(row);
          float plankId = floor(vWPos.x / uRowL + rowId * 0.37);
          float plankF = fract(vWPos.x / uRowL + rowId * 0.37);
          float t1 = fract(sin(rowId * 12.9898) * 43758.5453);
          float t2 = fract(sin(plankId * 78.233) * 43758.5453);
          // vary each board around the base timber colour. Mixing toward
          // white instead washed the whole deck out to near-white.
          vec3 plankCol = uDeck * (0.74 + t1 * 0.30 + t2 * 0.14);
          plankCol = mix(plankCol, uDeckDark, 0.30 * t2);
          float gapZ = smoothstep(0.0, 0.05, rowF) * smoothstep(0.0, 0.05, 1.0 - rowF);
          float gapX = smoothstep(0.0, 0.012, plankF) * smoothstep(0.0, 0.012, 1.0 - plankF);
          float grain = smoothstep(0.15, 1.0, 0.5 + 0.5 * sin(vWPos.x * 5.5 + t1 * 21.0 + t2 * 9.0));
          vec3 wood = mix(plankCol * 0.70, plankCol * 1.04, grain);
          wood = mix(uDeckDark * 0.35, wood, gapZ * gapX);

          // ---- painted topsides: deep crimson with the Sunny's white
          //      swooping trim bands running the length of the hull
          float hRow = vWPos.y * 2.4;
          float hId = floor(hRow);
          float hSeam = 1.0 - smoothstep(0.0, 0.10, abs(fract(hRow) - 0.5) * 2.0 - 0.82);
          float hCol = vWPos.x * 0.7 + hId * 0.41;
          float hJoint = 1.0 - smoothstep(0.0, 0.05, abs(fract(hCol) - 0.5) * 2.0 - 0.88);
          float bleach = clamp(vWNrm.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 hull = mix(uHull * 0.88, uHull * 1.10, bleach);
          hull = mix(hull, uHullSeam, hSeam * 0.40 + hJoint * 0.20);

          // three diagonal white bands, like the painted curves on the real hull.
          // bandF is a 0..1 triangle wave, so a high threshold gives THIN
          // stripes; a low one floods the whole hull white.
          float band = (vWPos.y * 0.62 + vWPos.x * 0.085) / 6.0;
          float bandF = abs(fract(band) - 0.5) * 2.0;
          float trim = smoothstep(0.90, 0.975, bandF);
          // keep the trim off up-facing surfaces so decks stay timber
          trim *= 1.0 - upness;
          hull = mix(hull, uHullTrim, trim * 0.95);

          // ---- below the waterline the hull is bare timber, not paint
          float below = 1.0 - smoothstep(uWaterY - 0.6, uWaterY + 1.4, vWPos.y);
          vec3 under = mix(uHullWood * 0.72, uHullWood, grain);
          hull = mix(hull, under, below);

          diffuseColor.rgb = mix(hull, wood, isDeck);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          float upness = smoothstep(0.50, 0.85, vWNrm.y);
          float aboveWater = smoothstep(uWaterY + 0.3, uWaterY + 2.2, vWPos.y);
          float isDeck = clamp(upness * aboveWater, 0.0, 1.0);
          roughnessFactor = mix(0.60, 0.86, isDeck);
        }`)
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/**
 * Deck planking. The generic wood material derives its plank rows from local
 * Y, which is correct for a vertical mast but degenerate on a flat deck (Y is
 * near-constant, so the pattern turns into moire). This one lays the planks
 * out in the local XZ plane and adds butt joints.
 */
export function deckWoodMaterial({ color, dark, plankWidth = 0.78, rowLength = 3.1 } = {}) {
  const key = `deckwood-${color}-${dark}-${plankWidth}-${rowLength}`
  if (cache.has(key)) return cache.get(key)

  const mat = base(key, {
    color: new THREE.Color(color),
    roughness: 0.82,
    metalness: 0.0,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWoodDark = { value: new THREE.Color(dark) }
    shader.uniforms.uPlankW = { value: plankWidth }
    shader.uniforms.uRowL = { value: rowLength }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n varying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjPos = position;')

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\n varying vec3 vObjPos;\n uniform vec3 uWoodDark;\n uniform float uPlankW;\n uniform float uRowL;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           // planks run along local X, stacked along local Z
           float row = vObjPos.z / uPlankW;
           float rowId = floor(row);
           float rowF = fract(row);

           float plankId = floor(vObjPos.x / uRowL + rowId * 0.37);
           float plankF = fract(vObjPos.x / uRowL + rowId * 0.37);

           // per-plank tone variation
           float t1 = fract(sin(rowId * 12.9898) * 43758.5453);
           float t2 = fract(sin(plankId * 78.233) * 43758.5453);
           vec3 plankCol = mix(uWoodDark, vec3(1.0), 0.55 + t1 * 0.30 + t2 * 0.16);

           // gaps between boards
           float gapZ = smoothstep(0.0, 0.05, rowF) * smoothstep(0.0, 0.05, 1.0 - rowF);
           float gapX = smoothstep(0.0, 0.012, plankF) * smoothstep(0.0, 0.012, 1.0 - plankF);

           // long grain along the board
           float grain = sin(vObjPos.x * 5.5 + t1 * 21.0 + t2 * 9.0);
           grain = smoothstep(0.15, 1.0, grain);

           vec3 wood = mix(plankCol * 0.70, plankCol * 1.04, grain);
           wood = mix(uWoodDark * 0.35, wood, gapZ * gapX);

           diffuseColor.rgb *= wood;
         }`
      )
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/** Painted hull planking: cream-green with subtle plank seams and wear. */
export function hullMaterial({ color, seam = '#9aa88c', plankScale = 5 } = {}) {
  const key = `hull-${color}-${seam}-${plankScale}`
  if (cache.has(key)) return cache.get(key)

  const mat = base(key, {
    color: new THREE.Color(color),
    roughness: 0.62,
    metalness: 0.03,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeam = { value: new THREE.Color(seam) }
    shader.uniforms.uPlankScale = { value: plankScale }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vObjPos;\n varying vec3 vObjNrm;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vObjPos = position;\n vObjNrm = normal;`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n varying vec3 vObjPos;\n varying vec3 vObjNrm;\n uniform vec3 uSeam;\n uniform float uPlankScale;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           // horizontal plank seams that follow the hull curve
           float row = vObjPos.y * uPlankScale;
           float seamMask = 1.0 - smoothstep(0.0, 0.05, abs(fract(row) - 0.5) * 2.0 - 0.86);

           // faint vertical butt joints
           float col = vObjPos.x * 0.9 + floor(row) * 0.37;
           float joint = 1.0 - smoothstep(0.0, 0.035, abs(fract(col) - 0.5) * 2.0 - 0.9);

           // paint wear: lighter toward upward faces (sun bleaching)
           float up = clamp(vObjNrm.z * 0.5 + 0.5, 0.0, 1.0);
           vec3 worn = mix(diffuseColor.rgb * 0.92, diffuseColor.rgb * 1.06, up);

           worn = mix(worn, uSeam, seamMask * 0.55 + joint * 0.25);
           diffuseColor.rgb *= worn;
         }`
      )
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/** Sail canvas: woven cloth with panel seams and a painted stripe. */
export function sailMaterial({ color, stripe = null, stripeAt = 0.5 } = {}) {
  const key = `sail-${color}-${stripe}-${stripeAt}`
  if (cache.has(key)) return cache.get(key)

  const mat = base(key, {
    color: new THREE.Color(color),
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShade = { value: new THREE.Color('#d8cfb8') }
    shader.uniforms.uStripe = { value: stripe ? new THREE.Color(stripe) : new THREE.Color(0, 0, 0) }
    shader.uniforms.uStripeAt = { value: stripeAt }
    shader.uniforms.uHasStripe = { value: stripe ? 1 : 0 }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vObjPos;\n varying vec3 vObjNrm;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vObjPos = position;\n vObjNrm = normal;`)

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos;
         varying vec3 vObjNrm;
         uniform vec3 uShade;
         uniform vec3 uStripe;
         uniform float uStripeAt;
         uniform float uHasStripe;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           // woven cloth: fine cross-hatch
           float weave = sin(vObjPos.x * 180.0) * sin(vObjPos.y * 180.0);
           weave = 0.5 + weave * 0.5;

           // vertical panel seams every ~0.9 units
           float panel = 1.0 - smoothstep(0.0, 0.02, abs(fract(vObjPos.x * 1.1) - 0.5) * 2.0 - 0.94);

           vec3 c = mix(diffuseColor.rgb, uShade, 0.16 * (1.0 - weave));
           c = mix(c, uShade, panel * 0.5);

           // painted stripe band
           float d = abs(vObjPos.y - uStripeAt);
           float band = 1.0 - smoothstep(0.06, 0.10, d);
           c = mix(c, uStripe, band * uHasStripe * 0.85);

           diffuseColor.rgb = c;
         }`
      )
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/** Polished painted metal / brass fittings. */
export function metalMaterial({ color, roughness = 0.34, metalness = 0.85 } = {}) {
  return base(`metal-${color}-${roughness}-${metalness}`, {
    color: new THREE.Color(color),
    roughness,
    metalness,
  })
}

/** Rope / rigging: fibrous, matte. */
export function ropeMaterial({ color = '#c8b48a' } = {}) {
  const key = `rope-${color}`
  if (cache.has(key)) return cache.get(key)
  const mat = base(key, { color: new THREE.Color(color), roughness: 0.95, metalness: 0.0 })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vObjPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n vObjPos = position;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n varying vec3 vObjPos;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           float twist = sin((vObjPos.x + vObjPos.y + vObjPos.z) * 90.0);
           diffuseColor.rgb *= 0.88 + twist * 0.12;
         }`
      )
  }
  mat.customProgramCacheKey = () => key
  return mat
}

/** Everything the GLB has not been given an explicit material for. */
export function fallbackMaterial() {
  return base('fallback', {
    color: new THREE.Color('#cfc9b8'),
    roughness: 0.72,
    metalness: 0.02,
  })
}

/**
 * Resolve a material for a ship node, from the semantic tag written by the
 * Blender pipeline. Called once per node and memoised in the map cache.
 */
export function resolveMaterial(part, name = '', deckY = 0, waterY = -14) {
  const n = (name || '').toLowerCase()

  switch (part) {
    case 'sail':
      // canvas is warm off-white; the reference has a gold sun emblem on the
      // fore sail and a red/black striped sail on the main mast
      if (n.includes('002') || n.includes('03')) {
        return sailMaterial({ color: '#f6f2e6', stripe: '#b3202a', stripeAt: 0.45 })
      }
      return sailMaterial({ color: '#f6f2e6', stripe: '#e0b23c', stripeAt: 0.45 })
    case 'mast':
      return woodMaterial({ color: '#8a5a30', dark: '#5d3a1c', plankScale: 3 })
    case 'rigging':
      return ropeMaterial({})
    case 'trim':
      // white painted trim: railings, window frames, the scrollwork
      return hullMaterial({ color: '#f2ece0', seam: '#cdc4b2', plankScale: 7 })
    case 'hull_below':
      return shipSurfaceMaterial({ deckY, waterY })
    case 'deck':
    case 'hull':
      // the lion figurehead and gold fittings read best as metal
      if (n.includes('sphere')) return metalMaterial({ color: '#e8b64c', roughness: 0.3, metalness: 0.8 })
      return shipSurfaceMaterial({ deckY, waterY })
    default:
      return fallbackMaterial()
  }
}
