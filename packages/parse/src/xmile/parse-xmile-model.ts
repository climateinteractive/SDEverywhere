// Copyright (c) 2023-2026 Climate Interactive / New Venture Fund

import type { XmlElement } from '@rgrove/parse-xml'
import { parseXml } from '@rgrove/parse-xml'

import type { DimensionDef, Equation, Model, SimulationSpec } from '../ast/ast-types'

import { parseXmileDimensionDef } from './parse-xmile-dimension-def'
import { parseXmileVariableDef } from './parse-xmile-variable-def'
import { firstElemOf, elemsOf, xmlError } from './xml'

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

  // Extract <sim_specs> -> SimulationSpec
  const simulationSpec: SimulationSpec = parseSimSpecs(xml.root, input)

  // Extract <dimensions> -> DimensionDef[]
  const dimensions: DimensionDef[] = parseDimensionDefs(xml.root, input)

  // Extract <variables> -> Equation[]
  const equations: Equation[] = parseVariableDefs(xml.root, input)

  return {
    simulationSpec,
    dimensions,
    equations
  }
}

function parseSimSpecs(rootElem: XmlElement | undefined, originalXml: string): SimulationSpec {
  // Extract <sim_specs> element
  const simSpecsElem = firstElemOf(rootElem, 'sim_specs')
  if (simSpecsElem === undefined) {
    throw new Error(xmlError(rootElem, '<sim_specs> element is required for XMILE model definition'))
  }

  function getSimSpecValue(name: string, required: boolean): number | undefined {
    const elem = firstElemOf(simSpecsElem, name)
    if (required && elem === undefined) {
      const error = new Error(xmlError(simSpecsElem, `<${name}> element is required in XMILE sim specs`))
      throwXmileParseError(error, originalXml, simSpecsElem, 'model')
    }
    if (elem === undefined) {
      return undefined
    }
    const value = Number(elem.text)
    if (!isNaN(value)) {
      return value
    } else {
      const error = new Error(xmlError(elem, `Invalid numeric value for <${name}> element: ${elem.text}`))
      throwXmileParseError(error, originalXml, simSpecsElem, 'model')
    }
  }

  // Extract <start> element
  const startTime = getSimSpecValue('start', true)

  // Extract <stop> element
  const endTime = getSimSpecValue('stop', true)

  // Extract <dt> element
  let timeStep = getSimSpecValue('dt', false)
  if (timeStep === undefined) {
    // The default `dt` value is 1 according to the XMILE spec
    timeStep = 1
  }

  return {
    startTime,
    endTime,
    timeStep
  }
}

function parseDimensionDefs(rootElem: XmlElement | undefined, originalXml: string): DimensionDef[] {
  const dimensionDefs: DimensionDef[] = []

  const dimensionsElem = firstElemOf(rootElem, 'dimensions')
  if (dimensionsElem) {
    // Extract <dim> -> SubscriptRange
    const dimElems = elemsOf(dimensionsElem, ['dim'])
    for (const dimElem of dimElems) {
      try {
        dimensionDefs.push(parseXmileDimensionDef(dimElem))
      } catch (e) {
        throwXmileParseError(e, originalXml, dimElem, 'dimension')
      }
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
        throwXmileParseError(e, originalXml, varElem, 'variable')
      }
    }
  }

  return equations
}

function throwXmileParseError(
  originalError: Error,
  originalXml: string,
  elem: XmlElement,
  elemKind: 'model' | 'dimension' | 'variable'
): void {
  // Include context such as line/column numbers in the error message if available
  let linePart = ''
  // Try to get line number from the XML element's position
  const lineNumInOriginalXml = getLineNumber(originalXml, elem.start)
  if (lineNumInOriginalXml !== -1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cause = (originalError as any).cause as { code?: string; line?: number; column?: number }
    if (cause?.code === 'VensimParseError') {
      if (cause.line) {
        // The line number reported by ANTLR is relative to the beginning of the
        // preprocessed definition (since we parse each definition individually),
        // so we need to add it to the line of the definition in the original source
        const lineNum = cause.line - 1 + lineNumInOriginalXml
        linePart += ` at line ${lineNum}`
        if (cause.column) {
          linePart += `, col ${cause.column}`
        }
      }
    } else {
      // Include the line number from the original XML
      linePart += ` at line ${lineNumInOriginalXml}`
    }
  }
  const elemString = extractXmlLines(originalXml, elem.start, elem.end)
  const msg = `Failed to parse XMILE ${elemKind} definition${linePart}:\n${elemString}\n\nDetail:\n  ${originalError.message}`
  throw new Error(msg)
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
 * Extract relevant lines from the original XML string using start/end byte offsets.
 * Includes full lines for context, even if start/end are not at line boundaries.
 *
 * @param originalXml The original XML string
 * @param startOffset The starting byte offset
 * @param endOffset The ending byte offset
 * @returns A string containing the relevant lines with line numbers
 */
function extractXmlLines(originalXml: string, startOffset: number, endOffset: number): string {
  if (startOffset === -1 || endOffset === -1 || startOffset >= originalXml.length || endOffset > originalXml.length) {
    return '[Unable to extract XML lines - invalid offsets]'
  }

  // Find the start of the line containing the start offset
  let lineStart = startOffset
  while (lineStart > 0 && originalXml[lineStart - 1] !== '\n') {
    lineStart--
  }

  // Find the end of the line containing the end offset
  let lineEnd = endOffset
  while (lineEnd < originalXml.length && originalXml[lineEnd] !== '\n') {
    lineEnd++
  }

  // Extract the lines
  const relevantXml = originalXml.substring(lineStart, lineEnd)

  // Return just the XML content without line number prefix
  return relevantXml
}
