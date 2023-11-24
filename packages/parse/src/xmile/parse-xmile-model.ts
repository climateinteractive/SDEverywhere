// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { XmlElement } from '@rgrove/parse-xml'
import { parseXml } from '@rgrove/parse-xml'

import type { Equation, Model, SubscriptRange } from '../ast/ast-types'

import { parseXmileDimensionDef } from './parse-xmile-dimension-def'
import { parseXmileVariableDef } from './parse-xmile-variable-def'
import { firstElemOf, elemsOf } from './xml'

/**
 * Parse the given XMILE model definition and return a `Model` AST node.
 *
 * @param input A string containing the XMILE model.
 * @param context An object that provides access to file system resources (such as
 * external data files) that are referenced during the parse phase.
 * @returns A `Model` AST node.
 */
export function parseXmileModel(input: string): Model {
  let xml
  try {
    xml = parseXml(input)
  } catch (e) {
    // Include context such as line/column numbers in the error message if available
    const msg = `Failed to parse XMILE model definition:\n\n${e.message}`
    throw new Error(msg)
  }

  // Extract <dimensions> -> SubscriptRange[]
  const subscriptRanges: SubscriptRange[] = parseDimensionDefs(xml.root)

  // Extract <variables> -> Equation[]
  const equations: Equation[] = parseVariableDefs(xml.root)

  return {
    subscriptRanges,
    equations
  }
}

function parseDimensionDefs(rootElem: XmlElement | undefined): SubscriptRange[] {
  const subscriptRanges: SubscriptRange[] = []

  const dimensionsElem = firstElemOf(rootElem, 'dimensions')
  if (dimensionsElem) {
    // Extract <dim> -> SubscriptRange
    const dimElems = elemsOf(dimensionsElem, ['dim'])
    for (const dimElem of dimElems) {
      subscriptRanges.push(parseXmileDimensionDef(dimElem))
    }
  }

  return subscriptRanges
}

function parseVariableDefs(rootElem: XmlElement | undefined): Equation[] {
  const modelElem = firstElemOf(rootElem, 'model')
  if (modelElem === undefined) {
    return []
  }

  const equations: Equation[] = []
  const variablesElem = firstElemOf(modelElem, 'variables')
  if (variablesElem) {
    // Extract variable definition (e.g., <aux> or <stock> or <flow>) -> Equation[]
    const varElems = elemsOf(variablesElem, ['aux', 'stock', 'flow'])
    for (const varElem of varElems) {
      const eqns = parseXmileVariableDef(varElem)
      if (eqns) {
        equations.push(...eqns)
      }
    }
  }

  return equations
}
