import * as R from 'ramda'

import { addIndex, allAliases, allDimensions, isDimension, sub } from '../_shared/subscript.js'

import SubscriptRangeReader from './subscript-range-reader.js'

/**
 * Read subscript ranges from the given model and then process the subscript/dimension
 * definitions to resolve aliases, families, and indices.
 *
 * @param {import('../parse/parser.js').VensimModelParseTree} tree
 * @param {string} modelDirname The path to the directory containing the model (used for resolving data
 * files for `GET DIRECT SUBSCRIPT`).
 */
export function readSubscriptRanges(tree, modelDirname) {
  // Read subscript ranges from the model.
  let subscriptRangeReader = new SubscriptRangeReader(modelDirname)
  subscriptRangeReader.visitModel(tree)
}

/**
 * Process the previously read subscript/dimension definitions to resolve aliases, families, and indices.
 *
 * @param {Object.<string, string>} dimensionFamilies
 */
export function resolveSubscriptRanges(dimensionFamilies) {
  let allDims = allDimensions()

  // Expand dimensions that appeared in subscript range definitions into indices.
  // Repeat until there are only indices in dimension values.
  let dimFoundInValue
  do {
    dimFoundInValue = false
    for (let dim of allDims) {
      if (dim.value !== '') {
        let value = R.flatten(
          R.map(subscript => (isDimension(subscript) ? sub(subscript).value : subscript), dim.value)
        )
        if (!R.equals(value, dim.value)) {
          dimFoundInValue = true
          dim.value = value
          dim.size = value.length
        }
      }
    }
  } while (dimFoundInValue)

  // Fill in subscript aliases from their model families.
  for (let dim of allAliases()) {
    if (dim.value === '') {
      let refDim = sub(dim.family)
      dim.value = refDim.value
      dim.size = refDim.size
      dim.modelValue = refDim.modelValue
      allDims.push(dim)
    }
  }

  // Update the families of dimensions. At this point, all dimensions have their family
  // provisionally set to their own dimension name.
  let dimComparator = (dim1, dim2) => {
    // Sort dimensions by size ascending, by name descending.
    if (dim1.size < dim2.size) {
      return -1
    } else if (dim1.size > dim2.size) {
      return 1
    } else if (dim1.name > dim2.name) {
      return -1
    } else if (dim1.name < dim2.name) {
      return 1
    } else {
      return 0
    }
  }
  for (let dim of allDims) {
    // Try looking up the family in the spec file dimension families if they exist.
    if (dimensionFamilies && dimensionFamilies[dim.name]) {
      dim.family = dimensionFamilies[dim.name]
    } else {
      // Find the dimension in this family with the largest number of values.
      // This is the "maximal" dimension that serves as the subscript family.
      // If two dimensions have the same maximal size, choose the one that comes
      // first in alpha sort order, by convention.
      // Take the first index in the dimension.
      let index = dim.value[0]
      let familyDims = R.sort(
        dimComparator,
        R.filter(thisDim => R.contains(index, thisDim.value), allDims)
      )
      if (familyDims.length > 0) {
        dim.family = R.last(familyDims).name
      } else {
        console.error(`No family found for dimension ${dim.name}`)
      }
    }
  }

  // Define indices in order from the maximal (family) dimension.
  // Until now, only dimensions have been defined. We wait until dimension families have been
  // determined to define indices, so that they will belong to exactly one dimension (the family).
  for (let dim of allDims) {
    if (dim.family === dim.name) {
      for (let i = 0; i < dim.value.length; i++) {
        addIndex(dim.value[i], i, dim.family)
      }
    }
  }

  // When there is a subscript mapping, the mapping value pulled from the subscript range
  // in the model is either a map-to dimension with the same cardinality as the map-from
  // dimension, or a list of subscripts in the map-to dimension with the same cardinality
  // as the map-from dimension. The mapping value must be transformed into a list of
  // map-from indices in one-to-one correspondence with the map-to indices.
  for (let fromDim of allDims) {
    for (let toDimName in fromDim.mappings) {
      let toDim = sub(toDimName)
      let mappingValue = fromDim.mappings[toDimName]
      let invertedMappingValue = []
      if (R.isEmpty(mappingValue)) {
        // When there is no list of map-to subscripts, list fromDim indices.
        invertedMappingValue = fromDim.value
      } else {
        // The mapping value is a list of map-to subscripts.
        // List fromDim indices in the order in which they map onto toDim indices.
        // Indices are filled in the mapping value by map-to index number as they
        // occur in the map-from dimension.
        let setMappingValue = (toSubName, toIndNumber, fromIndName) => {
          if (Number.isInteger(toIndNumber) && toIndNumber >= 0 && toIndNumber < toDim.size) {
            invertedMappingValue[toIndNumber] = fromIndName
          } else {
            console.error(
              `ERROR: map-to index "${toSubName}" not found when mapping from dimension "${fromDim.name}" index "${fromIndName}"`
            )
          }
        }
        for (let i = 0; i < fromDim.value.length; i++) {
          let fromIndName = fromDim.value[i]
          let toSubName = mappingValue[i]
          let toSub = sub(toSubName)
          if (isDimension(toSubName)) {
            // Fill in indices from a dimension in the mapping value.
            for (let toIndName of toSub.value) {
              let toIndNumber = toDim.value.indexOf(toIndName)
              setMappingValue(toSubName, toIndNumber, fromIndName)
            }
          } else {
            // Fill in a single index from an index in the mapping value.
            let toIndNumber = toDim.value.indexOf(toSub.name)
            setMappingValue(toSubName, toIndNumber, fromIndName)
          }
        }
      }
      // Replace toDim subscripts in the mapping value with fromDim subscripts that map to them.
      fromDim.mappings[toDimName] = invertedMappingValue
    }
  }
}
