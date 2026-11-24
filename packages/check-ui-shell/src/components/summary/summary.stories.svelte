<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<!--
  Stories for the "Comparison views" tab of the summary view.  Each story creates a comparison
  config with some view groups and a set of comparison results, and then verifies the subtitle of
  the tab, the view rows, and the colored bars for the views.
-->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor } from 'storybook/test'
import { writable } from 'svelte/store'

import type {
  BundleGraphSpec,
  ComparisonConfig,
  ComparisonSortMode,
  ComparisonSummary,
  ComparisonTestSummary,
  DatasetKey,
  ModelSpec,
  PerfReport
} from '@sdeverywhere/check-core'
import { createCheckDataCoordinatorForTests, createConfig } from '@sdeverywhere/check-core'

import { mockBundleModel, mockNamedBundle } from '../../_mocks/mock-bundle'
import { mockDataset } from '../../_mocks/mock-data'
import { inputVar, outputVar } from '../../_mocks/mock-vars'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { createPinnedItemStates } from '../compare/_shared/pinned-item-state'

import { createSummaryViewModel, type SummaryViewModel } from './summary-vm'
import Summary from './summary.svelte'

const { Story } = defineMeta({
  title: 'Components/Summary',
  component: Summary
})

const output1 = 'Model__output_1'
const output2 = 'Model__output_2'
const output3 = 'Model__output_3'

/**
 * Return a graph spec that shows a single dataset.
 *
 * @param id The graph ID.
 * @param datasetKey The key of the dataset shown in the graph.
 * @param units The units of the graph (stored in the graph metadata).
 */
function graph(id: string, datasetKey: DatasetKey, units: string): BundleGraphSpec {
  return {
    id,
    title: `Graph ${id}`,
    legendItems: [],
    datasets: [{ datasetKey, varName: datasetKey, color: 'red' }],
    metadata: new Map([['units', units]])
  }
}

/**
 * Return a model spec with one input, three outputs, and the given graphs.
 *
 * @param graphSpecs The graphs defined in the model.
 */
function modelSpec(graphSpecs: BundleGraphSpec[]): ModelSpec {
  return {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map([inputVar('1', 'Constant 1')]),
    outputVars: new Map(['Output 1', 'Output 2', 'Output 3'].map(varName => outputVar(varName))),
    implVars: new Map(),
    graphSpecs
  }
}

/**
 * Return a perf report with the given average time.
 *
 * @param avgTime The average time, in milliseconds.
 */
function perfReport(avgTime: number): PerfReport {
  return { minTime: avgTime, maxTime: avgTime, avgTime, medianTime: avgTime, p95Time: avgTime, stdDev: 0, allTimes: [] }
}

/**
 * Create a summary view model for a comparison with the given view groups (in YAML format).
 *
 * In the "baseline" scenario, Output 1 has a small diff, Output 2 is unchanged, and Output 3 has
 * a larger diff.  In the "constant_1_max" scenario, none of the outputs changed.
 *
 * Graph 1 (Output 1) has metadata and dataset changes, graph 2 (Output 2) is unchanged, graph 3
 * only exists in the right bundle, and graph 4 (Output 3) has dataset changes only.
 *
 * @param viewGroupsYaml The YAML for the view groups.
 */
async function createViewModel(viewGroupsYaml: string): Promise<SummaryViewModel> {
  const specL = modelSpec([graph('1', output1, 'C'), graph('2', output2, 'm'), graph('4', output3, 's')])
  const specR = modelSpec([
    graph('1', output1, 'K'),
    graph('2', output2, 'm'),
    graph('3', output2, 'm'),
    graph('4', output3, 's')
  ])
  const bundleModelL = mockBundleModel(specL, (_, keys) => new Map(keys.map(key => [key, mockDataset()])))
  const bundleModelR = mockBundleModel(specR, (_, keys) => new Map(keys.map(key => [key, mockDataset()])))

  const scenariosYaml = `
- scenario:
    id: baseline
    title: All inputs
    subtitle: at default
    with_inputs: all
    at: default
- scenario:
    id: constant_1_max
    title: Constant 1
    subtitle: at max
    with: Constant 1
    at: max
`
  const config = await createConfig({
    current: mockNamedBundle('current', bundleModelR),
    check: { tests: [] },
    comparison: {
      baseline: mockNamedBundle('baseline', bundleModelL),
      thresholds: [1, 5, 10],
      specs: [{ kind: 'yaml', content: `${scenariosYaml}\n${viewGroupsYaml}` }]
    }
  })
  const comparisonConfig: ComparisonConfig = config.comparison

  // Use the resolved scenario keys for the test summaries
  const scenarioKey = (id: string) => [...comparisonConfig.scenarios.getAllScenarios()].find(s => s.id === id).key
  const testSummary = (scenarioId: string, datasetKey: DatasetKey, maxDiff: number): ComparisonTestSummary => ({
    s: scenarioKey(scenarioId),
    d: datasetKey,
    md: maxDiff,
    ad: maxDiff / 2
  })
  const comparisonSummary: ComparisonSummary = {
    testSummaries: [
      testSummary('baseline', output1, 2),
      testSummary('baseline', output2, 0),
      testSummary('baseline', output3, 6),
      testSummary('constant_1_max', output1, 0),
      testSummary('constant_1_max', output2, 0),
      testSummary('constant_1_max', output3, 0)
    ],
    perfReportL: perfReport(10),
    perfReportR: perfReport(10)
  }

  const sortMode = writable<ComparisonSortMode>('max-diff')
  return createSummaryViewModel(
    createCheckDataCoordinatorForTests(bundleModelR),
    { groups: [] },
    comparisonConfig,
    comparisonSummary,
    createPinnedItemStates(),
    sortMode
  )
}

