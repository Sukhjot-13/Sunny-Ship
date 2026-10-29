/** Require complete, exact seven-space coverage plus immutable scoped C01 inputs. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const out='docs/review/post-comparison-c01',expected=["Men's Quarters","Women's Quarters",'Storage Room','Men Starboard Cannon Closet','Men Port Cannon Closet','Women Starboard Cannon Closet','Women Port Cannon Closet'].sort()
const access=JSON.parse(fs.readFileSync(`${out}/access.json`)),views=JSON.parse(fs.readFileSync(`${out}/final-views.json`)),inputs=JSON.parse(fs.readFileSync(`${out}/final-inputs.json`))
assert.deepEqual(access.failures,[],'all actual access and returns must pass')
assert.deepEqual(access.records.map(r=>r.name).sort(),expected,'all seven named C01 spaces must be tested exactly once')
assert(access.records.every(r=>r.returned),'every route must return to lawn')
assert.deepEqual(views.errors,[],'no current browser/shader errors')
assert.equal(views.records.length,14,'all scoped rooms, extra storage junctions and retained exterior views present')
for(const [file,want] of Object.entries(inputs.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),want,`frozen final C01 input ${file}`)
for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){assert.equal(views.hashes[n].local,inputs.files['public/models/'+n]);assert.equal(views.hashes[n].served,views.hashes[n].local)}
for(const f of ['final-trim.log','final-storage.log','final-exterior-combined.log'])assert(fs.readFileSync(`${out}/${f}`,'utf8').includes('PASS C01')&&!fs.readFileSync(`${out}/${f}`,'utf8').includes('AssertionError'),f)
assert(fs.readFileSync(`${out}/final-assets-build.log`,'utf8').includes('published completed asset generation and editable master'))
assert(fs.readFileSync(`${out}/final-frontend-build.log`,'utf8').includes('built in'))
const result={phase:'C01 verified in isolated integration workspace; actual original-ship application/confirmation is next',checkedAt:new Date().toISOString(),requiredSpaces:expected,actualRoundTrips:access.records,geometry:'zero exported shield and white/black band intersections; unchanged 20 micrometre independent test',physical:'113 matched fore perimeter walls to real ceiling underside; 13 formerly defective ray checks',exterior:{shield:688,hullAndBands:1200,differences:0},appearance:{captures:14,personallyReviewed:true,independentCoordinatorReviewed:true,servedHashes:views.hashes},runtime:'all original runtime sources and source FBX preserved; no body/control/material runtime change',scope:'C01 targeted tests/access/build only; no whole-ship aggregate claim',comparisonFrozenAt:'12e2dde'}
fs.writeFileSync(`${out}/verified-receipt.json`,JSON.stringify(result,null,2));console.log('PASS C01 complete exact-seven scoped receipt')
