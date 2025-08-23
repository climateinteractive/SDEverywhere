// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { XmlElement } from '@rgrove/parse-xml'

import { canonicalId } from '../_shared/canonical-id'

import { call, lookupDef, subRef } from '../ast/ast-builders'
import type { Equation, Expr, LookupDef, LookupPoint, SubscriptRef } from '../ast/ast-types'

import { parseVensimExpr } from '../vensim/parse-vensim-expr'

import { elemsOf, firstElemOf, firstTextOf, xmlError } from './xml'

/**
 * Parse the given XMILE variable definition and return an array of `Equation` AST nodes
 * corresponding to the variable definition (or definitions, in the case of a
 * non-apply-to-all variable that is defined with an `<element>` for each subscript).
 *
 * @param input A string containing the XMILE equation definition.
 * @returns An `Equation` AST node.
 */
export function parseXmileVariableDef(varElem: XmlElement): Equation[] {
  // Extract required variable name
  const varName = parseRequiredAttr(varElem, varElem, 'name')
  const varId = canonicalId(varName)

  // Extract optional <units> -> units string
  const units = firstElemOf(varElem, 'units')?.text || ''

  // Extract optional <doc> -> comment string
  const comment = firstElemOf(varElem, 'doc')?.text || ''

  // Helper function that creates a single `Equation` instance with an expression for
  // this variable definition
  function exprEquation(subscriptRefs: SubscriptRef[] | undefined, expr: Expr): Equation {
    return {
      lhs: {
        varDef: {
          kind: 'variable-def',
          varName,
          varId,
          subscriptRefs
        }
      },
      rhs: {
        kind: 'expr',
        expr
      },
      units,
      comment
    }
  }

  // Helper function that creates a single `Equation` instance with a lookup for
  // this variable definition
  function lookupEquation(subscriptRefs: SubscriptRef[] | undefined, lookup: LookupDef): Equation {
    return {
      lhs: {
        varDef: {
          kind: 'variable-def',
          varName,
          varId,
          subscriptRefs
        }
      },
      rhs: {
        kind: 'lookup',
        lookupDef: lookup
      },
      units,
      comment
    }
  }

  if (varElem.name === 'gf') {
    // This is a top-level <gf>
    // TODO: Are subscripted <gf> elements allowed?  If so, handle them here.
    const lookup = parseGfElem(varElem, varElem)
    return [lookupEquation(undefined, lookup)]
  }

  // Check for <dimensions>
  const dimensionsElem = firstElemOf(varElem, 'dimensions')
  const equationDefs: Equation[] = []
  if (dimensionsElem === undefined) {
    // This is a non-subscripted variable
    const gfElem = firstElemOf(varElem, 'gf')
    if (gfElem) {
      // The variable is defined with a graphical function
      if (varElem.name !== 'flow' && varElem.name !== 'aux') {
        throw new Error(xmlError(varElem, '<gf> is only allowed for <flow> and <aux> variables'))
      }
      const lookup = parseGfElem(varElem, gfElem)
      equationDefs.push(lookupEquation(undefined, lookup))
    } else {
      // The variable is defined with an equation
      const expr = parseEqnElem(varElem, varElem)
      if (expr) {
        equationDefs.push(exprEquation(undefined, expr))
      }
    }
  } else {
    // This is an array (subscripted) variable.  An array variable definition will include
    // a <dimensions> element that declares which dimensions are used.
    const dimElems = elemsOf(dimensionsElem, ['dim'])
    const dimNames: string[] = []
    for (const dimElem of dimElems) {
      const dimName = dimElem.attributes?.name
      if (dimName === undefined) {
        throw new Error(xmlError(varElem, '<dim> name attribute is required in <dimensions> for variable definition'))
      }
      dimNames.push(dimName)
    }

    // If it is an apply-to-all variable, there will be a single <eqn>.  If it is a
    // non-apply-to-all variable, there will be one or more <element> elements that define
    // the separate equation for each "instance".
    // TODO: Handle apply-to-all variable defs that contain <gf>?
    const elementElems = elemsOf(varElem, ['element'])
    if (elementElems.length === 0) {
      // This is an apply-to-all variable
      const dimRefs = dimNames.map(subRef)
      const expr = parseEqnElem(varElem, varElem)
      if (expr) {
        equationDefs.push(exprEquation(dimRefs, expr))
      }
    } else {
      // This is a non-apply-to-all variable
      // TODO: We should change SubscriptRef so that it can include an explicit dimension
      // name/ID (which we can pull from the <dimensions> section of the variable definition).
      // Until then, we will include the subscript name only (and we do not yet support
      // numeric subscript indices).
      // TODO: Handle non-apply-to-all variable defs that contain <gf>?
      for (const elementElem of elementElems) {
        const subscriptAttr = elementElem.attributes?.subscript
        if (subscriptAttr === undefined) {
          throw new Error(xmlError(varElem, '<element> subscript attribute is required in variable definition'))
        }
        const subscriptNames = subscriptAttr.split(',').map(s => s.trim())
        const subRefs: SubscriptRef[] = []
        for (const subscriptName of subscriptNames) {
          if (!isNaN(parseInt(subscriptAttr))) {
            throw new Error(xmlError(varElem, 'Numeric subscript indices are not currently supported'))
          }
          subRefs.push(subRef(subscriptName))
        }
        const expr = parseEqnElem(varElem, elementElem)
        if (expr) {
          equationDefs.push(exprEquation(subRefs, expr))
        }
      }
    }
  }

  return equationDefs
}

