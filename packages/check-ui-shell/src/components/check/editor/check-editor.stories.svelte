<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'

import type { InputVar, OutputVar, ModelSpec, Dataset } from '@sdeverywhere/check-core'
import { createCheckDataCoordinatorForTests } from '@sdeverywhere/check-core'

import { mockBundleModel } from '../../../_mocks/mock-bundle'
import { mockDataset } from '../../../_mocks/mock-data'
import { inputVar, outputVar } from '../../../_mocks/mock-vars'
import StoryDecorator from '../../_storybook/story-decorator.svelte'

import CheckEditor from './check-editor.svelte'
import { CheckEditorViewModel } from './check-editor-vm.svelte'

const { Story } = defineMeta({
  title: 'Components/CheckEditor',
  component: CheckEditor
})

// Mock data for tests
const mockInputVars: InputVar[] = [
  {
    inputId: '1',
    varId: '_input_a',
    varName: 'Input A',
    defaultValue: 50,
    minValue: 0,
    maxValue: 100
  },
  {
    inputId: '2',
    varId: '_input_b',
    varName: 'Input B',
    defaultValue: 25,
    minValue: 0,
    maxValue: 50
  },
  {
    inputId: '3',
    varId: '_input_c',
    varName: 'Input C',
    defaultValue: 10,
    minValue: 0,
    maxValue: 20
  }
]

const mockOutputVars: OutputVar[] = [
  {
    datasetKey: 'output_x',
    varId: '_output_x',
    varName: 'Output X'
  },
  {
    datasetKey: 'output_y',
    varId: '_output_y',
    varName: 'Output Y'
  },
  {
    datasetKey: 'output_z',
    varId: '_output_z',
    varName: 'Output Z'
  }
]

function createMockViewModel(): CheckEditorViewModel {
  // Create a model spec with the input and output variables
  const outputVarNames = mockOutputVars.map(v => v.varName)
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(mockInputVars.map((v, i) => inputVar(`${i}`, v.varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }

  // Create a bundle model with mock datasets
  const bundleModel = mockBundleModel(modelSpec, (_scenarioSpec, datasetKeys) => {
    const datasetMap = new Map()
    for (const datasetKey of datasetKeys) {
      const ds: Dataset = mockDataset()
      datasetMap.set(datasetKey, ds)
    }
    return datasetMap
  })

  // Create the data coordinator
  const dataCoordinator = createCheckDataCoordinatorForTests(bundleModel)

  return new CheckEditorViewModel(mockInputVars, mockOutputVars, dataCoordinator)
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={1200} height={800}>
    <CheckEditor open={args.open} viewModel={args.viewModel} />
  </StoryDecorator>
{/snippet}

<Story
  name="Open with Defaults"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify dialog is visible
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Verify title
    const title = canvas.getByText('Configure Check Test')
    await expect(title).toBeInTheDocument()

    // Verify scenario selector section exists
    const scenariosTitle = canvas.getByText(/scenarios/i)
    await expect(scenariosTitle).toBeInTheDocument()

    // Verify dataset selector section exists with first output selected
    const datasetsTitle = canvas.getByText(/datasets/i)
    await expect(datasetsTitle).toBeInTheDocument()

    await waitFor(() => {
      const datasetText = canvas.getByText(/Output X/i)
      expect(datasetText).toBeInTheDocument()
    })

    // Verify predicate selector section exists
    const predicatesTitle = canvas.getByText(/predicates/i)
    await expect(predicatesTitle).toBeInTheDocument()

    // Verify add buttons exist
    const addScenarioButton = canvas.getByRole('button', { name: /add scenario/i })
    await expect(addScenarioButton).toBeInTheDocument()

    const addDatasetButton = canvas.getByRole('button', { name: /add dataset/i })
    await expect(addDatasetButton).toBeInTheDocument()

    const addPredicateButton = canvas.getByRole('button', { name: /add predicate/i })
    await expect(addPredicateButton).toBeInTheDocument()

    // Verify tabbed preview exists
    const previewTab = canvas.getByRole('button', { name: /preview tab/i })
    await expect(previewTab).toBeInTheDocument()

    const codeTab = canvas.getByRole('button', { name: /code tab/i })
    await expect(codeTab).toBeInTheDocument()
  }}
></Story>

<Story
  name="Closed"
  {template}
  args={{
    open: false,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify dialog is not visible
    const dialog = canvas.queryByRole('dialog')
    await expect(dialog).not.toBeInTheDocument()
  }}
></Story>

<Story
  name="Change Dataset"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Find the dataset selector button
    const datasetItem = canvasElement.querySelector('.dataset-selector-item')
    await expect(datasetItem).toBeInTheDocument()

    // Verify initial selection is Output X by checking button text
    const selectorButton = datasetItem?.querySelector('.typeahead-selector-button') as HTMLButtonElement
    await expect(selectorButton).toBeInTheDocument()
    await expect(selectorButton).toHaveTextContent('Output X')

    // Click button to open popup
    await userEvent.click(selectorButton)

    // Wait for popup to appear
    await waitFor(() => {
      const popup = canvasElement.querySelector('.typeahead-selector-popup')
      expect(popup).toBeInTheDocument()
    })

    // Click on "Output Y" item
    const items = canvasElement.querySelectorAll('.typeahead-selector-item')
    const outputYItem = Array.from(items).find(item => item.textContent?.includes('Output Y'))
    await expect(outputYItem).toBeInTheDocument()

    if (outputYItem) {
      await userEvent.click(outputYItem as HTMLElement)
    }

    // Verify the selection changed
    await waitFor(() => {
      expect(selectorButton).toHaveTextContent('Output Y')
    })
  }}
