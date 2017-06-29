let antlr4 = require('antlr4/index');
let ModelLexer = require('./ModelLexer').ModelLexer;
let ModelParser = require('./ModelParser').ModelParser;
import ModelReader from './ModelReader';
import * as R from 'ramda';
import { sub, isIndex, isDimension } from './Subscript';
import { canonicalName, list, subscripts, listConcat } from './Helpers';

//
// ModelLHSReader parses the LHS of a var in Vensim format and
// constructs a list of var names with indices for subscripted vars.
//
export default class ModelLHSReader extends ModelReader {
  constructor() {
    super();
    this.varName = '';
    this.modelLHSList = [];
  }
  read(modelLHS) {
    // Parse a model LHS and return the var name without subscripts.
    // The names function may be called on this object to retrieve expanded subscript names.
    // console.error(modelLHS);
    let chars = new antlr4.InputStream(modelLHS);
    let lexer = new ModelLexer(chars);
    let tokens = new antlr4.CommonTokenStream(lexer);
    let parser = new ModelParser(tokens);
    parser.buildParseTrees = true;
    let tree = parser.lhs();
    this.visitLhs(tree);
    return this.varName;
  }
  names() {
    // Expand dimensions in a subscripted var into individual vars with indices.
    if (this.modelLHSList.length > 0) {
      return R.map(modelLHS => modelLHS.replace(/"/g, ''), this.modelLHSList);
    } else {
      return [this.varName.replace(/"/g, '')];
    }
  }
  visitLhs(ctx) {
    let varName = ctx.Id().getText();
    this.varName = varName;
    super.visitLhs(ctx);
  }
  visitSubscriptList(ctx) {
    // Construct the modelLHSList array with the LHS expanded into an entry for each index
    // in the same format as Vensim log files.
    // TODO handle more than two dimensions
    let subscripts = R.map(id => id.getText(), ctx.Id());
    let [dims, inds] = R.partition(subscript => isDimension(canonicalName(subscript)), subscripts);
    if (dims.length === 0) {
      // The list is just one variable with indices.
      let modelIndices = R.reduce((a, ind) => listConcat(a, ind), '', inds);
      this.modelLHSList = [`${this.varName}[${modelIndices}]`];
    } else if (dims.length === 1) {
      // Expand the single subscript dimension.
      if (subscripts.length === 1) {
        let dim = sub(canonicalName(subscripts[0]));
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelDim}]`, dim.modelValue);
      } else if (isDimension(canonicalName(subscripts[0]))) {
        // Expand the dimension in the first or second position.
        let dim = sub(canonicalName(subscripts[0]));
        let modelIndex = subscripts[1];
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelDim},${modelIndex}]`, dim.modelValue);
      } else {
        let dim = sub(canonicalName(subscripts[1]));
        let modelIndex = subscripts[0];
        this.modelLHSList = R.map(modelDim => `${this.varName}[${modelIndex},${modelDim}]`, dim.modelValue);
      }
    } else if (dims.length === 2) {
      for (let modelDim0 of sub(canonicalName(dims[0])).modelValue) {
        for (let modelDim1 of sub(canonicalName(dims[1])).modelValue) {
          this.modelLHSList.push(`${this.varName}[${modelDim0},${modelDim1}]`);
        }
      }
    } else {
      console.err(`${this.varName} has more than 2 dimensions, which is currently unsupported.`);
    }
    // console.error(this.modelLHSList);
  }
}
