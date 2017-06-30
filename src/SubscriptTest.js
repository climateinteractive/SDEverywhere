const assert = require('assert')
const R = require('ramda')
const {
  Subscript,
  sub,
  isIndex,
  isDimension,
  addMapping,
  hasMapping,
  loadSubscripts,
  normalizeSubscripts,
  subscriptFamilies,
  subscriptFamily,
  allSubscripts,
  allDimensions,
  allMappings,
  indexNamesForSubscript,
  dimensionNames,
  indexNames,
  mapIndex,
  printSubscripts,
  printSubscript
} = require('./Subscript')
const { vlog } = require('./Helpers')

let s = Subscript('S')
assert(s === undefined)
s = sub('_s')
assert(s === undefined)

s = Subscript('S', ['A1', 'A2', 'A3', 'A4'])
function assert1(x) {
  assert(x.modelName === 'S')
  assert(x.name === '_s')
  assert(x.size === 4)
  assert(x.value[0] === '_a1')
  assert(x.family === '_s')
}
assert1(s)
s = Subscript('S')
assert1(s)
s = sub('_s')
assert1(s)

let u = { name: 'T', value: 0 }
let t = Subscript(u.name, u.value, u.family)
assert(t.family === '_t')

let ind = sub('_a1')
assert(ind === undefined)
Subscript('S1', 0, 'S')
Subscript('S2', 1, 'S')
Subscript('S3', 2, 'S')
Subscript('S4', 3, 'S')
ind = sub('_s1')
assert(ind.value === 0)
assert(ind.family === '_s')

Subscript('Sub1', ['S1', 'S2'], 'S')
Subscript('Sub2', ['S3', 'S4'], 'S')
assert(sub('_sub1').family === '_s')
assert(sub('_sub2').size === 2)

assert(isDimension('_s'))
assert(isIndex('_s1'))

// Index subscript has numeric value
Subscript('t1', 0, 'Target')
Subscript('t2', 1, 'Target')
Subscript('t3', 2, 'Target')
// Dimension subscript has array value with default family = self
Subscript('Target', ['t1', 't2', 't3'])
// Subdimension subscript has family ≠ self
Subscript('tPrev', ['t1', 't2'], 'Target')
Subscript('tNext', ['t2', 't3'], 'Target')

assert(sub('_t1').family === '_target')
assert(sub('_tprev').family === '_target')
assert(isDimension('_tnext'))
assert(sub('_tnext').size === 2)

// Mappings applied later
addMapping('_tprev', '_tnext', ['_t1', '_t2'])
addMapping('_tnext', '_tprev', ['_t2', '_t3'])
assert(sub('_tprev').mappings['_tnext'])
assert(sub('_tnext').mappings['_tprev'])
assert(hasMapping('_tprev', '_tnext'))
assert(hasMapping('_tnext', '_tprev'))

// Find the index mapped to
assert(mapIndex('_tprev', '_t1', '_tnext') === '_t2')
assert(mapIndex('_tprev', '_t2', '_tnext') === '_t3')
assert(mapIndex('_tnext', '_t2', '_tprev') === '_t1')
assert(mapIndex('_tnext', '_t3', '_tprev') === '_t2')
assert(mapIndex('_tnext', '_t0', '_tprev') === undefined)

// Load subscripts from JSON
let json = `[
  { "name": "DimA", "value": ["A1", "A2", "A3"] },
  { "name": "A1", "value": 0, "family": "DimA" },
  { "name": "A2", "value": 1, "family": "DimA" },
  { "name": "A3", "value": 2, "family": "DimA" },
  { "name": "DimB", "value": ["B1", "B2"],
    "mappings": [ { "toDim": "DimA", "value": ["B1", "B1", "B2"] } ] },
  { "name": "B1", "value": 0, "family": "DimB" },
  { "name": "B2", "value": 1, "family": "DimB" }
]`
let subs = JSON.parse(json)
loadSubscripts(subs)
assert(sub('_dima').family === '_dima')
assert(sub('_a1').family === '_dima')
assert(sub('_dimb').size === 2)
assert(sub('_dimb').value[1] === '_b2')
assert(hasMapping('_dimb', '_dima'))

subs = normalizeSubscripts(['_t1', '_dima'])
assert(subs[0] === '_dima')
assert(subscriptFamilies(subs)[1] === '_target')

assert(subscriptFamily('_a1').name === '_dima')
assert(subscriptFamily('_dima').name === '_dima')
