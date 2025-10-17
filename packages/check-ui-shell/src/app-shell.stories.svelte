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

async function createAppViewModel(options?: {
  comparisonsEnabled?: boolean
  groupScenarios?: boolean
}): Promise<AppViewModel> {
  const modelSpec = mockModelSpec()
  const bundleL = mockNamedBundle('left', createBundleModel(modelSpec, 0))
  const bundleR = mockNamedBundle('right', createBundleModel(modelSpec, 0))
  const configOptions = mockConfigOptions(bundleL, bundleR, options)
  const appModel = await initAppModel(configOptions)
  return new AppViewModel(appModel)
}

const { Story } = defineMeta({
  title: 'Components/AppShell',
  beforeEach: () => {
    localStorage.setItem('sde-check-filter-states', JSON.stringify({}))
    localStorage.setItem('sde-comparison-scenario-filter-states', JSON.stringify({}))
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
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

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
    await expect(traceView).toBeDefined()

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
  name="Update Filters"
  {template}
  beforeEach={async ({ args }) => {
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
      expect(filterPopover).toBeDefined()
    })

    // Find and uncheck a test in the checks panel
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).toBeDefined()
    const firstCheckbox = checksPanel?.querySelector('input[type="checkbox"]')
    await expect(firstCheckbox).toBeDefined()
    await userEvent.click(firstCheckbox)

    // Verify that the filter states
    const filterStatesJson = localStorage.getItem('sde-check-filter-states')
    const filterStates = filterStatesJson ? JSON.parse(filterStatesJson) : {}
    await expect(filterStates).toEqual({
      'Output 1__should be positive': {
        titleParts: { groupName: 'Output 1', testName: 'should be positive' },
        checked: false
      }
    })
  }}
/>

<Story
  name="Reload with Filters (no comparisons configured)"
  {template}
  beforeEach={async ({ args }) => {
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
      expect(filterPopover).toBeDefined()
    })

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
  name="Reload with Filters (no scenario groups)"
  {template}
  beforeEach={async ({ args }) => {
    localStorage.setItem(
      'sde-check-filter-states',
      JSON.stringify({
        'Output 1__should be positive': {
          titleParts: { groupName: 'Output 1', testName: 'should be positive' },
          checked: false
        }
      })
    )
    localStorage.setItem(
      'sde-comparison-scenario-filter-states',
      JSON.stringify({
        'All inputs__at default': {
          titleParts: { title: 'All inputs', subtitle: 'at default' },
          checked: false
        },
        'Constant 1__at min': {
          titleParts: { title: 'Constant 1', subtitle: 'at min' },
          checked: false
        },
        'Constant 1__at max': {
          titleParts: { title: 'Constant 1', subtitle: 'at max' },
          checked: false
        }
      })
    )
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
      expect(filterPopover).toBeDefined()
    })

    // Verify initial checkbox states in Checks panel
    const checksPanel = canvasElement.querySelector('.filter-panel')
    await expect(checksPanel).toBeDefined()
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
    await expect(comparisonScenariosPanel).toBeDefined()
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

    // Verify that the Checks tab shows skipped count
    const tabSubtitle = canvasElement.querySelector('.tab-subtitle')
    await expect(tabSubtitle).toBeDefined()
    await expect(tabSubtitle.textContent).toBe('1 skipped')

    // Verify that the Checks summary shows skipped count
    const summaryLabel = canvasElement.querySelector('.summary-label')
    await expect(summaryLabel).toBeDefined()
    await expect(summaryLabel.textContent.replace(/\s+/g, ' ')).toBe('1 total | 1 skipped')

    // TODO: Verify that the "Comparisons by scenario" tab shows skipped count
  }}
/>

<Story
  name="Reload with Filters (with scenario groups)"
  {template}
  beforeEach={async ({ args }) => {
    localStorage.setItem(
      'sde-check-filter-states',
      JSON.stringify({
        'Output 1__should be positive': {
          titleParts: { groupName: 'Output 1', testName: 'should be positive' },
          checked: false
        }
      })
    )
    localStorage.setItem(
      'sde-comparison-scenario-filter-states',
      JSON.stringify({
        'All inputs__at default': {
          titleParts: { title: 'All inputs', subtitle: 'at default' },
          checked: false
        },
        'Constant 1__at min': {
          titleParts: { title: 'Constant 1', subtitle: 'at min' },
          checked: false
        },
        'Constant 1__at max': {
          titleParts: { title: 'Constant 1', subtitle: 'at max' },
          checked: false
        }
      })
    )
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
      expect(filterPopover).toBeDefined()
    })

    // Verify initial checkbox states in Comparison Scenarios panel
    await userEvent.click(canvas.getByRole('button', { name: 'Comparison Scenarios' }))
    const comparisonScenariosPanel = canvasElement.querySelector('.filter-panel')
    await expect(comparisonScenariosPanel).toBeDefined()
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
