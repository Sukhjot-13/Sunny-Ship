/** Budgeted warm downlight + soft indirect room bounce from authored marine pendants. */
import * as THREE from 'three'

/** Two shadowed fixtures at most (in `slots`); plus matching soft indirect bounce fills. */
export function createInteriorLightRig(records = []) {
  const group = new THREE.Group(), eye = new THREE.Vector3()
  const fixtures = records.map(record => ({
    ...record,
    position: new THREE.Vector3(record.pos[0], record.pos[2], -record.pos[1]),
    distanceToEye: Infinity,
  }))

  const slots = Array.from({ length: 2 }, () => {
    // Soft feathered wide marine pendant cone so light pools naturally instead of harsh rings
    const light = new THREE.SpotLight('#ffda98', 0, 15.5, 1.44, 0.88, 1.85)
    const target = new THREE.Object3D()
    light.castShadow = true
    light.shadow.mapSize.set(512, 512)
    light.shadow.camera.near = 0.12
    light.shadow.bias = -0.00008
    light.shadow.normalBias = 0.025
    light.shadow.radius = 2.6
    light.target = target
    group.add(light, target)
    return { light, target, fixture: null }
  })

  // Soft non-shadowed warm indirect room-bounce point lights paired with the two active pendants,
  // giving wooden ceilings, curved walls, shelves, and furniture cozy 360° maritime lantern bounce.
  const bounces = Array.from({ length: 2 }, () => {
    const fill = new THREE.PointLight('#ffcc84', 0, 17, 1.65)
    fill.castShadow = false
    group.add(fill)
    return fill
  })

  group.name = 'InteriorPendantLighting'

  /** Select nearby existing lamps, fading smoothly at the room-light budget boundary. */
  function update(camera, delta) {
    group.updateWorldMatrix(true, false)
    camera.getWorldPosition(eye)
    group.worldToLocal(eye)
    for (const f of fixtures) f.distanceToEye = f.position.distanceTo(eye)
    fixtures.sort((a, b) => a.distanceToEye - b.distanceToEye)
    const nearest = fixtures.slice(0, slots.length).filter(f => f.distanceToEye < 12)
    // Keep a fixture in its existing slot when distance ordering crosses over.
    const retained = new Set(slots.filter(s => nearest.includes(s.fixture)).map(s => s.fixture))
    const pending = nearest.filter(f => !retained.has(f))

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      const bounce = bounces[i]
      const f = nearest.includes(slot.fixture) ? slot.fixture : pending.shift()
      const active = !!f
      if (active && slot.fixture !== f) {
        slot.fixture = f
        slot.light.position.copy(f.position)
        slot.target.position.copy(f.position).add(new THREE.Vector3(0, -1, 0))
        slot.light.color.set(f.colour)
        slot.light.intensity = 0
        bounce.position.copy(f.position).add(new THREE.Vector3(0, -0.55, 0))
        bounce.color.set(f.colour).lerp(new THREE.Color('#ffbe70'), 0.25)
        bounce.intensity = 0
      }
      const wanted = active ? f.intensity * (1 - THREE.MathUtils.smoothstep(f.distanceToEye, 8, 12)) : 0
      const step = Math.min(delta, 0.1)
      slot.light.intensity = THREE.MathUtils.damp(slot.light.intensity, wanted, 9, step)
      bounce.intensity = THREE.MathUtils.damp(bounce.intensity, wanted * 0.26, 9, step)
    }
  }

  /** Free only this rig's light targets when the ship is replaced. */
  function dispose() {
    for (const { light } of slots) light.dispose()
    for (const fill of bounces) fill.dispose()
    group.clear()
  }

  return { group, update, dispose, slots }
}
