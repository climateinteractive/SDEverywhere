<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, waitFor } from 'storybook/test'

import type { ModelSpec, ImplVarGroup, ImplVar, BundleModel } from '@sdeverywhere/check-core'

import { mockBundleModel, mockNamedBundle } from './_mocks/mock-bundle'
import { mockConfigOptions } from './_mocks/mock-config'
import { mockDataset } from './_mocks/mock-data'
import { inputVar, outputVar, implVar } from './_mocks/mock-vars'

import StoryDecorator from './components/_storybook/story-decorator.svelte'

import { initAppModel } from './model/app-model'

import type { FilterItemTree, FilterStates } from './components/filter/filter-panel-vm'

import { AppViewModel } from './app-vm'
import AppShell from './app-shell.svelte'

function mockModelSpec(): ModelSpec {
  const varsPerGroup = 10

  const inputVarNames = Array.from({ length: varsPerGroup }, (_, i) => `Constant ${i + 1}`)
  const inputVars = new Map(inputVarNames.map((varName, i) => inputVar(`${i + 1}`, varName)))

  const outputVarNames = Array.from({ length: varsPerGroup }, (_, i) => `Output ${i + 1}`)
  const outputVars = new Map(outputVarNames.map(varName => outputVar(varName)))

  const constants = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Constant ${i + 1}`, 'const'))
  const levelVars = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Level ${i + 1}`, 'level'))
  const auxVars = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Output ${i + 1}`, 'aux'))
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

function createBundleModel(
  modelSpec: ModelSpec,
  options?: {
    delta?: number
    delayInGetDatasets?: number
  }
): BundleModel {
  const delta = options?.delta ?? 0
  return mockBundleModel(
    modelSpec,
    (_, datasetKeys) => {
      const datasetMap = new Map()
      for (const datasetKey of datasetKeys) {
        // Apply delta only for every even-numbered variable, otherwise use 0
        const match = datasetKey.match(/_(\d+)$/)
        const variableNumber = match ? parseInt(match[1], 10) : 0
        const effectiveDelta = variableNumber % 2 === 0 ? delta : 0
        datasetMap.set(datasetKey, mockDataset(effectiveDelta))
      }
      return datasetMap
    },
    {
      delayInGetDatasets: options?.delayInGetDatasets
    }
  )
}

function checkFilterTree(states: FilterStates): FilterItemTree {
  return {
    items: [
      {
        key: '__all_checks',
        label: 'All checks',
        children: [
          {
            key: 'Output 1',
            label: 'Output 1',
            children: [
              {
                key: 'Output 1__should be positive',
                label: 'should be positive',
                titleParts: { groupName: 'Output 1', testName: 'should be positive' }
              }
            ]
          }
        ]
      }
    ],
    states
  }
}

function scenarioFilterTree(states: FilterStates): FilterItemTree {
  return {
    items: [
      {
        key: '__all_scenarios',
        label: 'All scenarios',
        children: [
          {
            key: 'All inputs__at default',
            label: 'All inputs at default',
            titleParts: { title: 'All inputs', subtitle: 'at default' }
          },
          {
            key: 'Constant 1__at min',
            label: 'Constant 1 at min',
            titleParts: { title: 'Constant 1', subtitle: 'at min' }
          },
          {
            key: 'Constant 1__at max',
            label: 'Constant 1 at max',
            titleParts: { title: 'Constant 1', subtitle: 'at max' }
          }
        ]
      }
    ],
    states
  }
}

function saveCheckFilterTree(states: FilterStates): void {
  localStorage.setItem('sde-check-test-filters', JSON.stringify(checkFilterTree(states)))
}

function saveScenarioFilterTree(states: FilterStates): void {
  localStorage.setItem('sde-check-comparison-scenario-filters', JSON.stringify(scenarioFilterTree(states)))
}

async function createAppViewModel(options?: {
  comparisonsEnabled?: boolean
  modelsDiffer?: boolean
  delayInGetDatasets?: number
  groupScenarios?: boolean
}): Promise<AppViewModel> {
  const modelSpec = mockModelSpec()
  const bundleL = mockNamedBundle(
    'left',
    createBundleModel(modelSpec, {
      delayInGetDatasets: options?.delayInGetDatasets
    })
  )
  const bundleR = mockNamedBundle(
    'right',
    createBundleModel(modelSpec, {
      delta: options?.modelsDiffer === true ? 5 : 0,
      delayInGetDatasets: options?.delayInGetDatasets
    })
  )
  const configOptions = mockConfigOptions(bundleL, bundleR, options)
  const appModel = await initAppModel(configOptions)
  return new AppViewModel(appModel)
}

const { Story } = defineMeta({
  title: 'Components/AppShell',
  beforeEach: () => {
    localStorage.setItem('sde-check-test-filters', JSON.stringify({}))
    localStorage.setItem('sde-check-comparison-scenario-filters', JSON.stringify({}))
  },
  component: AppShell
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={1200} height={600}>
    <AppShell {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel()
  }}
/>

<Story
  name="Open Check Scenario in Trace View"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel()
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the tabs to appear
    await waitFor(() => {
      const checksTab = canvas.getByText('Checks')
      expect(checksTab).not.toBeNull()
    })

    // Click the "Checks" tab
    const checksTab = canvas.getByText('Checks')
    await userEvent.click(checksTab)

    // Click the first test row
    const firstTestRow = canvas.getByText('should be positive')
    await userEvent.click(firstTestRow)

    // Right click the first scenario row
    const firstScenarioRow = canvas.getByText('Constant 1')
    await userEvent.pointer({ keys: '[MouseRight]', target: firstScenarioRow })

    // Click the "Open Scenario in Trace View" button in the context menu
    const openScenarioItem = canvas.getByRole('menuitem', { name: 'Open Scenario in Trace View' })
    await userEvent.click(openScenarioItem)

    // Verify that the trace view is shown
    const traceView = canvasElement.querySelector('.trace-container')
    await expect(traceView).not.toBeNull()

    // Verify that the first source option is "left"
    const source1Select = canvas.getByLabelText('Source 1')
    await expect(source1Select).toHaveTextContent('left')

    // Verify that the first scenario option is "All inputs at default"
    const scenario1Select = canvas.getByLabelText('Scenario 1')
    await expect(scenario1Select).toHaveTextContent('All inputs at default')

    // Verify that the second source option is "right"
    const source2Select = canvas.getByLabelText('Source 2')
    await expect(source2Select).toHaveTextContent('right')

    // Verify that the second scenario option is "Selected scenario from check test"
    const scenario2Select = canvas.getByLabelText('Scenario 2')
    await expect(scenario2Select).toHaveTextContent('Selected scenario from check test')
  }}
/>

<Story
  name="Open Comparison Scenario in Trace View"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel({ modelsDiffer: true })
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Helper function that verifies the contents of the trace view (should be the
    // same contents regardless of whether we open the scenario from a summary row
    // or from a detail box)
    async function verifyTraceView() {
      // Verify that the trace view is shown
      const traceView = canvasElement.querySelector('.trace-container')
      await expect(traceView).not.toBeNull()

      // Verify that the first source option is "left"
      const source1Select = canvas.getByLabelText('Source 1')
      await expect(source1Select).toHaveTextContent('left')

      // Verify that the first scenario option is "All inputs at default"
      const scenario1Select = canvas.getByLabelText('Scenario 1')
      await expect(scenario1Select).toHaveTextContent('All inputs at default')

      // Verify that the second source option is "right"
      const source2Select = canvas.getByLabelText('Source 2')
      await expect(source2Select).toHaveTextContent('right')

      // Verify that the second scenario option is "Selected scenario from comparison"
      const scenario2Select = canvas.getByLabelText('Scenario 2')
      await expect(scenario2Select).toHaveTextContent('Selected scenario from comparison')
    }

    // Wait for the tabs to appear
    await waitFor(() => {
      const checksTab = canvas.getByText('Comparisons by scenario')
      expect(checksTab).not.toBeNull()
    })

    // Click the "Comparisons by scenario" tab
    const comparisonsByScenarioTab = canvas.getByText('Comparisons by scenario')
    await userEvent.click(comparisonsByScenarioTab)

    // Right click the "Constant 1 at max" summary row
    const scenarioTitle = canvas.getAllByText('Constant 1')[0]
    await userEvent.pointer({ keys: '[MouseRight]', target: scenarioTitle })

    // Click the "Open Scenario in Trace View" button in the context menu
    const openScenarioItem1 = canvas.getByRole('menuitem', { name: 'Open Scenario in Trace View' })
    await userEvent.click(openScenarioItem1)

    // Verify the contents of the trace view
    await verifyTraceView()

    // Type "h" to return to the main screen
    await userEvent.keyboard('h')

    // Click the "Comparisons by dataset" tab
    const comparisonsByDatasetTab = canvas.getByText('Comparisons by dataset')
    await userEvent.click(comparisonsByDatasetTab)

    // Click the "No differences detected" header
    const noDifferencesDetectedHeader = canvas.getByText('No differences detected for the following datasets')
    await userEvent.click(noDifferencesDetectedHeader)

    // Click the first dataset row
    const firstDatasetRow = canvas.getByText('Output 1')
    await userEvent.click(firstDatasetRow)

    // Right click the title of the "Constant 1 at max" detail box
    const detailBoxTitle = canvas.getByText('…at max')
    await userEvent.pointer({ keys: '[MouseRight]', target: detailBoxTitle })

    // Click the "Open Scenario in Trace View" button in the context menu
    const openScenarioItem2 = canvas.getByRole('menuitem', { name: 'Open Scenario in Trace View' })
    await userEvent.click(openScenarioItem2)

    // Verify the contents of the trace view
    await verifyTraceView()
  }}
/>

<Story
  name="Update Filters (after checks complete)"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel()
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the tabs to appear
    await waitFor(() => {
      const checksTab = canvas.getByText('Checks')
      expect(checksTab).not.toBeNull()
    })

    // Click the filter button to open the filter popover
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Find and uncheck a test in the checks panel
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).not.toBeNull()
    const firstCheckbox = checksPanel?.querySelector('input[type="checkbox"]')
    await expect(firstCheckbox).not.toBeNull()
    await userEvent.click(firstCheckbox)

    // Verify that the filter states are saved to LocalStorage
    const filterTreeJson = localStorage.getItem('sde-check-test-filters')
    const filterTree = filterTreeJson ? JSON.parse(filterTreeJson) : {}
    await expect(filterTree).toEqual(
      checkFilterTree({
        'Output 1__should be positive': false
      })
    )
  }}
/>

<Story
  name="Update Filters (while checks running)"
  {template}
  beforeEach={async ({ args }) => {
    // Set up some initial filter states
    saveCheckFilterTree({
      'Output 1__should be positive': true
    })
    saveScenarioFilterTree({
      'All inputs__at default': true,
      'Constant 1__at min': true,
      'Constant 1__at max': true
    })
    args.appViewModel = await createAppViewModel({
      // Add a delay to simulate long-running checks so that we can verify that the filter
      // popover is available and shows the correct state while checks are running
      delayInGetDatasets: 100
    })
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the progress indicator to appear
    await waitFor(() => {
      const progressContainer = canvasElement.querySelector('.progress-container')
      expect(progressContainer).not.toBeNull()
    })

    // Click the filter button to open the filter popover while checks are running
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify initial checkbox states in Checks panel (should load from LocalStorage)
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).not.toBeNull()
    const checkLabels = checksPanel.querySelectorAll('.filter-label')
    const checkCheckboxes = checksPanel.querySelectorAll('.filter-checkbox')
    await expect(checkLabels.length).toBe(3)
    await expect(checkCheckboxes.length).toBe(3)
    await expect(checkLabels[0]).toHaveTextContent('All checks')
    await expect(checkCheckboxes[0]).toBeChecked()
    await expect(checkLabels[1]).toHaveTextContent('Output 1')
    await expect(checkCheckboxes[1]).toBeChecked()
    await expect(checkLabels[2]).toHaveTextContent('should be positive')
    await expect(checkCheckboxes[2]).toBeChecked()

    // Verify initial checkbox states in Comparison Scenarios panel
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-panel')
    await expect(comparisonScenariosPanel).not.toBeNull()
    const comparisonScenarioLabels = comparisonScenariosPanel.querySelectorAll('.filter-label')
    const comparisonScenarioCheckboxes = comparisonScenariosPanel.querySelectorAll('.filter-checkbox')
    await expect(comparisonScenarioLabels.length).toBe(4)
    await expect(comparisonScenarioCheckboxes.length).toBe(4)
    await expect(comparisonScenarioLabels[0]).toHaveTextContent('All scenarios')
    await expect(comparisonScenarioCheckboxes[0]).toBeChecked()
    await expect(comparisonScenarioLabels[1]).toHaveTextContent('All inputs at default')
    await expect(comparisonScenarioCheckboxes[1]).toBeChecked()
    await expect(comparisonScenarioLabels[2]).toHaveTextContent('Constant 1 at min')
    await expect(comparisonScenarioCheckboxes[2]).toBeChecked()
    await expect(comparisonScenarioLabels[3]).toHaveTextContent('Constant 1 at max')
    await expect(comparisonScenarioCheckboxes[3]).toBeChecked()

    // Modify a filter while checks are running
    await userEvent.click(canvas.getByRole('button', { name: 'Checks' }))
    const firstCheckbox = checksPanel.querySelector('input[type="checkbox"]')
    await expect(firstCheckbox).not.toBeNull()
    await userEvent.click(firstCheckbox)

    // Verify that the filter states are saved to LocalStorage
    const filterTreeJson = localStorage.getItem('sde-check-test-filters')
    const filterTree = filterTreeJson ? JSON.parse(filterTreeJson) : {}
    await expect(filterTree).toEqual(
      checkFilterTree({
        'Output 1__should be positive': true
      })
    )

    // Close the filter popover
    await userEvent.click(filterButton)

    // Wait for checks to complete
    await waitFor(
      () => {
        const progressContainer = canvasElement.querySelector('.progress-container')
        expect(progressContainer).toBeNull()
      },
      { timeout: 1000 }
    )

    // Verify that the filter popover still works after checks complete
    await userEvent.click(filterButton)
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify that the modified state is preserved
    const checksPanelAfter = canvasElement.querySelector('.filter-panel')
    await expect(checksPanelAfter).not.toBeNull()
    // TODO: Currently the filter states will be based on whether the check/scenario
    // was skipped or not, so if we disabled a check while the checks were running,
    // but didn't click "Apply and Run", it will show up as enabled in the filter
    // popover when the checks complete.  We should fix this by using the filter
    // state from LocalStorage instead of the skipped state.
    // const checkCheckboxesAfter = checksPanelAfter.querySelectorAll('.filter-checkbox')
    // await expect(checkCheckboxesAfter[0]).toBeChecked()
  }}
/>

<Story
  name="Reload with Filters (no comparisons configured)"
  {template}
  beforeEach={async ({ args }) => {
    saveCheckFilterTree({
      'Output 1__should be positive': false
    })
    args.appViewModel = await createAppViewModel({ comparisonsEnabled: false })
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

    // Click the filter button to open the filter popover
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify initial checkbox states in Checks panel
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).not.toBeNull()
    const checkLabels = checksPanel.querySelectorAll('.filter-label')
    const checkCheckboxes = checksPanel.querySelectorAll('.filter-checkbox')
    await expect(checkLabels.length).toBe(3)
    await expect(checkCheckboxes.length).toBe(3)
    await expect(checkLabels[0]).toHaveTextContent('All checks')
    await expect(checkCheckboxes[0]).not.toBeChecked()
    await expect(checkLabels[1]).toHaveTextContent('Output 1')
    await expect(checkCheckboxes[1]).not.toBeChecked()
    await expect(checkLabels[2]).toHaveTextContent('should be positive')
    await expect(checkCheckboxes[2]).not.toBeChecked()

    // Verify that the Comparison Scenarios panel is empty
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-popover-content')
    await expect(comparisonScenariosPanel).not.toBeNull()
    const comparisonScenarioLabels = comparisonScenariosPanel.querySelectorAll('.filter-label')
    const comparisonScenarioCheckboxes = comparisonScenariosPanel.querySelectorAll('.filter-checkbox')
    await expect(comparisonScenarioLabels.length).toBe(0)
    await expect(comparisonScenarioCheckboxes.length).toBe(0)
    await expect(comparisonScenariosPanel).toHaveTextContent('No comparisons configured')
  }}
/>

<Story
  name="Reload with Filters (no scenario groups, all scenarios skipped)"
  {template}
  beforeEach={async ({ args }) => {
    saveCheckFilterTree({
      'Output 1__should be positive': false
    })
    saveScenarioFilterTree({
      'All inputs__at default': false,
      'Constant 1__at min': false,
      'Constant 1__at max': false
    })
    args.appViewModel = await createAppViewModel()
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

    // Click the filter button to open the filter popover
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify initial checkbox states in Checks panel
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).not.toBeNull()
    const checkLabels = checksPanel.querySelectorAll('.filter-label')
    const checkCheckboxes = checksPanel.querySelectorAll('.filter-checkbox')
    await expect(checkLabels.length).toBe(3)
    await expect(checkCheckboxes.length).toBe(3)
    await expect(checkLabels[0]).toHaveTextContent('All checks')
    await expect(checkCheckboxes[0]).not.toBeChecked()
    await expect(checkLabels[1]).toHaveTextContent('Output 1')
    await expect(checkCheckboxes[1]).not.toBeChecked()
    await expect(checkLabels[2]).toHaveTextContent('should be positive')
    await expect(checkCheckboxes[2]).not.toBeChecked()

    // Verify initial checkbox states in Comparison Scenarios panel
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-panel')
    await expect(comparisonScenariosPanel).not.toBeNull()
    const comparisonScenarioLabels = comparisonScenariosPanel.querySelectorAll('.filter-label')
    const comparisonScenarioCheckboxes = comparisonScenariosPanel.querySelectorAll('.filter-checkbox')
    await expect(comparisonScenarioLabels.length).toBe(4)
    await expect(comparisonScenarioCheckboxes.length).toBe(4)
    await expect(comparisonScenarioLabels[0]).toHaveTextContent('All scenarios')
    await expect(comparisonScenarioCheckboxes[0]).not.toBeChecked()
    await expect(comparisonScenarioLabels[1]).toHaveTextContent('All inputs at default')
    await expect(comparisonScenarioCheckboxes[1]).not.toBeChecked()
    await expect(comparisonScenarioLabels[2]).toHaveTextContent('Constant 1 at min')
    await expect(comparisonScenarioCheckboxes[2]).not.toBeChecked()
    await expect(comparisonScenarioLabels[3]).toHaveTextContent('Constant 1 at max')
    await expect(comparisonScenarioCheckboxes[3]).not.toBeChecked()

    // Click the filter button to hide the filter popover
    await userEvent.click(filterButton)

    // Verify that the Checks tab shows skipped count
    const tabTitles = canvasElement.querySelectorAll('.tab-title')
    const tabSubtitles = canvasElement.querySelectorAll('.tab-subtitle')
    await expect(tabTitles.length).toBe(3)
    await expect(tabSubtitles.length).toBe(3)
    const checksTabTitle = tabTitles[0]
    const checksTabSubtitle = tabSubtitles[0]
    await expect(checksTabTitle.textContent).toBe('Checks')
    await expect(checksTabSubtitle.textContent).toBe('1 skipped')

    // Verify that the Checks summary shows skipped count
    const checksSummaryLabel = canvasElement.querySelector('.summary-label')
    await expect(checksSummaryLabel).not.toBeNull()
    await expect(checksSummaryLabel.textContent.replace(/\s+/g, ' ')).toBe('1 total | 1 skipped')

    // Click the "Comparisons by scenario" tab
    const comparisonsByScenarioTab = canvas.getByText('Comparisons by scenario')
    await userEvent.click(comparisonsByScenarioTab)

    // Verify that the "Comparisons by scenario" tab shows skipped count
    const comparisonsByScenarioTabTitle = tabTitles[1]
    const comparisonsByScenarioTabSubtitle = tabSubtitles[1]
    await expect(comparisonsByScenarioTabTitle.textContent).toBe('Comparisons by scenario')
    await expect(comparisonsByScenarioTabSubtitle.textContent).toBe('no diffs, but 3 skipped scenarios')

    // Click the "No differences produced by the following scenarios" link
    const noDifferencesLink = canvas.getByText('No differences produced by the following scenarios')
    await userEvent.click(noDifferencesLink)
  }}
/>

<Story
  name="Reload with Filters (no scenario groups, some scenarios skipped)"
  {template}
  beforeEach={async ({ args }) => {
    saveCheckFilterTree({
      'Output 1__should be positive': false
    })
    saveScenarioFilterTree({
      'All inputs__at default': true,
      'Constant 1__at min': false,
      'Constant 1__at max': false
    })
    args.appViewModel = await createAppViewModel()
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

    // Click the filter button to open the filter popover
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify initial checkbox states in Comparison Scenarios panel
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-panel')
    await expect(comparisonScenariosPanel).not.toBeNull()
    const comparisonScenarioLabels = comparisonScenariosPanel.querySelectorAll('.filter-label')
    const comparisonScenarioCheckboxes = comparisonScenariosPanel.querySelectorAll('.filter-checkbox')
    await expect(comparisonScenarioLabels.length).toBe(4)
    await expect(comparisonScenarioCheckboxes.length).toBe(4)
    await expect(comparisonScenarioLabels[0]).toHaveTextContent('All scenarios')
    await expect(comparisonScenarioCheckboxes[0]).toBePartiallyChecked()
    // TODO: Figure out why these are out of order
    // await expect(comparisonScenarioLabels[1]).toHaveTextContent('All inputs at default')
    // await expect(comparisonScenarioCheckboxes[1]).toBeChecked()
    // await expect(comparisonScenarioLabels[2]).toHaveTextContent('Constant 1 at min')
    // await expect(comparisonScenarioCheckboxes[2]).not.toBeChecked()
    // await expect(comparisonScenarioLabels[3]).toHaveTextContent('Constant 1 at max')
    // await expect(comparisonScenarioCheckboxes[3]).not.toBeChecked()

    // Click the filter button to hide the filter popover
    await userEvent.click(filterButton)

    // Verify that the Checks tab shows skipped count
    const tabTitles = canvasElement.querySelectorAll('.tab-title')
    const tabSubtitles = canvasElement.querySelectorAll('.tab-subtitle')
    await expect(tabTitles.length).toBe(3)
    await expect(tabSubtitles.length).toBe(3)
    const checksTabTitle = tabTitles[0]
    const checksTabSubtitle = tabSubtitles[0]
    await expect(checksTabTitle.textContent).toBe('Checks')
    await expect(checksTabSubtitle.textContent).toBe('1 skipped')

    // Verify that the Checks summary shows skipped count
    const checksSummaryLabel = canvasElement.querySelector('.summary-label')
    await expect(checksSummaryLabel).not.toBeNull()
    await expect(checksSummaryLabel.textContent.replace(/\s+/g, ' ')).toBe('1 total | 1 skipped')

    // Click the "Comparisons by scenario" tab
    const comparisonsByScenarioTab = canvas.getByText('Comparisons by scenario')
    await userEvent.click(comparisonsByScenarioTab)

    // Verify that the "Comparisons by scenario" tab shows skipped count
    const comparisonsByScenarioTabTitle = tabTitles[1]
    const comparisonsByScenarioTabSubtitle = tabSubtitles[1]
    await expect(comparisonsByScenarioTabTitle.textContent).toBe('Comparisons by scenario')
    await expect(comparisonsByScenarioTabSubtitle.textContent).toBe('no diffs, but 2 skipped scenarios')

    // Click the "No differences produced by the following scenarios" link
    const noDifferencesLink = canvas.getByText('No differences produced by the following scenarios')
    await userEvent.click(noDifferencesLink)

    // TODO: Verify the bar colors

    // Click the "Comparisons by dataset" tab
    const comparisonsByDatasetTab = canvas.getByText('Comparisons by dataset')
    await userEvent.click(comparisonsByDatasetTab)

    // Verify that the "Comparisons by dataset" tab shows "skipped" message
    const comparisonsByDatasetTabTitle = tabTitles[2]
    const comparisonsByDatasetTabSubtitle = tabSubtitles[2]
    await expect(comparisonsByDatasetTabTitle.textContent).toBe('Comparisons by dataset')
    await expect(comparisonsByDatasetTabSubtitle.textContent).toBe('no diffs, but 2 skipped scenarios')

    // TODO: Verify the bar colors
  }}
/>

<Story
  name="Reload with Filters (with scenario groups)"
  {template}
  beforeEach={async ({ args }) => {
    saveCheckFilterTree({
      'Output 1__should be positive': false
    })
    saveScenarioFilterTree({
      'All inputs__at default': false,
      'Constant 1__at min': false,
      'Constant 1__at max': false
    })
    args.appViewModel = await createAppViewModel({ groupScenarios: true })
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

    // Click the filter button to open the filter popover
    const filterButton = canvas.getByRole('button', { name: 'Filters' })
    await userEvent.click(filterButton)

    // Wait for the filter popover to appear
    await waitFor(() => {
      const filterPopover = canvasElement.querySelector('.filter-popover')
      expect(filterPopover).not.toBeNull()
    })

    // Verify initial checkbox states in Comparison Scenarios panel
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-panel')
    await expect(comparisonScenariosPanel).not.toBeNull()
    const comparisonScenarioLabels = comparisonScenariosPanel.querySelectorAll('.filter-label')
    const comparisonScenarioCheckboxes = comparisonScenariosPanel.querySelectorAll('.filter-checkbox')
    await expect(comparisonScenarioLabels.length).toBe(6)
    await expect(comparisonScenarioCheckboxes.length).toBe(6)
    await expect(comparisonScenarioLabels[0]).toHaveTextContent('All scenarios')
    await expect(comparisonScenarioCheckboxes[0]).not.toBeChecked()
    await expect(comparisonScenarioLabels[1]).toHaveTextContent('Key scenarios')
    await expect(comparisonScenarioCheckboxes[1]).not.toBeChecked()
    await expect(comparisonScenarioLabels[2]).toHaveTextContent('All inputs at default')
    await expect(comparisonScenarioCheckboxes[2]).not.toBeChecked()
    await expect(comparisonScenarioLabels[3]).toHaveTextContent('Other scenarios')
    await expect(comparisonScenarioCheckboxes[3]).not.toBeChecked()
    await expect(comparisonScenarioLabels[4]).toHaveTextContent('Constant 1 at min')
    await expect(comparisonScenarioCheckboxes[4]).not.toBeChecked()
    await expect(comparisonScenarioLabels[5]).toHaveTextContent('Constant 1 at max')
    await expect(comparisonScenarioCheckboxes[5]).not.toBeChecked()
  }}
/>
