// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { XmlElement } from '@rgrove/parse-xml'

import { canonicalName } from '../_shared/names'

import type { DimensionDef, SubscriptRef } from '../ast/ast-types'

import { elemsOf, firstElemOf, xmlError } from './xml'

/**
 * Parse the given XMILE dimension (`<dim>`) definition and return a `DimensionDef` AST node.
 *
 * @param input A string containing the XMILE `<dim>` definition.
 * @returns A `DimensionDef` AST node.
 */
export function parseXmileDimensionDef(dimElem: XmlElement): DimensionDef {
  // Extract <dim name="...">
  const dimName = dimElem.attributes?.name
  if (dimName === undefined) {
    throw new Error(xmlError(dimElem, '<dim> name attribute is required for dimension definition'))
  }

  // Extract <dim> child <elem> elements
  const elemElems = elemsOf(dimElem, ['elem'])
  if (elemElems.length === 0) {
    throw new Error(xmlError(dimElem, '<dim> must contain one or more <elem> elements'))
  }
  const subscriptRefs: SubscriptRef[] = []
  for (const elem of elemElems) {
    // Extract <elem name="...">
    const subName = elem.attributes?.name
    if (subName === undefined) {
      throw new Error(xmlError(dimElem, '<elem> name attribute is required for dimension element definition'))
    }

    const subId = canonicalName(subName)
    subscriptRefs.push({
      subId,
      subName
    })
  }

  // Extract <doc> -> comment string
  const comment = firstElemOf(dimElem, 'doc')?.text || ''

  const dimId = canonicalName(dimName)
  return {
    dimName,
    dimId,
    // TODO: For Vensim `DimA <-> DimB` aliases, the family name would be `DimB`
    familyName: dimName,
    familyId: dimId,
    subscriptRefs,
    // TODO: Does XMILE support mappings?
    subscriptMappings: [],
    comment
  }
}
