// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Bundle, BundleModel, ModelSpec } from '../bundle/bundle-types'
import { outputVar } from '../check/_mocks/mock-check-dataset'
import { inputVar } from '../check/_mocks/mock-check-scenario'
import { resolveCompareScenarios } from './compare-resolve-scenarios'
import { ScenarioManager } from './scenario-manager'

interface MockConfigOptions {
  emptyTests?: boolean
  invalidTests?: boolean
}

function mockBundleModel(modelSpec: ModelSpec, mockOptions?: MockConfigOptions): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => {
      return {
        datasetMap: new Map()
      }
    },
    getGraphDataForScenario: async () => {
      return undefined
    },
    getGraphLinksForScenario: () => {
      return []
    }
  }
}

function mockBundle(mockOptions?: MockConfigOptions): Bundle {
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map([inputVar('I1')]),
    outputVars: new Map([outputVar('V1')]),
    implVars: new Map(),
    inputGroups: new Map(),
    datasetGroups: new Map()
  }
  return {
    version: 1,
    modelSpec,
    initModel: async () => {
      return mockBundleModel(modelSpec, mockOptions)
    }
  }
}

describe('resolveCompareScenarios', () => {
  it('should resolve to empty set of scenarios if no base scenarios or yaml defs are provided', () => {
    // TODO
  })

  it('should resolve when only base scenarios are provided (no yaml defs)', () => {
    // TODO
  })

  it('should resolve when only yaml defs are provided (no base scenarios)', () => {
    // TODO
  })

  it('should resolve when both base scenarios and yaml defs are provided', () => {
    const bundleL = mockBundle()
    const bundleR = mockBundle()

    const baseScenarios = new ScenarioManager(bundleL, bundleR)
    // TODO: Add a couple scenarios

    const yaml = `
# scenario
`
    const yamlDefs = [yaml]

    const resolvedScenarios = resolveCompareScenarios(bundleL, bundleR, baseScenarios, yamlDefs)
    expect(resolvedScenarios).toBeDefined()
  })
})
