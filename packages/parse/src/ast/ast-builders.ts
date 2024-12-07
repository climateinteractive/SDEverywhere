// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { canonicalFunctionId, canonicalId } from '../_shared/canonical-id'

import type {
  BinaryOp,
  BinaryOpExpr,
  DimensionDef,
  DimName,
  DimOrSubName,
  Equation,
  Expr,
  FunctionCall,
  FunctionName,
  Keyword,
  LookupCall,
  LookupDef,
  LookupPoint,
  LookupRange,
  Model,
  NumberLiteral,
  ParensExpr,
  StringLiteral,
  SubName,
  SubscriptMapping,
  SubscriptRef,
  UnaryOp,
  UnaryOpExpr,
  VariableDef,
  VariableName,
  VariableRef
} from './ast-types'

//
// NOTE: This file contains functions that allow for tersely defining AST nodes.
// It is intended for internal use only (primarily in tests), so it is not exported
// as part of the public API at this time.
//

//
// DIMENSIONS + SUBSCRIPTS
//

export function subRef(dimOrSubName: DimOrSubName): SubscriptRef {
  return {
    subName: dimOrSubName,
    subId: canonicalId(dimOrSubName)
  }
}

export function subMapping(toDimName: DimName, dimOrSubNames: DimOrSubName[] = []): SubscriptMapping {
  return {
    toDimName,
    toDimId: canonicalId(toDimName),
    subscriptRefs: dimOrSubNames.map(subRef)
  }
}

export function dimDef(
  dimName: DimName,
  familyName: DimName,
  dimOrSubNames: SubName[],
  subscriptMappings: SubscriptMapping[] = [],
  comment = '',
  group?: string
): DimensionDef {
  return {
    dimName,
    dimId: canonicalId(dimName),
    familyName,
    familyId: canonicalId(familyName),
    subscriptRefs: dimOrSubNames.map(subRef),
    subscriptMappings,
    comment,
    ...(group ? { group } : {})
  }
}

//
// EXPRESSIONS
//

export function num(value: number, text?: string): NumberLiteral {
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

export function varRef(varName: VariableName, subscriptNames?: DimOrSubName[]): VariableRef {
  return {
    kind: 'variable-ref',
    varName,
    varId: canonicalId(varName),
    subscriptRefs: subscriptNames?.map(subRef)
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
    fnId: canonicalFunctionId(fnName),
    args
  }
}

//
// EQUATIONS
//

export function varDef(
  varName: VariableName,
  subscriptNames?: DimOrSubName[],
  exceptSubscriptNames?: DimOrSubName[][]
): VariableDef {
  return {
    kind: 'variable-def',
    varName,
    varId: canonicalId(varName),
    subscriptRefs: subscriptNames?.map(subRef),
    exceptSubscriptRefSets: exceptSubscriptNames?.map(namesForSet => namesForSet.map(subRef))
  }
}

export function exprEqn(varDef: VariableDef, expr: Expr, units = '', comment = '', group?: string): Equation {
  return {
    lhs: {
      varDef
    },
    rhs: {
      kind: 'expr',
      expr
    },
    units,
    comment,
    ...(group ? { group } : {})
  }
}

export function constListEqn(varDef: VariableDef, constants: NumberLiteral[][], units = '', comment = ''): Equation {
  // For now, assume that the original text had a trailing semicolon if there are multiple groups
  let text = constants.map(arr => arr.map(constant => constant.text).join(',')).join(';')
  if (constants.length > 1) {
    text += ';'
  }
  return {
    lhs: {
      varDef
    },
    rhs: {
      kind: 'const-list',
      constants: constants.flat(),
      text
    },
    units,
    comment
  }
}

export function dataVarEqn(varDef: VariableDef, units = '', comment = ''): Equation {
  return {
    lhs: {
      varDef
    },
    rhs: {
      kind: 'data'
    },
    units,
    comment
  }
}

export function lookupVarEqn(varDef: VariableDef, lookupDef: LookupDef, units = '', comment = ''): Equation {
  return {
    lhs: {
      varDef
    },
    rhs: {
      kind: 'lookup',
      lookupDef
    },
    units,
    comment
  }
}

//
// MODEL
//

export function model(dimensions: DimensionDef[], equations: Equation[]): Model {
  return {
    dimensions,
    equations
  }
}
