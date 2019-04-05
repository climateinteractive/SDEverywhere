const util = require('util')
const R = require('ramda')
const B = require('bufx')
const yaml = require('js-yaml')
const { canonicalName, asort, vlog } = require('./Helpers')

// A subscript is a dimension or an index.
// Both have the same properties: model name, canonical name, family, values.

// |Property     |Description                                                       |
// |-------------|------------------------------------------------------------------|
// |modelName    |subscript name in Vensim format                                   |
// |modelValue   |subscript value in Vensim format                                  |
// |modelMappings|mappings from a dimension to a mapping value in Vensim format     |
// |name         |subscript name in canonical C format                              |
// |value        |subscript value in canonical C format                             |
// |mappings     |mappings from a dimension to a mapping value in canonical C format|
// |size         |number of indices in a dimension or 1 for an index                |
// |family       |subscript family on canonical C format (finalized later)          |

// A family is a dimension that is a reference to the maximal dimension containing an index or subdimension.
// The family of the maximal dimension is itself.
// Values are a single number for indices and an array of subscripts for dimensions.
// A Variable includes a list of subscripts in normal order.
// Mappings give a list of indices in the mapping value that map in order to to-dim indices.

// Subscript API
//
// Subscript(modelName, modelValue, modelFamily, modelMappings)
// with modelMappings of the form [ { toDim: dimension, value: indexArray } ]
//   sets a subscript dimension that maps the index elements in indexArray
//   to the index elements in another dimension
// Subscript(modelName)
//   gets the subscript with the model name
// Subscript(modelName, modelValue) with modelValue as array
//   sets a subscript dimension and its indices
// Subscript(modelName, modelValue, modelFamily) with modelValue as number
//   sets a subscript element and its index value in the subscript family
//
// Call Subscript with an array of subscript indices to establish a dimension.
// If there is a mapping to another dimension, give modelMappings in the call.
// Then call Subscript with each individual subscript index name and its numeric index value.
// All dimension and index names are in model form, not canonical form.
// They must be converted to canonical form later after all subscripts are read.

// The Subscript module maintains a subscript map with the canonical
// subscript name as the key and a subscript object as the value.
let subscripts = new Map()

