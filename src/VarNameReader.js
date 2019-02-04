const antlr4 = require('antlr4/index')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const ModelReader = require('./ModelReader')
const R = require('ramda')
const { sub, isIndex, normalizeSubscripts } = require('./Subscript')
const { canonicalName, vlog, subscripts } = require('./Helpers')
//
// VarNameReader reads a model var name using the parser to get the var name in C format.
// This is used to generate a variable output in the output section.
//
module.exports = class VarNameReader extends ModelReader {
  constructor() {
    super()
    this.varName = ''
  }
  read(modelVarName) {
    // Parse an individual model var name and convert it into a a canonical C var name.
    // Parse a single var name, which may include subscripts.
    let chars = new antlr4.InputStream(modelVarName)
    let lexer = new ModelLexer(chars)
    let tokens = new antlr4.CommonTokenStream(lexer)
    let parser = new ModelParser(tokens)
    parser.buildParseTrees = true
    let tree = parser.lhs()
    // Generate and return the canonical name.
    this.visitLhs(tree)
    return this.varName
  }
  visitLhs(ctx) {
    let varName = ctx.Id().getText()
    this.varName = canonicalName(varName)
    super.visitLhs(ctx)
  }
  visitSubscriptList(ctx) {
    // Get the canonical form of subscripts found in the var name.
    let subscripts = R.map(id => canonicalName(id.getText()), ctx.Id())
    subscripts = normalizeSubscripts(subscripts)
    // If a subscript is an index, convert it to an index number to match Vensim data exports.
    this.varName += R.map(subName => {
      return isIndex(subName) ? `[${sub(subName).value}]` : `[${subName}]`
    }, subscripts).join('')
  }
}
