const antlr4 = require('antlr4/index')
const R = require('ramda')
const ModelReader = require('./ModelReader')
const { Subscript } = require('./Subscript')

module.exports = class SubscriptRangeReader extends ModelReader {
  constructor() {
    super()
    this.subNames = []
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
      let family = ctx.Id().getText()
      ctx.subscriptList().accept(this)
      Subscript(family, this.subNames)
      for (let i = 0; i < this.subNames.length; i++) {
        let name = this.subNames[i]
        Subscript(name, i, family)
      }
    }
  }
  visitSubscriptList(ctx) {
    this.subNames = R.map(id => id.getText(), ctx.Id())
  }
}
