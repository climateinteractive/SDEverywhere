const antlr4 = require('antlr4/index')
const R = require('ramda')
const ModelReader = require('./ModelReader')
const { Subscript } = require('./Subscript')

module.exports = class SubscriptRangeReader extends ModelReader {
  constructor() {
    super()
    this.indNames = []
  }
  visitModel(ctx) {
    let subscriptRanges = ctx.subscriptRange()
    if (subscriptRanges) {
      for (let subscriptRange of subscriptRanges) {
        subscriptRange.accept(this)
      }
    }
  }
  visitSubscriptRange(ctx) {
    if (ctx) {
      let ids = ctx.Id()
      // Define a dimension and the names of its indices.
      let dim = ids[0].getText()
      let toDim = ids.length > 1 ? ids[1].getText() : null
      ctx.subscriptList().accept(this)
      // Make a mapping to another dimension if it is present.
      let mappings = toDim ? [{ toDim: toDim, value: this.indNames }] : null
      Subscript(dim, this.indNames, dim, mappings)
      // Define indices with their numeric values that belong to the dimension.
      for (let i = 0; i < this.indNames.length; i++) {
        let name = this.indNames[i]
        Subscript(name, i, dim)
      }
    }
  }
  visitSubscriptList(ctx) {
    this.indNames = R.map(id => id.getText(), ctx.Id())
  }
}
