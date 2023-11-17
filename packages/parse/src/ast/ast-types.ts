// Copyright (c) 2023 Climate Interactive / New Venture Fund

export type DimName = string
export type DimId = string

export type SubName = string
export type SubId = string

export type DimOrSubName = string
export type DimOrSubId = string

export interface SubscriptRef {
  subName: DimOrSubName
  subId: DimOrSubId
}

export interface SubscriptMapping {
  toDimName: DimName
  toDimId: DimId
  subscriptRefs: SubscriptRef[]
}

export interface SubscriptRange {
  dimName: DimName
  dimId: DimId
  familyName: DimName
  familyId: DimId
  subscriptRefs: SubscriptRef[]
  subscriptMappings: SubscriptMapping[]
}

export interface NumberValue {
  kind: 'number'
  /** The numeric value. */
  value: number
  /** The original string representation from the model. */
  text: string
}

export interface StringLiteral {
  kind: 'string'
  /** The string value without quotes. */
  text: string
}

export interface Keyword {
  kind: 'keyword'
  text: string
}

export type VariableName = string
export type VariableId = string

export interface VariableRef {
  kind: 'variable-ref'
  varName: VariableName
  varId: VariableId
  subscriptRefs?: SubscriptRef[]
  exceptSubscriptRefSets?: SubscriptRef[][]
}

export type UnaryOp = '+' | '-' | ':NOT:'

export interface UnaryOpExpr {
  kind: 'unary-op'
  op: UnaryOp
  expr: Expr
}

export type BinaryOp = '+' | '-' | '*' | '/' | '^' | '=' | '<>' | '<' | '>' | '<=' | '>=' | ':AND:' | ':OR:'

export interface BinaryOpExpr {
  kind: 'binary-op'
  lhs: Expr
  op: BinaryOp
  rhs: Expr
}

export interface ParensExpr {
  kind: 'parens'
  expr: Expr
}

// TODO: The antlr4-vensim grammar accepts any expression for each
// part of a lookup point, but SDE assumes they are numbers
export type LookupPoint = [number, number]

export interface LookupRange {
  min: LookupPoint
  max: LookupPoint
}

export interface LookupDef {
  kind: 'lookup-def'
  range?: LookupRange
  points: LookupPoint[]
}

export interface LookupCall {
  kind: 'lookup-call'
  varRef: VariableRef
  arg: Expr
}

export type FunctionName = string
export type FunctionId = string

export interface FunctionCall {
  kind: 'function-call'
  fnName: FunctionName
  fnId: FunctionId
  args: Expr[]
}

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

export interface EquationLhs {
  // TODO: Since :EXCEPT: clauses only appear on the LHS, we should have a `VariableDef`
  // type like this:
  //   varName: VariableName
  //   varId: VariableId
  //   subscriptRefs?: SubscriptRef[]
  //   exceptSubscriptRefSets?: SubscriptRef[][]
  // and then remove `exceptSubscriptRefSets` from `VariableRef`
  varRef: VariableRef
  // TODO: :INTERPOLATE:
}

export interface EquationRhsExpr {
  kind: 'expr'
  expr: Expr
}

export interface EquationRhsConstList {
  kind: 'const-list'
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

// TODO: A lookup definition equation technically has no RHS, and the lookup data is supplied next to the
// LHS variable name
export interface EquationRhsLookup {
  kind: 'lookup'
  lookupDef: LookupDef
}

export interface EquationRhsData {
  kind: 'data'
}

export type EquationRhs = EquationRhsExpr | EquationRhsConstList | EquationRhsLookup | EquationRhsData

export interface Equation {
  lhs: EquationLhs
  rhs: EquationRhs
  units?: string
  comment?: string
}

export interface Model {
  subscriptRanges: SubscriptRange[]
  equations: Equation[]
}
