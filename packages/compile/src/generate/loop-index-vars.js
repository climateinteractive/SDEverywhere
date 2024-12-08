import { isDimension } from '../_shared/subscript.js'

/**
 * Mapping of dimension IDs to loop index variables.  The `indexVars` is an array
 * of C/JS loop index variable names that will be generated.  For example, suppose
 * `indexVars` is ['i', 'j', 'k'] and we have an equation:
 *   x[DimA, DimB, DimC] = y[DimB, DimC, DimA] ~~|
 * This class will map the index variables according to the order in which the
 * `index` method is called:
 *   const vars = new LoopIndexVars(['i', 'j', 'k'])
 *   vars.index('_dima') // returns 'i'
 *   vars.index('_dimb') // returns 'j'
 *   vars.index('_dimc') // returns 'k'
 */
export default class LoopIndexVars {
  constructor(indexVars) {
    this.loopIndexVars = this.loopIndexVarGen(indexVars)
    this.loopIndices = {}
  }
  index(subscriptName) {
    let index
    if (isDimension(subscriptName)) {
      index = this.loopIndices[subscriptName]
      if (!index) {
        index = this.loopIndexVars.next()
        this.loopIndices[subscriptName] = index
      }
    }
    return index
  }
  loopIndexVarGen(indexVars) {
    // Return an object supplying C loop index variables.
    // Index variables are assigned in order from the index var list.
    let loopIter = indexVars[Symbol.iterator]()
    return {
      next: () => loopIter.next().value
    }
  }
}
