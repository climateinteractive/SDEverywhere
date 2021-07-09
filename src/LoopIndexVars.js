import { isDimension } from './Subscript.js'

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