></Story>

<Story
  name="Change Predicate Type"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Find the predicate type selector - it's within the predicate-selector-item
    const predicateTypeSelect = canvasElement.querySelector(
      '.predicate-selector-item select[aria-label="Predicate type"]'
    ) as HTMLSelectElement
    await expect(predicateTypeSelect).toBeInTheDocument()

    // Verify initial value is 'gt'
    await expect(predicateTypeSelect.value).toBe('gt')

    // Change to 'lt' (less than)
    await userEvent.selectOptions(predicateTypeSelect, 'lt')

    // Verify the selection changed
    await waitFor(() => {
      expect(predicateTypeSelect.value).toBe('lt')
    })
  }}
></Story>

<Story
  name="Change Predicate Value"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Find the predicate value input (has id starting with "pred-value-")
    const predicateValueInput = canvasElement.querySelector(
      'input[id^="pred-value-"]'
    ) as HTMLInputElement
    await expect(predicateValueInput).toBeInTheDocument()

    // Verify initial value is 0
    await expect(predicateValueInput.value).toBe('0')

    // Change the value
    await userEvent.clear(predicateValueInput)
    await userEvent.type(predicateValueInput, '10')

    // Verify the value changed
    await waitFor(() => {
      expect(predicateValueInput.value).toBe('10')
    })
  }}
></Story>

<Story
  name="Switch to Code Tab"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Verify Preview tab is active by default
    const previewTab = canvas.getByRole('button', { name: /preview tab/i })
    await expect(previewTab).toHaveClass('active')

    // Click the Code tab
    const codeTab = canvas.getByRole('button', { name: /code tab/i })
    await userEvent.click(codeTab)

    // Verify Code tab is now active
    await waitFor(() => {
      expect(codeTab).toHaveClass('active')
    })

    // Verify YAML code is displayed
    await waitFor(() => {
      const codeElement = canvasElement.querySelector('.tabbed-preview-code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement).toHaveTextContent('describe: Check Test')
    })
  }}
></Story>

