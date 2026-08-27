// Copyright (c) 2026 Climate Interactive / New Venture Fund

import Model from './model.js'

/**
 * The set of names (as they appear in a variable's `referencedFunctionNames`) for functions
 * that either read the current simulation time or keep internal state that is updated on
 * every time step.  A variable that calls one of these cannot be evaluated once and reused,
 * even if all of the variables it references are time invariant.
 *
 * Note that the time reading functions in this set also record an implicit reference to the
 * `Time` variable (see `read-equations.js`), so they would be caught by the reference check
 * alone, but they are listed here as well so that the analysis does not depend on that.
 */
const timeVaryingFnNames = new Set([
  // These read the current simulation time
  '__game',
  '__pulse',
  '__pulse_train',
  '__ramp',
  '__step',
  // These hold state that is updated on each time step
  '__delay_fixed',
  '__depreciate_straightline',
  '__sample_if_true',
  // This reads data at a given time
  '__get_data_between_times'
])

/**
 * The set of names for functions that return a pointer to an internal buffer that is
 * overwritten by the next call.  The generated code reads from that buffer in the statements
 * that immediately follow the call, so variables that use these functions are excluded from
 * hoisting out of conservatism, even though the functions themselves are time invariant.
 */
const bufferReturningFnNames = new Set([
  '__allocate_available',
  '__allocate_by_priority',
  '__demand_at_price',
  '__find_market_price',
  '__invert_matrix',
  '__supply_at_price',
  '__vector_sort_order'
])

/**
 * Find the aux variables whose values cannot change over the course of a run.  These are
 * the aux variables that only depend (transitively) on constants, on variables that are
 * initialized once, and on other time invariant aux variables.
 *
 * The generated code can evaluate these once, after the initial values have been computed
 * and the inputs for the run have been applied, instead of recomputing them on every time
 * step.  Note that this is only correct if the once-only evaluation happens after inputs
 * are set, since a time invariant aux can depend on an input constant.
 *
 * @param {Array} auxVars The array of aux `Variable` instances, in evaluation order.
 * @returns {Set} The set of ref IDs for the aux variables that are time invariant.
 */
export function findTimeInvariantAuxVars(auxVars) {
  // The result of the check for each ref ID that has been visited.  A ref ID that is
  // present with a value of `undefined` is one that is currently being visited; treating
  // it as time varying breaks the recursion for a variable that references itself (as in
  // the case of `SAMPLE IF TRUE`).
  const results = new Map()

  const isTimeInvariant = v => {
    if (v === undefined) {
      // We could not resolve the referenced variable, so assume the worst
      return false
    }

    if (v.varName === '_time') {
      // Note that the placeholder variable for the exogenous `Time` variable has a var
      // type of `const`, so this check must come before the var type checks below.
      return false
    }

    switch (v.varType) {
      case 'const':
        // Constants are set once, before the run begins
        return true
      case 'initial':
        // `INITIAL` variables are evaluated once, in `initLevels`
        return true
      case 'lookup':
        // Lookup data is set once, in `initLookups`
        return true
      case 'aux':
        // Fall through to the checks below
        break
      default:
        // Levels change on every time step, and data variables are read at the current
        // time, so neither can be treated as time invariant
        return false
    }

    const cached = results.get(v.refId)
    if (cached !== undefined) {
      return cached
    }
    if (results.has(v.refId)) {
      // The variable is currently being visited, which means it references itself
      return false
    }
    results.set(v.refId, undefined)

    const result = checkAux(v)
    results.set(v.refId, result)
    return result
  }

  const checkAux = v => {
    if (v.varSubtype === 'fixedDelay' || v.varSubtype === 'depreciation') {
      // These keep state that is updated on each time step
      return false
    }

    for (const fnName of v.referencedFunctionNames || []) {
      if (timeVaryingFnNames.has(fnName) || bufferReturningFnNames.has(fnName)) {
        // The variable calls a function whose value can differ from one call to the next,
        // so its own value can differ as well
        return false
      }
    }

    for (const refId of v.references) {
      if (!isTimeInvariant(Model.varWithRefId(refId))) {
        // The variable reads a value that can change over the course of a run
        return false
      }
    }

    // The variable only reads values that are set before the run begins
    return true
  }

  // Note that `auxVars` is in dependency order, so by the time a variable is visited here,
  // every aux variable it references has already been visited and cached.  That keeps the
  // recursion in `isTimeInvariant` shallow even for a model with long dependency chains.
  const timeInvariantRefIds = new Set()
  for (const v of auxVars) {
    if (isTimeInvariant(v)) {
      timeInvariantRefIds.add(v.refId)
    }
  }
  return timeInvariantRefIds
}
