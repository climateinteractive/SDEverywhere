<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../../_shared/button.svelte'
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'

import type { CheckEditorViewModel, PredicateType, PredicateRefKind, PredicateItemConfig } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

// Create selector options for predicate type
const predicateTypeOptions = [
  new SelectorOptionViewModel('Greater Than (>)', 'gt'),
  new SelectorOptionViewModel('Greater Than or Equal (≥)', 'gte'),
  new SelectorOptionViewModel('Less Than (<)', 'lt'),
  new SelectorOptionViewModel('Less Than or Equal (≤)', 'lte'),
  new SelectorOptionViewModel('Equal (=)', 'eq'),
  new SelectorOptionViewModel('Approximately (~)', 'approx')
]

// Create selector options for reference kind
const refKindOptions = [
  new SelectorOptionViewModel('Constant Value', 'constant'),
  new SelectorOptionViewModel('Data Reference', 'data')
]

function createTypeSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(predicateTypeOptions, predicate.type)
  selector.onUserChange = (newValue: string) => {
    viewModel.updatePredicate(predicate.id, { type: newValue as PredicateType })
  }
  return selector
}

function createRefKindSelector(predicate: PredicateItemConfig) {
  const selector = new SelectorViewModel(refKindOptions, predicate.ref.kind)
  selector.onUserChange = (newValue: string) => {
    const ref = { ...predicate.ref, kind: newValue as PredicateRefKind }
    viewModel.updatePredicate(predicate.id, { ref })
  }
  return selector
}

function handleAddPredicate() {
  viewModel.addPredicate()
}

function handleRemovePredicate(id: string) {
  viewModel.removePredicate(id)
}

function updateRefValue(predicate: PredicateItemConfig, value: number) {
  const ref = { ...predicate.ref, value }
  viewModel.updatePredicate(predicate.id, { ref })
}

function updateRefDatasetKey(predicate: PredicateItemConfig, datasetKey: string) {
  const ref = { ...predicate.ref, datasetKey }
  viewModel.updatePredicate(predicate.id, { ref })
}

function updateRefScenarioId(predicate: PredicateItemConfig, scenarioId: string) {
  const ref = { ...predicate.ref, scenarioId }
  viewModel.updatePredicate(predicate.id, { ref })
}
</script>

<!-- TEMPLATE -->
<div class="predicate-selector-section">
  <div class="predicate-selector-header">
    <h3 class="predicate-selector-title">Predicates</h3>
    <Button onClick={handleAddPredicate}>Add Predicate</Button>
  </div>

  {#each viewModel.predicates as predicate (predicate.id)}
    <div class="predicate-selector-item">
      <div class="predicate-selector-item-header">
        <span class="predicate-selector-item-label">Predicate</span>
        {#if viewModel.predicates.length > 1}
          <button
            class="predicate-selector-remove-btn"
            onclick={() => handleRemovePredicate(predicate.id)}
            aria-label="Remove predicate"
          >
            ✕
          </button>
        {/if}
      </div>

      <div class="predicate-selector-field">
        <span class="predicate-selector-label">Type</span>
        <Selector viewModel={createTypeSelector(predicate)} ariaLabel="Predicate type" />
      </div>

      <div class="predicate-selector-field">
        <span class="predicate-selector-label">Reference</span>
        <Selector viewModel={createRefKindSelector(predicate)} ariaLabel="Reference kind" />
      </div>

      {#if predicate.ref.kind === 'constant'}
        <div class="predicate-selector-field">
          <label for="pred-value-{predicate.id}" class="predicate-selector-label">Value</label>
          <input
            id="pred-value-{predicate.id}"
            type="number"
            class="predicate-selector-input"
            value={predicate.ref.value ?? 0}
            oninput={e => updateRefValue(predicate, parseFloat((e.target as HTMLInputElement).value))}
            aria-label="Predicate value"
          />
        </div>
      {:else if predicate.ref.kind === 'data'}
        <div class="predicate-selector-field">
          <label for="pred-dataset-{predicate.id}" class="predicate-selector-label">Dataset</label>
          <select
            id="pred-dataset-{predicate.id}"
            class="predicate-selector-select"
            value={predicate.ref.datasetKey || ''}
            onchange={e => updateRefDatasetKey(predicate, (e.target as HTMLSelectElement).value)}
            aria-label="Reference dataset"
          >
            <option value="">Select dataset...</option>
            {#each viewModel.datasetListItems as item}
              <option value={item.id}>{item.label}</option>
            {/each}
          </select>
        </div>
        <div class="predicate-selector-field">
          <label for="pred-scenario-{predicate.id}" class="predicate-selector-label">Scenario</label>
          <select
            id="pred-scenario-{predicate.id}"
            class="predicate-selector-select"
            value={predicate.ref.scenarioId || ''}
            onchange={e => updateRefScenarioId(predicate, (e.target as HTMLSelectElement).value)}
            aria-label="Reference scenario"
          >
            <option value="">Inherit</option>
            {#each viewModel.scenarios as scenario}
              <option value={scenario.id}>{scenario.id}</option>
            {/each}
          </select>
        </div>
      {/if}

      {#if predicate.type === 'approx'}
        <div class="predicate-selector-field">
          <label for="pred-tolerance-{predicate.id}" class="predicate-selector-label">Tolerance</label>
          <input
            id="pred-tolerance-{predicate.id}"
            type="number"
            class="predicate-selector-input"
            value={predicate.tolerance ?? 0.1}
            oninput={e => viewModel.updatePredicate(predicate.id, { tolerance: parseFloat((e.target as HTMLInputElement).value) })}
            step="0.01"
            aria-label="Predicate tolerance"
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<!-- STYLE -->
<style lang="scss">
.predicate-selector-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.predicate-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-normal);
}

.predicate-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.predicate-selector-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  background-color: var(--panel-bg);
}

.predicate-selector-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.predicate-selector-item-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.predicate-selector-remove-btn {
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

.predicate-selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.predicate-selector-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.predicate-selector-input,
.predicate-selector-select {
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
