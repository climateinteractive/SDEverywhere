<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
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
  new SelectorOptionViewModel('>', 'gt'),
  new SelectorOptionViewModel('≥', 'gte'),
  new SelectorOptionViewModel('<', 'lt'),
  new SelectorOptionViewModel('≤', 'lte'),
  new SelectorOptionViewModel('=', 'eq'),
  new SelectorOptionViewModel('~', 'approx')
]

// Create selector options for reference kind
const refKindOptions = [
  new SelectorOptionViewModel('Value', 'constant'),
  new SelectorOptionViewModel('Data', 'data')
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

function handleSelectPredicate(id: string) {
  viewModel.selectPredicate(id)
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

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const currentIndex = viewModel.predicates.findIndex(p => p.id === viewModel.selectedPredicateId)
    if (currentIndex < viewModel.predicates.length - 1) {
      viewModel.selectPredicate(viewModel.predicates[currentIndex + 1].id)
    } else {
      viewModel.selectPredicate(viewModel.predicates[0].id)
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const currentIndex = viewModel.predicates.findIndex(p => p.id === viewModel.selectedPredicateId)
    if (currentIndex > 0) {
      viewModel.selectPredicate(viewModel.predicates[currentIndex - 1].id)
    } else {
      viewModel.selectPredicate(viewModel.predicates[viewModel.predicates.length - 1].id)
    }
  }
}
</script>

<!-- TEMPLATE -->
<div class="predicate-selector-section">
  <div class="predicate-selector-header">
    <h3 class="predicate-selector-title">Predicates</h3>
    <button
      class="predicate-selector-add-btn"
      onclick={handleAddPredicate}
      aria-label="Add predicate"
    >
      +
    </button>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="predicate-selector-items" tabindex="0" onkeydown={handleKeyDown} role="list">
    {#each viewModel.predicates as predicate (predicate.id)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="predicate-selector-item"
        class:selected={viewModel.selectedPredicateId === predicate.id}
        onclick={() => handleSelectPredicate(predicate.id)}
        role="listitem"
      >
        <div class="predicate-selector-content">
          <div class="predicate-selector-row">
            <Selector viewModel={createTypeSelector(predicate)} ariaLabel="Predicate type" />
            <Selector viewModel={createRefKindSelector(predicate)} ariaLabel="Reference kind" />

            {#if predicate.ref.kind === 'constant'}
              <input
                id="pred-value-{predicate.id}"
                class="predicate-selector-input"
                type="number"
                value={predicate.ref.value ?? 0}
                oninput={e => {
                  e.stopPropagation()
                  updateRefValue(predicate, parseFloat((e.target as HTMLInputElement).value))
                }}
                onclick={e => e.stopPropagation()}
                aria-label="Predicate value"
              />
            {:else if predicate.ref.kind === 'data'}
              <select
                class="predicate-selector-select"
                value={predicate.ref.datasetKey || ''}
                onchange={e => {
                  e.stopPropagation()
                  updateRefDatasetKey(predicate, (e.target as HTMLSelectElement).value)
                }}
                onclick={e => e.stopPropagation()}
                aria-label="Reference dataset"
              >
                <option value="">Select...</option>
                {#each viewModel.datasetListItems as item}
                  <option value={item.id}>{item.label}</option>
                {/each}
              </select>
            {/if}

            {#if viewModel.predicates.length > 1}
              <button
                class="predicate-selector-remove-btn"
                onclick={e => {
                  e.stopPropagation()
                  handleRemovePredicate(predicate.id)
                }}
                aria-label="Remove predicate"
              >
                ✕
              </button>
            {/if}
          </div>

          {#if predicate.ref.kind === 'data'}
            <div class="predicate-selector-row">
              <span class="predicate-selector-text">Scenario:</span>
              <select
                class="predicate-selector-select"
                value={predicate.ref.scenarioId || ''}
                onchange={e => {
                  e.stopPropagation()
                  updateRefScenarioId(predicate, (e.target as HTMLSelectElement).value)
                }}
                onclick={e => e.stopPropagation()}
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
            <div class="predicate-selector-row">
              <span class="predicate-selector-text">Tolerance:</span>
              <input
                class="predicate-selector-input"
                type="number"
                value={predicate.tolerance ?? 0.1}
                oninput={e => {
                  e.stopPropagation()
                  viewModel.updatePredicate(predicate.id, {
                    tolerance: parseFloat((e.target as HTMLInputElement).value)
                  })
                }}
                onclick={e => e.stopPropagation()}
                step="0.01"
                aria-label="Predicate tolerance"
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.predicate-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.predicate-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-normal);
  flex-shrink: 0;
}

.predicate-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.predicate-selector-add-btn {
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

.predicate-selector-items {
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

.predicate-selector-item {
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

.predicate-selector-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.predicate-selector-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.predicate-selector-text {
  font-size: 0.9rem;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.predicate-selector-input {
  padding: 0.35rem 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  width: 80px;
  flex-shrink: 0;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.predicate-selector-select {
  padding: 0.35rem 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  flex: 1;
  min-width: 0;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.predicate-selector-remove-btn {
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
