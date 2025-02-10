import * as R from 'ramda'

import { toPrettyString } from '@sdeverywhere/parse'

import { cartesianProductOf } from '../_shared/helpers.js'
import { isDimension, isIndex, isSubdimension, sub, subscriptsMatch } from '../_shared/subscript.js'

import Variable from './variable.js'

/**
 * TODO: Docs
 *
 * @param {*} parsedModel TODO: Use ParsedVensimModel type here
 * @param {Object.<string, string>} [specialSeparationDims] The variable names that need to be
 * separated because of circular references.  This is an optional mapping from "C" variable name
 * to "C" dimension name to separate on.
 * @param {string[][]} [separateAllVarsWithDims] An optional array containing arrays of dimension
 * identifiers for which variables will be separated.  For example, if the LHS is `x[DimA,DimB,DimC]`
 * and this array contains a list `['_dima', '_dimb']`, then the LHS will be separated on both
 * DimA and DimB.
 * @returns {*} An array containing all `Variable` instances that were generated from
 * the model equations.
 */
export function readVariables(parsedModel, specialSeparationDims, separateAllVarsWithDims) {
  const variables = []

  // Add one or more `Variable` definitions for each parsed equation
  for (const eqn of parsedModel.root.equations) {
    variables.push(...variablesForEquation(eqn, specialSeparationDims || {}, separateAllVarsWithDims || []))
  }

  return variables
}

/**
 * Process a single parsed equation and return one or more `Variable` definitions
 * that were derived from the given equation.
 *
 * TODO: Types
 *
 * @param {*} eqn The parsed equation.
 * @param {Object.<string, string>} specialSeparationDims The variable names that need to be
 * separated because of circular references.
 * @param {string[][]} separateAllVarsWithDims An array containing arrays of dimension
 * identifiers for which variables will be separated.
 * @returns {*} An array containing all `Variable` instances that were generated from
 * the given equation.
 */
function variablesForEquation(eqn, specialSeparationDims, separateAllVarsWithDims) {
  // Start a new variable defined by this equation
  const variable = new Variable()

  // Fill in the LHS details
  const lhs = eqn.lhs.varDef
  const baseVarId = lhs.varId
  let lhsText
  if (lhs.subscriptRefs?.length > 0) {
    // Get the LHS subscript/dimension names
    const subNames = lhs.subscriptRefs.map(sub => sub.subName)
    let exceptPart
    if (lhs.exceptSubscriptRefSets) {
      // Get the LHS "except" subscript/dimension names
      const exceptSets = lhs.exceptSubscriptRefSets.map(exceptSubRefs => {
        const exceptSubNames = exceptSubRefs.map(sub => sub.subName)
        return `[${exceptSubNames.join(',')}]`
      })
      exceptPart = `:EXCEPT:${exceptSets.join(',')}`
    } else {
      exceptPart = ''
    }
    lhsText = `${lhs.varName}[${subNames.join(',')}]${exceptPart}`
  } else {
    lhsText = lhs.varName
  }
  variable.modelLHS = lhsText
  variable.varName = baseVarId

  // Fill in the RHS details
  let rhsText
  if (eqn.rhs.kind === 'expr') {
    rhsText = toPrettyString(eqn.rhs.expr, { compact: true })
  } else if (eqn.rhs.kind === 'const-list') {
    rhsText = eqn.rhs.text
  } else {
    rhsText = ''
    if (eqn.rhs.kind === 'data') {
      // The legacy parser sets the variable's varType to 'data' at this stage,
      // so we will do the same
      variable.varType = 'data'
    }
  }
  variable.modelFormula = rhsText
  variable.parsedEqn = eqn

  // If the variable is subscripted, expand on the LHS subscripts
  let expansions = []
  if (lhs.subscriptRefs?.length > 0) {
    // Get the LHS subscript/dimension IDs
    const subIds = lhs.subscriptRefs.map(ref => ref.subId)
    const exceptSubIdSets = []
    if (lhs.exceptSubscriptRefSets?.length > 0) {
      // Get the LHS "except" subscript/dimension IDs
      for (const exceptSubRefs of lhs.exceptSubscriptRefSets) {
        exceptSubIdSets.push(exceptSubRefs.map(ref => ref.subId))
      }
    }

    // At this point, we need to decide how to deal with each subscript/dimension position,
    // i.e., whether to expand to multiple non-apply-to-all variable instances (that are
    // evaluated independently at runtime), or to have one apply-to-all variable instance
    // (that can be evaluated using loops at runtime)
    let positionsToExpand
    if (eqn.rhs.kind === 'const-list') {
      // For const lists, we expand on all dimensions (unconditionally)
      positionsToExpand = subIds.map(subId => isDimension(subId))
    } else {
      // For other equations, look at the different subscripts and the RHS to determine
      // which positions to expand.  Note that `specialSeparationDims` in the spec file
      // can be a single string or an array of strings.
      let separationDims = specialSeparationDims[baseVarId] || []
      if (!Array.isArray(separationDims)) {
        separationDims = [separationDims]
      }
      // Alternatively, if the variable was not in `specialSeparationDims`, separate
      // on dims from `separateAllVarsWithDims` if the var matches one of the dim lists.
      if (separationDims.length === 0) {
        for (let dimList of separateAllVarsWithDims) {
          // The list entry from the spec is only considered a match if every dimension
          // in the spec list appears on the LHS
          if (dimList.every(dim => subIds.includes(dim))) {
            // Technically we allow each entry in the spec array to be either a single
            // dim ID string or an array of dim IDs
            if (!Array.isArray(dimList)) {
              dimList = [dimList]
            }
            separationDims = dimList
            break
          }
        }
      }
      positionsToExpand = subscriptPositionsToExpand(subIds, exceptSubIdSets, separationDims, variable.modelFormula)
    }

    // Expand on LHS subscripts
    expansions = computeExpansions(baseVarId, subIds, exceptSubIdSets, positionsToExpand)
  }

  if (expansions.length === 0) {
    // Generate a single variable defined by the equation
    return [variable]
  } else {
    // Generate variables expanded over subscripts to the model
    const variables = []
    for (const expansion of expansions) {
      const v = new Variable()
      v.varName = baseVarId
      v.modelLHS = lhsText
      v.modelFormula = rhsText
      v.parsedEqn = eqn
      v.subscripts = expansion.subIds
      v.separationDims = expansion.separationDimIds
      variables.push(v)
    }
    return variables
  }
}

