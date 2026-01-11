<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../../_shared/button.svelte'
import Dialog from '../../_shared/dialog.svelte'
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'
import ComparisonGraph from '../../graphs/comparison-graph.svelte'
import { SearchListViewModel } from '../../list/search-list-vm.svelte'

import type { CheckEditorViewModel, PredicateType } from './check-editor-vm.svelte'
import type { InputPosition } from '@sdeverywhere/check-core'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { open = $bindable(false), viewModel }: Props = $props()

// Create search list view model for dataset selection
const datasetSearchViewModel = new SearchListViewModel(viewModel.datasetListItems)
datasetSearchViewModel.onItemSelected = item => {
  viewModel.updateSelectedDataset(item.id)
}

// Track the current dataset query and sync with selected dataset
let datasetQuery = $state('')
$effect(() => {
  // When selectedDatasetKey changes, update the query to show the selected dataset name
  const outputVar = viewModel.outputVars.find(v => v.datasetKey === viewModel.selectedDatasetKey)
  if (outputVar) {
    datasetQuery = outputVar.varName
  }
})

// Create selector view model for predicate type
const predicateTypeOptions = [
  new SelectorOptionViewModel('Greater Than (>)', 'gt'),
  new SelectorOptionViewModel('Greater Than or Equal (≥)', 'gte'),
  new SelectorOptionViewModel('Less Than (<)', 'lt'),
  new SelectorOptionViewModel('Less Than or Equal (≤)', 'lte'),
  new SelectorOptionViewModel('Equal (=)', 'eq'),
  new SelectorOptionViewModel('Approximately (~)', 'approx')
]
const predicateTypeSelector = new SelectorViewModel(predicateTypeOptions, viewModel.predicateType)
predicateTypeSelector.onUserChange = (newValue: string) => {
  viewModel.updatePredicateType(newValue as PredicateType)
}

// Create selector view model for all-inputs position
const allInputsPositionOptions = [
  new SelectorOptionViewModel('Default', 'at-default'),
  new SelectorOptionViewModel('Minimum', 'at-minimum'),
  new SelectorOptionViewModel('Maximum', 'at-maximum')
]
const allInputsPositionSelector = new SelectorViewModel(allInputsPositionOptions, viewModel.allInputsPosition)
allInputsPositionSelector.onUserChange = (newValue: string) => {
  viewModel.updateAllInputsPosition(newValue as InputPosition)
}

// Handle save
function handleSave() {
  const config = viewModel.getConfig()
  viewModel.onSave?.(config)
  open = false
}

// Handle cancel
function handleCancel() {
  viewModel.onCancel?.()
  open = false
}

// Track whether search list should be shown
let showDatasetList = $state(false)
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Configure Check Test">
  <div class="check-editor-container">
    <div class="check-editor-form">
      <!-- Scenario Section -->
      <div class="check-editor-section">
        <h3 class="check-editor-section-title">Scenario</h3>
        <div class="check-editor-field">
          <label for="scenario-position-select" class="check-editor-label">All Inputs</label>
          <Selector viewModel={allInputsPositionSelector} ariaLabel="All inputs position" />
        </div>
      </div>

      <!-- Dataset Section -->
      <div class="check-editor-section">
        <h3 class="check-editor-section-title">Dataset</h3>
        <div class="check-editor-field">
          <label for="dataset-search" class="check-editor-label">Output Variable</label>
          <div class="check-editor-dataset-selector">
            <input
              id="dataset-search"
              type="text"
              class="check-editor-input"
              bind:value={datasetQuery}
              placeholder="Search outputs..."
              aria-label="Search output variables"
              onfocus={() => (showDatasetList = true)}
              onblur={() => setTimeout(() => (showDatasetList = false), 200)}
              oninput={e => (datasetSearchViewModel.query = (e.target as HTMLInputElement).value)}
            />
            {#if showDatasetList && datasetSearchViewModel.filteredItems.length > 0}
              <div class="check-editor-dataset-list">
                {#each datasetSearchViewModel.filteredItems as item}
                  <div
                    class="check-editor-dataset-item"
                    role="option"
                    tabindex="0"
                    aria-selected={item.id === viewModel.selectedDatasetKey}
                    onmousedown={() => datasetSearchViewModel.onItemSelected?.(item)}
                  >
                    {item.label}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Predicate Section -->
      <div class="check-editor-section">
        <h3 class="check-editor-section-title">Predicate</h3>
        <div class="check-editor-field">
          <label for="predicate-type-select" class="check-editor-label">Type</label>
          <div class="check-editor-predicate-type">
            <Selector viewModel={predicateTypeSelector} ariaLabel="Predicate type" />
          </div>
        </div>
        <div class="check-editor-field">
          <label for="predicate-value-input" class="check-editor-label">Value</label>
          <div class="check-editor-predicate-value">
            <input
              id="predicate-value-input"
              type="number"
              class="check-editor-input"
              bind:value={viewModel.predicateValue}
              aria-label="Predicate value"
            />
          </div>
        </div>
        {#if viewModel.predicateType === 'approx'}
          <div class="check-editor-field">
            <label for="predicate-tolerance-input" class="check-editor-label">Tolerance</label>
            <input
              id="predicate-tolerance-input"
              type="number"
              class="check-editor-input"
              bind:value={viewModel.predicateTolerance}
              step="0.01"
              aria-label="Predicate tolerance"
            />
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="check-editor-actions">
        <Button onClick={handleCancel}>Cancel</Button>
        <Button primary onClick={handleSave}>Save</Button>
      </div>
    </div>

    <!-- Graph Preview -->
    <div class="check-editor-graph-container">
      {#if viewModel.graphViewModel}
        <ComparisonGraph viewModel={viewModel.graphViewModel} />
      {/if}
    </div>
  </div>
</Dialog>

<!-- STYLE -->
<style lang="scss">
.check-editor-container {
  display: flex;
  gap: 2rem;
  min-width: 60rem;
  min-height: 30rem;
}

.check-editor-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
  min-width: 24rem;
}

.check-editor-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.check-editor-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color-normal);
  padding-bottom: 0.25rem;
}

.check-editor-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.check-editor-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.check-editor-input {
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: inherit;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.check-editor-dataset-selector {
  position: relative;
}

.check-editor-dataset-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 12rem;
  overflow-y: auto;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-top: none;
  border-radius: 0 0 var(--input-border-radius) var(--input-border-radius);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.check-editor-dataset-item {
  padding: 0.5rem;
  cursor: pointer;
  color: var(--text-color-primary);

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &[aria-selected='true'] {
    background-color: var(--button-bg-primary-normal);
    color: white;
  }
}

.check-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-normal);
}

.check-editor-graph-container {
  flex: 1;
  min-width: 32rem;
  min-height: 24rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  padding: 1rem;
}
</style>
