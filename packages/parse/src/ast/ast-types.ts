// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// DIMENSIONS + SUBSCRIPTS
//

/** The original name of a dimension, as it appears in the model. */
export type DimName = string

/** The canonical identifier of a dimension, as it appears in generated code. */
export type DimId = string

/** The original name of a subscript/index, as it appears in the model. */
export type SubName = string

/** The canonical identifier of a subscript/index, as it appears in generated code. */
export type SubId = string

/**
 * The original name of a dimension or subscript/index, as it appears in the model.
 *
 * This type is used in cases where either a dimension or an individual subscript/index
 * can appear, and more analysis is needed to resolve the reference.
 */
export type DimOrSubName = string

/**
 * The canonical identifier of a dimension or subscript/index, as it appears in
 * generated code.
 *
 * This type is used in cases where either a dimension or an individual subscript/index
 * can appear, and more analysis is needed to resolve the reference.
 */
export type DimOrSubId = string

/**
 * A reference to a dimension or an individual subscript/index, as used in a subscript
 * range definition or in a variable reference inside an equation definition.
 *
 * This type can be used in cases where either a dimension or an individual subscript/index
 * can appear, and more analysis is needed to resolve the reference.
 */
export interface SubscriptRef {
  /**
   * The original name of the dimension or subscript/index, as it appears in the model.
   */
  subName: DimOrSubName
  /**
   * The canonical identifier of the dimension or subscript/index, as it appears in
   * generated code.
   */
  subId: DimOrSubId
}

/**
 * A subscript mapping, as used in a subscript range definition.
 */
export interface SubscriptMapping {
  /**
   * The original name of the "target" dimension for the mapping, as it appears in
   * the model.
   */
  toDimName: DimName
  /**
   * The canonical identifier of the "target" dimension for the mapping, as it appears
   * in generated code.
   */
  toDimId: DimId
  /**
   * The mapped subscripts.
   */
  subscriptRefs: SubscriptRef[]
}

/**
 * A subscript range definition.
 */
export interface SubscriptRange {
  /**
   * The original name of the subscript range ("dimension") being defined, as it appears in
   * the model.
   */
  dimName: DimName
  /**
   * The canonical identifier of the subscript range ("dimension") being defined, as it appears
   * in generated code.
   */
  dimId: DimId
  /**
   * The original name of the family associated with the subscript range ("dimension") being
   * defined, as it appears in the model.
   *
   * For a typical subscript range, the family name is the same as the dimension name, but
   * in the case of an alias (e.g., in Vensim, `DimA <-> DimB`), this will be the name used
   * on the right side (e.g., `DimB`).
   */
  familyName: DimName
  /**
   * The canonical identifier of the family associated with the subscript range ("dimension")
   * being defined, as it appears in generated code.
   *
   * For a typical subscript range, the family name is the same as the dimension name, but
   * in the case of an alias (e.g., in Vensim, `DimA <-> DimB`), this will be the ID used
   * on the right side (e.g., `_dimb`).
   */
  familyId: DimId
  /**
   * The array of subscripts/indices that are part of this subscript range ("dimension").
   */
  subscriptRefs: SubscriptRef[]
  /**
   * The array of subscript mappings, if defined for this subscript range ("dimension").
   */
  subscriptMappings: SubscriptMapping[]
  /**
   * The optional comment text that accompanies the subscript range definition in the model.
   */
  comment?: string
}

//
// EXPRESSIONS
//

/** A number literal that appears in an expression. */
export interface NumberValue {
  kind: 'number'
  /** The numeric value. */
  value: number
  /** The original string representation from the model. */
  text: string
}

/** A string literal that appears in an expression. */
export interface StringLiteral {
  kind: 'string'
  /** The string value without quotes. */
  text: string
}

/** A keyword (e.g., ":NA:") that appears in an expression. */
export interface Keyword {
  kind: 'keyword'
  /** The original string representation from the model. */
  text: string
}

/** The original name of a variable, as it appears in the model. */
export type VariableName = string

/** The canonical identifier of a variable, as it appears in generated code. */
export type VariableId = string

/**
 * A reference to a variable that appears in an expression.
 */
export interface VariableRef {
  kind: 'variable-ref'
  /**
   * The original name of the variable, as it appears in the model.
   */
  varName: VariableName
  /**
   * The canonical identifier of the variable, as it appears in generated code.
   */
  varId: VariableId
  /**
   * The optional array of subscript/dimension references, if the referenced variable
   * is subscripted.
   */
  subscriptRefs?: SubscriptRef[]
}

/** An operator used in a unary expression. */
export type UnaryOp = '+' | '-' | ':NOT:'

/** A unary expression. */
export interface UnaryOpExpr {
  kind: 'unary-op'
  /** The operator. */
  op: UnaryOp
  /** The child expression that the operator applies to. */
  expr: Expr
}

/** An operator used in a binary expression. */
export type BinaryOp = '+' | '-' | '*' | '/' | '^' | '=' | '<>' | '<' | '>' | '<=' | '>=' | ':AND:' | ':OR:'

/** A binary expression. */
export interface BinaryOpExpr {
  kind: 'binary-op'
  /** The left-hand side child expression. */
  lhs: Expr
  /** The operator. */
  op: BinaryOp
  /** The right-hand side child expression. */
  rhs: Expr
}

/** An expression that was contained within parentheses in the original model. */
export interface ParensExpr {
  kind: 'parens'
  /** The child expression that was defined within parentheses. */
  expr: Expr
}