<Story
  name="Copy Code to Clipboard"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Click the Code tab
    const codeTab = canvas.getByRole('button', { name: /code tab/i })
    await userEvent.click(codeTab)

    // Wait for code to be visible
    await waitFor(() => {
      const codeElement = canvasElement.querySelector('.tabbed-preview-code')
      expect(codeElement).toBeInTheDocument()
    })

    // Click the Copy button
    const copyButton = canvas.getByRole('button', { name: /copy to clipboard/i })
    await userEvent.click(copyButton)

    // Note: We can't actually verify clipboard contents in tests,
    // but we can verify the button was clicked without errors
    await expect(copyButton).toBeInTheDocument()
  }}
></Story>

<Story
  name="Close with Escape Key"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify dialog is open
    const dialog = canvas.getByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Press Escape key
    fireEvent.keyDown(dialog, { key: 'Escape' })

    // Verify dialog closes
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    })
  }}
></Story>

<Story
  name="Change Scenario Type"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Click the "+" button to open scenario context menu
    const addScenarioButton = canvas.getByRole('button', { name: /add scenario/i })
    await userEvent.click(addScenarioButton)

    // Wait for context menu
    await waitFor(() => {
      const contextMenu = canvasElement.querySelector('.scenario-selector-context-menu')
      expect(contextMenu).toBeInTheDocument()
    })

    // Click "Given inputs at..." to add a given-inputs scenario
    const givenInputsOption = Array.from(canvasElement.querySelectorAll('.scenario-selector-context-item')).find(
      item => item.textContent?.includes('Given inputs')
    )
    await expect(givenInputsOption).toBeInTheDocument()

    if (givenInputsOption) {
      await userEvent.click(givenInputsOption as HTMLElement)
    }

    // Verify we now have 2 scenarios
    await waitFor(() => {
      const scenarios = canvasElement.querySelectorAll('.scenario-selector-item')
      expect(scenarios.length).toBe(2)
    })

    // Verify the second scenario shows "Given inputs:" text
    const scenarios = canvasElement.querySelectorAll('.scenario-selector-item')
    const secondScenario = scenarios[1]
    await expect(secondScenario).toHaveTextContent('Given inputs:')
  }}
></Story>

<Story
  name="Add and Remove Items"
  {template}
  args={{
    open: true,
    viewModel: createMockViewModel()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Initially should have 1 of each item
    const initialScenarios = canvasElement.querySelectorAll('.scenario-selector-item')
    await expect(initialScenarios.length).toBe(1)

    const initialDatasets = canvasElement.querySelectorAll('.dataset-selector-item')
    await expect(initialDatasets.length).toBe(1)

    const initialPredicates = canvasElement.querySelectorAll('.predicate-selector-item')
    await expect(initialPredicates.length).toBe(1)

    // Add a scenario by clicking the "+" button and selecting from context menu
    const addScenarioButton = canvas.getByRole('button', { name: /add scenario/i })
    await userEvent.click(addScenarioButton)

    // Wait for context menu to appear
    await waitFor(() => {
      const contextMenu = canvasElement.querySelector('.scenario-selector-context-menu')
      expect(contextMenu).toBeInTheDocument()
    })

    // Click the "All inputs at..." option
    const allInputsOption = canvasElement.querySelector(
      '.scenario-selector-context-item'
    ) as HTMLButtonElement
    await userEvent.click(allInputsOption)

    await waitFor(() => {
      const scenarios = canvasElement.querySelectorAll('.scenario-selector-item')
      expect(scenarios.length).toBe(2)
    })

    // Add a dataset
    const addDatasetButton = canvas.getByRole('button', { name: /add dataset/i })
    await userEvent.click(addDatasetButton)

    await waitFor(() => {
      const datasets = canvasElement.querySelectorAll('.dataset-selector-item')
      expect(datasets.length).toBe(2)
    })

    // Remove buttons should now be visible (not when only 1 item)
    const removeButtons = canvasElement.querySelectorAll('.scenario-selector-remove-btn')
    await expect(removeButtons.length).toBeGreaterThan(0)
  }}
></Story>