function Subscript(modelName, modelValue = null, modelFamily = null, modelMappings = null) {
  let name = canonicalName(modelName)
  if (modelValue === null) {
    // Look up a subscript by its model name.
    return sub(name)
  }
  // Map the subscript value array into canonical form.
  let value, size
  if (Array.isArray(modelValue)) {
    value = R.map(x => canonicalName(x), modelValue)
    size = value.length
  } else if (typeof modelValue === 'number') {
    value = modelValue
    size = 1
  }
  // Convert the model family into canonical form.
  if (modelFamily === null) {
    // The default family is the subscript itself.
    modelFamily = modelName
  }
  let family = canonicalName(modelFamily)
  // Convert the subscript mappings into canonical form.
  let mappings = {}
  if (modelMappings && !R.isEmpty(modelMappings)) {
    for (let m of modelMappings) {
      mappings[canonicalName(m.toDim)] = R.map(subName => canonicalName(subName), m.value)
    }
  }
  // Save the subscript as an object in the subscripts store.
  let subscript = {
    modelName,
    modelValue,
    modelMappings,
    name,
    value,
    size,
    family,
    mappings
  }
  subscripts.set(name, subscript)
  return subscript
}
function sub(name) {
  // Look up a subscript by its canonical name.
  // Return undefined if the name is not a subscript name.
  let result
  try {
    result = subscripts.get(name)
  } catch (e) {
    console.error(`sub name ${name} not found`)
    debugger
  }
  return result
}
function isIndex(name) {
  let s = sub(name)
  return s && typeof s.value === 'number'
}
function isDimension(name) {
  let s = sub(name)
  return s && Array.isArray(s.value)
}
function addIndex(name, value, family) {
  // Add an index with arguments in canonical form.
  let subscript = {
    name: name,
    value: value,
    size: 1,
    family: family,
    mappings: {}
  }
  subscripts.set(name, subscript)
}
function hasMapping(fromSubscript, toSubscript) {
  let result = false
  let subFrom = sub(fromSubscript)
  let subTo = sub(toSubscript)
  if (subFrom === undefined) {
    vlog('ERROR: undefined hasMapping fromSubscript', fromSubscript)
  }
  if (subTo === undefined) {
    vlog('ERROR: undefined hasMapping toSubscript', toSubscript)
  }
  if (subFrom.mappings[toSubscript]) {
    return true
  }
  return false
}
function mapIndex(fromSubName, fromIndexName, toSubName) {
  // Return the index names that the fromSubName dimension maps from fromIndexName
  // to the toSubName dimension. Return an empty array if there is no such mapping.
  let toIndexNames = []
  let fromSub = sub(fromSubName)
  let toSub = sub(toSubName)
  if (fromSub && toSub && isDimension(fromSubName) && isDimension(toSubName)) {
    let mapping = fromSub.mappings[toSubName]
    let fromSubIndexNames = fromSub.value
    if (mapping) {
      // Find the positions of fromIndexName in the mapping.
      for (let pos = 0; pos < mapping.length; pos++) {
        if (mapping[pos] === fromIndexName) {
          // Return the index name at the same position in the toSub dimension.
          toIndexNames.push(toSub.value[pos])
        }
      }
    }
  }
  return toIndexNames
}
function printSubscripts() {
  B.clearBuf()
  for (let [k, v] of subscripts) {
    B.emitLine(`${k}:\n${util.inspect(v, { depth: null })}\n`)
  }
  return B.getBuf()
}
function yamlSubsList() {
  let subs = {}
  for (let [k, v] of subscripts) {
    subs[k] = v
  }
  return yaml.safeDump(subs)
}
function loadSubscriptsFromYaml(yamlSubs) {
  // Load the subscripts map from subscripts serialized to a YAML file by yamlSubsList.
  // This function should be called instead of adding subscripts through the constructor.
  let subs = yaml.safeLoad(yamlSubs)
  for (const k in subs) {
    subscripts.set(k, subs[k])
  }
}
function normalizeSubscripts(subscripts) {
  // Sort a list of subscript names already in canonical form according to the subscript family.
  let subs = R.map(name => sub(name), subscripts)
  subs = R.sortBy(R.prop('family'), subs)
  let normalizedSubs
  try {
    normalizedSubs = R.map(R.prop('name'), subs)
  } catch (e) {
    console.error(`normalizeSubscripts fails for ${subscripts}`)
    debugger
  }
  return normalizedSubs
}
function subscriptFamilies(subscripts) {
  // Return a list of the subscript families for each subscript.
  try {
    return R.map(subscriptName => sub(subscriptName).family, subscripts)
  } catch (e) {
    console.error(`ERROR: subscript not found in "${subscripts.join(',')}" in subscriptFamilies`)
    debugger
  }
}
function subscriptFamily(subscriptName) {
  // Return the subscript family object for the subscript name.
  let family = sub(subscriptName).family
  return sub(family)
}
function allSubscripts() {
  // Return an array of all subscript objects.
  return [...subscripts.values()]
}
function allDimensions() {
  // Return an array of all dimension subscript objects.
  return R.filter(subscript => Array.isArray(subscript.value), allSubscripts())
}
function allMappings() {
  // Return an array of all subscript mappings as objects.
  let mappings = []
  R.forEach(subscript => {
    R.forEach(mapTo => {
      mappings.push({
        mapFrom: subscript.name,
        mapTo: mapTo,
        value: subscript.mappings[mapTo]
      })
    }, Object.keys(subscript.mappings))
  }, allSubscripts())
  return mappings
}
function indexNamesForSubscript(subscript) {
  // Return a list of index names for a subscript in canonical form.
  if (isIndex(subscript)) {
    // The subscript is an index, so just return it.
    return [subscript]
  } else {
    // Return a list of index names for the dimension.
    let dim = sub(subscript)
    if (!dim) {
      vlog('ERROR: no indexNamesForSubscript', subscript)
      console.trace()
      return []
    }
    return dim.value
  }
}
function separatedVariableIndex(rhsSub, variable) {
  // If a RHS subscript matches the variable's separation dimension, return the index name corresponding to the LHS.
  // The LHS and RHS subscripts need not be in normal order or have the same number of subscripts in a var.
  // The search proceeds through three stages:
  // 1. Find a sepDim that matches rhsSub.
  // 2. Then find an lhsSub in the same family as the sepDim.
  // 3. Further qualify the lhsSub.

  // (1)
  for (let sepDim of variable.separationDims) {
    if (rhsSub === sepDim || hasMapping(rhsSub, sepDim)) {
      // (2)
      for (let lhsSub of variable.subscripts) {
        if (sub(lhsSub).family === sub(sepDim).family) {
          if (!isIndex(lhsSub)) {
            console.error(`ERROR: ${variable.refId} subscript in separation dimension ${sepDim} is not an index`)
          } else {
            // (3)
            if (rhsSub === sepDim) {
              // There may be more than one lhsSub in the same family as rhsSub.
              // Pick the one that belongs to the rhsSub.
              if (indexNamesForSubscript(rhsSub).includes(lhsSub)) {
                return lhsSub
              }
            } else {
              // Find the index that maps from the subscript dimension to the separated var index.
              for (let fromIndexName of sub(rhsSub).value) {
                let mappedIndices = mapIndex(rhsSub, fromIndexName, sepDim)
                if (mappedIndices.includes(lhsSub)) {
                  return fromIndexName
                }
              }
            }
          }
        }
      }
    }
  }
  return null
}
// Function to filter canonical dimension names from a list of names
let dimensionNames = R.pipe(
  R.filter(subscript => isDimension(subscript)),
  asort
)
// Function to filter canonical index names from a list of names
let indexNames = R.pipe(
  R.filter(subscript => isIndex(subscript)),
  asort
)

module.exports = {
  Subscript,
  addIndex,
  allDimensions,
  allMappings,
  dimensionNames,
  hasMapping,
  indexNames,
  indexNamesForSubscript,
  isDimension,
  isIndex,
  loadSubscriptsFromYaml,
  mapIndex,
  normalizeSubscripts,
  printSubscripts,
  separatedVariableIndex,
  sub,
  subscriptFamilies,
  subscriptFamily,
  yamlSubsList
}
