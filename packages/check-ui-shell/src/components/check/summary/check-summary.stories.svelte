<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
// import { expect } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type {
  BundleModel,
  CheckKey,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckReport,
  CheckResult,
  Dataset,
  ModelSpec
} from '@sdeverywhere/check-core'
import { CheckDataCoordinator } from '@sdeverywhere/check-core'

import { mockBundleModel } from '../../../_mocks/mock-bundle'
import { mockDataset } from '../../../_mocks/mock-data'
import { inputVar, outputVar } from '../../../_mocks/mock-vars'

import { inputAtPos } from '../_mocks/mock-check-scenario'
import {
  datasetReport,
  groupReport,
  opConstantRef,
  predicateReport,
  scenarioReport,
  testReport
} from '../_mocks/mock-check-report'

import StoryDecorator from '../../_storybook/story-decorator.svelte'

import { createCheckSummaryViewModel } from './check-summary-vm'
import CheckSummary from './check-summary.svelte'

const { Story } = defineMeta({
  title: 'Components/CheckSummary',
  component: CheckSummary
})

const bundleModel = createBundleModel()
const dataCoordinator = new CheckDataCoordinator(bundleModel)

const passedResult: CheckResult = {
  status: 'passed'
}
const failedResult: CheckResult = {
  status: 'failed',
  failValue: 50,
  failTime: 2000
}
const errorResult: CheckResult = {
  status: 'error',
  errorInfo: {
    kind: 'unknown-dataset',
    name: 'Some Dataset Name'
  }
}

const eqZero: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(0)]]

const passedPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], passedResult)
const failedPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], failedResult)
const errorPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], errorResult)

function createBundleModel(): BundleModel {
  const inputVarNames = Array.from({ length: 1000 }, (_, i) => `I${i + 1}`)
  const outputVarNames = Array.from({ length: 1000 }, (_, i) => `O${i + 1}`)
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(inputVarNames.map((varName, i) => inputVar(`${i + 1}`, varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }
  return mockBundleModel(modelSpec, (_, datasetKeys) => {
    const datasetMap = new Map()
    for (const datasetKey of datasetKeys) {
      let ds: Dataset
      switch (datasetKey) {
        case 'Model__o2':
          ds = mockDataset(5)
          break
        case 'Model__o2_upper':
          ds = mockDataset(15)
          break
        case 'Model__o2_lower':
          ds = mockDataset(-5)
          break
        default:
          ds = mockDataset()
          break
      }
      datasetMap.set(datasetKey, ds)
    }
    return datasetMap
  })
}

function createCheckReport(scenarioCount: number, datasetCount: number): CheckReport {
  let checkKey = 0
  let allScenariosPassed = true
  const scenarioReports = Array.from({ length: scenarioCount }, (_, scenarioIndex) => {
    let allDatasetsPassed = true
    const datasetReports = Array.from({ length: datasetCount }, (_, datasetIndex) => {
      let pred: CheckPredicateReport
      switch (datasetIndex % 3) {
        case 1:
          pred = failedPred(checkKey++)
          allDatasetsPassed = false
          break
        case 2:
          pred = errorPred(checkKey++)
          allDatasetsPassed = false
          break
        default:
          pred = passedPred(checkKey++)
          break
      }
      return datasetReport('Model', `O${datasetIndex + 1}`, pred.result.status, [pred])
    })
    if (!allDatasetsPassed) {
      allScenariosPassed = false
    }
    const input = inputVar(`${scenarioIndex + 1}`, `I${scenarioIndex + 1}`)[1]
    return scenarioReport(inputAtPos(input, 'at-maximum'), allDatasetsPassed ? 'passed' : 'error', datasetReports)
  })
  const group = groupReport('group1', [testReport('test1', allScenariosPassed ? 'passed' : 'error', scenarioReports)])
  return {
    groups: [group]
  }
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={800} height={600}>
    <CheckSummary {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Single test (1 scenario x 1 dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(1, 1)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (1 scenario x 100 datasets)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(1, 100)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (100 scenarios x 1 dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(100, 1)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (100 scenarios x 10 dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(100, 10)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (100 scenarios x 100 datasets)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(100, 100)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (1000 scenarios x 1 dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(1000, 1)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>

<Story
  name="Single test (1000 scenarios x 10 datasets)"
  {template}
  beforeEach={async ({ args }) => {
    const report = createCheckReport(1000, 10)
    args.viewModel = createCheckSummaryViewModel(dataCoordinator, report)
  }}
/>
