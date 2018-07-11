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
  visitSubscriptList(ctx) {
    let isException = (indName, exceptSub) => {
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
    let expandVars = (exceptSubs = null) => {
      // Decide whether we need to expand each subscript on the LHS.
      // Construct an array of booleans in each subscript position.
      let expanding = []
      for (let i = 0; i < this.var.subscripts.length; i++) {
        let subscript = this.var.subscripts[i]
        let expand = false
        if (isDimension(subscript)) {
          let dim = sub(subscript)
          let specialSeparationDim = this.specialSeparationDims[this.var.varName]
          expand = dim.size < sub(dim.family).size || specialSeparationDim === subscript
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
          if (!isException(indName, exceptSub)) {
            let v = new Variable(this.var.eqnCtx)
            v.varName = this.var.varName
            v.subscripts = replaceInArray(expansionSubscript, indName, this.var.subscripts)
            v.separationDims.push(expansionSubscript)
            debugLog(`  ${strlist(v.subscripts)}`)
            this.expandedVars.push(v)
          }
        }
      } else if (numSubscriptsToExpand === 2) {
        debugLog(`expanding ${this.var.varName}[${strlist(this.var.subscripts)}] subscripts`, strlist(this.var.subscripts))
        let expansionSubscript0 = this.var.subscripts[0]
        let expansionSubscript1 = this.var.subscripts[1]
        let expansionSubs0 = isIndex(expansionSubscript0) ? [sub(expansionSubscript0).name] : sub(expansionSubscript0).value
        let expansionSubs1 = isIndex(expansionSubscript1) ? [sub(expansionSubscript1).name] : sub(expansionSubscript1).value
        let exceptSub0 = exceptSubs ? exceptSubs[0] : null
        let exceptSub1 = exceptSubs ? exceptSubs[1] : null
        for (let indName0 of expansionSubs0) {
          for (let indName1 of expansionSubs1) {
            if (!isException(indName0, exceptSub0) || !isException(indName1, exceptSub1)) {
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
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_lhs) {
      let subscripts = normalizeSubscripts(R.map(id => canonicalName(id.getText()), ctx.Id()))
      if (R.isEmpty(this.var.subscripts)) {
        // The first subscript list is subscripts attached to a variable name.
        // We detect that it's first by virtue of the var subscripts not being set yet.
        this.var.subscripts = subscripts
        expandVars()
      } else {
        // A second subscript list is an EXCEPT clause that establishes an ad hoc subdimension.
        // Expand the subscript exceptions. Discard already expanded vars from the LHS.
        debugLog(`${this.var.varName} exceptSubs`, subscripts)
        this.expandedVars = []
        expandVars(subscripts)
      }
    }
    super.visitSubscriptList(ctx)
  }
  visitConstList(ctx) {
    let exprs = ctx.expr()
    let errmsgNoDim = () => vlog('ERROR: no dimension for constant list in variable', this.var.varName)
    let errmsgDimSize = () =>
      vlog('ERROR: the dimension size does not match the number of constants in constant list', this.var.varName)
    // A constant list should have more than one value because the syntax is a list of constants delimited by commas.
    if (exprs.length > 1) {
      // Construct a variable (based on the variable so far) for each constant on the list.
      // The parser collapses 2D constant lists into a flat list in row-major order.
      // The subscripts must be dimensions.
      let numDims = this.var.subscripts.length
      if (numDims === 0) {
        errmsgNoDim()
      } else if (numDims === 1) {
        let dimName = this.var.subscripts[0]
        if (isDimension(dimName)) {
          let dim = sub(dimName)
          if (dim.size != exprs.length) {
            errmsgDimSize()
          }
          R.forEach(indName => {
            let v = new Variable(this.var.eqnCtx)
            v.varName = this.var.varName
            v.subscripts = [indName]
            this.expandedVars.push(v)
          }, dim.value)
        } else {
          errmsgNoDim()
        }
      } else if (numDims === 2) {
        let dimName1 = this.var.subscripts[0]
        let dimName2 = this.var.subscripts[1]
        if (isDimension(dimName1) && isDimension(dimName2)) {
          let dim1 = sub(dimName1)
          let dim2 = sub(dimName2)
          let n = dim1.size * dim2.size
          if (n != exprs.length) {
            errmsgNoDim()
          }
          for (let indName1 of dim1.value) {
            for (let indName2 of dim2.value) {
              let v = new Variable(this.var.eqnCtx)
              v.varName = this.var.varName
              v.subscripts = [indName1, indName2]
              this.expandedVars.push(v)
            }
          }
        }
      }
    }
  }
}
