// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { cartesianProductOf } from '../_shared/combo'
import { parseTestYaml } from './check-parser'

// time: 0
// time: [0, 1]
// time:
//   after_excl: 0
//   after_incl: 0
//   before_excl: 0
//   before_incl: 0
function time(values?: number | [number, number] | string[]): string {
  if (!values) {
    return ''
  }

  const whitespace = '          '
  if (typeof values === 'number') {
    return `${whitespace}time: ${values}`
  } else if (typeof values[0] === 'number') {
    return `${whitespace}time: [${values[0]}, ${values[1]}]`
  } else {
    let p = `${whitespace}time:`
    for (const v of values) {
      p += `\n${whitespace}  ${v}: 2000`
    }
    return p
  }
}

const times = [
  time(),
  time(1),
  time([1, 2]),
  time(['after_excl']),
  time(['after_incl']),
  time(['before_excl']),
  time(['before_incl']),
  time(['after_excl', 'before_excl']),
  time(['after_excl', 'before_incl']),
  time(['after_incl', 'before_excl']),
  time(['after_incl', 'before_incl'])
]

const pred1 = ([op, time]: [string, string]) => {
  const whitespace = '        '
  let p = `${whitespace}- ${op}: 0`
  if (time) {
    p += `\n${time}`
  }
  return p
}

const pred1WithRef = ([op, time]: [string, string]) => {
  const whitespace = '        '
  let p = `${whitespace}- ${op}:`
  p += `\n${whitespace}    dataset:`
  p += `\n${whitespace}      name: Other`
  p += `\n${whitespace}    scenario:`
  p += `\n${whitespace}      with: Input`
  p += `\n${whitespace}      at: min`
  if (time) {
    p += `\n${time}`
  }
  return p
}

const pred1WithInherit = ([op, time]: [string, string]) => {
  const whitespace = '        '
  let p = `${whitespace}- ${op}:`
  p += `\n${whitespace}    dataset: inherit`
  p += `\n${whitespace}    scenario: inherit`
  if (time) {
    p += `\n${time}`
  }
  return p
}

const pred2 = ([op1, op2, time]: [string, string, string]) => {
  const whitespace = '        '
  let p = `${whitespace}- ${op1}: 0`
  p += `\n${whitespace}  ${op2}: 1`
  if (time) {
    p += `\n${time}`
  }
  return p
}

const pred3 = ([op1, op2, op3, time]: [string, string, string, string]) => {
  const whitespace = '        '
  let p = `${whitespace}- ${op1}: 0`
  p += `\n${whitespace}  ${op2}: 1`
  p += `\n${whitespace}  ${op3}: 2`
  if (time) {
    p += `\n${time}`
  }
  return p
}

describe('parseTestYaml', () => {
  it('should reject malformed yaml', () => {
    const yaml = `
describe: Group1
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should accept multiple describe groups', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
        - gt: 0
- describe: Group2
  tests:
    - it: should do something else
      datasets:
        - name: Output Y
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept describe with multiple tests', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
        - gt: 0
    - it: should do something else
      datasets:
        - name: Output Y
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with multiple datasets', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
        - name: Output X
          source: Reference
        - group: Dataset Group
        - matching:
            type: aux
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should reject test with invalid datasets', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - matching: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should accept test with scenario matrix', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios:
        - preset: matrix
      datasets:
        - name: Output X
      predicates:
        - gt: 0
      `
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with multiple scenarios', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios:
        - with: Input A
          at: max
        - with: Input A
          at: min
        - with: Input A
          at: default
        - with: Input B
          at: 5
        - with: Input B
          at: -5
        - with:
            - input: Input A
              at: min
            - input: Input B
              at: 5
        - with_inputs: all
          at: min
        - with_inputs: all
          at: max
        - with_inputs: all
          at: default
        - with_inputs_in: some group
          at: min
        - with_inputs_in: some group
          at: max
        - with_inputs_in: some group
          at: default
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with multi-input scenarios', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios:
        - with_inputs: all
          at: default
        - with:
            - input: Input A
              at: max
            - input: Input B
              at: 5
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should reject test with empty scenarios', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios: []
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should reject test with invalid scenarios', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios:
        - inputs: Input A
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should reject test with empty multi-input scenario', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      scenarios:
        - with: []
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should accept test with multiple predicates', () => {
    const ops = ['gt', 'gte', 'lt', 'lte', 'eq', 'approx']
    const combos = cartesianProductOf([ops, times])
    const predicates = combos.map(pred1).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with multiple predicates that reference other datasets', () => {
    const ops = ['gt', 'gte', 'lt', 'lte', 'eq', 'approx']
    const combos = cartesianProductOf([ops, times])
    const predicates = combos.map(pred1WithRef).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with multiple predicates that reference inherited dataset and scenario', () => {
    const ops = ['gt', 'gte', 'lt', 'lte', 'eq', 'approx']
    const combos = cartesianProductOf([ops, times])
    const predicates = combos.map(pred1WithInherit).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should accept test with range predicates', () => {
    const gs = ['gt', 'gte']
    const ls = ['lt', 'lte']
    const combos = cartesianProductOf([gs, ls, times])
    const predicates = combos.map(pred2).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(true)
  })

  it('should reject test with invalid combination of 2 predicates', () => {
    const ops = ['gt', 'gte', 'lt', 'lte']
    const invalid = ['eq', 'approx']
    const combos = cartesianProductOf([ops, invalid, times])
    const predicates = combos.map(pred2).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should reject test with invalid combination of 3 predicates', () => {
    const ops1 = ['gt']
    const ops2 = ['lt', 'lte']
    const invalid = ['gte', 'eq', 'approx']
    const combos = cartesianProductOf([ops1, ops2, invalid, times])
    const predicates = combos.map(pred3).join('\n')

    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
${predicates}
`
    const result = parseTestYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should reject test with invalid combination of time predicates', () => {
    const whitespace = '          '
    const invalidTimes = [
      `${whitespace}time: X`,
      `${whitespace}time: [X]`,
      `${whitespace}time: [X, Y]`,
      `${whitespace}time: [1]`,
      `${whitespace}time: [1, 2, 3]`,
      `${whitespace}time:\n${whitespace}  after_excl: 0\n${whitespace}  after_incl: 0`,
      `${whitespace}time:\n${whitespace}  after_excl: 0\n${whitespace}  something: 0`
    ]
    for (const t of invalidTimes) {
      const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
        - eq: 0
${t}
`
      const result = parseTestYaml([yaml])
      if (result.isOk()) {
        console.log(yaml)
      }
      expect(result.isOk()).toBe(false)
    }
  })
})
