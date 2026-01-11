<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { SearchListViewModel } from '../../list/search-list-vm.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

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

// Track whether search list should be shown
let showDatasetList = $state(false)
</script>

<!-- TEMPLATE -->
<div class="dataset-selector-section">
  <h3 class="dataset-selector-title">Dataset</h3>
  <div class="dataset-selector-field">
    <label for="dataset-search" class="dataset-selector-label">Output Variable</label>
    <div class="dataset-selector-input-container">
      <input
        id="dataset-search"
        type="text"
        class="dataset-selector-input"
        bind:value={datasetQuery}
        placeholder="Search outputs..."
        aria-label="Search output variables"
        onfocus={() => (showDatasetList = true)}
        onblur={() => setTimeout(() => (showDatasetList = false), 200)}
        oninput={e => (datasetSearchViewModel.query = (e.target as HTMLInputElement).value)}
      />
      {#if showDatasetList && datasetSearchViewModel.filteredItems.length > 0}
        <div class="dataset-selector-list">
          {#each datasetSearchViewModel.filteredItems as item}
            <div
              class="dataset-selector-item"
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

<!-- STYLE -->
<style lang="scss">
.dataset-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dataset-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color-normal);
  padding-bottom: 0.25rem;
}

.dataset-selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dataset-selector-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.dataset-selector-input {
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

.dataset-selector-input-container {
  position: relative;
}

.dataset-selector-list {
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

.dataset-selector-item {
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
</style>
