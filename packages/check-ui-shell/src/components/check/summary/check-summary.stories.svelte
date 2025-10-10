<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
// import { expect } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type {
  BundleModel,
  CheckKey,
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckReport,
  CheckResult,
  ModelSpec
} from '@sdeverywhere/check-core'
import { CheckDataCoordinator } from '@sdeverywhere/check-core'

import { inputVar, mockBundleModel, outputVar } from '../../../_mocks/mock-bundle'
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

const eqZero: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(0)]]

const passedPred = (checkKey: CheckKey) => predicateReport(checkKey, eqZero, ['== 0'], passedResult)

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
  return mockBundleModel(modelSpec)
}

function createCheckReport(scenarioCount: number, datasetCount: number): CheckReport {
  let checkKey = 0
  const scenarioReports = Array.from({ length: scenarioCount }, (_, scenarioIndex) => {
    const datasetReports = Array.from({ length: datasetCount }, (_, datasetIndex) => {
      return datasetReport('Model', `O${datasetIndex + 1}`, 'passed', [passedPred(checkKey++)])
    })
    const input = inputVar(`${scenarioIndex + 1}`, `I${scenarioIndex + 1}`)[1]
    return scenarioReport(inputAtPos(input, 'at-maximum'), 'passed', datasetReports)
  })
  const group = groupReport('group1', [testReport('test1', 'passed', scenarioReports)])
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
