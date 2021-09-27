import { ModelParser } from 'antlr4-vensim'
import R from 'ramda'
import ModelReader from './ModelReader.js'
import Model from './Model.js'
import Variable from './Variable.js'
import { sub, isDimension, isIndex, normalizeSubscripts } from './Subscript.js'
import { canonicalName, vlog, replaceInArray, strlist, cartesianProductOf } from './Helpers.js'

// Set true to print extra debugging information to stderr.
const DEBUG_LOG = false
let debugLog = (title, value) => !DEBUG_LOG || vlog(title, value)

export default class VariableReader extends ModelReader {
  constructor(specialSeparationDims, directData) {
    super()
    // specialSeparationDims are var names that need to be separated because of
    // circular references, mapped to the dimension subscript to separate on.
    // '{c-variable-name}': '{c-dimension-name}'
    this.specialSeparationDims = specialSeparationDims || {}
    this.directData = directData || {}
  }
  visitModel(ctx) {
    let equations = ctx.equation()
    if (equations) {
      for (let equation of equations) {
        equation.accept(this)
      }
    }
  }
  visitEquation(ctx) {
    // Start a new variable defined by this equation.
    this.var = new Variable(ctx)
    // Allow for an alternate array of variables that are expanded over subdimensions.
    this.expandedVars = []
    // Fill in the variable by visiting the equation parse context.
    super.visitEquation(ctx)
    if (R.isEmpty(this.expandedVars)) {
      // Add a single variable defined by the equation.
      Model.addVariable(this.var)
    } else {
      // Add variables expanded over indices to the model.
      R.forEach(v => Model.addVariable(v), this.expandedVars)
    }
  }
  visitLhs(ctx) {
    this.var.varName = canonicalName(ctx.Id().getText())
    super.visitLhs(ctx)
    // Possibly expand the var on subdimensions.
    if (!R.isEmpty(this.var.subscripts)) {
      // Expand on LHS subscripts alone.
      let expanding = this.subscriptPosToExpand()
      this.expandVars(expanding)
    }
  }
  subscriptPosToExpand() {
    // Decide whether we need to expand each subscript on the LHS.
    // Construct an array of booleans in each subscript position.
    let expanding = []
    for (let iLhsSub = 0; iLhsSub < this.var.subscripts.length; iLhsSub++) {
      let subscript = this.var.subscripts[iLhsSub]
      let expand = false
      // Expand a subdimension in the LHS.
      if (isDimension(subscript)) {
        let dim = sub(subscript)
        let specialSeparationDims = this.specialSeparationDims[this.var.varName] || []
        expand = dim.size < sub(dim.family).size || specialSeparationDims.includes(subscript)
      }
      if (!expand) {
        // Direct data vars with subscripts are separated because we generate a lookup for each index.
        if (
          isDimension(subscript) &&
          (this.var.modelFormula.includes('GET DIRECT DATA') || this.var.modelFormula.includes('GET DIRECT LOOKUPS'))
        ) {
          expand = true
        }
      }
      // Also expand on exception subscripts that are indices or subdimensions.
      if (!expand) {
        for (const exceptSubs of this.var.exceptSubscripts) {
          let exceptSub = exceptSubs[iLhsSub]
          expand = isIndex(exceptSub)
          if (!expand && isDimension(exceptSub)) {
            let dim = sub(exceptSub)
            expand = dim.size < sub(dim.family).size
          }
          if (expand) {
            break
          }
        }
      }
      expanding.push(expand)
    }
    return expanding
  }
  expandVars(expanding) {
    // Expand the indicated subscripts into variable objects in the expandedVars list.
    debugLog(`expanding ${this.var.varName}[${strlist(this.var.subscripts)}] subscripts`, strlist(this.var.subscripts))
    let expansion = []
    let separationDims = []
    // Construct an array with an array at each subscript position. If the subscript is expanded at that position,
    // it will become an array of indices. Otherwise, it remains an index or dimension as a single-valued array.
    for (let i = 0; i < this.var.subscripts.length; i++) {
      let subscript = this.var.subscripts[i]
      let value
      if (expanding[i]) {
        separationDims.push(subscript)
        if (isDimension(subscript)) {
          value = sub(subscript).value
        }
      }
      expansion.push(value || [subscript])
    }
    // Generate an array of fully expanded subscripts.
    let expandedSubs = cartesianProductOf(expansion)
    for (let subs of expandedSubs) {
      // Skip expansions that match exception subscripts.
      if (!R.any(e => R.equals(e, subs), this.var.exceptSubscripts)) {
        // Add a new variable to the expanded vars.
        let v = new Variable(this.var.eqnCtx)
        v.varName = this.var.varName
        v.subscripts = subs
        v.separationDims = separationDims
        debugLog(`  ${strlist(v.subscripts)}`)
        this.expandedVars.push(v)
      }
    }
  }
  visitSubscriptList(ctx) {
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_lhs) {
      let subscripts = normalizeSubscripts(R.map(id => canonicalName(id.getText()), ctx.Id()))
      // Save subscripts in the Variable instance. Subscripts after the first one are exception subscripts.
      if (R.isEmpty(this.var.subscripts)) {
        this.var.subscripts = subscripts
      } else {
        this.var.exceptSubscripts.push(subscripts)
      }
    }
    super.visitSubscriptList(ctx)
  }
  visitConstList(ctx) {
    // Expand a subscripted equation with a constant list.
    let exprs = ctx.expr()
    if (exprs.length > 1) {
      let expanding = R.map(subscript => isDimension(subscript), this.var.subscripts)
      // If the var was already expanded, do it over to make sure we expand on all subscripts.
      if (!R.isEmpty(this.expandedVars)) {
        this.expandedVars = []
      }
      this.expandVars(expanding)
    }
  }
}
