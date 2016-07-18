let antlr4 = require('antlr4/index');
let ModelParser = require('./ModelParser').ModelParser;
import * as R from 'ramda';
import * as Model from './Model';
import ModelReader from './ModelReader';
import Variable from './Variable';
import { sub, isDimension, normalizeSubscripts } from './Subscript';
import { canonicalName, vlog, replaceInArray } from './Helpers';

// List var names that need to be separated because of circular references,
// mapped to the dimension subscript to separate on.
let specialSeparationDims = {
  // '{c-variable-name}': '{c-dimension-name}',
};

export default class VariableReader extends ModelReader {
  visitEquation(ctx) {
    // Start a new variable and an alternate array of variables for constant lists.
    this.var = new Variable(ctx);
    this.expandedVars = [];
    // Fill in the variable by visiting the equation parse context.
    super.visitEquation(ctx);
    // Add variables to the model.
    if (this.expandedVars.length > 0) {
      R.forEach(v => Model.addVariable(v), this.expandedVars);
    }
    else {
      Model.addVariable(this.var);
    }
  }
  visitLhs(ctx) {
    this.var.varName = canonicalName(ctx.Id().getText());
    super.visitLhs(ctx);
  }
  visitSubscriptList(ctx) {
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_lhs) {
      // Get LHS subscripts in normal form.
      let subscripts = R.map(id => canonicalName(id.getText()), ctx.Id());
      this.var.subscripts = normalizeSubscripts(subscripts);
      // If the LHS has a subdimension as a subscript, expand it into individual
      // scalar variables for each index in the subdimension. This handles the case
      // where the indices need to be evaluated interleaved with other variables.
      // The separated variables replace the  original model variable.
      R.forEach(subscript => {
        if (isDimension(subscript)) {
          let dim = sub(subscript);
          let specialSeparationDim = specialSeparationDims[this.var.varName];
          if (dim.size < sub(dim.family).size || specialSeparationDim === subscript) {
            // if (specialSeparationDim) {
              // console.error(`separating ${this.var.varName} on ${specialSeparationDim}`);
            // }
            // Separate into variables for each index in the subdimension.
            R.forEach(indName => {
              let v = new Variable(this.var.eqnCtx);
              v.varName = this.var.varName;
              v.subscripts = replaceInArray(subscript, indName, this.var.subscripts);
              v.separationDim = subscript;
              this.expandedVars.push(v);
            }, dim.value);
          }
        }
      }, this.var.subscripts);
    }
    super.visitSubscriptList(ctx);
  }
  visitConstList(ctx) {
    let consts = ctx.Const();
    if (consts.length > 1) {
      // Construct a variable (based on the variable so far) for each constant on the list.
      // Assume the subscript is a dimension because a constant list has more than one value.
      // TODO are there cases where there is more than one dimension?
      let dimName = this.var.subscripts[0];
      if (isDimension(dimName)) {
        let dim = sub(dimName);
        if (dim.size != consts.length) {
          vlog('ERROR: the number of dimensions does not match the number of constants in constant list', this.var.varName);
        }
        R.forEach(indName => {
          let v = new Variable(this.var.eqnCtx);
          v.varName = this.var.varName;
          v.subscripts = [indName];
          this.expandedVars.push(v);
        }, dim.value);
      }
      else {
        vlog('ERROR: no dimension for constant list', this.var.varName);
      }
    }
  }
}
