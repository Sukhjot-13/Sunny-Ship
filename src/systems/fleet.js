import { firstShoal, ISLANDS, shoalRadius } from '../config/archipelago.js'

export const GAON_REACH = 330
export const RESPAWN_SECONDS = 24
const plans = [
  { id: 0, name: 'Red Jackal', color: '#883a31', east: -263, south: -9, radius: 26, pace: 0.115, hull: 2 },
  { id: 1, name: 'Black Current', color: '#343941', east: -413, south: -153, radius: 36, pace: 0.082, hull: 3 },
  { id: 2, name: 'Iron Gull', color: '#4e6773', east: 32, south: 361, radius: 40, pace: 0.073, hull: 3 },
]

export const fleet = plans.map(plan => ({ ...plan }))
const radians = Math.PI / 180

/** Start a patrol at the authored station or at the selected replacement station. */
function station(ship, east, south) {
  Object.assign(ship, {
    centerEast: east, centerSouth: south,
    east: east + ship.radius, south, yaw: Math.PI, age: 0,
    health: ship.hull, damageTimer: 0, sinking: 0,
  })
}

export function resetFleet() {
  for (const ship of fleet) {
    ship.respawns = 0
    station(ship, plans[ship.id].east, plans[ship.id].south)
  }
}
resetFleet()

/** Choose a different patrol loop in open water around the current voyage. */
function replacement(ship, voyage) {
  for (let i = 0; i < 12; i++) {
    const bearing = ship.id * 2.1 + ship.respawns * 1.74 + i * 0.91
    const range = 360 + (ship.id * 63 + ship.respawns * 29 + i * 47) % 210
    const east = voyage.east + Math.sin(bearing) * range
    const south = voyage.south + Math.cos(bearing) * range
    const unsafe = ISLANDS.some(island => Math.hypot(east - island.east, south - island.south) < shoalRadius(island) + ship.radius)
    const occupied = fleet.some(other => Math.hypot(east - other.centerEast, south - other.centerSouth) < 125)
    if (!unsafe && !occupied) return { east, south }
  }
  const east = Math.max(voyage.east, ...ISLANDS.map(island => island.east + shoalRadius(island))) + 490 + ship.id * 175
  return { east, south: voyage.south + 190 + ship.respawns * 37 }
}

/** Patrol, sink, and return on a different course. */
export function advanceFleet(elapsed, voyage) {
  for (const ship of fleet) {
    ship.damageTimer = Math.max(0, ship.damageTimer - elapsed)
    if (!ship.health) {
      ship.sinking += elapsed
      if (ship.sinking >= RESPAWN_SECONDS) {
        ship.respawns++
        const next = replacement(ship, voyage)
        station(ship, next.east, next.south)
      }
      continue
    }
    ship.age += elapsed
    const phase = ship.age * ship.pace
    ship.east = ship.centerEast + Math.cos(phase) * ship.radius
    ship.south = ship.centerSouth + Math.sin(phase) * ship.radius
    ship.yaw = Math.PI - phase
  }
}

/** Closest ship inside the Gaon air-blast cone, with land occlusion. */
export function aimGaon(voyage) {
  const east = Math.sin(voyage.heading * radians)
  const south = -Math.cos(voyage.heading * radians)
  const originEast = voyage.east + east * 40
  const originSouth = voyage.south + south * 40
  let target = null
  let distance = GAON_REACH
  for (const ship of fleet) {
    if (!ship.health) continue
    const dx = ship.east - originEast, dz = ship.south - originSouth
    const along = dx * east + dz * south
    if (along < 0 || along > distance || Math.abs(dx * south - dz * east) > 11 + along * 0.11) continue
    // Shoal clearance is for the Sunny's hull. Remove that extra buffer for line of sight.
    const land = firstShoal(originEast, originSouth, dx, dz, 0)
    if (land) continue
    distance = along
    target = ship
  }
  return target
}

/** Damage the nearest exposed target once per successful Gaon shot. */
export function fireAtFleet(voyage) {
  const target = aimGaon(voyage)
  if (!target) return null
  target.health--
  target.damageTimer = 2.5
  return target
}

/** Name, bearing and range for the closest live contact. */
export function nearestContact(voyage) {
  let contact = null
  for (const ship of fleet) {
    if (!ship.health) continue
    const east = ship.east - voyage.east, south = ship.south - voyage.south
    const range = Math.hypot(east, south)
    if (!contact || range < contact.range) {
      contact = { name: ship.name, range, bearing: (Math.atan2(east, -south) / radians + 360) % 360 }
    }
  }
  return contact
}
