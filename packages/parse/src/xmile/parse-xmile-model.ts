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
    // Enable position tracking to get byte offsets for line number calculation
    xml = parseXml(input, { includeOffsets: true })
  } catch (e) {
    // Include context such as line/column numbers in the error message if available
    const msg = `Failed to parse XMILE model definition:\n\n${e.message}`
    throw new Error(msg)
  }

  // Extract <dimensions> -> DimensionDef[]
  const dimensions: DimensionDef[] = parseDimensionDefs(xml.root)

  // Extract <variables> -> Equation[]
  const equations: Equation[] = parseVariableDefs(xml.root, input)

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

function parseVariableDefs(rootElem: XmlElement | undefined, originalXml: string): Equation[] {
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
        // Try to get line number from the XML element's position
        const lineNumInOriginalXml = getLineNumber(originalXml, varElem.start)
        if (lineNumInOriginalXml !== -1) {
          if (e.cause?.code === 'VensimParseError') {
            if (e.cause.line) {
              // The line number reported by ANTLR is relative to the beginning of the
              // preprocessed definition (since we parse each definition individually),
              // so we need to add it to the line of the definition in the original source
              const lineNum = e.cause.line - 1 + lineNumInOriginalXml
              linePart += ` at line ${lineNum}`
              if (e.cause.column) {
                linePart += `, col ${e.cause.column}`
              }
            }
          } else {
            // Include the line number from the original XML
            linePart += ` at line ${lineNumInOriginalXml}`
          }
        }
        const varElemString = elementToXmlString(varElem)
        const msg = `Failed to parse XMILE variable definition${linePart}:\n${varElemString}\n\nDetail:\n  ${e.message}`
        throw new Error(msg)
      }
    }
  }

  return equations
}

/**
 * Calculate the line number from a byte offset in the original XML string.
 *
 * @param xmlString The original XML string
 * @param byteOffset The byte offset from the XmlElement
 * @returns The line number (1-indexed) or -1 if offset is invalid
 */
function getLineNumber(xmlString: string, byteOffset: number): number {
  if (byteOffset === -1 || byteOffset >= xmlString.length) {
    return -1
  }

  // Count newlines up to the byte offset
  const substring = xmlString.substring(0, byteOffset)
  return substring.split('\n').length
}

/**
 * Reconstruct XML string from an XmlElement.
 *
 * @param elem The XmlElement to convert back to XML
 * @returns A string representation of the XML element
 */
function elementToXmlString(elem: XmlElement): string {
  const attrs = Object.entries(elem.attributes || {})
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')

  const attrStr = attrs ? ` ${attrs}` : ''

  if (elem.isEmpty) {
    return `<${elem.name}${attrStr} />`
  }

  const children = elem.children
    .map(child => {
      if (child.type === 'text') {
        return (child as { text: string }).text
      } else if (child.type === 'element') {
        return elementToXmlString(child as XmlElement)
      } else if (child.type === 'cdata') {
        return `<![CDATA[${(child as { text: string }).text}]]>`
      } else if (child.type === 'comment') {
        return `<!--${(child as { text: string }).text}-->`
      }
      return ''
    })
    .join('')

  return `<${elem.name}${attrStr}>${children}</${elem.name}>`
}
