import assert from 'node:assert/strict'
import { FLY_FAST_SPEED, FLY_SPEED } from '../src/config/shipConfig.js'
import { flightSpeed } from '../src/systems/flight.js'
import { advanceFleet, aimGaon, fleet, RESPAWN_SECONDS } from '../src/systems/fleet.js'
import { operateCannon, resetVoyage, voyage } from '../src/systems/navigation.js'

const bounds = { min: [-43, -53, -21], max: [43, 62, 21] }
assert.equal(flightSpeed([0, -35, 0], bounds, false), FLY_SPEED)
assert.equal(flightSpeed([48, 20, 0], bounds, true), FLY_FAST_SPEED)
assert(flightSpeed([93, 20, 0], bounds, false) > FLY_SPEED)
assert.equal(flightSpeed([180, 110, 0], bounds, false), 78)
assert.equal(flightSpeed([180, 110, 0], bounds, true), 142)

resetVoyage()
const initial = aimGaon(voyage)
assert.equal(initial.name, 'Red Jackal')
const station = [initial.centerEast, initial.centerSouth]
assert.match(operateCannon('fire').message, /hull remaining/)
assert.equal(initial.health, 1)
assert.equal(operateCannon('toggle-mouth').ok, true)
assert.equal(initial.health, 1, 'the jaw switch does not deal damage')
assert.match(operateCannon('fire').message, /is sinking/)
assert.equal(initial.health, 0)
assert.notEqual(aimGaon(voyage), initial)
advanceFleet(RESPAWN_SECONDS - 1, voyage)
assert.equal(initial.health, 0)
advanceFleet(1, voyage)
assert.equal(initial.health, initial.hull)
assert.equal(initial.respawns, 1)
assert(Math.hypot(initial.centerEast - station[0], initial.centerSouth - station[1]) > 100)
const respawned = [initial.east, initial.south]
advanceFleet(2, voyage)
assert.notDeepEqual([initial.east, initial.south], respawned)
voyage.heading = 135
assert.equal(aimGaon(voyage), null)
resetVoyage()
assert.equal(fleet.length, 3)
assert.equal(aimGaon(voyage).name, 'Red Jackal')
console.log('PASS proximity flight speeds, directional Gaon damage, sinking and relocated respawn')
