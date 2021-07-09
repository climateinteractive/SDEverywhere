import { ModelParser } from 'antlr4-vensim'
import R from 'ramda'
import ModelReader from './ModelReader.js'
import Model from './Model.js'
import Variable from './Variable.js'
import { sub, isDimension, isIndex, normalizeSubscripts } from './Subscript.js'
import { canonicalName, vlog, replaceInArray, strlist } from './Helpers.js'

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
        if (isDimension(subscript) && this.var.modelFormula.includes('GET DIRECT DATA')) {
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
    let isException = (indName, exceptSub) => {
      // Compare the LHS index name directly to an exception index subscript.
      let result = false
      if (isIndex(exceptSub)) {
        result = indName === exceptSub
      } else if (isDimension(exceptSub)) {
        result = R.contains(indName, sub(exceptSub).value)
      }
      return result
    }
    let skipExpansion = (indName, expansionPos) => {
      // Look for this index in each of the exception subscript lists at expansionsPos.
      let skip = false
      for (const exceptSubs of this.var.exceptSubscripts) {
        let exceptSub = exceptSubs[expansionPos]
        if (isException(indName, exceptSub)) {
          skip = true
          break
        }
      }
      return skip
    }
    let skipExpansion2 = (indName0, indName1) => {
      let skip = false
      for (const exceptSubs of this.var.exceptSubscripts) {
        let exceptSub0 = exceptSubs[0]
        let exceptSub1 = exceptSubs[1]
        if (isException(indName0, exceptSub0) && isException(indName1, exceptSub1)) {
          skip = true
          break
        }
      }
      return skip
    }
    let numSubscriptsToExpand = expanding.reduce((n, x) => n + (!!x ? 1 : 0), 0)
    if (numSubscriptsToExpand === 1) {
      let expansionPos = expanding[0] ? 0 : 1
      let expansionSubscript = this.var.subscripts[expansionPos]
      // An exception subscript can be an index. Expand on a single index or on all indices of a dimension.
      let expansionSubs = isIndex(expansionSubscript) ? [sub(expansionSubscript).name] : sub(expansionSubscript).value
      debugLog(`expanding ${this.var.varName}[${strlist(this.var.subscripts)}] subscript`, expansionSubscript)
      for (let indName of expansionSubs) {
        if (!skipExpansion(indName, expansionPos)) {
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
      for (let indName0 of expansionSubs0) {
        for (let indName1 of expansionSubs1) {
          if (!skipExpansion2(indName0, indName1)) {
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
