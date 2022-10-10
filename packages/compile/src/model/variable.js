export default class Variable {
  constructor(eqnCtx) {
    // The equation rule context allows us to generate code by visiting the parse tree.
    this.eqnCtx = eqnCtx
    // Save both sides of the equation text in the model for documentation purposes.
    this.modelLHS = eqnCtx ? eqnCtx.lhs().getText() : ''
    this.modelFormula = this.formula(eqnCtx)
    // An equation defines a variable with a var name, saved in canonical form here.
    this.varName = ''
    // Subscripts are canonical dimension or index names on the LHS in normal order.
    this.subscripts = []
    // Exception subscripts are subscript lists given in an EXCEPT clause on the LHS.
    this.exceptSubscripts = []
    // Array variables that are separated in VariableReader keep the original dimensions here.
    this.separationDims = []
    // Direct data function arguments are saved here for use in code generation.
    this.directDataArgs = null
    // Direct constants function arguments are saved here for use in code generation.
    this.directConstArgs = null
    // Lookup vars have lookup points and an optional range.
    this.range = []
    this.points = []
    // The reference id appears in lists of references.
    this.refId = ''
    // The default varType is aux, but may be overridden later.
    this.varType = 'aux'
    // The variable subtype accommodates special handling needed by some Vensim functions.
    this.varSubtype = ''
    // A variable may reference other variable names at eval time.
    this.references = []
    // Levels and certain other variables have an initial value that may reference other variable names.
    this.initReferences = []
    // Set true when a variable has an initial value (e.g. levels and initials).
    this.hasInitValue = false
    // Lookup args generate vars that are substituted into the call during code generation.
    this.lookupArgVarName = ''
    // SMOOTH* calls are expanded into new level vars and substituted during code generation.
    this.smoothVarRefId = ''
    // TREND calls are expanded into new level vars and substituted during code generation.
    this.trendVarName = ''
    // NPV calls are expanded into new level vars and substituted during code generation.
    this.npvVarName = ''
    // DELAY3* calls are expanded into new level vars and substituted during code generation.
    this.delayVarRefId = ''
    this.delayTimeVarName = ''
    // DELAY FIXED calls generate a FixedDelay support var.
    this.fixedDelayVarName = ''
    // DEPRECIATE STRAIGHTLINE calls generate a Depreciation support var.
    this.depreciationVarName = ''
    // Variables generated by special expansions are not included in output.
    this.includeInOutput = true
  }
  copy() {
    let c = new Variable()
    c.eqnCtx = this.eqnCtx
    c.modelLHS = this.modelLHS
    c.modelFormula = this.modelFormula
    c.varName = this.varName
    c.subscripts = this.subscripts.slice()
    c.separationDims = this.separationDims
    c.range = this.range.slice()
    c.points = this.points.slice()
    c.refId = this.refId
    c.varType = this.varType
    c.references = this.references.slice()
    c.initReferences = this.initReferences.slice()
    c.hasInitValue = this.hasInitValue
    c.lookupArgVarName = this.lookupArgVarName
    c.smoothVarRefId = this.smoothVarRefId
    c.trendVarName = this.trendVarName
    c.delayVarRefId = this.delayVarRefId
    c.delayTimeVarName = this.delayTimeVarName
    c.includeInOutput = this.includeInOutput
    return c
  }
  formula(eqnCtx) {
    if (eqnCtx) {
      if (eqnCtx.expr()) {
        return eqnCtx.expr().getText()
      } else if (eqnCtx.constList()) {
        return eqnCtx.constList().getText()
      }
    }
    return ''
  }
  hasSubscripts() {
    return this.subscripts.length > 0
  }
  hasPoints() {
    return this.points.length > 0
  }
  isConst() {
    return this.varType === 'const'
  }
  isAux() {
    return this.varType === 'aux'
  }
  isLevel() {
    return this.varType === 'level'
  }
  isFixedDelay() {
    return this.varSubtype === 'fixedDelay'
  }
  isDepreciation() {
    return this.varSubtype === 'depreciation'
  }
  isInitial() {
    return this.varType === 'initial'
  }
  isLookup() {
    return this.varType === 'lookup'
  }
  isData() {
    return this.varType === 'data'
  }
}
