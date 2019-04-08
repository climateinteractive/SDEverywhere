const antlr4 = require('antlr4/index')
const { ModelParser } = require('antlr4-vensim')
const R = require('ramda')
const ModelReader = require('./ModelReader')
const Variable = require('./Variable')
const { sub, isDimension, isIndex, normalizeSubscripts } = require('./Subscript')
const { canonicalName, vlog, replaceInArray, strlist } = require('./Helpers')

// Set true to print extra debugging information to stderr.
const DEBUG_LOG = false
let debugLog = (title, value) => !DEBUG_LOG || vlog(title, value)

module.exports = class VariableReader extends ModelReader {
  constructor(specialSeparationDims) {
    super()
    // specialSeparationDims are var names that need to be separated because of
    // circular references, mapped to the dimension subscript to separate on.
    // '{c-variable-name}': '{c-dimension-name}'
    this.specialSeparationDims = specialSeparationDims || {}
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
    const { addVariable } = require('./Model')
    this.var = new Variable(ctx)
    // Allow for an alternate array of variables that are expanded over subdimensions.
    this.expandedVars = []
    // Fill in the variable by visiting the equation parse context.
    super.visitEquation(ctx)
    if (R.isEmpty(this.expandedVars)) {
      // Add a single variable defined by the equation.
      addVariable(this.var)
    } else {
      // Add variables expanded over indices to the model.
      R.forEach(v => addVariable(v), this.expandedVars)
    }
  }
  visitLhs(ctx) {
    this.var.varName = canonicalName(ctx.Id().getText())
    super.visitLhs(ctx)
  }
  isException(indName, exceptSub) {
    // Compare the LHS index name directly to an exception index subscript.
    // TODO allow two exception subscripts (requires nested loop)
    let result = false
    if (exceptSub) {
      if (isIndex(exceptSub)) {
        result = indName === exceptSub
      } else if (isDimension(exceptSub)) {
        result = R.contains(indName, sub(exceptSub).value)
      }
    }
    return result
  }
  subscriptPosToExpand(exceptSubs = null) {
    // Decide whether we need to expand each subscript on the LHS.
    // Construct an array of booleans in each subscript position.
    let expanding = []
    for (let i = 0; i < this.var.subscripts.length; i++) {
      let subscript = this.var.subscripts[i]
      let expand = false
      // Expand a subdimension in the LHS.
      if (isDimension(subscript)) {
        let dim = sub(subscript)
        let specialSeparationDims = this.specialSeparationDims[this.var.varName] || []
        expand = dim.size < sub(dim.family).size || specialSeparationDims.includes(subscript)
      }
      // Also expand on exception subscripts that are indices or subdimensions.
      if (!expand && exceptSubs) {
        let exceptSub = exceptSubs[i]
        expand = isIndex(exceptSub)
        if (!expand && isDimension(exceptSub)) {
          let dim = sub(exceptSub)
          expand = dim.size < sub(dim.family).size
        }
      }
      expanding.push(expand)
    }
    return expanding
  }
  expandVars(expanding, exceptSubs = null) {
    // Expand the indicated subscripts into variable objects in the expandedVars list.
    let numSubscriptsToExpand = expanding.reduce((n, x) => n + (!!x ? 1 : 0), 0)
    if (numSubscriptsToExpand === 1) {
      let expansionPos = expanding[0] ? 0 : 1
      let expansionSubscript = this.var.subscripts[expansionPos]
      // An exception subscript can be an index. Expand on a single index or on all indices of a dimension.
      let expansionSubs = isIndex(expansionSubscript) ? [sub(expansionSubscript).name] : sub(expansionSubscript).value
      let exceptSub = exceptSubs ? exceptSubs[expansionPos] : null
      debugLog(`expanding ${this.var.varName}[${strlist(this.var.subscripts)}] subscript`, expansionSubscript)
      for (let indName of expansionSubs) {
        if (!this.isException(indName, exceptSub)) {
          let v = new Variable(this.var.eqnCtx)
          v.varName = this.var.varName
          v.subscripts = replaceInArray(expansionSubscript, indName, this.var.subscripts)
          v.separationDims.push(expansionSubscript)
          debugLog(`  ${strlist(v.subscripts)}`)
          this.expandedVars.push(v)
        }
      }
    } else if (numSubscriptsToExpand === 2) {
      debugLog(
        `expanding ${this.var.varName}[${strlist(this.var.subscripts)}] subscripts`,
        strlist(this.var.subscripts)
      )
      let expansionSubscript0 = this.var.subscripts[0]
      let expansionSubscript1 = this.var.subscripts[1]
      let expansionSubs0 = isIndex(expansionSubscript0)
        ? [sub(expansionSubscript0).name]
        : sub(expansionSubscript0).value
      let expansionSubs1 = isIndex(expansionSubscript1)
        ? [sub(expansionSubscript1).name]
        : sub(expansionSubscript1).value
      let exceptSub0 = exceptSubs ? exceptSubs[0] : null
      let exceptSub1 = exceptSubs ? exceptSubs[1] : null
      for (let indName0 of expansionSubs0) {
        for (let indName1 of expansionSubs1) {
          if (!this.isException(indName0, exceptSub0) || !this.isException(indName1, exceptSub1)) {
            let v = new Variable(this.var.eqnCtx)
            v.varName = this.var.varName
            v.subscripts = [indName0, indName1]
            v.separationDims = [expansionSubscript0, expansionSubscript1]
            debugLog(`  ${strlist(v.subscripts)}`)
            this.expandedVars.push(v)
          }
        }
      }
    }
  }
  visitSubscriptList(ctx) {
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_lhs) {
      let subscripts = normalizeSubscripts(R.map(id => canonicalName(id.getText()), ctx.Id()))
      if (R.isEmpty(this.var.subscripts)) {
        // The first subscript list is subscripts attached to a variable name.
        // We detect that it's first by virtue of the var subscripts not being set yet.
        this.var.subscripts = subscripts
        let expanding = this.subscriptPosToExpand()
        this.expandVars(expanding)
      } else {
        // A second subscript list is an EXCEPT clause that establishes an ad hoc subdimension.
        // Discard already expanded vars from the LHS.
        this.expandedVars = []
        // Expand the subscript exceptions.
        debugLog(`${this.var.varName} exceptSubs`, subscripts)
        let expanding = this.subscriptPosToExpand(subscripts)
        this.expandVars(expanding, subscripts)
      }
    }
    super.visitSubscriptList(ctx)
  }
  visitConstList(ctx) {
    // Expand a subscripted equation with a constant list if it was not already expanded
    // because of a subdimension or EXCEPT clause on the LHS.
    let exprs = ctx.expr()
    if (exprs.length > 1 && R.isEmpty(this.expandedVars)) {
      let expanding = R.map(subscript => isDimension(subscript), this.var.subscripts)
      // let expanding = []
      // for (let subscript of this.var.subscripts) {
      //   let s = canonicalName(subscript)
      //   let d = isDimension(s)
      //   expanding.push(d)
      // }
      this.expandVars(expanding)
    }
  }
}
