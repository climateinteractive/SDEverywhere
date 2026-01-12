<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, userEvent, waitFor, within } from 'storybook/test'

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

    // Verify graph preview area exists
    const graphContainer = canvasElement.querySelector('.preview-graph-container')
    await expect(graphContainer).toBeInTheDocument()

    // Verify action buttons
    const saveButton = canvas.getByRole('button', { name: /save/i })
    await expect(saveButton).toBeInTheDocument()

    const cancelButton = canvas.getByRole('button', { name: /cancel/i })
    await expect(cancelButton).toBeInTheDocument()
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

    // Find the dataset select dropdown (should have id="output-var-dataset-1")
    const datasetSelect = canvasElement.querySelector('select[id^="output-var-"]') as HTMLSelectElement
    await expect(datasetSelect).toBeInTheDocument()

    // Verify initial selection is Output X
    await expect(datasetSelect.value).toBe('output_x')

    // Change to Output Y
    await userEvent.selectOptions(datasetSelect, 'output_y')

    // Verify the selection changed
    await waitFor(() => {
      expect(datasetSelect.value).toBe('output_y')
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
  name="Save Button"
  {template}
  args={{
    open: true,
    viewModel: (() => {
      const vm = createMockViewModel()
      vm.onSave = () => {
        // Save callback for testing
      }
      return vm
    })()
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByRole('dialog')).toBeInTheDocument()
    })

    // Click the save button
    const saveButton = canvas.getByRole('button', { name: /save/i })
    await userEvent.click(saveButton)

    // Verify dialog closes
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    })
  }}
></Story>

<Story
  name="Cancel Button"
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

    // Click the cancel button
    const cancelButton = canvas.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    // Verify dialog closes
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    })
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

    await waitFor(() => {
      const d = canvas.getByRole('dialog')
      expect(d).toBeInTheDocument()
    })

    // Press Escape key
    await userEvent.keyboard('{Escape}')

    // Verify dialog closes
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
    })
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

    // Add a scenario
    const addScenarioButton = canvas.getByRole('button', { name: /add scenario/i })
    await userEvent.click(addScenarioButton)

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
