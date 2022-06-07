import { ModelParser } from 'antlr4-vensim'
import R from 'ramda'

import {
  canonicalName,
  canonicalVensimName,
  cFunctionName,
  decanonicalize,
  isDelayFunction,
  isSeparatedVar,
  isSmoothFunction,
  isTrendFunction,
  isNpvFunction,
  matchRegex,
  newAuxVarName,
  newLevelVarName,
  newLookupVarName,
  newFixedDelayVarName,
  cartesianProductOf
} from '../_shared/helpers.js'
import {
  extractMarkedDims,
  indexNamesForSubscript,
  normalizeSubscripts,
  separatedVariableIndex,
  sub,
  isDimension
} from '../_shared/subscript.js'
import ModelReader from '../parse/model-reader.js'
import { createParser } from '../parse/parser.js'

import ExprReader from './expr-reader.js'
import Model from './model.js'
import VariableReader from './variable-reader.js'

// Set this true to get a list of functions used in the model. This may include lookups.
const PRINT_FUNCTION_NAMES = false

export default class EquationReader extends ModelReader {
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
      if (refId !== this.var.refId && !list.includes(refId)) {
        list.push(refId)
      }
    }
    // Add expanded reference ids if they exist, otherwise, add the single reference id.
    if (R.isEmpty(this.expandedRefIds)) {
      add(this.refId)
    } else {
      this.expandedRefIds.forEach(refId => add(refId))
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
    if (fn === '_INTEG' || fn === '_DELAY_FIXED') {
      this.var.varType = 'level'
      this.var.hasInitValue = true
      if (fn === '_DELAY_FIXED') {
        this.var.varSubtype = 'fixedDelay'
        this.var.fixedDelayVarName = canonicalName(newFixedDelayVarName())
      }
    } else if (fn === '_INITIAL') {
      this.var.varType = 'initial'
      this.var.hasInitValue = true
    } else if (fn === '_ACTIVE_INITIAL' || fn === '_SAMPLE_IF_TRUE') {
      this.var.hasInitValue = true
    } else if (fn === '_GET_DIRECT_DATA' || fn === '_GET_DIRECT_LOOKUPS') {
      this.var.varType = 'data'
    } else if (fn === '_GET_DIRECT_CONSTANTS') {
      this.var.varType = 'const'
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
      this.expandSmoothFunction(fn, args)
    } else if (isTrendFunction(fn)) {
      // Generate a level var to expand the TREND call.
      // Get TREND arguments for the function expansion.
      let args = R.map(expr => expr.getText(), ctx.expr())
      let input = args[0]
      let avgTime = args[1]
      let init = args[2]
      let level = this.expandTrendFunction(fn, args)
      let genSubs = this.genSubs(input, avgTime, init)
      let aux = newAuxVarName()
      this.addVariable(
        `${aux}${genSubs} = ZIDZ(${input} - ${level}${genSubs}, ${avgTime} * ABS(${level}${genSubs})) ~~|`
      )
      this.var.trendVarName = canonicalName(aux)
      this.var.references.push(this.var.trendVarName)
    } else if (isNpvFunction(fn)) {
      // Generate level vars to expand the NPV call.
      // Get NPV arguments for the function expansion.
      let args = R.map(expr => expr.getText(), ctx.expr())
      let stream = args[0]
      let discountRate = args[1]
      let initVal = args[2]
      let factor = args[3]
      let level = this.generateNpvLevels(stream, discountRate, initVal, factor)
      let genSubs = this.genSubs(stream, discountRate, initVal, factor)
      let aux = newAuxVarName()
      // npv = (ncum + stream * TIME STEP * df) * factor
      this.addVariable(`${aux}${genSubs} = (${level.ncum} + ${stream} * TIME STEP * ${level.df}) * ${factor} ~~|`)
      this.var.npvVarName = canonicalName(aux)
      this.var.references.push(this.var.npvVarName)
    } else if (isDelayFunction(fn)) {
      // Generate a level var to expand the DELAY* call.
      let args = R.map(expr => expr.getText(), ctx.expr())
      this.expandDelayFunction(fn, args)
    } else if (fn === '_GET_DIRECT_DATA' || fn === '_GET_DIRECT_LOOKUPS') {
      // Extract string constant arguments into an object used in code generation.
      // For Excel files, the file argument names an indirect "?" file tag from the model settings.
      // For CSV files, it gives a relative pathname in the model directory.
      // For Excel files, the tab argument names an Excel worksheet.
      // For CSV files, it gives the delimiter character.
      let args = R.map(
        arg => matchRegex(arg, /'(.*)'/),
        R.map(expr => expr.getText(), ctx.expr())
      )
      this.var.directDataArgs = {
        file: args[0],
        tab: args[1],
        timeRowOrCol: args[2],
        startCell: args[3]
      }
    } else if (fn === '_GET_DIRECT_CONSTANTS') {
      // Extract string constant arguments into an object used in code generation.
      // The file argument gives a relative pathname in the model directory.
      // The tab argument gives the delimiter character.
      let args = R.map(
        arg => matchRegex(arg, /'(.*)'/),
        R.map(expr => expr.getText(), ctx.expr())
      )
      this.var.directConstArgs = {
        file: args[0],
        tab: args[1],
        startCell: args[2]
      }
    } else if (fn === '_IF_THEN_ELSE') {
      // Evaluate the condition expression of the `IF THEN ELSE`.  If it resolves
      // to a compile-time constant, we only need to visit one branch, which means
      // that no references will be recorded for the other branch, therefore allowing
      // it to be skipped in the unused reference elimination phase and during the
      // final code generation phase.
      const condText = ctx.expr(0).getText()
      const exprReader = new ExprReader()
      const condExpr = exprReader.read(condText)
      if (condExpr.constantValue !== undefined) {
        // Record the conditional expression and its constant value so that
        // it can be accessed later by EquationGen.  We need to record it
        // this way because any variables referenced by the expression may
        // be removed during the unused reference elimination phase.
        Model.addConstantExpr(condText, condExpr.constantValue)
        if (condExpr.constantValue !== 0) {
          // Only visit the "if true" branch
          this.setArgIndex(1)
          ctx.expr(1).accept(this)
        } else {
          // Only visit the "if false" branch
          this.setArgIndex(2)
          ctx.expr(2).accept(this)
        }
      } else {
        // Visit the condition and both branches
        super.visitExprList(ctx)
      }
    } else {
      // Keep track of all function names referenced in this expression.  Note that lookup
      // variables are sometimes function-like, so they will be included here.  This will be
      // used later to decide whether a lookup variable needs to be included in generated code.
      const canonicalFnName = canonicalName(fn)
      if (this.var.referencedFunctionNames) {
        if (!this.var.referencedFunctionNames.includes(canonicalFnName)) {
          this.var.referencedFunctionNames.push(canonicalFnName)
        }
      } else {
        this.var.referencedFunctionNames = [canonicalFnName]
      }
      super.visitExprList(ctx)
    }
  }
  visitVar(ctx) {
    // Mark the RHS as non-constant, since it has a variable reference.
    this.rhsNonConst = true
    // Get the var name of a variable in a call and save it as a reference.
    let id = ctx.Id().getText()
    let varName = canonicalName(id)
    // Do not add a dimension name as a reference.
    if (!isDimension(varName)) {
      let fn = this.currentFunctionName()
      this.refId = varName
      this.expandedRefIds = []
      super.visitVar(ctx)
      // Separate init references from eval references in level formulas.
      if (isSmoothFunction(fn) || isTrendFunction(fn) || isNpvFunction(fn) || isDelayFunction(fn)) {
        // Do not set references inside the call, since it will be replaced
        // with the generated level var.
      } else if (this.argIndexForFunctionName('_INTEG') === 1) {
        this.addReferencesToList(this.var.initReferences)
      } else if (this.argIndexForFunctionName('_DELAY_FIXED') === 1) {
        this.addReferencesToList(this.var.initReferences)
      } else if (this.argIndexForFunctionName('_DELAY_FIXED') === 2) {
        this.addReferencesToList(this.var.initReferences)
      } else if (this.argIndexForFunctionName('_ACTIVE_INITIAL') === 1) {
        this.addReferencesToList(this.var.initReferences)
      } else if (this.argIndexForFunctionName('_SAMPLE_IF_TRUE') === 2) {
        this.addReferencesToList(this.var.initReferences)
      } else if (this.argIndexForFunctionName('_ALLOCATE_AVAILABLE') === 1) {
        // Reference the second and third elements of the priority profile argument instead of the first one
        // that Vensim requires for ALLOCATE AVAILABLE. This is required to get correct dependencies.
        let ptypeRefId = this.expandedRefIds[0]
        let { subscripts } = Model.splitRefId(ptypeRefId)
        let ptypeIndexName = subscripts[1]
        let profileElementsDimName = sub(ptypeIndexName).family
        let profileElementsDim = sub(profileElementsDimName)
        let priorityRefId = ptypeRefId.replace(ptypeIndexName, profileElementsDim.value[1])
        let widthRefId = ptypeRefId.replace(ptypeIndexName, profileElementsDim.value[2])
        this.expandedRefIds = [priorityRefId, widthRefId]
        this.addReferencesToList(this.var.references)
      } else if (this.var.isInitial()) {
        this.addReferencesToList(this.var.initReferences)
      } else {
        this.addReferencesToList(this.var.references)
      }
    }
  }
  visitLookupCall(ctx) {
    // Mark the RHS as non-constant, since it has a lookup.
    this.rhsNonConst = true
    // Keep track of the lookup variable that is referenced on the RHS.
    const id = ctx.Id().getText()
    const lookupVarName = canonicalName(id)
    if (this.var.referencedLookupVarNames) {
      this.var.referencedLookupVarNames.push(lookupVarName)
    } else {
      this.var.referencedLookupVarNames = [lookupVarName]
    }
    // Complete the visit.
    ctx.expr().accept(this)
    super.visitLookupCall(ctx)
  }
  visitLookupArg(ctx) {
    // When a call argument is a lookup, generate a new lookup variable and save the variable name to emit later.
    // TODO consider expanding this to more than one lookup arg per equation
    const lookupArgVarName = this.generateLookupArg(ctx)
    this.var.lookupArgVarName = lookupArgVarName
    // Keep track of all lookup variables that are referenced.  This will be used later to decide
    // whether a lookup variable needs to be included in generated code.
    if (this.var.referencedLookupVarNames) {
      this.var.referencedLookupVarNames.push(lookupArgVarName)
    } else {
      this.var.referencedLookupVarNames = [lookupArgVarName]
    }
  }
  visitSubscriptList(ctx) {
    // When an equation references a non-appy-to-all array, add its subscripts to the array var's refId.
    if (ctx.parentCtx.ruleIndex === ModelParser.RULE_expr) {
      // Get the referenced var's subscripts in canonical form.
      let subscripts = R.map(id => canonicalName(id.getText()), ctx.Id())
      // Remove dimension subscripts marked with ! and save them for later.
      let markedDims = extractMarkedDims(subscripts)
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
          // The refIds of actual vars containing the indices will accumulate with possible duplicates.
          let expandedRefIds = []
          let iSub
          // Accumulate an array of lists of the separated index names at each position.
          let indexNames = []
          for (iSub = 0; iSub < expansionFlags.length; iSub++) {
            if (expansionFlags[iSub]) {
              // For each index name at the subscript position, find refIds for vars that include the index.
              // This process ensures that we generate references to vars that are in the var table.
              let indexNamesAtPos
              // Use the single index name for a separated variable if it exists.
              // But don't do this if the subscript is a marked dimension in a vector function.
              let separatedIndexName = separatedVariableIndex(subscripts[iSub], this.var, subscripts)
              if (!markedDims.includes(subscripts[iSub]) && separatedIndexName) {
                indexNamesAtPos = [separatedIndexName]
              } else {
                // Generate references to all the indices for the subscript.
                indexNamesAtPos = indexNamesForSubscript(subscripts[iSub])
              }
              indexNames.push(indexNamesAtPos)
            }
          }
          // Flatten the arrays of index names at each position into an array of index name combinations.
          let separatedIndices = cartesianProductOf(indexNames)
          // Find a separated variable for each combination of indices.
          for (let separatedIndex of separatedIndices) {
            // Consider each var with the same name as the reference in the equation.
            for (let refVar of varsWithRefName) {
              let iSeparatedIndex = 0
              for (iSub = 0; iSub < expansionFlags.length; iSub++) {
                if (expansionFlags[iSub]) {
                  let refVarIndexNames = indexNamesForSubscript(refVar.subscripts[iSub])
                  if (refVarIndexNames.length === 0) {
                    console.error(
                      `ERROR: no subscript at subscript position ${iSub} for var ${refVar.refId} with subscripts ${refVar.subscripts}`
                    )
                  }
                  if (!refVarIndexNames.includes(separatedIndex[iSeparatedIndex++])) {
                    break
                  }
                }
              }
              if (iSub >= expansionFlags.length) {
                // All separated index names matched index names in the var, so add it as a reference.
                expandedRefIds.push(refVar.refId)
                break
              }
            }
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
    let eqn = `${varName}${lookupArgCtx.getText()} ~~|`
    this.addVariable(eqn)
    return canonicalName(varName)
  }
  expandSmoothFunction(fn, args) {
    // Generate variables for a SMOOTH* call found in the RHS.
    let input = args[0]
    let delay = args[1]
    let init = args[2] !== undefined ? args[2] : args[0]
    if (fn === '_SMOOTH' || fn === '_SMOOTHI') {
      this.generateSmoothLevel(input, delay, init, 1)
    } else if (fn === '_SMOOTH3' || fn === '_SMOOTH3I') {
      let delay3 = `(${delay} / 3)`
      let level1 = this.generateSmoothLevel(input, delay3, init, 1)
      let level2 = this.generateSmoothLevel(level1, delay3, init, 2)
      this.generateSmoothLevel(level2, delay3, init, 3)
    }
  }
  generateSmoothLevel(input, delay, init, levelNumber) {
    // Generate a level equation to implement SMOOTH.
    // The parameters are model names. Return the canonical name of the generated level var.
    let genSubs = this.genSubs(input, delay, init)
    // For SMOOTH3, the previous level is the input for level number 2 and 3. Add RHS subscripts.
    if (levelNumber > 1 && genSubs) {
      input += genSubs
    }
    let level, levelLHS, levelRefId
    if (isSeparatedVar(this.var)) {
      // Levels generated by separated vars are also separated. We have to compute the indices here instead
      // of using the dimension on the LHS and letting addVariable do it, so that the whole array of
      // separated variables are not added for each visit here by an already-separated index.
      // Start by getting a level var based on the var name, so it is the same for all separated levels.
      level = newLevelVarName(this.var.varName, levelNumber)
      // Replace the dimension in the generated variable subscript with the separated index from the LHS.
      // Find the index in the LHS that was expanded from the separation dimension.
      let index
      let sepDim
      let r = genSubs.match(/\[(.*)\]/)
      if (r) {
        let rhsSubs = r[1].split(',').map(x => canonicalName(x))
        for (let rhsSub of rhsSubs) {
          let separatedIndexName = separatedVariableIndex(rhsSub, this.var, rhsSubs)
          if (separatedIndexName) {
            index = decanonicalize(separatedIndexName)
            sepDim = decanonicalize(rhsSub)
            break
          }
        }
      }
      // Use the Vensim form of the index in the LHS and in all arguments.
      if (index) {
        let re = new RegExp(`\\[(.*?)${sepDim}(.*?)\\]`, 'gi')
        let replacement = `[$1${index}$2]`
        let newGenSubs = genSubs.replace(re, replacement)
        levelLHS = `${level}${newGenSubs}`
        levelRefId = canonicalVensimName(levelLHS)
        input = input.replace(re, replacement)
        delay = delay.replace(re, replacement)
        init = init.replace(re, replacement)
      }
    } else {
      // In the normal case, generate a unique variable name for the level var.
      level = newLevelVarName()
      levelLHS = level + genSubs
      // If it has subscripts, the refId is still just the var name, because it is an apply-to-all array.
      levelRefId = canonicalName(level)
    }
    let eqn = `${levelLHS} = INTEG((${input} - ${levelLHS}) / ${delay}, ${init}) ~~|`
    if (isSeparatedVar(this.var)) {
      Model.addNonAtoAVar(canonicalName(level), [true])
    }
    this.addVariable(eqn)
    // Add a reference to the new level var.
    // For SMOOTH3, the smoothVarRefId is the final level refId.
    this.var.smoothVarRefId = levelRefId
    this.refId = levelRefId
    this.expandedRefIds = []
    this.addReferencesToList(this.var.references)
    return level
  }
  expandTrendFunction(fn, args) {
    // Generate variables for a TREND call found in the RHS.
    let input = args[0]
    let avgTime = args[1]
    let init = args[2]
    let level = this.generateTrendLevel(input, avgTime, init)
    return level
  }
  generateTrendLevel(input, avgTime, init) {
    // Generate a level equation to implement TREND.
    // The parameters are model names. Return the canonical name of the generated level var.
    let genSubs = this.genSubs(input, avgTime, init)
    let level = newLevelVarName()
    let levelLHS = level + genSubs
    let eqn = `${levelLHS} = INTEG((${input} - ${levelLHS}) / ${avgTime}, ${input} / (1 + ${init} * ${avgTime})) ~~|`
    this.addVariable(eqn)
    // Add a reference to the new level var.
    // If it has subscripts, the refId is still just the var name, because it is an apply-to-all array.
    this.refId = canonicalName(level)
    this.expandedRefIds = []
    this.addReferencesToList(this.var.references)
    return level
  }
  generateNpvLevels(stream, discountRate, initVal, factor) {
    // Generate two level equations to implement NPV.
    // Return the canonical names of the generated level vars as object properties.
    let genSubs = this.genSubs(stream, discountRate, initVal, factor)
    // df = INTEG((-df * discount rate) / (1 + discount rate * TIME STEP), 1)
    let df = newLevelVarName()
    let dfLHS = df + genSubs
    let dfEqn = `${dfLHS} = INTEG((-${dfLHS} * ${discountRate}) / (1 + ${discountRate} * TIME STEP), 1) ~~|`
    this.addVariable(dfEqn)
    // ncum = INTEG(stream * df, init val)
    let ncum = newLevelVarName()
    let ncumLHS = ncum + genSubs
    let ncumEqn = `${ncumLHS} = INTEG(${stream} * ${dfLHS}, ${initVal}) ~~|`
    this.addVariable(ncumEqn)
    // Add references to the new level vars.
    // If they have subscripts, the refIds are still just the var name, because they are apply-to-all arrays.
    this.refId = ''
    this.expandedRefIds = [canonicalName(ncum), canonicalName(df)]
    this.addReferencesToList(this.var.references)
    return { ncum, df }
  }
  expandDelayFunction(fn, args) {
    // Generate variables for a DELAY* call found in the RHS.
    let input = args[0]
    let delay = args[1]
    let genSubs = this.genSubs(this.var.modelLHS)

    if (fn === '_DELAY1' || fn === '_DELAY1I') {
      let level, levelLHS, levelRefId
      let init = `${args[2] !== undefined ? args[2] : args[0]} * ${delay}`
      let varLHS = this.var.modelLHS
      if (isSeparatedVar(this.var)) {
        level = newLevelVarName(this.var.varName, 1)
        let index
        let sepDim
        let r = genSubs.match(/\[(.*)\]/)
        if (r) {
          let rhsSubs = r[1].split(',').map(x => canonicalName(x))
          for (let rhsSub of rhsSubs) {
            let separatedIndexName = separatedVariableIndex(rhsSub, this.var, rhsSubs)
            if (separatedIndexName) {
              index = decanonicalize(separatedIndexName)
              sepDim = decanonicalize(rhsSub)
              break
            }
          }
        }
        if (index) {
          let re = new RegExp(sepDim, 'gi')
          genSubs = genSubs.replace(re, index)
          levelLHS = `${level}${genSubs}`
          levelRefId = canonicalVensimName(levelLHS)
          input = input.replace(re, index)
          varLHS = varLHS.replace(re, index)
          delay = delay.replace(re, index)
          init = init.replace(re, index)
        }
        Model.addNonAtoAVar(canonicalName(level), [true])
      } else {
        level = newLevelVarName()
        levelLHS = level + genSubs
        levelRefId = canonicalName(level)
      }
      // Generate a level var that will replace the DELAY function call.
      this.var.delayVarRefId = this.generateDelayLevel(levelLHS, levelRefId, input, varLHS, init)
      // Generate an aux var to hold the delay time expression.
      let delayTimeVarName = newAuxVarName()
      this.var.delayTimeVarName = canonicalName(delayTimeVarName)
      if (isSeparatedVar(this.var)) {
        Model.addNonAtoAVar(this.var.delayTimeVarName, [true])
      }
      let delayTimeEqn = `${delayTimeVarName}${genSubs} = ${delay} ~~|`
      this.addVariable(delayTimeEqn)
      // Add a reference to the var, since it won't show up until code gen time.
      this.var.references.push(canonicalVensimName(`${delayTimeVarName}${genSubs}`))
    } else if (fn === '_DELAY3' || fn === '_DELAY3I') {
      let level1, level1LHS, level1RefId
      let level2, level2LHS, level2RefId
      let level3, level3LHS, level3RefId
      let delay3 = `((${delay}) / 3)`
      let init = `${args[2] !== undefined ? args[2] : args[0]} * ${delay3}`
      let varLHS = this.var.modelLHS
      let aux1, aux1LHS
      let aux2, aux2LHS
      let aux3, aux3LHS
      let aux4, aux4LHS
      if (isSeparatedVar(this.var)) {
        level1 = newLevelVarName(this.var.varName, 1)
        level2 = newLevelVarName(this.var.varName, 2)
        level3 = newLevelVarName(this.var.varName, 3)
        aux1 = newAuxVarName(this.var.varName, 1)
        aux2 = newAuxVarName(this.var.varName, 2)
        aux3 = newAuxVarName(this.var.varName, 3)
        aux4 = newAuxVarName(this.var.varName, 4)
        let index
        let sepDim
        let r = genSubs.match(/\[(.*)\]/)
        if (r) {
          let rhsSubs = r[1].split(',').map(x => canonicalName(x))
          for (let rhsSub of rhsSubs) {
            let separatedIndexName = separatedVariableIndex(rhsSub, this.var, rhsSubs)
            if (separatedIndexName) {
              index = decanonicalize(separatedIndexName)
              sepDim = decanonicalize(rhsSub)
              break
            }
          }
        }
        if (index) {
          let re = new RegExp(sepDim, 'gi')
          genSubs = genSubs.replace(re, index)
          level1LHS = `${level1}${genSubs}`
          level2LHS = `${level2}${genSubs}`
          level3LHS = `${level3}${genSubs}`
          aux1LHS = `${aux1}${genSubs}`
          aux2LHS = `${aux2}${genSubs}`
          aux3LHS = `${aux3}${genSubs}`
          aux4LHS = `${aux4}${genSubs}`
          level1RefId = canonicalVensimName(level1LHS)
          level2RefId = canonicalVensimName(level2LHS)
          level3RefId = canonicalVensimName(level3LHS)
          input = input.replace(re, index)
          varLHS = varLHS.replace(re, index)
          delay3 = delay3.replace(re, index)
          init = init.replace(re, index)
        }
        Model.addNonAtoAVar(canonicalName(level1), [true])
        Model.addNonAtoAVar(canonicalName(level2), [true])
        Model.addNonAtoAVar(canonicalName(level3), [true])
      } else {
        level1 = newLevelVarName()
        level2 = newLevelVarName()
        level3 = newLevelVarName()
        aux1 = newAuxVarName()
        aux2 = newAuxVarName()
        aux3 = newAuxVarName()
        aux4 = newAuxVarName()
        level1LHS = level1 + genSubs
        level2LHS = level2 + genSubs
        level3LHS = level3 + genSubs
        aux1LHS = aux1 + genSubs
        aux2LHS = aux2 + genSubs
        aux3LHS = aux3 + genSubs
        aux4LHS = aux4 + genSubs
        level1RefId = canonicalName(level1)
        level2RefId = canonicalName(level2)
        level3RefId = canonicalName(level3)
      }
      // Generate a level var that will replace the DELAY function call.
      this.var.delayVarRefId = this.generateDelayLevel(level3LHS, level3RefId, aux2LHS, aux3LHS, init)
      this.generateDelayLevel(level2LHS, level2RefId, aux1LHS, aux2LHS, init)
      this.generateDelayLevel(level1LHS, level1RefId, input, aux1LHS, init)
      // Generate equations for the aux vars using the subs in the generated level var.
      this.addVariable(`${aux1LHS} = ${level1LHS} / ${delay3} ~~|`)
      this.addVariable(`${aux2LHS} = ${level2LHS} / ${delay3} ~~|`)
      this.addVariable(`${aux3LHS} = ${level3LHS} / ${delay3} ~~|`)
      // Generate an aux var to hold the delay time expression.
      this.var.delayTimeVarName = canonicalName(aux4)
      if (isSeparatedVar(this.var)) {
        Model.addNonAtoAVar(this.var.delayTimeVarName, [true])
      }
      this.addVariable(`${aux4LHS} = ${delay3} ~~|`)
      // Add a reference to the var, since it won't show up until code gen time.
      this.var.references.push(canonicalVensimName(`${aux4}${genSubs}`))
    }
  }
  generateDelayLevel(levelLHS, levelRefId, input, aux, init) {
    // Generate a level equation to implement DELAY.
    // The parameters are model names. Return the refId of the generated level var.
    let eqn = `${levelLHS} = INTEG(${input} - ${aux}, ${init}) ~~|`
    this.addVariable(eqn)
    // Add a reference to the new level var.
    this.refId = levelRefId
    this.expandedRefIds = []
    this.addReferencesToList(this.var.references)
    return levelRefId
  }
  addVariable(modelEquation) {
    let parser = createParser(modelEquation)
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
    const re = /\[[^\]]+\]/g
    for (let varName of varNames) {
      let subs = varName.match(re)
      if (subs) {
        for (let sub of subs) {
          result.add(sub.trim())
        }
      }
    }
    if (result.size > 1) {
      console.error(`ERROR: genSubs subscripts do not agree: ${[...varNames]}`)
      debugger
    }
    return [...result][0] || ''
  }
}
