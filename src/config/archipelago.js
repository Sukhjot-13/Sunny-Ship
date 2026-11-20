/** Chart coordinates in metres east and south of the Sunny's starting point. */
export const ISLANDS = [
  { name: 'Lantern Cay', east: 510, south: -58, radius: 105, height: 56, seed: 3, beacon: true },
  { name: 'Twin Fangs', east: 205, south: -590, radius: 93, height: 123, seed: 8 },
  { name: 'Mikan Shoals', east: -460, south: 295, radius: 86, height: 39, seed: 13 },
]

/** Normalized shoreline sampled by the terrain and its colored shallows. */
export function coastRadius(angle, seed) {
  return 0.94 + 0.085 * Math.sin(3 * angle + seed) +
    0.057 * Math.cos(5 * angle - seed) + 0.035 * Math.sin(9 * angle)
}

/** Allow for the outermost rocks, the bow and enough depth to turn. */
export function shoalRadius(island) {
  return island.radius * 1.12 + 67
}

/** The first point where the Sunny's swept clearance crosses a charted shoal. */
export function firstShoal(east, south, eastward, southward, hullClearance = 67) {
  const travelSquared = eastward ** 2 + southward ** 2
  if (!travelSquared) return null
  let first = null
  for (const island of ISLANDS) {
    const x = east - island.east
    const z = south - island.south
    const approach = x * eastward + z * southward
    if (approach >= 0) continue
    const clearance = x * x + z * z - (island.radius * 1.12 + hullClearance) ** 2
    const discriminant = approach ** 2 - travelSquared * clearance
    if (discriminant < 0) continue
    const fraction = Math.max(0, (-approach - Math.sqrt(discriminant)) / travelSquared)
    if (fraction <= 1 && (!first || fraction < first.fraction)) first = { island, fraction }
  }
  return first
}

/** Log Pose readings in clockwise compass degrees from north. */
export function readLogPose(state) {
  return ISLANDS.map(island => {
    const east = island.east - state.east
    const south = island.south - state.south
    const range = Math.hypot(east, south)
    return {
      name: island.name,
      bearing: (Math.atan2(east, -south) * 180 / Math.PI + 360) % 360,
      range,
      near: range < shoalRadius(island) + 85,
    }
  })
}
