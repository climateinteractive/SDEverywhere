<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import TypeaheadSelector from '../../list/typeahead-selector.svelte'

import type { CheckDatasetEditorViewModel } from './check-dataset-editor-vm.svelte'
import CheckEditorRemoveButton from './check-editor-remove-button.svelte'

interface Props {
  /** The view model for the dataset editor. */
  viewModel: CheckDatasetEditorViewModel
}

let { viewModel }: Props = $props()

function handleAddDataset() {
  viewModel.addDataset()
}

function handleRemoveDataset(id: string) {
  viewModel.removeDataset(id)
}

function handleSelectDataset(id: string) {
  viewModel.selectDataset(id)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const currentIndex = viewModel.datasets.findIndex(d => d.id === viewModel.selectedDatasetId)
    if (currentIndex < viewModel.datasets.length - 1) {
      viewModel.selectDataset(viewModel.datasets[currentIndex + 1].id)
    } else {
      viewModel.selectDataset(viewModel.datasets[0].id)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = viewModel.datasets.findIndex(d => d.id === viewModel.selectedDatasetId)
    if (currentIndex > 0) {
      viewModel.selectDataset(viewModel.datasets[currentIndex - 1].id)
    } else {
      viewModel.selectDataset(viewModel.datasets[viewModel.datasets.length - 1].id)
    }
  }
}
</script>

<!-- TEMPLATE -->
<div class="dataset-editor-section">
  <div class="dataset-editor-header">
    <h3 class="dataset-editor-title">
      Datasets
      <button class="dataset-editor-add-btn" onclick={handleAddDataset} aria-label="Add dataset"> + </button>
    </h3>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dataset-editor-items" tabindex="0" onkeydown={handleKeyDown} role="list">
    {#each viewModel.datasets as dataset (dataset.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="dataset-editor-item"
        class:selected={viewModel.selectedDatasetId === dataset.id}
        onclick={() => handleSelectDataset(dataset.id)}
        role="listitem"
      >
        <div class="dataset-editor-row">
          <span class="dataset-editor-text">Output:</span>
          <div class="dataset-editor-typeahead-wrapper" onclick={e => e.stopPropagation()} role="none">
            <TypeaheadSelector
              items={viewModel.datasetListItems}
              selectedId={dataset.datasetKey}
              placeholder="Search outputs..."
              ariaLabel="Output variable"
              onSelect={(item: ListItemViewModel) => {
                viewModel.updateDataset(dataset.id, { datasetKey: item.id })
              }}
            />
          </div>
          {#if viewModel.datasets.length > 1}
            <CheckEditorRemoveButton ariaLabel="Remove dataset" onclick={() => handleRemoveDataset(dataset.id)} />
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.dataset-editor-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dataset-editor-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.dataset-editor-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.dataset-editor-add-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  margin-left: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.dataset-editor-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dataset-editor-item {
  padding: 0.5rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
  cursor: pointer;

  &:hover {
    background-color: rgba(200, 220, 240, 0.1);
  }

  &.selected {
    background-color: rgba(100, 180, 255, 0.15);
    border-color: rgba(100, 180, 255, 0.3);
  }
}

.dataset-editor-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.dataset-editor-text {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.dataset-editor-typeahead-wrapper {
  flex: 1;
  min-width: 0;
}
</style>
