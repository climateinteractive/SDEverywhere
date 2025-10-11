<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type { BundleModel, Config, ImplVar, ImplVarGroup, ModelSpec, SuiteReport } from '@sdeverywhere/check-core'
import { ComparisonDataCoordinator, runSuite } from '@sdeverywhere/check-core'

import { mockBundleModel, mockNamedBundle } from '../../_mocks/mock-bundle'
import { mockConfig } from '../../_mocks/mock-config'
import { mockDataset } from '../../_mocks/mock-data'
import { implVar, inputVar, outputVar } from '../../_mocks/mock-vars'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { createTraceViewModel } from './trace-vm'
import Trace from './trace.svelte'

const { Story } = defineMeta({
  title: 'Components/Trace',
  component: Trace
})

function mockModelSpec(): ModelSpec {
  const inputVarNames = Array.from({ length: 10 }, (_, i) => `Constant ${i + 1}`)
  const inputVars = new Map(inputVarNames.map((varName, i) => inputVar(`${i + 1}`, varName)))

  const outputVarNames = Array.from({ length: 10 }, (_, i) => `Output ${i + 1}`)
  const outputVars = new Map(outputVarNames.map(varName => outputVar(varName)))

  const constants = Array.from({ length: 10 }, (_, i) => implVar(`Constant ${i + 1}`, 'const'))
  const levelVars = Array.from({ length: 10 }, (_, i) => implVar(`Level ${i + 1}`, 'level'))
  const auxVars = Array.from({ length: 10 }, (_, i) => implVar(`Output ${i + 1}`, 'aux'))
  const implVars = new Map([...constants, ...levelVars, ...auxVars])

  const implVarGroups: ImplVarGroup[] = []
  function addGroup(fn: string, vars: [string, ImplVar][]) {
    implVarGroups.push({
      title: fn,
      fn,
      datasetKeys: vars.map(([key]) => key)
    })
  }
  addGroup('initConstants', constants)
  addGroup('initLevels', levelVars)
  addGroup('evalLevels', levelVars)
  addGroup('evalAux', auxVars)

  return {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars,
    outputVars,
    implVars,
    implVarGroups,
    startTime: 2000,
    endTime: 2100
  }
}

function createBundleModel(modelSpec: ModelSpec, delta = 0): BundleModel {
  return mockBundleModel(modelSpec, (_, datasetKeys) => {
    const datasetMap = new Map()
    for (const datasetKey of datasetKeys) {
      // Apply delta only for every even-numbered variable, otherwise use 0
      const match = datasetKey.match(/_(\d+)$/)
      const variableNumber = match ? parseInt(match[1], 10) : 0
      const effectiveDelta = variableNumber % 2 === 0 ? delta : 0
      datasetMap.set(datasetKey, mockDataset(effectiveDelta))
    }
    return datasetMap
  })
}

async function runComparisons(config: Config): Promise<SuiteReport> {
  return await new Promise((resolve, reject) => {
    const callbacks = {
      onComplete: (report: any) => resolve(report),
      onError: (error: Error) => reject(error)
    }
    runSuite(config, callbacks)
  })
}

async function createTraceViewModelForStory(deltaR = 0) {
  const modelSpec = mockModelSpec()
  const bundleL = mockNamedBundle('left', createBundleModel(modelSpec, 0))
  const bundleR = mockNamedBundle('right', createBundleModel(modelSpec, deltaR))

  const config = await mockConfig(bundleL, bundleR)
  const comparisonConfig = config.comparison
  console.log(comparisonConfig)
  const dataCoordinator = new ComparisonDataCoordinator(comparisonConfig.bundleL.model, comparisonConfig.bundleR.model)

  // XXX: Run the comparisons to get the terse summaries
  const suiteReport = await runComparisons(config)
  const terseSummaries = suiteReport.comparisonReport?.testReports.map(report => ({
    s: report.scenarioKey,
    d: report.datasetKey,
    md: report.diffReport.maxDiff
  }))
  console.log(terseSummaries)

  return createTraceViewModel(comparisonConfig, dataCoordinator, terseSummaries)
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={1200} height={600}>
    <Trace {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Models Without Differences"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where the models produce identical data
    args.viewModel = await createTraceViewModelForStory(0)
  }}
/>

<Story
  name="Models With Differences"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where even-numbered variables have different values
    args.viewModel = await createTraceViewModelForStory(5)
  }}
/>
