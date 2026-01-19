<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import TypeaheadSelector from '../../list/typeahead-selector.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'
import type { ListItemViewModel } from '../../list/list-item-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
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
<div class="dataset-selector-section">
  <div class="dataset-selector-header">
    <h3 class="dataset-selector-title">Datasets</h3>
    <button
      class="dataset-selector-add-btn"
      onclick={handleAddDataset}
      aria-label="Add dataset"
    >
      +
    </button>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dataset-selector-items" tabindex="0" onkeydown={handleKeyDown} role="list">
    {#each viewModel.datasets as dataset (dataset.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="dataset-selector-item"
        class:selected={viewModel.selectedDatasetId === dataset.id}
        onclick={() => handleSelectDataset(dataset.id)}
        role="listitem"
      >
        <div class="dataset-selector-row">
          <span class="dataset-selector-text">Output:</span>
          <div
            class="dataset-selector-typeahead-wrapper"
            onclick={e => e.stopPropagation()}
            role="none"
          >
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
            <button
              class="dataset-selector-remove-btn"
              onclick={e => {
                e.stopPropagation()
                handleRemoveDataset(dataset.id)
              }}
              aria-label="Remove dataset"
            >
              ✕
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.dataset-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.dataset-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-normal);
  flex-shrink: 0;
}

.dataset-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.dataset-selector-add-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.dataset-selector-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 200px;
  padding-right: 4px;

  &:focus {
    outline: 2px solid var(--border-color-focused);
    outline-offset: -2px;
  }
}

.dataset-selector-item {
  padding: 0.5rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(200, 220, 240, 0.1);
  }

  &.selected {
    background-color: rgba(100, 180, 255, 0.15);
    border-color: rgba(100, 180, 255, 0.3);
  }
}

.dataset-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.dataset-selector-text {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.dataset-selector-typeahead-wrapper {
  flex: 1;
  min-width: 0;
}

.dataset-selector-remove-btn {
  padding: 0.15rem 0.4rem;
  background: none;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;
  flex-shrink: 0;

  &:hover {
    background-color: var(--button-bg-hover);
  }
}
</style>
