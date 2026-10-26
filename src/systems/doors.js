/**
 * Runtime door + hatch state machine.
 *
 * PURE LOGIC: no three.js, no React, no DOM, no globals. `DoorSystem.jsx` owns
 * the scene objects and calls `update()` once per frame; this module only does
 * arithmetic and hands back a collider set. That split is deliberate - the
 * "never trap the player" rule below is the one piece of logic that has to be
 * provably correct, and it can only be proven against a pure module.
 *
 * ---------------------------------------------------------------------------
 * COORDINATES
 * ---------------------------------------------------------------------------
 * Entries in `public/models/ship-metadata.json` (`interiors.doors`) are
 * authored in Blender Z-up. They are converted here with the same rule as
 * `shipMeta.toThree`:  (x, y, z)_blender -> (x, z, -y)_three.
 *
 * Metadata contract, per opening:
 *   pos      [x, y, z]  Blender; centre of the opening at FLOOR level.
 *   rot      number     the wall's local +X axis, as radians about Blender Z.
 *   width    number     leaf width  (hatch: opening width across local X)
 *   height   number     leaf height (door) / ignored (hatch)
 *   thickness number     leaf/lid thickness along the wall normal (door) or
 *                        vertically (hatch)
 *   depth    number     hatch only: lid depth in the floor plane (local Z)
 *   slide    [dx,dy,dz] slide mode: full travel vector, Blender coords
 *   hinge    [hx, hy]   swing mode: hinge offset from `pos` in the leaf's own
 *                        local X (across the opening) and local Y (along the
 *                        wall normal). Both are horizontal - the rotation axis
 *                        is vertical, so a vertical component would be a no-op.
 *   angle    number     swing mode: signed open angle in radians, +ve about
 *                        the three.js +Y axis.
 *   node     string     name of the moving leaf/lid in sunny.glb
 *
 * Because `toThree` is a proper rotation, a rotation of `rot` about Blender Z
 * becomes a rotation of the SAME value about three.js +Y, and the leaf's local
 * axes map to:
 *   local X (across the opening) -> ex = ( cos rot, 0, -sin rot)
 *   local Y (along the normal)   -> ey = (-sin rot, 0, -cos rot)
 *   local Z (up)                 -> (0, 1, 0)
 * The only authored `rot` values today are 0 and 1.57, both cardinal, so a
 * shut sliding leaf's box is exactly axis aligned; a swung leaf never is.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE THAT MATTERS: A MOVING SOLID NEVER TOUCHES THE PLAYER
 * ---------------------------------------------------------------------------
 * Before openness is allowed to reach a new candidate value, the leaf's
 * candidate solid box is swept from the current value to the candidate. The
 * capsule is inflated by the distance the leaf can travel in that step, which
 * makes the test a proof about the whole continuous path rather than a set of
 * samples - a lid sliding past the player never has either end point inside the
 * capsule, so sampling it would miss exactly the case that matters. If the step
 * is not clear, the animation is bisected down to the last clear value and
 * `blocked` is reported. The published collider is therefore always capsule-free
 * by construction, and the clamp resumes from there on the next frame - so a
 * player who walks into a closing door simply pushes it back open and is never
 * pushed, squeezed or trapped by it.
 *
 * ---------------------------------------------------------------------------
 * COLLISION IS AXIS ALIGNED ONLY (documented approximation)
 * ---------------------------------------------------------------------------
 * `collision.js` is a pure Box3 world, so an oriented leaf is published as the
 * axis-aligned bounding box of its rotated extents. Exact for closed cardinal
 * doors (rot 0 / 1.57) and for hatches; for a swung leaf the AABB is larger
 * than the leaf, most visibly at ~45 deg where the AABB of a 1.1 m leaf is
 * ~1.5 m square. The consequence is a small invisible "no-go" wedge beside an
 * open swing door - never a hole, which is the failure direction that matters.
 * The trap test uses the SAME AABB that gets published, so "never overlaps the
 * capsule" is guaranteed for the box the physics actually sees.
 *
 * ---------------------------------------------------------------------------
 * DOORS vs HATCHES
 * ---------------------------------------------------------------------------
 * `kind: 'door'`  auto-opens on approach and auto-closes once the player has
 *                  cleared the opening (with hysteresis).
 * `kind: 'hatch'` is a floor panel and NEVER auto-opens - it is toggled by
 *                  interaction only (`toggleHatch` / `interactNearest`). Its
 *                  collider supports feet at the lid's current footprint.
 *                  Sliding it aside removes support from the real opening.
 *                  A flat lid may withdraw beneath feet resting on its top;
 *                  it cannot move through a body crossing the hatch plane.
 */

