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
import type { ComparisonSpecs } from '../comparison/config/comparison-spec-types'
import type { ComparisonOptions } from '../comparison/config/comparison-config'

interface MockConfigOptions {
  emptyTests?: boolean
  invalidTests?: boolean
  throwInCurrentGetDatasets?: boolean
  includeComparisons?: boolean
}

function mockBundleModel(modelSpec: ModelSpec, mockOptions: MockConfigOptions): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => {
      if (mockOptions.throwInCurrentGetDatasets === true) {
        throw new Error('Fake error')
      }
      return {
        datasetMap: new Map([['Model_v1', new Map([[2000, 0]])]])
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
    inputVars: new Map([inputVar('1', 'I1'), inputVar('2', 'I2')]),
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
  - it: test2
    scenarios:
      - with: I1
        at: min
    datasets:
      - name: V1
    predicates:
      - eq: 0
`
    tests = [test]
  }

  const bundleR: Bundle = mockBundle(mockOptions)

  let comparisonOptions: ComparisonOptions | undefined
  if (mockOptions.includeComparisons === true) {
    const bundleL: Bundle = mockBundle({})
    const comparisonSpecs: ComparisonSpecs = {
      scenarios: [
        {
          kind: 'scenario-with-all-inputs',
          id: 'all_inputs_at_default',
          title: 'All inputs',
          subtitle: 'at default',
          position: 'default'
        },
        {
          kind: 'scenario-with-inputs',
          id: 'input_1_at_min',
          title: 'Input 1',
          subtitle: 'at min',
          inputs: [
            {
              kind: 'input-at-position',
              inputName: 'I1',
              position: 'min'
            }
          ]
        }
      ]
    }
    comparisonOptions = {
      baseline: {
        name: 'Baseline',
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      specs: [comparisonSpecs]
    }
  }

  const configOptions: ConfigOptions = {
    current: {
      name: 'Current',
      bundle: bundleR
    },
    check: {
      tests
    },
    comparison: comparisonOptions
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
      comparisonReport: undefined
    })
    expect(progressPcts).toEqual([0, 1])
  })

  it('should skip checks when skipChecks option is provided', async () => {
    const config = await mockConfig({})

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      runSuite(config, callbacks, {
        skipChecks: [{ groupName: 'group1', testName: 'test1' }]
      })
    })

    // Verify that there is one group in the report with two tests
    expect(report.checkReport.groups.length).toBe(1)
    expect(report.checkReport.groups[0].name).toBe('group1')
    expect(report.checkReport.groups[0].tests.length).toBe(2)

    // Verify that test1 has no scenarios (since it was skipped)
    const test1 = report.checkReport.groups[0].tests[0]
    expect(test1).toBeDefined()
    expect(test1.status).toBe('skipped')
    expect(test1.scenarios.length).toBe(0)

    // Verify that test2 has scenarios (since it was not skipped)
    const test2 = report.checkReport.groups[0].tests[1]
    expect(test2).toBeDefined()
    expect(test2.status).toBe('passed')
    expect(test2.scenarios.length).toBe(1)
  })

  it('should skip comparisons when skipComparisonScenarios option is provided', async () => {
    const config = await mockConfig({ includeComparisons: true })

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      runSuite(config, callbacks, {
        skipComparisonScenarios: [{ title: 'Input 1', subtitle: 'at min' }]
      })
    })

    // Verify that there are two comparison reports
    expect(report.comparisonReport).toBeDefined()
    expect(report.comparisonReport.testReports.length).toBe(2)

    // Verify that the "Input 1 at min" scenario is skipped
    const report1 = report.comparisonReport.testReports[0]
    expect(report1.scenarioKey).toBe('2')
    expect(report1.diffReport).toBeUndefined()

    // Verify that the "All inputs" scenario is not skipped
    const report2 = report.comparisonReport.testReports[1]
    expect(report2.scenarioKey).toBe('1')
    expect(report2.diffReport).toBeDefined()
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