function parseEqnElem(varElem: XmlElement, parentElem: XmlElement): Expr {
  const varTagName = varElem.name
  const eqnElem = firstElemOf(parentElem, 'eqn')

  // Interpret the <eqn> element
  // TODO: Handle the case where <eqn> is defined using CDATA
  const eqnText = eqnElem ? firstTextOf(eqnElem) : undefined
  switch (varTagName) {
    case 'aux':
      if (eqnText === undefined) {
        // Technically the <eqn> is optional for an <aux>; if not defined, we will skip it
        return undefined
      }
      return parseExpr(eqnText.text)

    case 'stock': {
      // <stock> elements are currently translated to a Vensim-style aux:
      //   INTEG({inflow}, {eqn})
      if (eqnText === undefined) {
        // An <eqn> is currently required for a <stock>
        throw new Error(xmlError(varElem, 'Currently <eqn> is required for a <stock> variable'))
      }
      const inflowElems = elemsOf(parentElem, ['inflow'])
      if (inflowElems.length !== 1) {
        // TODO: XMILE allows for multiple <inflow> elements, but we don't support that yet
        throw new Error(xmlError(varElem, 'Currently only one <inflow> is supported for a <stock> variable'))
      }
      // TODO: Handle the case where <inflow> is defined using CDATA
      const inflowText = firstTextOf(inflowElems[0])
      if (inflowText === undefined) {
        throw new Error(xmlError(varElem, 'Currently <inflow> is required for a <stock> variable'))
      }

      // TODO: We currently do not support certain <stock> options, so for now we
      // fail fast if we encounter these
      if (firstElemOf(parentElem, 'conveyor')) {
        throw new Error(xmlError(varElem, 'Currently <conveyor> is not supported for a <stock> variable'))
      }
      if (firstElemOf(parentElem, 'queue')) {
        throw new Error(xmlError(varElem, 'Currently <queue> is not supported for a <stock> variable'))
      }
      // TODO: We currently ignore `<non_negative>` elements during parsing since it is noted in the XMILE
      // spec that it is not directly supported by XMILE and an optional vendor-specific feature.  More
      // work will be needed to make this work according to the spec, but for now it's OK to ignore it.
      // if (firstElemOf(parentElem, 'non_negative')) {
      //   throw new Error(xmlError(varElem, 'Currently <non_negative> is not supported for a <stock> variable'))
      // }

      const initExpr = parseExpr(eqnText.text)
      const inflowExpr = parseExpr(inflowText.text)
      return call('INTEG', inflowExpr, initExpr)
    }

    case 'flow':
      // <flow> elements with an <eqn> are currently translated to a Vensim-style aux
      // TODO: The XMILE spec says some <flow> variants must not have an equation (in the case
      // of conveyors or queues).  For now, we don't support those, and we require an <eqn>.
      if (eqnText === undefined) {
        // An <eqn> is currently required for a <stock>
        throw new Error(xmlError(varElem, 'Currently <eqn> or <gf> is required for a <flow> variable'))
      }
      // TODO: We currently do not support certain <stock> options, so for now we
      // fail fast if we encounter these
      if (firstElemOf(parentElem, 'multiplier')) {
        throw new Error(xmlError(varElem, 'Currently <multiplier> is not supported for a <flow> variable'))
      }
      // TODO: We currently ignore `<non_negative>` elements during parsing since it is noted in the XMILE
      // spec that it is not directly supported by XMILE and an optional vendor-specific feature.  More
      // work will be needed to make this work according to the spec, but for now it's OK to ignore it.
      // if (firstElemOf(parentElem, 'non_negative')) {
      //   throw new Error(xmlError(varElem, 'Currently <non_negative> is not supported for a <flow> variable'))
      // }
      if (firstElemOf(parentElem, 'overflow')) {
        throw new Error(xmlError(varElem, 'Currently <overflow> is not supported for a <flow> variable'))
      }
      if (firstElemOf(parentElem, 'leak')) {
        throw new Error(xmlError(varElem, 'Currently <leak> is not supported for a <flow> variable'))
      }
      return parseExpr(eqnText.text)

    default:
      throw new Error(xmlError(varElem, `Unhandled variable type '${varTagName}'`))
  }
}

