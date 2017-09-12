const antlr4 = require('antlr4/index')
const ModelLexer = require('./ModelLexer').ModelLexer
const ModelParser = require('./ModelParser').ModelParser
const ModelReader = require('./ModelReader')
const R = require('ramda')
const { sub, isIndex, normalizeSubscripts } = require('./Subscript')
const { canonicalName, encodeCIdentifier, list, vlog, subscripts } = require('./Helpers')
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
    // Encode special characters in the var name before going to the parser.
    let m = modelVarName.match(/([^\[]+)(\[.*)?/)
    let varName = canonicalName(m[1]) + (m[2] || '')
    // Identifiers can't start with digits, so quote it. The quotes are removed later.
    if (/^\d/.test(varName)) {
      varName = `"${varName}"`
    }
    // Parse a single var name, which may include subscripts.
    let chars = new antlr4.InputStream(varName)
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
    this.varName = ctx.Id().getText()
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
