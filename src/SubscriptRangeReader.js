const antlr4 = require('antlr4/index')
const { ModelParser } = require('antlr4-vensim')
const R = require('ramda')
const ModelReader = require('./ModelReader')
const { Subscript } = require('./Subscript')

module.exports = class SubscriptRangeReader extends ModelReader {
  constructor() {
    super()
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
    // When entering a new subscript range definition, reset the properties that will be filled in.
    this.indNames = []
    this.mappingValue = []
    this.toDim = ''
    // All subscript ranges have a dimension name.
    let dimName = ctx.Id().getText()
    // Visit children to fill in the subscript range definition.
    super.visitSubscriptRange(ctx)
    // Make a mapping to another dimension if it is present.
    let mappings = this.toDim ? [{ toDim: this.toDim, value: this.mappingValue }] : null
    // Create a new subscript range definition.
    // The family is provisionally set to the dimension name.
    // It will be updated to the maximal dimension if this is a subdimension.
    // The mapping value contains dimensions and indices in the toDim.
    // It will be expanded and inverted to fromDim indices later.
    Subscript(dimName, this.indNames, dimName, mappings)
  }
  visitSubscriptList(ctx) {
    // A subscript list can appear in either a subscript range or mapping.
    let subscripts = R.map(id => id.getText(), ctx.Id())
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_subscriptRange) {
      this.indNames = subscripts
    }
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_subscriptMapping) {
      this.mappingValue = subscripts
    }
  }
  visitSubscriptSequence(ctx) {
    // Construct index names from the sequence start and end indices.
    // This assumes the indices begin with the same string and end with numbers.
    let r = /^(.*?)(\d+)$/
    let ids = R.map(id => id.getText(), ctx.Id())
    let matches = R.map(id => r.exec(id), ids)
    if (matches[0][1] === matches[1][1]) {
      let prefix = matches[0][1]
      let start = parseInt(matches[0][2])
      let end = parseInt(matches[1][2])
      for (let i = start; i <= end; i++) {
        this.indNames.push(prefix + i)
      }
    }
  }
  visitSubscriptMapping(ctx) {
    this.toDim = ctx.Id().getText()
    super.visitSubscriptMapping(ctx)
  }
}
