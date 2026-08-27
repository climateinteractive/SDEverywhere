// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { TaskExecutor, TaskExecutorKey } from '../_shared/task-queue'
import { createExecutor, TaskQueue } from '../_shared/task-queue'
import type { DatasetKey, DatasetMap } from '../_shared/types'

import type { Bundle, BundleModel, ModelSpec } from '../bundle/bundle-types'

import { createConfig } from '../config/config'
import type { Config, ConfigOptions } from '../config/config-types'

import { outputVar } from '../check/_mocks/mock-check-dataset'
import { inputVar } from '../check/_mocks/mock-check-scenario'

import type { ComparisonSpecs } from '../comparison/config/comparison-spec-types'
import type { ComparisonOptions } from '../comparison/config/comparison-config'

import type { SuiteReport } from './suite-report-types'
import type { RunSuiteCallbacks } from './suite-runner'
import { runSuiteWithTaskQueue } from './suite-runner'

interface MockConfigOptions {
  /** If true, configure the check suite with no tests. */
  emptyTests?: boolean
  /** If true, configure the check suite with a test that fails to parse. */
  invalidTests?: boolean
  /** If true, use a check test that includes a predicate that references another dataset. */
  testsWithRefData?: boolean
  /** The number of model instances to initialize (defaults to 1). */
  concurrency?: number
  /** The delay (in msecs) applied to every model run. */
  delayInGetDatasets?: number
  /** The delay (in msecs) applied to a model run that includes the given dataset key. */
  delaysByDatasetKey?: Map<DatasetKey, number>
  /** If true, throw an error from each model run in the "current" bundle. */
  throwInCurrentGetDatasets?: boolean
  /** If true, configure the suite with comparison tests in addition to check tests. */
  includeComparisons?: boolean
  /** Called at the start of each model run, before any configured delay is applied. */
  onGetDatasets?: () => void
  /** Called when a model run starts and when it completes. */
  onModelRun?: (event: string) => void
}

function mockBundleModel(modelSpec: ModelSpec, mockOptions: MockConfigOptions): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async (_scenarioSpec, datasetKeys) => {
      if (mockOptions.onGetDatasets) {
        mockOptions.onGetDatasets()
      }
      mockOptions.onModelRun?.(`start ${datasetKeys.join(',')}`)

      // Use the longest delay that is configured for the requested dataset keys
      let delay = mockOptions.delayInGetDatasets || 0
      for (const datasetKey of datasetKeys) {
        const delayForKey = mockOptions.delaysByDatasetKey?.get(datasetKey)
        if (delayForKey !== undefined && delayForKey > delay) {
          delay = delayForKey
        }
      }
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      if (mockOptions.throwInCurrentGetDatasets === true) {
        throw new Error('Fake error')
      }

      const datasetMap: DatasetMap = new Map(datasetKeys.map(datasetKey => [datasetKey, new Map([[2000, 0]])]))
      mockOptions.onModelRun?.(`end ${datasetKeys.join(',')}`)
      return {
        datasetMap
      }
    }
  }
}

function mockBundle(mockOptions: MockConfigOptions): Bundle {
  const outputVars = mockOptions.testsWithRefData === true ? [outputVar('V1'), outputVar('V2')] : [outputVar('V1')]
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map([inputVar('1', 'I1'), inputVar('2', 'I2')]),
    outputVars: new Map(outputVars),
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
  } else if (mockOptions.testsWithRefData === true) {
    // This test includes a predicate that compares one dataset against another
    // dataset, which means the reference data for V2 must be fetched (and held
    // in memory) before the check on V1 is performed
    const test = `
- describe: group1
  tests:
  - it: test1
    scenarios:
      - with: I1
        at: min
    datasets:
      - name: V1
    predicates:
      - eq:
          dataset:
            name: V2
          scenario: inherit
`
    tests = [test]
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
    comparison: comparisonOptions,
    concurrency: mockOptions.concurrency
  }
  return createConfig(configOptions)
}

