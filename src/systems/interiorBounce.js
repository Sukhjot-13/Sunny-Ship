import { Color, Data3DTexture, LinearFilter, RGBAFormat, Vector3 } from 'three'

const SPACING = .58
const heights = { B1: 6.6, F1: 4.1, F2F: 4.4, F2A: 5.3, F3L: 3.4, F3B: 3.3, F3C: 3.4 }
const daylight = new Set(['Library', "Crow's Nest", 'Bath', 'Kitchen', 'Stern Ladder Access'])
const smooth = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

function roomBounds(interiors) {
  const { rooms, levels, lookoutRoom } = interiors
  const lookout = lookoutRoom?.centre
  const crown = lookout ? [{
    name: "Crow's Nest",
    level: 'F3C',
    x: [lookout[0] - lookoutRoom.bounds[0], lookout[0] + lookoutRoom.bounds[0]],
    y: [lookout[1] - lookoutRoom.bounds[1], lookout[1] + lookoutRoom.bounds[1]],
  }] : []
  return [...rooms, ...crown].filter(room => heights[room.level] && Number.isFinite(levels[room.level])).map(room => {
    const floor = levels[room.level]
    const min = new Vector3(room.x[0], floor, -room.y[1])
    const max = new Vector3(room.x[1], floor + heights[room.level], -room.y[0])
    const area = (max.x - min.x) * (max.z - min.z)
    return { name: room.name, level: room.level, min, max, area }
  }).sort((a, b) => b.area - a.area)
}

/**
 * Ship-space indirect illumination. Bake diffuse colour and enclosure into
 * a small linear volume, so bounce stays in its room as the player moves.
 */
export function createInteriorBounce(interiors, lights = interiors.lights ?? []) {
  const rooms = roomBounds(interiors)
  if (!rooms.length) return null

  const origin = new Vector3(Infinity, Infinity, Infinity)
  const limit = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const room of rooms) {
    origin.min(room.min)
    limit.max(room.max)
  }
  origin.addScalar(-SPACING * 2)
  const counts = limit.sub(origin).addScalar(SPACING * 2).divideScalar(SPACING).ceil()
  const size = counts.clone().multiplyScalar(SPACING)
  const data = new Uint8Array(counts.x * counts.y * counts.z * 4)
  const warm = new Color(), cool = new Color()

  for (const { name, level, min, max } of rooms) {
    const fixtures = lights.filter(light => light.room === name)
    const isDaylit = daylight.has(name) || name === 'Dining Room'
    const isAquarium = name === 'Aquarium Bar'
    warm.set(isAquarium ? '#dfa176' : '#ffd0a1')
    cool.set(isAquarium ? '#63b5d1' : isDaylit ? '#b5d3f6' : '#959ba5')
    const base = isAquarium ? .23 : isDaylit ? .18 : .16
    const start = min.clone().addScalar(-.52).sub(origin).divideScalar(SPACING).floor().max(new Vector3())
    const end = max.clone().addScalar(.52).sub(origin).divideScalar(SPACING).ceil().min(counts)
    for (let z = start.z; z < end.z; z++) {
      const pz = origin.z + (z + .5) * SPACING
      const sideZ = Math.min(pz - min.z, max.z - pz)
      for (let y = start.y; y < end.y; y++) {
        const py = origin.y + (y + .5) * SPACING
        const vertical = Math.min(py - min.y, max.y - py)
        const aboveFloor = py - min.y
        for (let x = start.x; x < end.x; x++) {
          const px = origin.x + (x + .5) * SPACING
          const sideX = Math.min(px - min.x, max.x - px)
          const edge = Math.min(sideX, sideZ)
          const coverage = smooth(-.48, .15, edge) * smooth(-.43, .12, vertical)
          if (coverage <= .001) continue

          let lamp = 0
          for (const { pos, intensity } of fixtures) {
            const dx = px - pos[0], dz = pz + pos[1], dy = py - pos[2]
            lamp += intensity * .006 * Math.exp(-(dx * dx + dz * dz + dy * dy * .8) * .052)
          }
          const wallFloor = smooth(.07, 1.2, edge + aboveFloor * .49)
          const daylightWash = isDaylit ? .135 * Math.exp(-Math.max(0, edge) * .62) : 0
          const ambient = (base + daylightWash) * (.69 + wallFloor * .31)
          const bounce = Math.min(lamp, .29) * (.61 + .39 * wallFloor)
          const i = ((z * counts.y + y) * counts.x + x) * 4
          const weight = Math.round(coverage * 255)
          const keep = 1 - coverage
          data[i] = Math.round(data[i] * keep + weight * (cool.r * ambient + warm.r * bounce))
          data[i + 1] = Math.round(data[i + 1] * keep + weight * (cool.g * ambient + warm.g * bounce))
          data[i + 2] = Math.round(data[i + 2] * keep + weight * (cool.b * ambient + warm.b * bounce))
          const enclosure = level === 'F3C' || name === 'Library' ? .52 : isDaylit ? .67 : .84
          data[i + 3] = Math.round(data[i + 3] * keep + weight * enclosure)
        }
      }
    }
  }

  const texture = new Data3DTexture(data, counts.x, counts.y, counts.z)
  texture.format = RGBAFormat
  texture.minFilter = texture.magFilter = LinearFilter
  texture.needsUpdate = true
  const materials = new Map()
  return {
    texture, origin, size, materials, rooms,
    dispose() {
      texture.dispose()
      for (const material of materials.values()) material.dispose()
    },
  }
}

export function applyInteriorBounce(shader, bounce, projected) {
  shader.uniforms.roomLight = { value: bounce.texture }
  shader.uniforms.roomLightOrigin = { value: bounce.origin }
  shader.uniforms.roomLightSize = { value: bounce.size }
  if (!projected) {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 interiorPosition;
      varying vec3 vInteriorPosition;`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vInteriorPosition = interiorPosition;`)
  }
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
    ${projected ? '' : 'varying vec3 vInteriorPosition;'}
    uniform highp sampler3D roomLight;
    uniform vec3 roomLightOrigin, roomLightSize;`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
    vec3 roomUV = (vInteriorPosition - roomLightOrigin) / roomLightSize;
    vec4 roomBounce = texture(roomLight, roomUV);
    reflectedLight.indirectDiffuse *= 1.0 - roomBounce.a * .73;
    reflectedLight.indirectSpecular *= 1.0 - roomBounce.a * .65;
    reflectedLight.indirectDiffuse += roomBounce.rgb * diffuseColor.rgb * (1.0 - metalnessFactor);
  `)
}
