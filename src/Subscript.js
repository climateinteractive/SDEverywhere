const R = require('ramda')
const { canonicalName, asort, vlog } = require('./Helpers')

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
  if (modelMappings !== null) {
    R.forEach(m => {
      mappings[canonicalName(m.toDim)] = R.map(indName => canonicalName(indName), m.value)
    }, modelMappings)
  }
  // Save the subscript as an object in the subscripts store.
  let subscript = {
    modelName: modelName,
    modelValue: modelValue,
    modelMappings: modelMappings,
    name: name,
    value: value,
    size: size,
    family: family,
    mappings: mappings
  }
  subscripts.set(name, subscript)
  return subscript
}
function sub(name) {
  // Look up a subscript by its canonical name.
  // Return undefined if the name is not a subscript name.
  return subscripts.get(name)
}
function isIndex(name) {
  let s = sub(name)
  return s && typeof s.value === 'number'
}
function isDimension(name) {
  let s = sub(name)
  return s && Array.isArray(s.value)
}
function addMapping(fromSubscript, toSubscript, value) {
  let subFrom = sub(fromSubscript)
  let subTo = sub(toSubscript)
  if (subFrom === undefined) {
    vlog('ERROR: undefined addMapping fromSubscript', fromSubscript)
  }
  if (subTo === undefined) {
    vlog('ERROR: undefined addMapping toSubscript', toSubscript)
  }
  subFrom.mappings[toSubscript] = value
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
  // Return the index name that the fromSubName dimension maps from fromIndexName
  // to the toSubName dimension. Return undefined if there is no such mapping.
  let toIndexName
  let fromSub = sub(fromSubName)
  let toSub = sub(toSubName)
  if (fromSub && toSub && isDimension(fromSubName) && isDimension(toSubName)) {
    let mapping = fromSub.mappings[toSubName]
    let fromSubIndexNames = fromSub.value
    if (mapping) {
      // Find the position of fromIndexName in the mapping.
      let pos = R.indexOf(fromIndexName, mapping)
      if (pos >= 0) {
        // Return the index name at the same position in the toSub dimension.
        toIndexName = toSub.value[pos]
      }
    }
  }
  return toIndexName
}
function loadSubscripts(subscriptsArray) {
  // Load subscripts from an array of the form:
  // [
  //   // DimA: A1, A2, A3
  //   { name: 'DimA', value: [ 'A1', 'A2', 'A3' ] },
  //   { name: 'A1', value: 0, family: 'DimA' },
  //   { name: 'A2', value: 1, family: 'DimA' },
  //   { name: 'A3', value: 2, family: 'DimA' },
  //   // SubA: A1, A2
  //   { name: 'SubA', value: ['A1', 'A2'], family: 'DimA' },
  //   // DimB: B1, B2 -> (DimA: SubA, A3)
  //   // Dimension mapping expanded through subdimensions
  //   { name: 'DimB', value: [ 'B1', 'B2' ],
  //     mappings: [
  //       { toDim: 'DimA', value: [ 'B1', 'B1', 'B2' ] },
  //     ] },
  //   { name: 'B1', value: 0, family: 'DimB' },
  //   { name: 'B2', value: 1, family: 'DimB' },
  // ]
  R.forEach(s => Subscript(s.name, s.value, s.family, s.mappings), subscriptsArray)
}
function printSubscripts() {
  console.error(subscripts)
}
function printSubscript(subName) {
  console.error(sub(subName))
}
function normalizeSubscripts(subscripts) {
  // Sort a list of subscript names already in canonical form according to the subscript family.
  let subs = R.map(name => sub(name), subscripts)
  subs = R.sortBy(R.prop('family'), subs)
  let normalizedSubs
  try {
    normalizedSubs = R.map(R.prop('name'), subs)
  } catch (e) {
    // debugger
  }
  return normalizedSubs
}
function subscriptFamilies(subscripts) {
  // Return a list of the subscript families for each subscript.
  return R.map(name => sub(name).family, subscripts)
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
      mappings.push({ mapFrom: subscript.name, mapTo: mapTo, value: subscript.mappings[mapTo] })
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
  let separatedIndexName
  let sepDim = variable.separationDim
  let varSubs = variable.subscripts
  if (sepDim && (rhsSub === sepDim || hasMapping(rhsSub, sepDim))) {
    // Find the var subscript that was separated.
    for (let varSub of varSubs) {
      if (sub(varSub).family === sub(sepDim).family) {
        if (!isIndex(varSub)) {
          console.error(`ERROR: ${variable.refId} subscript in separation dimension ${sepDim} is not an index`)
        } else {
          if (rhsSub === sepDim) {
            // The subscript dimension is the separation dimension, so use the separated var index.
            separatedIndexName = varSub
          } else {
            // Find the index that maps from the subscript dimension to the separated var index.
            for (let fromIndexName of sub(rhsSub).value) {
              if (mapIndex(rhsSub, fromIndexName, sepDim) === varSub) {
                separatedIndexName = fromIndexName
                break
              }
            }
          }
        }
      }
    }
  }
  return separatedIndexName
}
// Function to filter canonical dimension names from a list of names
let dimensionNames = R.pipe(R.filter(subscript => isDimension(subscript)), asort)
// Function to filter canonical index names from a list of names
let indexNames = R.pipe(R.filter(subscript => isIndex(subscript)), asort)

module.exports = {
  Subscript,
  sub,
  isIndex,
  isDimension,
  addMapping,
  hasMapping,
  mapIndex,
  loadSubscripts,
  printSubscripts,
  printSubscript,
  normalizeSubscripts,
  subscriptFamilies,
  subscriptFamily,
  allSubscripts,
  allDimensions,
  allMappings,
  indexNamesForSubscript,
  separatedVariableIndex,
  dimensionNames,
  indexNames
}
