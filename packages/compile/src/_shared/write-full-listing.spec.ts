// Copyright (c) 2026 Climate Interactive / New Venture Fund

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { writeFullListing } from './write-full-listing'

describe('writeFullListing', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-full-listing-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  /**
   * Write the listing with `writeFullListing` and return the file contents.
   *
   * @param full The full listing object.
   * @returns The text written to the file.
   */
  function writeAndRead(full: any): string {
    const pathname = path.join(tmpDir, 'model.json')
    writeFullListing(pathname, full)
    return fs.readFileSync(pathname, 'utf8')
  }

  it('should match JSON.stringify(full, null, 2) for a typical listing', () => {
    const full: any = {
      dimensions: [
        { id: '_dima', subIds: ['_a1', '_a2'], subs: [{ id: '_a1' }, { id: '_a2' }] },
        { id: '_dimb', subIds: ['_b1'] }
      ],
      variables: [
        { refId: '_x', varName: '_x', varType: 'const', families: ['_dima'], references: [] },
        { refId: '_y', varName: '_y', varType: 'aux', parsedEqn: { kind: 'expr', args: [1, 2.5, null, true] } }
      ],
      varInstances: {
        constants: [{ varName: '_x', subscriptIndices: [0] }],
        lookupVars: [],
        dataVars: [],
        initVars: [],
        levelVars: [],
        auxVars: [{ varName: '_y' }]
      }
    }
    expect(writeAndRead(full)).toBe(JSON.stringify(full, null, 2))
  })

  it('should match JSON.stringify(full, null, 2) when all arrays are empty', () => {
    const full: any = {
      dimensions: [],
      variables: [],
      varInstances: {
        constants: [],
        auxVars: []
      }
    }
    expect(writeAndRead(full)).toBe(JSON.stringify(full, null, 2))
  })

  it('should match JSON.stringify(full, null, 2) when varInstances is empty', () => {
    const full = {
      dimensions: [{ id: '_dima' }],
      variables: [{ refId: '_x' }],
      varInstances: {}
    }
    expect(writeAndRead(full)).toBe(JSON.stringify(full, null, 2))
  })

  it('should match JSON.stringify(full, null, 2) for escaped strings and undefined values', () => {
    const full: any = {
      dimensions: [{ id: 'line1\nline2', comment: 'say "hi"\t\\' }],
      variables: [{ refId: '_x', modelLHS: undefined, units: 'm/s' }, undefined, { refId: 'é∑' }],
      varInstances: {
        'odd "key"': [{ a: [] }, { b: {} }, { c: [[1, [2]], { d: [] }] }]
      }
    }
    expect(writeAndRead(full)).toBe(JSON.stringify(full, null, 2))
  })

  it('should match JSON.stringify(full, null, 2) for a listing larger than the flush threshold', () => {
    const variables = []
    for (let i = 0; i < 50000; i++) {
      variables.push({
        refId: `_var_${i}`,
        varName: `_var_${i}`,
        families: ['_dima', '_dimb'],
        references: [`_ref_${i}_a`, `_ref_${i}_b`],
        parsedEqn: { kind: 'binary', lhs: { kind: 'num', value: i }, rhs: { kind: 'num', value: i * 2 } }
      })
    }
    const full = {
      dimensions: [{ id: '_dima' }, { id: '_dimb' }],
      variables,
      varInstances: {
        auxVars: variables.map(v => ({ varName: v.varName }))
      }
    }
    const expected = JSON.stringify(full, null, 2)
    expect(expected.length).toBeGreaterThan(8 * 1024 * 1024)
    expect(writeAndRead(full)).toBe(expected)
  })
})
