const antlr4 = require('antlr4/index')
const R = require('ramda')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const ModelReader = require('./ModelReader')
const { sub, isIndex, isDimension, indexNamesForSubscript } = require('./Subscript')
const { canonicalName, subscripts, listConcat } = require('./Helpers')

//
// ModelLHSReader parses the LHS of a var in Vensim format and
// constructs a list of var names with indices for subscripted vars.
//
module.exports = class ModelLHSReader extends ModelReader {
  constructor() {
    super()
    this.varName = ''
    this.modelLHSList = []
  }
  read(modelLHS) {
    // Parse a model LHS and return the var name without subscripts.
    // The names function may be called on this object to retrieve expanded subscript names.
    let chars = new antlr4.InputStream(modelLHS)
    let lexer = new ModelLexer(chars)
    let tokens = new antlr4.CommonTokenStream(lexer)
    let parser = new ModelParser(tokens)
    parser.buildParseTrees = true
    let tree = parser.lhs()
    this.visitLhs(tree)
    return this.varName
  }
  names() {
    // Expand dimensions in a subscripted var into individual vars with indices.
    if (this.modelLHSList.length > 0) {
      return R.map(modelLHS => modelLHS.replace(/"/g, ''), this.modelLHSList)
    } else {
      return [this.varName.replace(/"/g, '')]
    }
  }
  visitLhs(ctx) {
    let varName = ctx.Id().getText()
    this.varName = varName
    super.visitLhs(ctx)
  }
  visitSubscriptList(ctx) {
    // Construct the modelLHSList array with the LHS expanded into an entry for each index
    // in the same format as Vensim log files.
    let subscripts = R.map(id => id.getText(), ctx.Id())
    let expandLHSDims = (a, subscripts) => {
      if (subscripts.length === 0) {
        this.modelLHSList.push(`${this.varName}[${a.join(',')}]`)
      } else {
        let sub0 = canonicalName(subscripts[0])
        if (isDimension(sub0)) {
          for (let subscriptModelName of sub(sub0).modelValue) {
            expandLHSDims(a.concat(subscriptModelName), subscripts.slice(1))
          }
        } else {
          expandLHSDims(a.concat(subscripts[0]), subscripts.slice(1))
        }
      }
    }
    expandLHSDims([], subscripts)
    return this.modelLHSList
  }
}