function parseExpr(exprText: string): Expr {
  // Except for a few slight differences (e.g., `IF ... THEN ... ELSE ...`), the expression
  // syntax in XMILE is the same as in Vensim, so we will use the existing Vensim expression
  // parser here.  The idiomatic way to do conditional statements in XMILE is:
  //   IF {condition} THEN {trueExpr} ELSE {falseExpr}
  // But the spec allows for the Vensim form:
  //   IF_THEN_ELSE({condition}, {trueExpr}, {falseExpr})
  // Since we only support the latter in the compile package, it's better if we transform
  // the XMILE form to Vensim form, and then we can use the Vensim expression parser.
  exprText = convertConditionalExpressions(exprText)

  // XXX: XMILE uses different syntax for array functions than Vensim. XMILE uses an
  // asterisk (wildcard), e.g., `SUM(x[*])`, while Vensim uses e.g., `SUM(x[DimA!])`.
  // To allow for reusing the Vensim expression parser, we will replace the XMILE wildcard
  // with the Vensim syntax (using a placeholder dimension name; the real one will be
  // resolved later).
  exprText = exprText.replace(/\[([^\]]*)\*([^\]]*)\]/g, '[$1_SDE_WILDCARD_!$2]')

  return parseVensimExpr(exprText)
}

function parseGfElem(varElem: XmlElement, gfElem: XmlElement): LookupDef {
  // Parse the optional `type` attribute
  const typeAttr = parseOptionalAttr(gfElem, 'type')
  if (typeAttr && typeAttr !== 'continuous') {
    throw new Error(xmlError(varElem, 'Currently "continuous" is the only type supported for <gf>'))
  }

  // Parse the required <ypts>
  const yptsElem = firstElemOf(gfElem, 'ypts')
  if (yptsElem === undefined) {
    throw new Error(xmlError(varElem, '<ypts> must be defined for a <gf>'))
  }
  const ypts = parseGfPts(varElem, yptsElem)
  if (ypts.length === 0) {
    throw new Error(xmlError(varElem, '<ypts> must have at least one element'))
  }

  // Check for <xpts> or <xscale> (must be one or the other)
  const xptsElem = firstElemOf(gfElem, 'xpts')
  const xscaleElem = firstElemOf(gfElem, 'xscale')
  if (xptsElem && xscaleElem) {
    throw new Error(xmlError(varElem, '<gf> must contain <xpts> or <xscale> but not both'))
  } else if (xptsElem === undefined && xscaleElem === undefined) {
    throw new Error(xmlError(varElem, '<gf> must contain either <xpts> or <xscale>'))
  }

  let xpts: number[]
  if (xptsElem) {
    // Parse the <xpts>
    xpts = parseGfPts(varElem, xptsElem)
    if (xpts.length === 0) {
      throw new Error(xmlError(varElem, '<xpts> must have at least one element'))
    }
  } else {
    // Parse the <xscale>
    const xMin = parseFloatAttr(varElem, xscaleElem, 'min')
    const xMax = parseFloatAttr(varElem, xscaleElem, 'max')
    if (xMin > xMax) {
      throw new Error(xmlError(varElem, '<xscale> max attribute must be > min attribute'))
    }
    xpts = Array(ypts.length)
    const xRange = xMax - xMin
    if (ypts.length === 1) {
      // TODO: Error?
      xpts[0] = 0
    } else {
      for (let i = 0; i < ypts.length; i++) {
        const frac = i / (ypts.length - 1)
        xpts[i] = xMin + xRange * frac
      }
    }
  }

  // Check for same length as <ypts>
  if (xpts.length !== ypts.length) {
    throw new Error(xmlError(varElem, '<xpts> and <ypts> must have the same number of elements'))
  }

  // Zip the arrays
  const points: LookupPoint[] = []
  for (let i = 0; i < xpts.length; i++) {
    points.push([xpts[i], ypts[i]])
  }
  return lookupDef(points)
}

function parseGfPts(varElem: XmlElement, ptsElem: XmlElement): number[] {
  const ptsText = firstTextOf(ptsElem)?.text
  if (ptsText === undefined) {
    return []
  }

  const sep = ptsElem.attributes?.sep || ','
  const elems = ptsText.split(sep)
  const nums: number[] = []
  for (const elem of elems) {
    const numText = elem.trim()
    const num = parseFloat(numText)
    if (isNaN(num)) {
      console.log(JSON.stringify(ptsElem))
      throw new Error(xmlError(varElem, `Invalid number value '${numText}' in <${ptsElem.name}>'`))
    }
    nums.push(num)
  }
  return nums
}

