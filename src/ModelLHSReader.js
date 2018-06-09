const antlr4 = require('antlr4/index')
const R = require('ramda')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const ModelReader = require('./ModelReader')
const { sub, isIndex, isDimension, indexNamesForSubscript } = require('./Subscript')
const { canonicalName, list, subscripts, listConcat } = require('./Helpers')

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
    // console.error(modelLHS);
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
    // TODO handle more than two dimensions
    let modelLHSInds = dim => {
      // Construct the model indices for a dimension. If the subscript range contained a dimension,
      // expand it into index names.
      let indNames = R.map(subscriptModelName => {
        let subscript = canonicalName(subscriptModelName)
        if (isDimension(subscript)) {
          return sub(subscript).modelValue
        } else {
          return subscriptModelName
        }
      }, dim.modelValue)
      return R.flatten(indNames)
    }
    let subscripts = R.map(id => id.getText(), ctx.Id())
    let [dims, inds] = R.partition(subscript => isDimension(canonicalName(subscript)), subscripts)
    if (dims.length === 0) {
      // The list is just one variable with indices.
      let modelIndices = R.reduce((a, ind) => listConcat(a, ind), '', inds)
      this.modelLHSList = [`${this.varName}[${modelIndices}]`]
    } else if (dims.length === 1) {
      // Expand the single subscript dimension.
      if (subscripts.length === 1) {
        let dim = sub(canonicalName(subscripts[0]))
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelDim}]`, modelLHSInds(dim))
      } else if (isDimension(canonicalName(subscripts[0]))) {
        // Expand the dimension in the first or second position.
        let dim = sub(canonicalName(subscripts[0]))
        let modelIndex = subscripts[1]
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelDim},${modelIndex}]`, modelLHSInds(dim))
      } else {
        let dim = sub(canonicalName(subscripts[1]))
        let modelIndex = subscripts[0]
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelIndex},${modelDim}]`, modelLHSInds(dim))
      }
    } else if (dims.length === 2) {
      for (let modelDim0 of modelLHSInds(sub(canonicalName(dims[0])))) {
        for (let modelDim1 of modelLHSInds(sub(canonicalName(dims[1])))) {
          this.modelLHSList.push(`${this.varName}[${modelDim0},${modelDim1}]`)
        }
      }
    } else {
      console.err(`${this.varName} has more than 2 dimensions, which is currently unsupported.`)
    }
    // console.error(this.modelLHSList);
  }
}
