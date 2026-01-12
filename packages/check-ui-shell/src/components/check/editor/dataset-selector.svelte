<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../../_shared/button.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'

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
</script>

<!-- TEMPLATE -->
<div class="dataset-selector-section">
  <div class="dataset-selector-header">
    <h3 class="dataset-selector-title">Datasets</h3>
    <Button onClick={handleAddDataset}>Add Dataset</Button>
  </div>

  {#each viewModel.datasets as dataset (dataset.id)}
    <div class="dataset-selector-item">
      <div class="dataset-selector-item-header">
        <span class="dataset-selector-item-label">Dataset</span>
        {#if viewModel.datasets.length > 1}
          <button
            class="dataset-selector-remove-btn"
            onclick={() => handleRemoveDataset(dataset.id)}
            aria-label="Remove dataset"
          >
            ✕
          </button>
        {/if}
      </div>

      <div class="dataset-selector-field">
        <label for="output-var-{dataset.id}" class="dataset-selector-label">Output Variable</label>
        <select
          id="output-var-{dataset.id}"
          class="dataset-selector-select"
          value={dataset.datasetKey}
          onchange={e => viewModel.updateDataset(dataset.id, { datasetKey: (e.target as HTMLSelectElement).value })}
          aria-label="Output variable"
        >
          {#each viewModel.datasetListItems as item}
            <option value={item.id}>{item.label}</option>
          {/each}
        </select>
      </div>
    </div>
  {/each}
</div>

<!-- STYLE -->
<style lang="scss">
.dataset-selector-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dataset-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-normal);
}

.dataset-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.dataset-selector-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
}

.dataset-selector-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dataset-selector-item-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.dataset-selector-remove-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background-color: var(--button-bg-hover);
  }
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

.dataset-selector-select {
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
</style>
