// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { type XmlElement, parseXml } from '@rgrove/parse-xml'

import { subRange } from '../ast/ast-builders'

import { parseXmileDimensionDef } from './parse-xmile-dimension-def'

function xml(input: string): XmlElement {
  let xml
  try {
    xml = parseXml(input)
  } catch (e) {
    throw new Error(`Invalid XML:\n${input}\n\n${e}`)
  }
  return xml.root
}

describe('parseXmileDimensionDef', () => {
  it('should parse a dimension def with explicit subscripts', () => {
    const dim = xml(`
      <dim name="DimA">
        <elem name="A1" />
        <elem name="A2" />
        <elem name="A3" />
      </dim>
    `)
    expect(parseXmileDimensionDef(dim)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3']))
  })

  it('should throw an error if dimension name is not defined', () => {
    const dim = xml(`
      <dim>
        <elem name="A1" />
        <elem name="A2" />
        <elem name="A3" />
      </dim>
    `)
    expect(() => parseXmileDimensionDef(dim)).toThrow('<dim> name attribute is required for dimension definition')
  })

  it('should throw an error if dimension element name is not defined', () => {
    const dim = xml(`
      <dim name="DimA">
        <elem name="A1" />
        <elem name="A2" />
        <elem />
      </dim>
    `)
    expect(() => parseXmileDimensionDef(dim)).toThrow(
      '<elem> name attribute is required for dimension element definition'
    )
  })

  it('should throw an error if no dimension elements are defined', () => {
    const dim = xml(`
      <dim name="DimA">
      </dim>
    `)
    expect(() => parseXmileDimensionDef(dim)).toThrow('<dim> must contain one or more <elem> elements')
  })
})
