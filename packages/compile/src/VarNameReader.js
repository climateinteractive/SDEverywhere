import ModelReader from './ModelReader.js'
import R from 'ramda'
import { createParser } from './Parser.js'
import { sub, isIndex, normalizeSubscripts } from './Subscript.js'
import { canonicalName } from './_shared/helpers.js'
//
// VarNameReader reads a model var name using the parser to get the var name in C format.
// This is used to generate a variable output in the output section.
//
export default class VarNameReader extends ModelReader {
  constructor() {
    super()
    this.varName = ''
  }
  read(modelVarName) {
    // Parse an individual model var name and convert it into a a canonical C var name.
    // Parse a single var name, which may include subscripts.
    let parser = createParser(modelVarName)
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
