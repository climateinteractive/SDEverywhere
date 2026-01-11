<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'

import type { CheckEditorViewModel, PredicateType } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

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
</script>

<!-- TEMPLATE -->
<div class="predicate-selector-section">
  <h3 class="predicate-selector-title">Predicate</h3>
  <div class="predicate-selector-field">
    <label for="predicate-type-select" class="predicate-selector-label">Type</label>
    <div class="predicate-selector-type">
      <Selector viewModel={predicateTypeSelector} ariaLabel="Predicate type" />
    </div>
  </div>
  <div class="predicate-selector-field">
    <label for="predicate-value-input" class="predicate-selector-label">Value</label>
    <div class="predicate-selector-value">
      <input
        id="predicate-value-input"
        type="number"
        class="predicate-selector-input"
        bind:value={viewModel.predicateValue}
        aria-label="Predicate value"
      />
    </div>
  </div>
  {#if viewModel.predicateType === 'approx'}
    <div class="predicate-selector-field">
      <label for="predicate-tolerance-input" class="predicate-selector-label">Tolerance</label>
      <input
        id="predicate-tolerance-input"
        type="number"
        class="predicate-selector-input"
        bind:value={viewModel.predicateTolerance}
        step="0.01"
        aria-label="Predicate tolerance"
      />
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.predicate-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.predicate-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color-normal);
  padding-bottom: 0.25rem;
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

.predicate-selector-input {
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