export const APPROACH_R = 2.6
export const CLOSE_R = 3.4
export const OPEN_TIME = 0.55
export const CLOSE_TIME = 0.8
export const FEET_BAND_BELOW = 0.4
export const FEET_BAND_ABOVE = 0.6
export const INTERACT_R = 2.0
export const PLAYER_RADIUS = 0.34
export const PLAYER_HEIGHT = 1.75
export const CONTACT_GAP = 0.02
export const OPEN_COUNT_AT = 0.5
export const TRAP_STEPS = 14
export const MIN_SIZE = 0.02
export const MAX_SIZE = 24
const MAX_DT = 0.1

const EMPTY_OPTS = {}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

function num(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Blender (x, y, z) -> three.js (x, z, -y), per shipMeta.toThree. */
function toThree(v, fallback) {
  if (!Array.isArray(v) || v.length < 3) return fallback
  const x = num(v[0], NaN)
  const y = num(v[1], NaN)
  const z = num(v[2], NaN)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return fallback
  return [x, z, -y]
}

/** Read a player position given as an array or as an {x, y, z} object. */
function vec3(v) {
  if (Array.isArray(v)) return [num(v[0], 0), num(v[1], 0), num(v[2], 0)]
  if (v && typeof v === 'object') return [num(v.x, 0), num(v.y, 0), num(v.z, 0)]
  return [0, 0, 0]
}

/**
 * One opening, normalised into three.js space with everything the per-frame
 * maths needs precomputed. Mutated in place for the lifetime of the system.
 */
export function normalizeDoor(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  if (!id) return null

  const kind = raw.kind === 'hatch' ? 'hatch' : 'door'
  const mode = raw.mode === 'lift' && kind === 'hatch' ? 'lift' : raw.mode === 'swing' ? 'swing' : 'slide'
  const pos = toThree(raw.pos, null)
  if (!pos) return null

  const rot = num(raw.rot, 0)
  const width = clamp(num(raw.width, kind === 'hatch' ? 1.2 : 1.1), MIN_SIZE, MAX_SIZE)
  const height = clamp(num(raw.height, 2.2), MIN_SIZE, MAX_SIZE)
  const thickness = clamp(num(raw.thickness, 0.07), MIN_SIZE, MAX_SIZE)
  const depth = clamp(num(raw.depth, width), MIN_SIZE, MAX_SIZE)
  const slide = toThree(raw.slide, [0, 0, 0])
  const hinge = Array.isArray(raw.hinge) ? [num(raw.hinge[0], 0), num(raw.hinge[1], 0)] : [0, 0]
  const angle = num(raw.angle, mode === 'slide' ? 0 : Math.PI / 2)

  // leaf frame
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const ex = [c, 0, -s]
  const ey = [-s, 0, -c]

  // half extents along local X (across), local Y (along the normal), up
  const hW = width / 2
  const hD = (kind === 'hatch' ? depth : thickness) / 2
  const hU = (kind === 'hatch' ? thickness : height) / 2

  const rooms = Array.isArray(raw.rooms) ? raw.rooms.map(String) : []
  const label = rooms.length ? `${rooms.join(' / ')} ${kind}` : `${id} ${kind}`

  return {
    id,
    kind,
    mode,
    rooms,
    label,
    node: String(raw.node ?? ''),
    pos,
    rot,
    width,
    height,
    thickness,
    depth,
    slide,
    hinge,
    angle,
    ex,
    ey,
    hW,
    hD,
    hU,
    centreY: pos[1] + num(raw.baseOffset, kind === 'hatch' ? hU : 0.03 + height / 2),
    bandLow: pos[1] - (kind === 'hatch' ? PLAYER_HEIGHT + 0.3 : FEET_BAND_BELOW),
    bandHigh: kind === 'hatch' ? pos[1] + FEET_BAND_ABOVE : pos[1] + height + FEET_BAND_ABOVE,
    // horizontal pivot offset from `pos`, [x, z] in three.js space
    pivotOffset: mode === 'swing' ? [ex[0] * hinge[0] + ey[0] * hinge[1], ex[2] * hinge[0] + ey[2] * hinge[1]] : [0, 0],
    state: { openness: 0, target: 0, blocked: false, holdOpen: false, latched: false },
    info: { id, kind, label, open: false },
    collider: { min: [0, 0, 0], max: [0, 0, 0], isFloor: kind === 'hatch', name: `${kind === 'hatch' ? 'HATCH' : 'DOOR'}_${id}` },
    probe: [0, 0, 0, 0, 0, 0],
    motion: [0, 0, 0, 0],
  }
}

/** Closed-centre displacement and rotation; shared by visible and solid leaves.
 * A lift hinges about local Y at floor level, along the lid's +X edge.
 */
export function doorMotion(door, t, out) {
  const th = door.angle * t, c = Math.cos(th), s = Math.sin(th)
  out[3] = door.mode === 'slide' ? 0 : th
  if (door.mode === 'swing') {
    const [hx, hz] = door.pivotOffset
    out[0] = hx - hx*c - hz*s; out[1] = 0; out[2] = hz + hx*s - hz*c
  } else if (door.mode === 'lift') {
    const h = door.hinge[0], v = door.centreY-door.pos[1]
    const along = h*(1-c)+v*s
    out[0] = door.ex[0]*along; out[2] = door.ex[2]*along
    out[1] = h*s+v*(c-1)
  } else {
    out[0] = door.slide[0]*t; out[1] = door.slide[1]*t; out[2] = door.slide[2]*t
  }
  return out
}

/**
 * Write the leaf's world AABB at openness `t` into `out`
 * ([minX, minY, minZ, maxX, maxY, maxZ]). Slide/hatch leaves translate; swing
 * leaves rotate about the hinge and their AABB is the bounding box of the
 * rotated extents (see the AABB note at the top of this file).
 */
function writeBox(door, t, out) {
  const motion = doorMotion(door,t,door.motion)
  const cx = door.pos[0]+motion[0], cy = door.centreY+motion[1], cz = door.pos[2]+motion[2]
  const yaw = door.rot+(door.mode==='swing'?motion[3]:0)
  const ca = Math.abs(Math.cos(yaw))
  const sa = Math.abs(Math.sin(yaw))
  const lift = door.mode==='lift', c = Math.abs(Math.cos(motion[3])), s = Math.abs(Math.sin(motion[3]))
  const hw = lift ? door.hW*c+door.hU*s : door.hW
  const hx = hw * ca + door.hD * sa
  const hz = hw * sa + door.hD * ca
  const hy = lift ? door.hW*s+door.hU*c : door.hU
  out[0] = cx - hx; out[1] = cy - hy; out[2] = cz - hz
  out[3] = cx + hx; out[4] = cy + hy; out[5] = cz + hz
}

/**
 * How far any point of the leaf can travel while openness goes a -> b.
 * Slide/hatch: the straight travel distance. Swing: the arc, bounded by
 * `radius * dTheta`, where the radius is the furthest leaf corner from the
 * hinge (the chord is never longer than the arc).
 */
function travel(door, a, b) {
  const dt = Math.abs(b - a)
  if (!(dt > 0)) return 0
  const reach = door.mode === 'lift'
    ? Math.hypot(Math.abs(door.hinge[0])+door.hW,Math.abs(door.centreY-door.pos[1])+door.hU)*Math.abs(door.angle)
    : door.mode === 'swing'
    ? (Math.hypot(door.pivotOffset[0], door.pivotOffset[1]) + door.hW + door.hD) * Math.abs(door.angle)
    : Math.hypot(door.slide[0], door.slide[1], door.slide[2])
  const d = reach * dt
  // A NaN here would make every comparison in stepClear false, which reads as
  // "clear" and switches the trap rule off. Fail towards stopping the leaf.
  return Number.isFinite(d) ? d : Number.MAX_VALUE
}

/**
 * True when the leaf's WHOLE continuous path from openness `a` to `b` stays at
 * least CONTACT_GAP clear of the capsule.
 *
 * This is a proof, not a sample: the capsule is inflated by the distance the
 * leaf can travel during the step, so "the box at `b` is outside the inflated
 * capsule" implies "the box at every openness in [a, b] is outside the real
 * capsule". Sampling cannot give that guarantee - a lid sliding across the
 * player between two frames crosses the capsule without either end point being
 * inside it, which is precisely the case this rule exists to stop.
 */
function stepClear(door, a, b, px, py, pz) {
  const p = door.probe
  writeBox(door, b, p)
  if(door.mode==='slide'){
    // The endpoint union contains the entire translating leaf. Expanding all
    // axes by its travel falsely prevents a door sliding beside a person.
    // Flat lids retain the real resting-foot rule without vertical padding.
    const delta=b-a
    const dx=door.slide[0]*delta,dy=door.slide[1]*delta,dz=door.slide[2]*delta
    const verticalGap=door.kind==='hatch'&&door.slide[1]===0?0:CONTACT_GAP
    return !(
      Math.max(p[3],p[3]-dx)>px-PLAYER_RADIUS-CONTACT_GAP &&
      Math.min(p[0],p[0]-dx)<px+PLAYER_RADIUS+CONTACT_GAP &&
      Math.max(p[4],p[4]-dy)>py-verticalGap && Math.min(p[1],p[1]-dy)<py+PLAYER_HEIGHT+verticalGap &&
      Math.max(p[5],p[5]-dz)>pz-PLAYER_RADIUS-CONTACT_GAP &&
      Math.min(p[2],p[2]-dz)<pz+PLAYER_RADIUS+CONTACT_GAP
    )
  }
  const slack = CONTACT_GAP + travel(door, a, b)
  return !(
    p[3] > px - PLAYER_RADIUS - slack && p[0] < px + PLAYER_RADIUS + slack &&
    p[4] > py - slack && p[1] < py + PLAYER_HEIGHT + slack &&
    p[5] > pz - PLAYER_RADIUS - slack && p[2] < pz + PLAYER_RADIUS + slack
  )
}

/**
 * Largest openness in [from, to] whose whole path is capsule-clear.
 *
 * `clear` is monotone (the swept region for a bigger step contains the region
 * for a smaller one), so a plain bisection is exact rather than heuristic:
 * 14 iterations resolves the bound to well under a millimetre.
 */
function clampToPlayer(door, from, to, px, py, pz) {
  if (stepClear(door, from, to, px, py, pz)) return to
  // already touching or overlapping - hold still rather than push the player
  if (!stepClear(door, from, from, px, py, pz)) return from
  let lo = 0
  let hi = 1
  for (let i = 0; i < TRAP_STEPS; i++) {
    const mid = (lo + hi) * 0.5
    if (stepClear(door, from, from + (to - from) * mid, px, py, pz)) lo = mid
    else hi = mid
  }
  return from + (to - from) * lo
}

export function createDoorSystem(rawDoors) {
  const doors = []
  const seen = new Set()

  const list = Array.isArray(rawDoors) ? rawDoors : []
  for (const raw of list) {
    const door = normalizeDoor(raw)
    if (!door || seen.has(door.id)) continue
    seen.add(door.id)
    doors.push(door)
  }

  /** Fill a door's published collider from its current openness. */
  function writeCollider(door) {
    const box = door.collider
    writeBox(door, door.state.openness, door.probe)
    box.min[0] = door.probe[0]; box.min[1] = door.probe[1]; box.min[2] = door.probe[2]
    box.max[0] = door.probe[3]; box.max[1] = door.probe[4]; box.max[2] = door.probe[5]
    return box
  }

  const states = {}
  for (const door of doors) {
    states[door.id] = door.state
    writeCollider(door)
  }

  const colliders = []
  const result = { colliders, states, openCount: 0, near: null, enabled: true }

  /**
   * Every leaf is published as solid, open or shut: "open" means the doorway
   * is passable, not that the leaf has stopped existing. A fully open sliding
   * leaf is parked flat against the wall (still a real obstacle) and a swung
   * leaf is out in the room.
   */
  function publish() {
    colliders.length = 0
    let open = 0
    for (const door of doors) {
      const box = writeCollider(door)
      if (door.state.openness > OPEN_COUNT_AT) open++
      colliders.push(box)
    }
    result.openCount = open
    return colliders
  }

  function reset() {
    for (const door of doors) {
      const s = door.state
      s.openness = 0
      s.target = 0
      s.blocked = false
      s.holdOpen = false
      s.latched = false
      door.info.open = false
    }
    colliders.length = 0
    result.openCount = 0
    result.near = null
    result.enabled = false
  }

  /** Nearest hatch within reach, given a feet position in three.js space. */
  function nearestHatch(px, py, pz) {
    let best = null
    let bestDist = INTERACT_R
    for (const door of doors) {
      if (door.kind !== 'hatch') continue
      if (py < door.bandLow || py > door.bandHigh) continue
      const dx = px - door.pos[0]
      const dz = pz - door.pos[2]
      // Reach the physical opening's edge. A longer stairwell cover should
      // remain operable from its exit landing without standing on the lid.
      const localX = dx*door.ex[0]+dz*door.ex[2]
      const localY = dx*door.ey[0]+dz*door.ey[2]
      const dist = Math.hypot(Math.max(0,Math.abs(localX)-door.hW),
                              Math.max(0,Math.abs(localY)-door.hD))
      if (dist > bestDist) continue
      bestDist = dist
      best = door
    }
    if (!best) return null
    best.info.open = best.state.openness > OPEN_COUNT_AT
    return best.info
  }

  /** Nearest hatch within reach of `playerPosition`, else null. */
  function nearestInteraction(playerPosition) {
    if (!playerPosition) return null
    const p = vec3(playerPosition)
    return nearestHatch(p[0], p[1], p[2])
  }

  /**
   * Advance every leaf.
   *
   * @param {number} dt seconds (clamped, non-finite treated as 0)
   * @param {number[]|{x:number,y:number,z:number}|null} playerPosition FEET
   *        position in three.js space; null closes everything
   * @param {{enabled?:boolean}} [options] enabled:false snaps shut and clears
   * @returns {{colliders:Array,states:Object,openCount:number,near:?Object,enabled:boolean}}
   *          the dynamic collider set and the per-door state, both reused
   *          between frames (mutated in place, never reallocated)
   */
  function update(dt, playerPosition, options) {
    const o = options || EMPTY_OPTS
    if (o.enabled === false || o.active === false) {
      if (result.enabled) reset()
      return result
    }
    result.enabled = true

    const step = num(dt, 0)
    const d = clamp(step, 0, MAX_DT)

    let hasPlayer = false
    let px = 0
    let py = 0
    let pz = 0
    if (playerPosition) {
      const p = vec3(playerPosition)
      px = p[0]; py = p[1]; pz = p[2]
      hasPlayer = Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)
    }

    for (const door of doors) {
      const s = door.state

      // ---- target -------------------------------------------------
      if (door.kind === 'hatch') {
        // Hatches never auto-open; `latched` is only changed by interaction.
        s.target = hasPlayer && s.latched ? 1 : 0
      } else if (!hasPlayer) {
        s.holdOpen = false
        s.target = 0
      } else {
        const dx = px - door.pos[0]
        const dz = pz - door.pos[2]
        const dist = Math.hypot(dx, dz)
        const inBand = py >= door.bandLow && py <= door.bandHigh
        // hysteresis: inside CLOSE_R and inside the band the previous decision
        // stands, so a player loitering between the radii cannot make it chatter
        if (dist <= APPROACH_R && inBand) s.holdOpen = true
        else if (dist > CLOSE_R || !inBand) s.holdOpen = false
        // a player standing in the opening keeps it open, always
        if (dist <= door.hW + PLAYER_RADIUS && inBand) s.holdOpen = true
        s.target = s.holdOpen ? 1 : 0
      }

      // ---- animate, clamped so the leaf never reaches the capsule ----
      s.blocked = false
      if (s.target !== s.openness && d > 0) {
        const dir = s.target > s.openness ? 1 : -1
        const span = dir > 0 ? OPEN_TIME : CLOSE_TIME
        let candidate = clamp(s.openness + (dir * d) / span, 0, 1)
        if (hasPlayer) {
          const safe = clampToPlayer(door, s.openness, candidate, px, py, pz)
          // `safe` lies between the current and candidate values, and which end
          // it sits at depends on the direction: a clamped OPENING is below the
          // candidate, a clamped CLOSING is above it. Anything but an exact
          // match means the trap rule bit.
          if (safe !== candidate) {
            s.blocked = true
            candidate = safe
          }
        }
        s.openness = candidate
      }

      door.info.open = s.openness > OPEN_COUNT_AT
    }

    publish()
    result.near = hasPlayer ? nearestHatch(px, py, pz) : null
    return result
  }

  /** Latch a hatch open/closed. Returns the id, or null if it is not a hatch. */
  function toggleHatch(id) {
    const door = doors.find((x) => x.id === id)
    if (!door || door.kind !== 'hatch') return null
    door.state.latched = !door.state.latched
    door.state.target = door.state.latched ? 1 : 0
    return door.id
  }

  /** Toggle the nearest hatch in reach. Returns the id, or null. */
  function interactNearest(playerPosition) {
    const info = nearestInteraction(playerPosition)
    if (!info) return null
    return toggleHatch(info.id)
  }

  function getState() {
    return states
  }

  function getColliders() {
    return colliders
  }

  return {
    doors,
    states,
    update,
    reset,
    getState,
    getColliders,
    toggleHatch,
    interactNearest,
    nearestInteraction,
  }
}