/**
 * Return an array of boolean flags that indicate whether the variable should be
 * expanded over the subscripts for that position.
 *
 * TODO: Use correct types here
 *
 * @param {*} subIds The list of subscripts appearing on the LHS in the original order.
 * @param {*} exceptSubIdSets An array of subscript lists from the :EXCEPT: clause.
 * @param {string[]} separationDims The variable names that need to be separated for this
 * variable because of circular references.
 * @param {string} rhsText The text of the RHS of the variable definition.
 * @returns {boolean[]} An array of boolean flags, one for each subscript position.
 */
function subscriptPositionsToExpand(subIds, exceptSubIdSets, separationDims, rhsText) {
  // Decide whether we need to expand each subscript on the LHS.
  // Construct an array of booleans in each subscript position.
  const expandFlags = new Array(subIds.length).fill(false)

  for (let i = 0; i < subIds.length; i++) {
    const subId = subIds[i]
    let expand = false

    // Expand a subdimension and special separation dims in the LHS
    if (isDimension(subId)) {
      expand = isSubdimension(subId)
      if (!expand) {
        expand = separationDims.includes(subId)
      }
    }

    if (!expand) {
      // Direct data vars with subscripts are separated because we generate a lookup for each index
      if (isDimension(subId) && (rhsText.includes('GET DIRECT DATA') || rhsText.includes('GET DIRECT LOOKUPS'))) {
        expand = true
      }
    }

    if (!expand) {
      // Also expand on exception subscripts that are indices or subdimensions
      for (const exceptSubIds of exceptSubIdSets) {
        expand = isIndex(exceptSubIds[i]) || isSubdimension(exceptSubIds[i])
        if (expand) {
          break
        }
      }
    }

    expandFlags[i] = expand
  }

  return expandFlags
}

/**
 * Return an array describing the set of variable expansions.
 *
 * TODO: Use correct types here
 *
 * @param {string} baseVarId The canonical base name of the variable.
 * @param {*} subIds The list of subscripts appearing on the LHS in the original order.
 * @param {*} exceptSubIdSets An array of subscript lists from the :EXCEPT: clause.
 * @param {*} positionsToExpand An array of boolean flags, one for each subscript position.
 * @returns {*} An array of objects containing the `subIds` and `separationDims` for each expansion.
 */
function computeExpansions(baseVarId, subIds, exceptSubIdSets, positionsToExpand) {
  // Construct an array with an array at each subscript position. If the subscript is expanded at that position,
  // it will become an array of indices. Otherwise, it remains an index or dimension as a single-valued array.
  const expandedSubIdsPerPosition = []
  const separationDimIds = []
  for (let i = 0; i < subIds.length; i++) {
    const subId = subIds[i]
    let subIdsInExpansion
    if (positionsToExpand[i]) {
      separationDimIds.push(subId)
      if (isDimension(subId)) {
        subIdsInExpansion = sub(subId).value
      }
    }
    expandedSubIdsPerPosition.push(subIdsInExpansion || [subId])
  }

  // Generate an array of fully expanded subscripts, which may be indices or dimensions
  const expandedSubIdSets = cartesianProductOf(expandedSubIdsPerPosition)
  const skipExpansion = expandedSubIds => {
    // Check the subscripts against each set of except subscripts. Skip expansion if one of them matches.
    const subsRange = R.range(0, expandedSubIds.length)
    for (const exceptSubIds of exceptSubIdSets) {
      if (expandedSubIds.length === exceptSubIds.length) {
        if (R.all(i => subscriptsMatch(expandedSubIds[i], exceptSubIds[i]), subsRange)) {
          return true
        }
      } else {
        console.error(`WARNING: expandedSubIds length ≠ exceptSubIds length in ${baseVarId}`)
      }
    }
    return false
  }

  const expansions = []
  for (const expandedSubIds of expandedSubIdSets) {
    // Skip expansions that match exception subscripts
    if (!skipExpansion(expandedSubIds)) {
      // Add a new expansion
      expansions.push({
        subIds: expandedSubIds,
        separationDimIds
      })
    }
  }

  return expansions
}