function parseRequiredAttr(varElem: XmlElement, elem: XmlElement, attrName: string): string {
  let s = elem.attributes && elem.attributes[attrName]
  s = s?.trim()
  if (s === undefined || s.length === 0) {
    throw new Error(xmlError(varElem, `<${elem.name}> ${attrName} attribute is required`))
  }
  return s
}

function parseOptionalAttr(elem: XmlElement, attrName: string): string {
  const s = elem.attributes && elem.attributes[attrName]
  return s?.trim()
}

function parseFloatAttr(varElem: XmlElement, elem: XmlElement, attrName: string): number {
  const s = parseRequiredAttr(varElem, elem, attrName)
  const num = parseFloat(s)
  if (isNaN(num)) {
    throw new Error(xmlError(varElem, `Invalid number value '${s}' for <${elem.name}> ${attrName} attribute'`))
  }
  return num
}

/**
 * Parse XMILE conditional expressions recursively to handle nested IF-THEN-ELSE statements.
 *
 * This transforms XMILE syntax:
 *   IF condition THEN trueExpr ELSE falseExpr
 * to Vensim syntax:
 *   IF THEN ELSE(condition, trueExpr, falseExpr)
 *
 * Examples of supported nested structures:
 * - Simple: IF x > 0 THEN 1 ELSE 0
 * - Nested: IF x > 0 THEN IF y > 0 THEN 2 ELSE 1 ELSE 0
 * - Complex: IF a > 0 THEN IF b > 0 THEN IF c > 0 THEN 3 ELSE 2 ELSE 1 ELSE 0
 */
function convertConditionalExpressions(exprText: string): string {
  // XXX: This function implementation was generated by an LLM and is rather complex.
  // We probably could remove it if we had a new ANTLR grammar/parser for XMILE-style
  // expressions, including nested conditional expressions.

  // Trim whitespace and normalize newlines
  const normalizedText = exprText.trim().replace(/\s+/g, ' ')

  // Handle nested conditionals wrapped in parentheses
  let textToParse = normalizedText
  if (textToParse.startsWith('(') && textToParse.endsWith(')')) {
    textToParse = textToParse.slice(1, -1).trim()
  }

  // Find the outermost IF-THEN-ELSE pattern
  const ifMatch = textToParse.match(/^IF\s+(.+)$/i)
  if (!ifMatch) {
    return exprText
  }

  // Parse the condition part (everything after IF until THEN)
  const remainingText = ifMatch[1]
  const thenMatch = remainingText.match(/^(.+?)\s+THEN\s+(.+)$/i)
  if (!thenMatch) {
    return exprText
  }

  const condition = thenMatch[1].trim()
  const afterThen = thenMatch[2]

  // Find the ELSE part by looking for the outermost ELSE that's not inside parentheses
  // We need to parse the THEN expression to understand its structure
  let elseIndex = -1
  let parenCount = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < afterThen.length; i++) {
    const char = afterThen[i]

    // Handle quoted strings
    if ((char === '"' || char === "'") && (i === 0 || afterThen[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      continue
    }

    if (inQuotes) {
      continue
    }

    // Handle parentheses for nested expressions
    if (char === '(') {
      parenCount++
    } else if (char === ')') {
      parenCount--
    }

    // Look for ELSE, but only when not inside parentheses or quoted strings
    if (parenCount === 0 && !inQuotes) {
      const elseMatch = afterThen.substring(i).match(/^ELSE\s+(.+)$/i)
      if (elseMatch) {
        elseIndex = i
        break
      }
    }
  }

  if (elseIndex === -1) {
    return exprText
  }

  // Skip "ELSE "
  const trueExpr = afterThen.substring(0, elseIndex).trim()
  const falseExpr = afterThen.substring(elseIndex + 5).trim()

  // Recursively parse nested conditionals in the true and false expressions
  const convertedTrueExpr = convertConditionalExpressions(trueExpr)
  const convertedFalseExpr = convertConditionalExpressions(falseExpr)

  const convertedCondition = condition
    // Replace logical operators for Vensim compatibility
    .replace(/(?<!".*?)\b AND \b(?!.*?")/gi, ' :AND: ')
    .replace(/(?<!".*?)\b OR \b(?!.*?")/gi, ' :OR: ')
    .replace(/(?<!".*?)\b\s?NOT \b(?!.*?")/gi, ' :NOT: ')
    // Remove outer parentheses from condition
    .replace(/^\((.+)\)$/, '$1')

  return `IF THEN ELSE(${convertedCondition}, ${convertedTrueExpr}, ${convertedFalseExpr})`
}
