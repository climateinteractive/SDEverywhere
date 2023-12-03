import { reduceConditionals, reduceExpr, toPrettyString } from '@sdeverywhere/parse'

import Model from './model.js'

/**
 * Process the parsed `Equation` instances associated with all variables in the model and attempt to
 * reduce expressions through constant folding and simplifying trivial operations and function calls.
 *
 * @param {*} variables The array of `Variable` instances.
 * @param {string[]} inputVarIds The array of IDs for the configured input variables, which need to be
 * preserved (will not be reduced/eliminated).
 * @param {'default' | 'aggressive'} mode The reduction method to use.
 */
export function reduceVariables(variables, inputVarIds, mode) {
  const baseVarIdForRefId = refId => {
    return refId.split('[')[0]
  }

  const refIdForVarRef = varRef => {
    if (varRef.subscriptRefs?.length > 0) {
      const subIds = varRef.subscriptRefs.map(subRef => subRef.subId)
      return `${varRef.varId}[${subIds.join(',')}]`
    } else {
      return varRef.varId
    }
  }

  // TODO: For now, we will look up input variables by base varId (ignoring any subscripts)
  // to avoid any confusion
  const inputBaseVarIdsSet = new Set()
  for (const inputVarId of inputVarIds) {
    inputBaseVarIdsSet.add(baseVarIdForRefId(inputVarId))
  }

  // Keep track of which variables are currently being reduced in order to detect cycles
  // let currentLhsBaseVarId
  const activelyReducingRefIds = new Set()

  const reduceVariable = v => {
    if (v.reduced) {
      // The variable has already been visited/reduced
      return
    }

    // For now, only attempt to reduce variables that have an "expr" equation
    // TODO: Handle const lists too
    if (v.parsedEqn?.rhs?.kind !== 'expr') {
      v.reduced = true
      return
    }

    // Add this variable to the set of active ones
    // TODO: Allow cycle if the current LHS is referenced on the RHS
    // const baseVarId = v.parsedEqn.lhs.varId
    // if (baseVarId !== currentLhsBaseVarId) {
    if (activelyReducingRefIds.has(v.refId)) {
      throw new Error(`Cycle detected when reducing variables: ${v.refId}`)
    }
    // }
    activelyReducingRefIds.add(v.refId)

    // We currently have two options for reducing variables.  The less aggressive
    // one only reduces conditionals (the default for now, for compatibility with
    // the legacy reader), and the more aggressive one (enabled via environment
    // variable) performs constant folding and simplifies trivial expressions and
    // function calls.
    let reduce
    if (mode === 'aggressive') {
      reduce = reduceExpr
    } else {
      reduce = reduceConditionals
    }

    // Reduce the expression
    const parsedRhsExpr = v.parsedEqn.rhs.expr
    const reducedRhsExpr = reduce(parsedRhsExpr, {
      resolveVarRef
    })

    // Save reduced RHS as a new `parsedEqn`
    const newEqn = {
      lhs: v.parsedEqn.lhs,
      rhs: {
        kind: 'expr',
        expr: reducedRhsExpr
      }
    }
    v.parsedEqn = newEqn

    // TODO: Ideally we would leave the `modelFormula` untouched so that when we generate the
    // comment above the generated code, it would show the original equation instead of the
    // reduced one.  But the tests currently rely on `modelFormula` being updated after we
    // reduce the RHS, so we will leave this as is for now.
    const reducedRhsText = toPrettyString(reducedRhsExpr, { compact: true })
    v.modelFormula = reducedRhsText

    // Set a flag to indicate that the variable has been visited and reduced
    v.reduced = true

    // Remove this variable from the set of active ones
    activelyReducingRefIds.delete(v.refId)
  }

  const resolveVarRef = varRef => {
    // If we look up by refId, it will fail if it's a separated var.  If it's a normal
    // unsubscripted or apply-to-all var, then refId lookup should return one var.
    // TODO: This approach needs to be revisited
    const refId = refIdForVarRef(varRef)
    const refVar = Model.varWithRefId(refId)
    if (refVar) {
      // XXX: For now, don't try to reduce variables like this:
      //   x[DimA] = 1
      // This is because `generateSmoothVariables` doesn't work well in cases
      // where some arguments have subscripts and some don't.  So for example,
      // if the "init" arg is subscripted but is defined as a constant, we would
      // reduce it to a constant, but `generateSmoothVariables` doesn't know how
      // to mix.
      if (refVar.subscripts !== undefined && refVar.subscripts.length > 0) {
        return undefined
      }

      // In "aggressive" mode, attempt to reduce the referenced variable, otherwise
      // use the parsed RHS expression as is
      if (mode === 'aggressive') {
        reduceVariable(refVar)
      }

      // If the attempt was successful, the reduced expression will be defined here
      const reducedExpr = refVar.parsedEqn?.rhs?.expr
      if (reducedExpr) {
        // Only substitute if the reduced expression resolves to a simple constant and
        // the variable is not configured as an input (that can override the constant
        // value at runtime).  Otherwise we will keep the variable reference intact.
        // TODO: Are there other cases where we should do a substitution?  Like when
        // the expression reduces to a single 'variable-ref'?
        const refBaseVarId = baseVarIdForRefId(refId)
        if (reducedExpr.kind === 'number' && !inputBaseVarIdsSet.has(refBaseVarId)) {
          return reducedExpr
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    } else {
      // We couldn't find the variable by refId, so find all variables with that base varId
      // TODO: Revisit this
      // const refVars = Model.varsWithName(varRef.varId)
      // if (refVars.length === 1) {
      //   // When there's a single variable, we can use that
      //   reduceVariable(refVars[0])
      //   return refVars[0].parsedEqn?.rhs?.expr
      // } else {
      //   return undefined
      // }
      return undefined
    }
  }

  // Visit each variable and attempt to reduce it
  for (const v of variables) {
    reduceVariable(v)
  }
}