/** A single (x,y) point in a lookup definition. */
// TODO: The antlr4-vensim grammar accepts any expression for each
// part of a lookup point, but SDE assumes they are numbers
export type LookupPoint = [number, number]

/** The range for a lookup definition. */
export interface LookupRange {
  min: LookupPoint
  max: LookupPoint
}

/** A lookup definition. */
export interface LookupDef {
  kind: 'lookup-def'
  /** The optional range that declares the minimum and maximum points for this lookup. */
  range?: LookupRange
  /** The array of points that define this lookup. */
  points: LookupPoint[]
}

/**
 * A lookup call, as used in an expression.  This is similar to a `FunctionCall`, except
 * that instead of a function name, there is a reference to a lookup variable, and the
 * single argument determines the x coordinate for the lookup.
 */
export interface LookupCall {
  kind: 'lookup-call'
  /** The reference to a lookup variable. */
  varRef: VariableRef
  /** The single argument that determines the x coordinate for the lookup. */
  arg: Expr
}

/** The original name of a function, as it appears in the model. */
export type FunctionName = string

/** The canonical identifier of a function, as it appears in generated code. */
export type FunctionId = string

/** A function call, as used in an expression. */
export interface FunctionCall {
  kind: 'function-call'
  /**
   * The original name of the function, as it appears in the model.
   */
  fnName: FunctionName
  /**
   * The canonical identifier of the function, as it appears in generated code.
   */
  fnId: FunctionId
  /**
   * The array of argument expressions that are passed to the function.
   */
  args: Expr[]
}

/**
 * A union type that includes all possible expression types.  Each expression type includes
 * a unique `kind` property that can be used to identify the type of the expression.
 */
export type Expr =
  | NumberValue
  | StringLiteral
  | Keyword
  | VariableRef
  | UnaryOpExpr
  | BinaryOpExpr
  | ParensExpr
  | LookupDef
  | LookupCall
  | FunctionCall

//
// EQUATIONS
//

/**
 * A variable definition that appears on the LHS of an equation definition.  Note that
 * this is mostly the same as `VariableRef` that is used in an expression; the difference
 * is that a `VariableDef` may contain an "except" clause whereas a `VariableRef` will not.
 */
export interface VariableDef {
  kind: 'variable-def'
  /**
   * The original name of the variable, as it appears in the model.
   */
  varName: VariableName
  /**
   * The canonical identifier of the variable, as it appears in generated code.
   */
  varId: VariableId
  /**
   * The optional array of subscript/dimension references, if the variable is subscripted.
   */
  subscriptRefs?: SubscriptRef[]
  /**
   * The optional array of "exceptions".  For example, in Vensim it is possible to express
   * that an equation to applies to all subscripts in a dimension except for one (or a subset),
   * e.g., `x[DimA] :EXCEPT: [A1] = 5`.
   */
  exceptSubscriptRefSets?: SubscriptRef[][]
}

/**
 * The left-hand side of an equation definition.
 */
export interface EquationLhs {
  /** The variable definition that appears on the LHS. */
  varDef: VariableDef
  // TODO: :INTERPOLATE:
}

/** The right-hand side of a typical equation that is defined with an expression. */
export interface EquationRhsExpr {
  kind: 'expr'
  /** The expression that appears on the right-hand side of the equation. */
  expr: Expr
}

/** The right-hand side of a constant list definition. */
export interface EquationRhsConstList {
  kind: 'const-list'
  /** The array of constant values. */
  // TODO: It would be better if this was a `NumberValue[][]` (one array per dimension) to
  // better match how it appears in a model, but the antlr4-vensim grammar currently flattens
  // them into a single list (it doesn't make use of the semicolon separator)
  constants: NumberValue[]
  /**
   * @hidden The original string representation from the model.  This is only needed for
   * compatibility with the legacy parser, which includes the original string representation
   * including semicolons, which is used for the `modelFormula`.  Ideally we could remove this
   * field if we fix antlr4-vensim to preserve the groupings as described above.
   */
  text: string
}

/** The right-hand side of a "lookup variable" definition. */
export interface EquationRhsLookup {
  kind: 'lookup'
  /** The lookup definition that appears on the right-hand side of the variable definition. */
  lookupDef: LookupDef
}

/**
 * The right-hand side of a "data variable" definition.  In Vensim, a data variable does
 * not contain any information in the model file, and the data is read from an external
 * file, so this type is merely used to indicate the equation kind (to differentiate it
 * from other kinds of equations).
 */
export interface EquationRhsData {
  kind: 'data'
}

/**
 * A union type that includes all possible equation right-hand side types.  Each type includes
 * a unique `kind` property that can be used to identify the type of the equation.
 */
export type EquationRhs = EquationRhsExpr | EquationRhsConstList | EquationRhsLookup | EquationRhsData

/** An equation definition. */
export interface Equation {
  /** The left-hand side of the equation. */
  lhs: EquationLhs
  /** The right-hand side of the equation. */
  rhs: EquationRhs
  /**
   * The optional units text that accompanies the equation definition in the model.
   */
  units?: string
  /**
   * The optional comment text that accompanies the equation definition in the model.
   */
  comment?: string
}

//
// MODEL
//

/** A complete model definition, including all defined subscript ranges and equations. */
export interface Model {
  /** The array of all subscript ranges defined in the model. */
  subscriptRanges: SubscriptRange[]
  /** The array of all equations defined in the model. */
  equations: Equation[]
}
