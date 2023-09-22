import * as R from 'ramda'

import { toPrettyString } from '@sdeverywhere/parse'

import { cartesianProductOf } from '../_shared/helpers.js'
import {
  isDimension,
  isIndex,
  isSubdimension,
  normalizeSubscripts,
  sub,
  subscriptsMatch
} from '../_shared/subscript.js'

import Variable from './variable.js'

/**
 * TODO: Docs
 *
 * @param {*} parsedModel TODO: Use ParsedVensimModel type here
 * @returns {*} An array containing all `Variable` instances that were generated from
 * the model equations.
 */
export function readVariables(parsedModel) {
  const variables = []

  // Add one or more `Variable` definitions for each parsed equation
  for (const eqn of parsedModel.root.equations) {
    variables.push(...variablesForEquation(eqn))
  }

  // Add a placeholder variable for the exogenous `Time` variable
  const timeVar = new Variable(null)
  timeVar.modelLHS = 'Time'
  timeVar.varName = '_time'
  variables.push(timeVar)

  return variables
}

/**
 * Process a single parsed equation and return one or more `Variable` definitions
 * that were derived from the given equation.
 *
 * TODO: Types
 *
 * @param {*} eqn The parsed equation.
 * @returns {*} An array containing all `Variable` instances that were generated from
 * the given equation.
 */
function variablesForEquation(eqn) {
  // Start a new variable defined by this equation
  const variable = new Variable(undefined)

  // Fill in the LHS details
  const lhs = eqn.lhs.varRef
  const baseVarId = lhs.varId
  let lhsText
  if (lhs.subscriptRefs?.length > 0) {
    // Note that we use the original order of subscripts here, not the "normalized"
    // order as below.  (This is how the legacy parser worked, so we will preserve
    // that behavior for now.)
    const subNames = lhs.subscriptRefs.map(sub => sub.subName)
    let exceptPart
    if (lhs.exceptSubscriptRefSets) {
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

  // If the variable is subscripted, expand on the LHS subscripts
  let expansions = []
  if (lhs.subscriptRefs?.length > 0) {
    // XXX: We use `normalizeSubscripts` here so that we are compatible with
    // the legacy parser.  It normalizes by putting the subscripts in alphabetical
    // order by family.  This approach to ordering may lead to issues in cases where
    // there are multiple dimensions used that resolve to the same family, so we
    // should revisit this.
    const subIds = normalizeSubscripts(lhs.subscriptRefs.map(ref => ref.subId))
    const exceptSubIdSets = []
    if (lhs.exceptSubscriptRefSets?.length > 0) {
      for (const exceptSubRefs of lhs.exceptSubscriptRefSets) {
        exceptSubIdSets.push(normalizeSubscripts(exceptSubRefs.map(ref => ref.subId)))
      }
    }

    // Determine which positions we will expand
    let positionsToExpand
    if (eqn.rhs.kind === 'const-list') {
      // For const lists, we expand on all dimensions (unconditionally)
      positionsToExpand = subIds.map(subId => isDimension(subId))
    } else {
      // For other equations, look at the different subscripts and the RHS to determine
      // which positions to expand
      positionsToExpand = subscriptPositionsToExpand(subIds, exceptSubIdSets, variable.modelFormula)
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
      const v = new Variable(undefined)
      v.varName = baseVarId
      v.modelLHS = lhsText
      v.modelFormula = rhsText
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
 * @param {*} subIds The list of subscripts appearing on the LHS in normalized order.
 * @param {*} exceptSubIdSets An array of subscript lists from the :EXCEPT: clause.
 * @param {string} rhsText The text of the RHS of the variable definition.
 * @returns {boolean[]} An array of boolean flags, one for each subscript position.
 */
function subscriptPositionsToExpand(subIds, exceptSubIdSets, rhsText) {
  // Decide whether we need to expand each subscript on the LHS.
  // Construct an array of booleans in each subscript position.
  const expandFlags = new Array(subIds.length).fill(false)

  for (let i = 0; i < subIds.length; i++) {
    const subId = subIds[i]
    let expand = false

    // Expand a subdimension and special separation dims in the LHS
    if (isDimension(subId)) {
      expand = isSubdimension(subId)
      // TODO
      // if (!expand) {
      //   let specialSeparationDims = this.specialSeparationDims[this.var.varName] || []
      //   expand = specialSeparationDims.includes(subscript)
      // }
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
 * @param {*} subIds The list of subscripts appearing on the LHS in normalized order.
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
