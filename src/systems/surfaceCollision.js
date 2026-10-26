/** Tight boxes for an authored moving surface, rather than its whole envelope. */
const component = (point, axis) => point[axis]

/** Clip a convex polygon to one coordinate half-plane. */
function clip(points, axis, edge, above) {
  const result = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    const da = component(a, axis) - edge, db = component(b, axis) - edge
    const insideA = above ? da >= 0 : da <= 0
    const insideB = above ? db >= 0 : db <= 0
    if (insideA) result.push(a)
    if (insideA !== insideB) {
      const t = da / (da - db)
      result.push(a.map((value, k) => value + (b[k] - value) * t))
    }
  }
  return result
}

/**
 * Clip real triangles into small horizontal cells, merging their skin bounds
 * only within each cell. This retains the closed blade profile without a
 * whole-envelope phantom wall or thousands of duplicate triangle boxes.
 * Input is an array of triangles of [x, y, z] points in ship-local Y-up metres.
 */
export function surfaceCollisionBounds(triangles, spacing = .15, skin = .0125) {
  if (!(spacing > 0) || !(skin > 0)) throw new Error('Positive surface collision dimensions required')
  const cells = new Map()
  for (const triangle of triangles) {
    if (triangle.length !== 3 || triangle.some(p => p.length !== 3 || p.some(v => !Number.isFinite(v)))) {
      throw new Error('Finite surface triangles required')
    }
    const lowX = Math.floor(Math.min(...triangle.map(p => p[0])) / spacing)
    const highX = Math.floor(Math.max(...triangle.map(p => p[0])) / spacing)
    const lowZ = Math.floor(Math.min(...triangle.map(p => p[2])) / spacing)
    const highZ = Math.floor(Math.max(...triangle.map(p => p[2])) / spacing)
    for (let i = lowX; i <= highX; i++) for (let j = lowZ; j <= highZ; j++) {
      let polygon = clip(triangle, 0, i * spacing, true)
      polygon = clip(polygon, 0, (i + 1) * spacing, false)
      polygon = clip(polygon, 2, j * spacing, true)
      polygon = clip(polygon, 2, (j + 1) * spacing, false)
      if (polygon.length < 3) continue
      const min = [0, 1, 2].map(k => Math.min(...polygon.map(p => p[k])) - skin)
      const max = [0, 1, 2].map(k => Math.max(...polygon.map(p => p[k])) + skin)
      const key = `${i},${j}`, previous = cells.get(key)
      if (previous) {
        for (let k = 0; k < 3; k++) {
          previous.min[k] = Math.min(previous.min[k], min[k])
          previous.max[k] = Math.max(previous.max[k], max[k])
        }
      } else cells.set(key, {min, max})
    }
  }
  return [...cells.values()]
}
