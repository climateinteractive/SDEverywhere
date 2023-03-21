// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { Bundle, BundleModel, ModelSpec } from '../bundle/bundle-types'
import { outputVar } from '../check/_mocks/mock-check-dataset'
import { inputVar } from '../check/_mocks/mock-check-scenario'
import { createConfig } from '../config/config'
import type { Config, ConfigOptions } from '../config/config-types'
import type { SuiteReport } from './suite-report-types'
import type { RunSuiteCallbacks } from './suite-runner'
import { runSuite } from './suite-runner'

interface MockConfigOptions {
  emptyTests?: boolean
  invalidTests?: boolean
  throwInCurrentGetDatasets?: boolean
}

function mockBundleModel(modelSpec: ModelSpec, mockOptions: MockConfigOptions): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => {
      if (mockOptions.throwInCurrentGetDatasets === true) {
        throw new Error('Fake error')
      }
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

function mockBundle(mockOptions: MockConfigOptions): Bundle {
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

async function mockConfig(mockOptions: MockConfigOptions): Promise<Config> {
  let tests: string[]
  if (mockOptions.emptyTests === true) {
    tests = []
  } else if (mockOptions.invalidTests === true) {
    tests = ['INVALID']
  } else {
    const test = `
- describe: group1
  tests:
  - it: test1
    scenarios:
      - with: I1
        at: min
      - with: I1
        at: max
    datasets:
      - name: V1
    predicates:
      - eq: 0
`
    tests = [test]
  }
  const configOptions: ConfigOptions = {
    current: {
      name: 'Current',
      bundle: mockBundle(mockOptions)
    },
    check: {
      tests
    }
  }
  return createConfig(configOptions)
}

describe('runSuite', () => {
  it('should notify progress and completion callbacks for successful run', async () => {
    const config = await mockConfig({})

    const progressPcts: number[] = []
    const sawOnComplete = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onProgress: pct => {
          progressPcts.push(pct)
        },
        onComplete: () => {
          resolve(true)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }
      runSuite(config, callbacks)
    })

    expect(sawOnComplete).toBe(true)
    expect(progressPcts).toEqual([0, 0.5, 1])
  })

  it('should notify progress and completion callbacks even when there are no tests', async () => {
    const config = await mockConfig({ emptyTests: true })

    const progressPcts: number[] = []
    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onProgress: pct => {
          progressPcts.push(pct)
        },
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }
      runSuite(config, callbacks)
    })

    expect(report).toEqual({
      checkReport: {
        groups: []
      },
      compareReport: undefined
    })
    expect(progressPcts).toEqual([0, 1])
  })

  it('should notify error callback if there was an error', async () => {
    const config = await mockConfig({ invalidTests: true })

    const sawOnError = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: () => {
          reject(new Error('onComplete should not be called'))
        },
        onError: () => {
          resolve(true)
        }
      }
      runSuite(config, callbacks)
    })

    expect(sawOnError).toBe(true)
  })
})
