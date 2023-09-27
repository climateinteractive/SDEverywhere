// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { canonicalName, cFunctionName } from '../_shared/names'

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
  /* @hidden: This is temporary until we add a proper structure including the individual parsed values */
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

export function subRef(dimOrSubName: DimOrSubName): SubscriptRef {
  return {
    subName: dimOrSubName,
    subId: canonicalName(dimOrSubName)
  }
}

export function subMapping(toDimName: DimName, dimOrSubNames: DimOrSubName[] = []): SubscriptMapping {
  return {
    toDimName,
    toDimId: canonicalName(toDimName),
    subscriptRefs: dimOrSubNames.map(subRef)
  }
}

export function subRange(
  dimName: DimName,
  familyName: DimName,
  dimOrSubNames: SubName[],
  subscriptMappings: SubscriptMapping[] = []
): SubscriptRange {
  return {
    dimName,
    dimId: canonicalName(dimName),
    familyName,
    familyId: canonicalName(familyName),
    subscriptRefs: dimOrSubNames.map(subRef),
    subscriptMappings
  }
}

export function num(value: number, text?: string): NumberValue {
  return {
    kind: 'number',
    value,
    text: text || value.toString()
  }
}

export function stringLiteral(text: string): StringLiteral {
  return {
    kind: 'string',
    text
  }
}

export function keyword(text: string): Keyword {
  return {
    kind: 'keyword',
    text
  }
}

export function varRef(
  varName: VariableName,
  subscriptNames?: DimOrSubName[],
  exceptSubscriptNames?: DimOrSubName[][]
): VariableRef {
  return {
    kind: 'variable-ref',
    varName,
    varId: canonicalName(varName),
    subscriptRefs: subscriptNames?.map(subRef),
    exceptSubscriptRefSets: exceptSubscriptNames?.map(namesForSet => namesForSet.map(subRef))
  }
}

export function unaryOp(op: UnaryOp, expr: Expr): UnaryOpExpr {
  return {
    kind: 'unary-op',
    op,
    expr
  }
}

export function binaryOp(lhs: Expr, op: BinaryOp, rhs: Expr): BinaryOpExpr {
  return {
    kind: 'binary-op',
    lhs,
    op,
    rhs
  }
}

export function parens(expr: Expr): ParensExpr {
  return {
    kind: 'parens',
    expr
  }
}

export function lookupDef(points: LookupPoint[], range?: LookupRange): LookupDef {
  return {
    kind: 'lookup-def',
    range,
    points
  }
}

export function lookupCall(varRef: VariableRef, arg: Expr): LookupCall {
  return {
    kind: 'lookup-call',
    varRef,
    arg
  }
}

export function call(fnName: FunctionName, ...args: Expr[]): FunctionCall {
  return {
    kind: 'function-call',
    fnName,
    fnId: cFunctionName(fnName),
    args
  }
}

export function exprEqn(varRef: VariableRef, expr: Expr, units = '', comment = ''): Equation {
  return {
    lhs: {
      varRef
    },
    rhs: {
      kind: 'expr',
      expr
    },
    units,
    comment
  }
}

export function constListEqn(varRef: VariableRef, constListText: string, units = '', comment = ''): Equation {
  return {
    lhs: {
      varRef
    },
    rhs: {
      kind: 'const-list',
      text: constListText
    },
    units,
    comment
  }
}

export function dataVarEqn(varRef: VariableRef, units = '', comment = ''): Equation {
  return {
    lhs: {
      varRef
    },
    rhs: {
      kind: 'data'
    },
    units,
    comment
  }
}

export function lookupVarEqn(varRef: VariableRef, lookupDef: LookupDef, units = '', comment = ''): Equation {
  return {
    lhs: {
      varRef
    },
    rhs: {
      kind: 'lookup',
      lookupDef
    },
    units,
    comment
  }
}

export function model(subscriptRanges: SubscriptRange[], equations: Equation[]): Model {
  return {
    subscriptRanges,
    equations
  }
}
