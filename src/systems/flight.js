import { FLY_FAST_SPEED, FLY_SPEED } from '../config/shipConfig.js'

/** Preserve deck precision, then smoothly accelerate clear of the ship's envelope. */
export function flightSpeed(position, bounds, boost) {
  const { min, max } = bounds
  const distance = Math.hypot(...position.map((axis, i) => Math.max(min[i] - axis, axis - max[i], 0)))
  const ratio = Math.min(1, Math.max(0, (distance - 10) / 106))
  const blend = ratio * ratio * (3 - 2 * ratio)
  const slow = boost ? FLY_FAST_SPEED : FLY_SPEED
  return slow + ((boost ? 142 : 78) - slow) * blend
}
