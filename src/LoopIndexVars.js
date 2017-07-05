const { sub, isDimension } = require('./Subscript')

module.exports = class LoopIndexVars {
  constructor() {
    this.loopIndexVars = this.loopIndexVarGen()
    this.lhsLoopIndices = {}
  }
  index(subscriptName) {
    let index
    if (isDimension(subscriptName)) {
      let subscript = sub(subscriptName)
      if (subscript) {
        let family = subscript.family
        index = this.lhsLoopIndices[family]
        if (!index) {
          index = this.loopIndexVars.next()
          this.lhsLoopIndices[family] = index
        }
      }
    }
    return index
  }
  marked() {
    return this.loopIndexVars.marked
  }
  loopIndexVarGen() {
    // Return an object supplying C loop index variables.
    // Loop index variables are assigned in order from this list.
    const LOOP_INDEX_VARS = ['i', 'j', 'k', 'l']
    let iter = LOOP_INDEX_VARS[Symbol.iterator]()
    // Array functions like SUM are evaluated with a special inner loop using this loop index variable.
    const ARRAY_FN_LOOP_INDEX_VAR = 'm'
    return {
      next: () => iter.next().value,
      marked: ARRAY_FN_LOOP_INDEX_VAR
    }
  }
}

// Test
// const { Subscript } = require('./Subscript')
// let loopIndices = new LoopIndexVars();
// console.error(loopIndices.marked());
// let s = Subscript('S', ['A1', 'A2', 'A3', 'A4']);
// let t = Subscript('T', ['B1', 'B2', 'B3', 'B4']);
// console.error(isDimension('_s'));
// console.error(loopIndices.index('_s'));
// console.error(loopIndices.index('_t'));
// console.error(loopIndices.index('_s'));
