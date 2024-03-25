// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../_shared/types'
import type { DatasetGroupName, ModelSpec } from '../bundle/bundle-types'
import type { ImplVar, OutputVar } from '../bundle/var-types'
import { expandDatasets } from './check-dataset'
import type { CheckDatasetSpec } from './check-spec'
import { dataset, dimension, implVar, outputVar } from './_mocks/mock-check-dataset'
import { datasetGroupSpec, datasetMatchingTypeSpec, datasetNameSpec } from './_mocks/mock-check-spec'

function nameSpec(name: string, source?: string): CheckDatasetSpec {
  return datasetNameSpec(name, source)
}

function groupSpec(group: string): CheckDatasetSpec {
  return datasetGroupSpec(group)
}

function matchingTypeSpec(type: string): CheckDatasetSpec {
  return datasetMatchingTypeSpec(type)
}

describe('expandDatasets', () => {
  const outputVars: Map<DatasetKey, OutputVar> = new Map([
    outputVar('V1', 'Static'),
    outputVar('V1'),
    outputVar('V2[A1]'),
    outputVar('V6')
  ])

  const implVars: Map<DatasetKey, ImplVar> = new Map([
    implVar('V1'),
    implVar('V2', [dimension('A')]),
    implVar('V3'),
    implVar('V4', [dimension('A')]),
    implVar('V5', [dimension('A'), dimension('B')]),
    implVar('V6')
  ])

  const datasetGroups: Map<DatasetGroupName, DatasetKey[]> = new Map([
    ['output group 0', []],
    ['output group 1', ['Model_unknown_dataset']],
    ['output group 2', ['Model_v1', 'Model_v6']],
    ['output group 3', ['Model_v1', 'ModelImpl_v3']]
  ])

  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(),
    outputVars,
    implVars,
    datasetGroups
  }

  it('should return a dataset with undefined key if name does not match any known variable', () => {
    expect(expandDatasets(modelSpec, nameSpec('XX'))).toEqual([
      {
        name: 'XX',
        error: 'no-matches-for-dataset'
      }
    ])
  })

  it('should expand a single output variable to one dataset', () => {
    expect(expandDatasets(modelSpec, nameSpec('V1'))).toEqual([dataset('Model', 'V1')])
  })

  it('should expand a single output variable from a secondary source to one dataset', () => {
    expect(expandDatasets(modelSpec, nameSpec('V1', 'Static'))).toEqual([dataset('Static', 'V1')])
  })

  it.skip('should expand a single subscripted output variable to one dataset', () => {
    // TODO: Implement support for name that includes subscript(s)
    expect(expandDatasets(modelSpec, nameSpec('V2[A1]'))).toEqual([dataset('Model', 'V2', ['A1'])])
  })

  it('should expand a single impl variable to one dataset', () => {
    expect(expandDatasets(modelSpec, nameSpec('V3'))).toEqual([dataset('ModelImpl', 'V3')])
  })

  it('should ignore case when matching by name', () => {
    expect(expandDatasets(modelSpec, nameSpec('v1'))).toEqual([dataset('Model', 'V1')])
    expect(expandDatasets(modelSpec, nameSpec('v1', 'static'))).toEqual([dataset('Static', 'V1')])
  })

  it('should expand an impl variable with one dimension to multiple datasets', () => {
    expect(expandDatasets(modelSpec, nameSpec('V4'))).toEqual([
      dataset('ModelImpl', 'V4', ['A1']),
      dataset('ModelImpl', 'V4', ['A2'])
    ])
  })

  it('should expand an impl variable with two dimensions to multiple datasets', () => {
    expect(expandDatasets(modelSpec, nameSpec('V5'))).toEqual([
      dataset('ModelImpl', 'V5', ['A1', 'B1']),
      dataset('ModelImpl', 'V5', ['A1', 'B2']),
      dataset('ModelImpl', 'V5', ['A2', 'B1']),
      dataset('ModelImpl', 'V5', ['A2', 'B2'])
    ])
  })

  it.skip('should expand an impl variable with one subscript to one dataset', () => {
    // TODO: Implement support for name that includes subscript(s)
    expect(expandDatasets(modelSpec, nameSpec('V4[A1]'))).toEqual([dataset('ModelImpl', 'V4', ['A1'])])
  })

  it.skip('should expand an impl variable with two subscripts to one dataset', () => {
    // TODO: Implement support for name that includes subscript(s)
    expect(expandDatasets(modelSpec, nameSpec('V5[A1,B1]'))).toEqual([dataset('ModelImpl', 'V5', ['A1', 'B1'])])
  })

  it('should return a dataset with undefined key if group is unknown', () => {
    expect(expandDatasets(modelSpec, groupSpec('unknown'))).toEqual([
      {
        name: 'unknown',
        error: 'no-matches-for-group'
      }
    ])
  })

  it('should return a dataset with undefined key if result set is empty when matching by group', () => {
    expect(expandDatasets(modelSpec, groupSpec('output group 0'))).toEqual([
      {
        name: 'output group 0',
        error: 'no-matches-for-group'
      }
    ])
  })

  it('should return a dataset with undefined key if group contains unknown dataset', () => {
    expect(expandDatasets(modelSpec, groupSpec('output group 1'))).toEqual([
      {
        name: 'Model_unknown_dataset',
        error: 'no-matches-for-dataset'
      }
    ])
  })

  it('should expand datasets when group contains known outputs', () => {
    expect(expandDatasets(modelSpec, groupSpec('output group 2'))).toEqual([
      dataset('Model', 'V1'),
      dataset('Model', 'V6')
    ])
  })

  it('should expand datasets when group contains mix of output and impl variables', () => {
    expect(expandDatasets(modelSpec, groupSpec('output group 3'))).toEqual([
      dataset('Model', 'V1'),
      dataset('ModelImpl', 'V3')
    ])
  })

  it('should return a dataset with undefined key if result set is empty when matching by type', () => {
    expect(expandDatasets(modelSpec, matchingTypeSpec('xx'))).toEqual([
      {
        name: 'xx',
        error: 'no-matches-for-type'
      }
    ])
  })

  it('should expand datasets when matching by type', () => {
    expect(expandDatasets(modelSpec, matchingTypeSpec('aux'))).toEqual([
      dataset('ModelImpl', 'V1'),
      dataset('ModelImpl', 'V2', ['A1']),
      dataset('ModelImpl', 'V2', ['A2']),
      dataset('ModelImpl', 'V3'),
      dataset('ModelImpl', 'V4', ['A1']),
      dataset('ModelImpl', 'V4', ['A2']),
      dataset('ModelImpl', 'V5', ['A1', 'B1']),
      dataset('ModelImpl', 'V5', ['A1', 'B2']),
      dataset('ModelImpl', 'V5', ['A2', 'B1']),
      dataset('ModelImpl', 'V5', ['A2', 'B2']),
      dataset('ModelImpl', 'V6')
    ])
  })
})
