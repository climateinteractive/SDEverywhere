<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
// import { expect } from 'storybook/test'
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'

import type {
  CheckPredicateOp,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckPredicateTimeSpec,
  CheckResult,
  CheckScenario,
  DatasetKey,
  InputVar,
  ModelSpec
} from '@sdeverywhere/check-core'
import { CheckDataCoordinator } from '@sdeverywhere/check-core'

import { inputVar, mockBundleModel, outputVar } from '../../../_mocks/mock-bundle'
import { dataset, opConstantRef, opDataRef } from '../_mocks/mock-check-report'
import { inputAtValue } from '../_mocks/mock-check-scenario'

import StoryDecorator from '../../_storybook/story-decorator.svelte'

import { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'
import CheckSummaryGraphBox from './check-summary-graph-box.svelte'

const { Story } = defineMeta({
  title: 'Components/CheckSummaryGraphBox',
  component: CheckSummaryGraphBox
})

function createPredicateReport(
  opRefPairs: [CheckPredicateOp, CheckPredicateOpRef][],
  options?: { time?: CheckPredicateTimeSpec; tolerance?: number }
): CheckPredicateReport {
  const result: CheckResult = {
    status: 'passed'
  }

  const opRefs: Map<CheckPredicateOp, CheckPredicateOpRef> = new Map(opRefPairs)

  return {
    checkKey: 1,
    result,
    opRefs,
    // The opValues aren't used in the graph box, so we leave it empty
    opValues: [],
    time: options?.time,
    tolerance: options?.tolerance
  }
}

function createGraphBoxViewModel(predicateReport: CheckPredicateReport): CheckSummaryGraphBoxViewModel {
  const inputVarNames = ['I1']
  const outputVarNames = ['O1', 'O2', 'O2_Upper', 'O2_Lower']
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(inputVarNames.map((varName, i) => inputVar(`${i}`, varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }
  const bundleModel = mockBundleModel(modelSpec)

  const dataCoordinator = new CheckDataCoordinator(bundleModel)
  const input1: InputVar = modelSpec.inputVars.get('_i1')
  const scenario: CheckScenario = inputAtValue(input1, 10)
  const datasetKey: DatasetKey = 'Model__o1'
  return new CheckSummaryGraphBoxViewModel(dataCoordinator, scenario, datasetKey, predicateReport)
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={460} height={300}>
    <CheckSummaryGraphBox {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Without time: eq"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(50)]]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: approx"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: gt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opConstantRef(50)]]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: gte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opConstantRef(50)]]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opConstantRef(50)]]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: lte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opConstantRef(50)]]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="Without time: gt and lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opConstantRef(20)],
      ['lte', opConstantRef(90)]
    ]
    const report = createPredicateReport(ops)
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: eq"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: approx"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040,
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: gt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: gte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: lte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With single time: gt and lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opConstantRef(20)],
      ['lte', opConstantRef(90)]
    ]
    const report = createPredicateReport(ops, {
      time: 2040
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: eq"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: approx"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      },
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: gt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: gte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: lte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With min time: gt and lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opConstantRef(20)],
      ['lte', opConstantRef(90)]
    ]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: eq"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: approx"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      },
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: gt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: gte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: lte"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With max time: gt and lt"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opConstantRef(20)],
      ['lte', opConstantRef(90)]
    ]
    const report = createPredicateReport(ops, {
      time: {
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: eq (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: approx (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      },
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gt (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gte (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: lt (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: lte (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opConstantRef(50)]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gt and lt (constant)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opConstantRef(20)],
      ['lte', opConstantRef(90)]
    ]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2040,
        before_incl: 2060
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: eq (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['eq', opDataRef(dataset('Model', 'O2'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: approx (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['approx', opDataRef(dataset('Model', 'O2'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      },
      tolerance: 10
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gt (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gt', opDataRef(dataset('Model', 'O2_Lower'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gte (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['gte', opDataRef(dataset('Model', 'O2_Lower'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: lt (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lt', opDataRef(dataset('Model', 'O2_Upper'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: lte (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [['lte', opDataRef(dataset('Model', 'O2_Upper'))]]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2090
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>

<Story
  name="With time range: gt and lt (dataset)"
  {template}
  beforeEach={async ({ args }) => {
    const ops: [CheckPredicateOp, CheckPredicateOpRef][] = [
      ['gte', opDataRef(dataset('Model', 'O2_Lower'))],
      ['lte', opDataRef(dataset('Model', 'O2_Upper'))]
    ]
    const report = createPredicateReport(ops, {
      time: {
        after_incl: 2020,
        before_incl: 2080
      }
    })
    args.viewModel = createGraphBoxViewModel(report)
  }}
/>