/**
 * Return the subtitle element of the tab with the given title.
 *
 * @param canvasElement The root element of the story.
 * @param title The title of the tab.
 */
function tabSubtitle(canvasElement: HTMLElement, title: string): HTMLElement {
  const tab = Array.from(canvasElement.querySelectorAll('.tab-item')).find(
    el => el.querySelector('.tab-title').textContent === title
  )
  return tab.querySelector('.tab-subtitle')
}

/**
 * Return the widths (in percent, rounded to the nearest integer) of the colored bar segments of
 * the view row with the given title.
 *
 * @param canvasElement The root element of the story.
 * @param title The title of the view.
 */
function barWidths(canvasElement: HTMLElement, title: string): number[] {
  const row = Array.from(canvasElement.querySelectorAll('.summary-row')).find(
    el => el.querySelector('.title')?.textContent === title
  )
  return Array.from(row.querySelectorAll('.bar')).map(bar => Math.round(parseFloat((bar as HTMLElement).style.width)))
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={800} height={500}>
    <Summary {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Comparison views (graphs grouped by diffs)"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = await createViewModel(`
- view_group:
    title: Baseline
    views:
      - view:
          title: All graphs
          scenario_ref: baseline
          graphs: ['1', '2', '3', '4']
          graph_order: grouped-by-diffs
      - view:
          title: Output 2
          scenario_ref: baseline
          graphs: ['2']
- view_group:
    title: Constant 1
    views:
      - view:
          title: Constant 1 at max
          scenario_ref: constant_1_max
          graphs: ['2']
`)
  }}
  play={async ({ canvas, canvasElement }) => {
    // The tab counts the changed graphs in the views that show graphs grouped by diffs (graph 1
    // has metadata and dataset changes, graph 3 was added, and graph 4 has dataset changes)
    const subtitle = tabSubtitle(canvasElement, 'Comparison views')
    await expect(subtitle).toHaveTextContent('3 graphs with diffs')
    await expect(subtitle).toHaveClass('status-color-warning')

    // Select the tab and verify that it shows a section for each view group and a row for each view
    await userEvent.click(canvas.getByText('Comparison views'))
    await waitFor(() => expect(canvas.getByText('All graphs')).toBeInTheDocument())
    await expect(canvas.getByText('Baseline')).toBeInTheDocument()
    await expect(canvas.getByText('Output 2')).toBeInTheDocument()
    await expect(canvas.getByText('Constant 1')).toBeInTheDocument()
    await expect(canvas.getByText('Constant 1 at max')).toBeInTheDocument()

    // The bar for the "All graphs" view is colored by the graph differences: one graph in each of
    // the "unchanged", "added or metadata only" (bucket 1), "< 5%" (bucket 2), and "< 10%" (bucket 3)
    // buckets
    await expect(barWidths(canvasElement, 'All graphs')).toEqual([25, 25, 25, 25, 0, 0])

    // The bar for the "Output 2" view is colored by the dataset differences in the baseline scenario
    // (Output 1 is in bucket 2 and Output 3 is in bucket 3)
    await expect(barWidths(canvasElement, 'Output 2')).toEqual([33, 0, 33, 33, 0, 0])

    // The bar for the "Constant 1 at max" view has no differences
    await expect(barWidths(canvasElement, 'Constant 1 at max')).toEqual([100, 0, 0, 0, 0, 0])
  }}
/>

<Story
  name="Comparison views (default graph order)"
  {template}
  beforeEach={async ({ args }) => {
    args.viewModel = await createViewModel(`
- view_group:
    title: Views
    views:
      - view:
          title: Baseline graphs
          scenario_ref: baseline
          graphs: ['1', '2']
      - view:
          title: Constant 1 at max
          scenario_ref: constant_1_max
          graphs: ['1', '2']
`)
  }}
  play={async ({ canvasElement }) => {
    // When no view shows graphs grouped by diffs, the tab counts the views with diffs
    const subtitle = tabSubtitle(canvasElement, 'Comparison views')
    await expect(subtitle).toHaveTextContent('1 view with diffs')
    await expect(subtitle).toHaveClass('status-color-warning')
  }}
/>
