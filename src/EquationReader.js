const antlr4 = require('antlr4/index')
const { ModelLexer, ModelParser } = require('antlr4-vensim')
const R = require('ramda')
const Model = require('./Model')
const Variable = require('./Variable')
const ModelReader = require('./ModelReader')
const VariableReader = require('./VariableReader')
const { sub, normalizeSubscripts, indexNamesForSubscript, isIndex, separatedVariableIndex } = require('./Subscript')
const {
  canonicalName,
  cFunctionName,
  newLookupVarName,
  newLevelVarName,
  newAuxVarName,
  vlog,
  isSmoothFunction,
  isDelayFunction
} = require('./Helpers')

// Set this true to get a list of functions used in the model. This may include lookups.
const PRINT_FUNCTION_NAMES = false

module.exports = class EquationReader extends ModelReader {
  constructor(variable) {
    super()
    // variable that will be read
    this.var = variable
    // reference id constructed in parts
    this.refId = ''
    // list of reference ids filled when a dimension reference is expanded; overrides this.refId
    this.expandedRefIds = []
    // flag that indicates the RHS has something other than a constant
    this.rhsNonConst = false
  }
  read() {
    // Fill in more information about the variable by analyzing the equation parse tree.
    // Variables that were added programmatically do not have a parse tree context.
    if (this.var.eqnCtx) {
      this.visitEquation(this.var.eqnCtx)
    }
    // Refine the var type based on the contents of the equation.
    if (this.var.points.length > 0) {
      this.var.varType = 'lookup'
    } else if (this.var.isAux() && !this.rhsNonConst) {
      this.var.varType = 'const'
    }
  }
  //
  // Helpers
  //
  addReferencesToList(list) {
    // Add reference ids gathered while walking the RHS parse tree to the variable's reference list.
    let add = refId => {
      // In Vensim a variable can refer to its current value in the state.
      // Do not add self-references to the lists of references.
      // Do not duplicate references.
      if (refId !== this.var.refId && !R.contains(refId, list)) {
        list.push(refId)
      }
    }
    // Add expanded reference ids if they exist, otherwise, add the single reference id.
    if (R.isEmpty(this.expandedRefIds)) {
      add(this.refId)
    } else {
      R.forEach(refId => add(refId), this.expandedRefIds)
    }
  }
  //
  // Visitor callbacks
  //
  visitCall(ctx) {
    // Mark the RHS as non-constant, since it has a function call.
    this.rhsNonConst = true
    // Convert the function name from Vensim to C format.
    let fn = cFunctionName(ctx.Id().getText())
    this.callStack.push({ fn: fn })
    if (PRINT_FUNCTION_NAMES) {
      console.error(fn)
    }
    if (fn === '_INTEG') {
      this.var.varType = 'level'
      this.var.hasInitValue = true
    } else if (fn === '_INITIAL') {
      this.var.varType = 'initial'
      this.var.hasInitValue = true
    } else if (fn === '_ACTIVE_INITIAL' || fn === '_SAMPLE_IF_TRUE') {
      this.var.hasInitValue = true
    }
    super.visitCall(ctx)
    this.callStack.pop()
  }
  visitExprList(ctx) {
    let fn = this.currentFunctionName()
    if (isSmoothFunction(fn)) {
      // Generate a level var to expand the SMOOTH* call.
      // TODO consider allowing more than one SMOOTH* call substitution
      // Get SMOOTH* arguments for the function expansion.
      let args = R.map(expr => expr.getText(), ctx.expr())
      this.var.smoothVarName = this.expandSmoothFunction(fn, args)
    } else if (isDelayFunction(fn)) {
      // Generate a level var to expand the DELAY* call.
      let args = R.map(expr => expr.getText(), ctx.expr())
      this.var.delayVarName = this.expandDelayFunction(fn, args)
      // Generate an aux var to hold the delay time expression.
      let genSubs = this.genSubs(...args)
      let delayTimeVarName = newAuxVarName()
      this.var.delayTimeVarName = canonicalName(delayTimeVarName)
      let delayTimeEqn
      if (fn === '_DELAY1' || fn === '_DELAY1I') {
        delayTimeEqn = `${delayTimeVarName}${genSubs} = ${args[1]}`
      } else if (fn === '_DELAY3' || fn === '_DELAY3I') {
        delayTimeEqn = `${delayTimeVarName}${genSubs} = (${args[1]}) / 3.0`
      }
      this.addVariable(delayTimeEqn)
      // Add a reference to the var, since it won't show up until code gen time.
      this.var.references.push(this.var.delayTimeVarName)
    } else {
      super.visitExprList(ctx)
    }
  }
  visitVar(ctx) {
    // Mark the RHS as non-constant, since it has a variable reference.
    this.rhsNonConst = true
    // Get the var name of a variable in a call and save it as a reference.
    let id = ctx.Id().getText()
    let varName = canonicalName(id)
    let fn = this.currentFunctionName()
    this.refId = varName
    this.expandedRefIds = []
    super.visitVar(ctx)
    // Separate init references from eval references in level formulas.
    if (isSmoothFunction(fn) || isDelayFunction(fn)) {
      // Do not set references inside the call, since it will be replaced
      // with the generated level var.
    } else if (this.argIndexForFunctionName('_INTEG') === 1) {
      this.addReferencesToList(this.var.initReferences)
    } else if (this.argIndexForFunctionName('_ACTIVE_INITIAL') === 1) {
      this.addReferencesToList(this.var.initReferences)
    } else if (this.argIndexForFunctionName('_SAMPLE_IF_TRUE') === 2) {
      this.addReferencesToList(this.var.initReferences)
    } else if (this.var.isInitial()) {
      this.addReferencesToList(this.var.initReferences)
    } else {
      this.addReferencesToList(this.var.references)
    }
  }
  visitLookupCall(ctx) {
    // Mark the RHS as non-constant, since it has a lookup.
    this.rhsNonConst = true
    ctx.expr().accept(this)
    super.visitLookupCall(ctx)
  }
  visitLookupArg(ctx) {
    // When a call argument is a lookup, generate a new lookup variable and save the variable name to emit later.
    // TODO consider expanding this to more than one lookup arg per equation
    this.var.lookupArgVarName = this.generateLookupArg(ctx)
  }
  visitSubscriptList(ctx) {
    // When an equation references a non-appy-to-all array, add its subscripts to the array var's refId.
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_expr) {
      // Get the referenced var's subscripts in normal order.
      let subscripts = R.map(id => canonicalName(id.getText().replace('!', '')), ctx.Id())
      subscripts = normalizeSubscripts(subscripts)
      // console.error(`${this.var.refId} → ${this.refId} [ ${subscripts} ]`);
      if (subscripts.length > 0) {
        // See if this variable is non-apply-to-all. At this point, the refId is just the var name.
        // References to apply-to-all variables do not need subscripts since they refer to the whole array.
        let expansionFlags = Model.expansionFlags(this.refId)
        if (expansionFlags) {
          // The reference is to a non-apply-to-all variable.
          // Find the refIds of the vars that include the indices in the reference.
          // Get the vars with the var name of the reference. We will choose from these vars.
          let varsWithRefName = Model.varsWithName(this.refId)
          // Support one or two dimensions that vary in non-apply-to-all variable definitions.
          let numLoops = R.reduce((n, f) => n + (f ? 1 : 0), 0, expansionFlags)
          // The refIds of actual vars containing the indices will accumulate with possible duplicates.
          let expandedRefIds = []
          if (numLoops === 1) {
            // Find refIds for a subscript in either the first or the second position.
            let pos = expansionFlags[0] ? 0 : 1
            // For each index name at the subscript position, find refIds for vars that include the index.
            // This process ensures that we generate references to vars that are in the var table.
            let indexNamesAtPos
            // Use the single index name for a separated variable if it exists.
            let separatedIndexName = separatedVariableIndex(subscripts[pos], this.var)
            if (separatedIndexName) {
              indexNamesAtPos = [separatedIndexName]
            } else {
              // Generate references to all the indices for the subscript.
              indexNamesAtPos = indexNamesForSubscript(subscripts[pos])
            }
            // vlog('indexNamesAtPos', indexNamesAtPos);
            R.forEach(indexName => {
              // Consider each var with the same name as the reference in the equation.
              R.forEach(refVar => {
                let refVarIndexNames = indexNamesForSubscript(refVar.subscripts[pos])
                if (refVarIndexNames.length === 0) {
                  console.error(
                    `no subscript at pos ${pos} for var ${refVar.refId} with subscripts ${refVar.subscripts}`
                  )
                }
                if (R.contains(indexName, refVarIndexNames)) {
                  expandedRefIds.push(refVar.refId)
                  // console.error(`adding reference ${refVar.refId}`);
                }
              }, varsWithRefName)
            }, indexNamesAtPos)
          } else if (numLoops === 2) {
            // Expand the dimension in both positions.
            let indexNamesAtPos0
            let separatedIndexName0 = separatedVariableIndex(subscripts[0], this.var)
            if (separatedIndexName0) {
              indexNamesAtPos0 = [separatedIndexName0]
            } else {
              indexNamesAtPos0 = indexNamesForSubscript(subscripts[0])
            }
            let indexNamesAtPos1
            let separatedIndexName1 = separatedVariableIndex(subscripts[1], this.var)
            if (separatedIndexName1) {
              indexNamesAtPos1 = [separatedIndexName1]
            } else {
              indexNamesAtPos1 = indexNamesForSubscript(subscripts[1])
            }
            R.forEach(indexName0 => {
              R.forEach(indexName1 => {
                R.forEach(refVar => {
                  let refVarIndexNames0 = indexNamesForSubscript(refVar.subscripts[0])
                  if (refVarIndexNames0.length === 0) {
                    console.error(
                      `ERROR: no subscript at pos 0 for var ${refVar.refId} with subscripts ${refVar.subscripts}`
                    )
                  }
                  let refVarIndexNames1 = indexNamesForSubscript(refVar.subscripts[1])
                  if (refVarIndexNames1.length === 0) {
                    console.error(
                      `ERROR: no subscript at pos 1 for var ${refVar.refId} with subscripts ${refVar.subscripts}`
                    )
                  }
                  if (R.contains(indexName0, refVarIndexNames0) && R.contains(indexName1, refVarIndexNames1)) {
                    expandedRefIds.push(refVar.refId)
                  }
                }, varsWithRefName)
              }, indexNamesAtPos1)
            }, indexNamesAtPos0)
          }
          // Sort the expandedRefIds and eliminate duplicates.
          this.expandedRefIds = R.uniq(expandedRefIds.sort())
        }
      }
    }
    super.visitSubscriptList(ctx)
  }
  visitLookupRange(ctx) {
    this.var.range = R.map(p => this.getPoint(p), ctx.lookupPoint())
    super.visitLookupRange(ctx)
  }
  visitLookupPointList(ctx) {
    this.var.points = R.map(p => this.getPoint(p), ctx.lookupPoint())
    super.visitLookupPointList(ctx)
  }
  getPoint(lookupPoint) {
    let exprs = lookupPoint.expr()
    if (exprs.length >= 2) {
      return [parseFloat(exprs[0].getText()), parseFloat(exprs[1].getText())]
    }
  }
  generateLookupArg(lookupArgCtx) {
    // Generate a variable for a lookup argument found in the RHS.
    let varName = newLookupVarName()
    let eqn = `${varName}${lookupArgCtx.getText()}`
    this.addVariable(eqn)
    return canonicalName(varName)
  }
  expandSmoothFunction(fn, args) {
    // Generate variables for a SMOOTH* call found in the RHS.
    let input = args[0]
    let delay = args[1]
    let init = args[2] ? args[2] : args[0]
    if (fn === '_SMOOTH' || fn === '_SMOOTHI') {
      let level = this.generateSmoothLevel(input, delay, init, 1)
      return canonicalName(level)
    } else if (fn === '_SMOOTH3' || fn === '_SMOOTH3I') {
      let delay3 = `(${delay} / 3)`
      let level1 = this.generateSmoothLevel(input, delay3, init, 1)
      let level2 = this.generateSmoothLevel(level1, delay3, init, 2)
      let level3 = this.generateSmoothLevel(level2, delay3, init, 3)
      return canonicalName(level3)
    }
  }
  generateSmoothLevel(input, delay, init, levelNumber) {
    // Generate a level equation to implement SMOOTH.
    // The parameters are model names. Return the canonical name of the generated level var.
    let genSubs = this.genSubs(input, delay, init)
    let level = newLevelVarName()
    let levelLHS = level + genSubs
    if (levelNumber > 1 && genSubs) {
      input += genSubs
    }
    let eqn = `${levelLHS} = INTEG((${input} - ${levelLHS}) / ${delay}, ${init})`
    this.addVariable(eqn)
    // Add a reference to the new level var.
    // If it has subscripts, the refId is still just the var name, because it is an apply-to-all array.
    this.refId = canonicalName(level)
    this.expandedRefIds = []
    this.addReferencesToList(this.var.references)
    return level
  }
  expandDelayFunction(fn, args) {
    // Generate variables for a DELAY* call found in the RHS.
    let input = args[0]
    let delay = args[1]
    if (fn === '_DELAY1' || fn === '_DELAY1I') {
      let init = args[2] ? args[2] : args[0]
      let level = newLevelVarName()
      this.generateDelayLevel(fn, level, input, this.var.modelLHS, init, 1)
      return canonicalName(level)
    } else if (fn === '_DELAY3' || fn === '_DELAY3I') {
      let genSubs = this.genSubs()
      let delay3 = `((${delay}) / 3)`
      let init = `${args[2] ? args[2] : args[0]} * ${delay3}`
      let level1 = newLevelVarName()
      let level2 = newLevelVarName()
      let level3 = newLevelVarName()
      let aux1 = newAuxVarName()
      let aux2 = newAuxVarName()
      this.generateDelayLevel(fn, level3, aux2, this.var.modelLHS, init, 3)
      this.generateDelayLevel(fn, level2, aux1, aux2, level3, 2)
      this.generateDelayLevel(fn, level1, input, aux1, level3, 1)
      this.addVariable(`${aux1}${genSubs} = ${level1}${genSubs} / ${delay3}`)
      this.addVariable(`${aux2}${genSubs} = ${level2}${genSubs} / ${delay3}`)
      return canonicalName(level3)
    }
  }
  generateDelayLevel(fn, level, input, aux, init, levelNumber) {
    // Generate a level equation to implement SMOOTH.
    // The parameters are model names. Return the canonical name of the generated level var.
    let levelSubs = this.genSubs(input, aux, init)
    let eqn = `${level}${levelSubs} = INTEG(${input} - ${aux}, ${init})`
    this.addVariable(eqn)
    // Add a reference to the new level var.
    // If it has subscripts, the refId is still just the var name, because it is an apply-to-all array.
    this.refId = canonicalName(level)
    this.expandedRefIds = []
    this.addReferencesToList(this.var.references)
    return level
  }
  addVariable(modelEquation) {
    let chars = new antlr4.InputStream(modelEquation)
    let lexer = new ModelLexer(chars)
    let tokens = new antlr4.CommonTokenStream(lexer)
    let parser = new ModelParser(tokens)
    parser.buildParseTrees = true
    let tree = parser.equation()
    // Read the var and add it to the Model var table.
    let variableReader = new VariableReader()
    variableReader.visitEquation(tree)
    // Fill in the rest of the var, which may been expanded on a separation dim.
    let generatedVars = variableReader.expandedVars.length > 0 ? variableReader.expandedVars : [variableReader.var]
    R.forEach(v => {
      // Fill in the refId.
      v.refId = Model.refIdForVar(v)
      // Inhibit output for generated variables.
      v.includeInOutput = false
      // Finish the variable by parsing the RHS.
      let equationReader = new EquationReader(v)
      equationReader.read()
    }, generatedVars)
  }
  genSubs(...varNames) {
    // Get the subscripts from one or more varnames. Check if they agree.
    // This is used to get the subscripts for generated variables.
    let result = new Set()
    for (let subscriptedVarname of varNames) {
      let subs = subscriptedVarname.replace(/^[^[]+/, '')
      if (subs) {
        result.add(subs)
      }
    }
    if (result.size > 1) {
      console.error(`ERROR: genSubs subscripts do not agree: ${[...varNames]}`)
    }
    return [...result][0] || ''
  }
}
