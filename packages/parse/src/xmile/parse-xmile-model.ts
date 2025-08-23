// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { XmlElement } from '@rgrove/parse-xml'
import { parseXml } from '@rgrove/parse-xml'

import type { DimensionDef, Equation, Model } from '../ast/ast-types'

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

  // Extract <dimensions> -> DimensionDef[]
  const dimensions: DimensionDef[] = parseDimensionDefs(xml.root)

  // Extract <variables> -> Equation[]
  const equations: Equation[] = parseVariableDefs(xml.root)

  return {
    dimensions,
    equations
  }
}

function parseDimensionDefs(rootElem: XmlElement | undefined): DimensionDef[] {
  const dimensionDefs: DimensionDef[] = []

  const dimensionsElem = firstElemOf(rootElem, 'dimensions')
  if (dimensionsElem) {
    // Extract <dim> -> SubscriptRange
    const dimElems = elemsOf(dimensionsElem, ['dim'])
    for (const dimElem of dimElems) {
      dimensionDefs.push(parseXmileDimensionDef(dimElem))
    }
  }

  return dimensionDefs
}

function parseVariableDefs(rootElem: XmlElement | undefined): Equation[] {
  const modelElem = firstElemOf(rootElem, 'model')
  if (modelElem === undefined) {
    return []
  }

  const equations: Equation[] = []
  const variablesElem = firstElemOf(modelElem, 'variables')
  if (variablesElem) {
    // Extract variable definition (e.g., <aux>, <stock>, <flow>, <gf>) -> Equation[]
    const varElems = elemsOf(variablesElem, ['aux', 'stock', 'flow', 'gf'])
    for (const varElem of varElems) {
      try {
        const eqns = parseXmileVariableDef(varElem)
        if (eqns) {
          equations.push(...eqns)
        }
      } catch (e) {
        // Include context such as line/column numbers in the error message if available
        let linePart = ''
        if (e.cause?.code === 'VensimParseError') {
          if (e.cause.line) {
            // The line number reported by ANTLR is relative to the beginning of the
            // preprocessed definition (since we parse each definition individually),
            // so we need to add it to the line of the definition in the original source
            // TODO: Get the actual line number
            // const lineNum = e.cause.line - 1 + def.line
            const lineNum = 'unknown'
            linePart += ` at line ${lineNum}`
            if (e.cause.column) {
              linePart += `, col ${e.cause.column}`
            }
          }
        }
        const varElemString = varElem.toString()
        const msg = `Failed to parse XMILE variable definition${linePart}:\n${varElemString}\n\nDetail:\n  ${e.message}`
        throw new Error(msg)
      }
    }
  }

  return equations
}