function mockTaskQueue(config: Config): TaskQueue {
  const bundleModelsL = config.comparison?.bundleL.models
  const bundleModelsR = config.comparison?.bundleR.models || config.check.bundle.models
  const executors: Map<TaskExecutorKey, TaskExecutor> = new Map()
  for (let i = 0; i < bundleModelsR.length; i++) {
    const bundleModelL = bundleModelsL?.[i]
    const bundleModelR = bundleModelsR[i]
    const executor = createExecutor(bundleModelL, bundleModelR)
    executors.set(`executor-${i}`, executor)
  }
  return new TaskQueue(executors)
}

describe('runSuite', () => {
  it('should notify progress and completion callbacks for successful run', async () => {
    let getDatasetsCallCount = 0
    const config = await mockConfig({
      onGetDatasets: () => {
        getDatasetsCallCount++
      }
    })
    const taskQueue = mockTaskQueue(config)

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
      runSuiteWithTaskQueue(config, taskQueue, callbacks)
    })

    expect(sawOnComplete).toBe(true)
    expect(progressPcts).toEqual([0, 0.5, 1])
    expect(getDatasetsCallCount).toBe(2)
  })

  it('should fetch all reference data before running checks that depend on it', async () => {
    // Use more than one model instance so that multiple data requests can be processed
    // concurrently, and make the reference data request (for V2) take longer than the
    // check data request (for V1).  If the two were allowed to run at the same time, the
    // check would be performed before the reference data was available.
    const events: string[] = []
    const config = await mockConfig({
      testsWithRefData: true,
      concurrency: 2,
      delaysByDatasetKey: new Map([['Model_v2', 20]]),
      onModelRun: event => {
        events.push(event)
      }
    })
    const taskQueue = mockTaskQueue(config)

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
      runSuiteWithTaskQueue(config, taskQueue, callbacks)
    })

    // Verify that the reference data run completed before the check data run started
    expect(events).toEqual(['start Model_v2', 'end Model_v2', 'start Model_v1', 'end Model_v1'])

    // Verify that the check passed (it will be reported as an error if the reference
    // data was not resolved by the time the check was performed)
    const test1 = report.checkReport.groups[0].tests[0]
    expect(test1.status).toBe('passed')

    // Verify that progress is reported across both sets of data requests
    expect(progressPcts).toEqual([0, 0.5, 1])
  })

  it('should build reports when there is reference data but all checks are skipped', async () => {
    const events: string[] = []
    const config = await mockConfig({
      testsWithRefData: true,
      concurrency: 2,
      onModelRun: event => {
        events.push(event)
      }
    })
    const taskQueue = mockTaskQueue(config)

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }
      runSuiteWithTaskQueue(config, taskQueue, callbacks, {
        skipChecks: [{ groupName: 'group1', testName: 'test1' }]
      })
    })

    // Verify that only the reference data run was performed (there are no check data
    // requests because the only check was skipped)
    expect(events).toEqual(['start Model_v2', 'end Model_v2'])

    // Verify that the report was still built
    expect(report.checkReport.groups.length).toBe(1)
    expect(report.checkReport.groups[0].tests[0].status).toBe('skipped')
  })

  it('should notify progress and completion callbacks even when there are no tests', async () => {
    const config = await mockConfig({ emptyTests: true })
    const taskQueue = mockTaskQueue(config)

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
      runSuiteWithTaskQueue(config, taskQueue, callbacks)
    })

    expect(report).toEqual({
      checkReport: {
        groups: []
      },
      comparisonReport: undefined
    })
    expect(progressPcts).toEqual([0, 1])
  })

  it('should cancel tasks when the run is cancelled', async () => {
    let getDatasetsCallCount = 0
    const config = await mockConfig({
      onGetDatasets: () => {
        getDatasetsCallCount++
      },
      delayInGetDatasets: 20
    })

    const taskQueue = mockTaskQueue(config)

    const reportPromise = new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      const cancel = runSuiteWithTaskQueue(config, taskQueue, callbacks)
      setTimeout(() => cancel(), 10)
    })

    await Promise.race([
      reportPromise,
      new Promise(resolve => {
        setTimeout(() => resolve(true), 30)
      })
    ])

    expect(getDatasetsCallCount).toBe(1)
  })

  it('should skip checks when skipChecks option is provided', async () => {
    const config = await mockConfig({})
    const taskQueue = mockTaskQueue(config)

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      runSuiteWithTaskQueue(config, taskQueue, callbacks, {
        skipChecks: [{ groupName: 'group1', testName: 'test1' }]
      })
    })

    // Verify that there is one group in the report with two tests
    expect(report.checkReport.groups.length).toBe(1)
    expect(report.checkReport.groups[0].name).toBe('group1')
    expect(report.checkReport.groups[0].tests.length).toBe(2)

    // Verify that test1 has scenarios but is marked as skipped
    const test1 = report.checkReport.groups[0].tests[0]
    expect(test1).toBeDefined()
    expect(test1.status).toBe('skipped')
    expect(test1.scenarios.length).toBe(2)

    // Verify that test2 has scenarios (since it was not skipped)
    const test2 = report.checkReport.groups[0].tests[1]
    expect(test2).toBeDefined()
    expect(test2.status).toBe('passed')
    expect(test2.scenarios.length).toBe(1)
  })

  it('should skip comparisons when skipComparisonScenarios option is provided', async () => {
    const config = await mockConfig({ includeComparisons: true })
    const taskQueue = mockTaskQueue(config)

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      runSuiteWithTaskQueue(config, taskQueue, callbacks, {
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

  it('should build reports even when all checks and comparisons are skipped', async () => {
    const config = await mockConfig({ includeComparisons: true })
    const taskQueue = mockTaskQueue(config)

    const report: SuiteReport = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: suiteReport => {
          resolve(suiteReport)
        },
        onError: () => {
          reject(new Error('onError should not be called'))
        }
      }

      runSuiteWithTaskQueue(config, taskQueue, callbacks, {
        skipChecks: [
          { groupName: 'group1', testName: 'test1' },
          { groupName: 'group1', testName: 'test2' }
        ],
        skipComparisonScenarios: [
          { title: 'All inputs', subtitle: 'at default' },
          { title: 'Input 1', subtitle: 'at min' }
        ]
      })
    })

    expect(report.checkReport.groups.length).toBe(1)
    expect(report.checkReport.groups[0].name).toBe('group1')
    expect(report.checkReport.groups[0].tests.length).toBe(2)
    expect(report.checkReport.groups[0].tests[0].status).toBe('skipped')
    expect(report.checkReport.groups[0].tests[1].status).toBe('skipped')

    expect(report.comparisonReport).toBeDefined()
    expect(report.comparisonReport.testReports.length).toBe(2)
    expect(report.comparisonReport.testReports[0].scenarioKey).toBe('1')
    expect(report.comparisonReport.testReports[0].diffReport).toBeUndefined()
    expect(report.comparisonReport.testReports[1].scenarioKey).toBe('2')
    expect(report.comparisonReport.testReports[1].diffReport).toBeUndefined()
  })

  it('should notify error callback if there was an error', async () => {
    const config = await mockConfig({ invalidTests: true })
    const taskQueue = mockTaskQueue(config)

    const sawOnError = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: () => {
          reject(new Error('onComplete should not be called'))
        },
        onError: () => {
          resolve(true)
        }
      }
      runSuiteWithTaskQueue(config, taskQueue, callbacks)
    })

    expect(sawOnError).toBe(true)
  })

  it('should notify error callback if a task throws during model run', async () => {
    const config = await mockConfig({ throwInCurrentGetDatasets: true })
    const taskQueue = mockTaskQueue(config)

    const error: Error = await new Promise((resolve, reject) => {
      const callbacks: RunSuiteCallbacks = {
        onComplete: () => {
          reject(new Error('onComplete should not be called'))
        },
        onError: e => {
          resolve(e)
        }
      }
      runSuiteWithTaskQueue(config, taskQueue, callbacks)

      // Fail the test (instead of hanging) if onError is not called within
      // a reasonable amount of time
      setTimeout(() => {
        reject(new Error('Timed out waiting for onError'))
      }, 1000)
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Fake error')
  })
})
