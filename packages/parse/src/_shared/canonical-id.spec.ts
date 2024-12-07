// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { canonicalFunctionId, canonicalId, canonicalVarId } from './canonical-id'

describe('canonicalId', () => {
  it('should collapse multiple consecutive whitespace or underscore characters to a single underscore', () => {
    // The following examples are taken from the Vensim documentation under "Rules for Variable Names":
    //  https://www.vensim.com/documentation/ref_variable_names.html
    expect(canonicalId('Hello There')).toBe('_hello_there')
    expect(canonicalId('Hello_There')).toBe('_hello_there')
    expect(canonicalId('Hello __  ___   There')).toBe('_hello_there')
  })

  it('should replace each special character with a single underscore', () => {
    let input = '"Special'
    let expected = '__special'
    function add(name: string, char: string) {
      input += ` ${name}${char}`
      expected += `_${name}_`
    }
    add('period', '.')
    add('comma', ',')
    add('dash', '-')
    add('dollar', '$')
    add('amp', '&')
    add('pct', '%')
    add('slash', '/')
    // TODO: Handle backslashes
    // add('bslash', '\\')
    // TODO: Handle parentheses
    // add('lparen', '(')
    // add('rparen', ')')
    input += ' characters"'
    expected += '_characters_'
    expect(canonicalId(input)).toBe(expected)

    // The following examples are taken from the Vensim documentation under "Rules for Variable Names":
    //  https://www.vensim.com/documentation/ref_variable_names.html
    expect(canonicalId('"HiRes TV/Web Sets"')).toBe('__hires_tv_web_sets_')
    // TODO: Handle backslashes
    // expect(canonicalId('"The \\"Final\\" Frontier"')).toBe('')
    expect(canonicalId("érosion d'action")).toBe('_érosion_d_action')
  })

  it('should preserve mark when preceded by whitespace', () => {
    expect(canonicalVarId(`DimA  !`)).toBe('_dima!')
  })

  it('should preserve mark when split over multiple lines', () => {
    const name = `DimA
!
`
    expect(canonicalVarId(name)).toBe('_dima!')
  })
})

describe('canonicalVarId', () => {
  it('should work for non-subscripted variable', () => {
    expect(canonicalVarId('Hello There')).toBe('_hello_there')
  })

  it('should work for variable with 1 subscript', () => {
    expect(canonicalVarId('Variable name[A1]')).toBe('_variable_name[_a1]')
  })

  it('should work for variable with 2 subscripts', () => {
    expect(canonicalVarId('Variable name[A1,  DimB]')).toBe('_variable_name[_a1,_dimb]')
  })

  it('should work for variable with 3 subscripts', () => {
    expect(canonicalVarId('Variable name[A1,  DimB,C2]')).toBe('_variable_name[_a1,_dimb,_c2]')
  })
})

describe('canonicalFunctionId', () => {
  it('should work for uppercase function name', () => {
    expect(canonicalFunctionId('FUNCTION  NAME')).toBe('_FUNCTION_NAME')
  })

  it('should work for mixed case function name', () => {
    expect(canonicalFunctionId('function   name')).toBe('_FUNCTION_NAME')
  })
})
