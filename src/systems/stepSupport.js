/** Highest climbable floor touched by the same footprint used for collisions. */
export function stepSupport(boxes, position, radius, maxRise) {
  let y = null
  for (const { box, isFloor } of boxes) {
    if (!isFloor) continue
    const rise = box.max.y - position.y
    if (rise <= 0.01 || rise > maxRise) continue
    if (position.x + radius <= box.min.x || position.x - radius >= box.max.x ||
        position.z + radius <= box.min.z || position.z - radius >= box.max.z) continue
    if (y === null || box.max.y > y) y = box.max.y
  }
  return y
}
