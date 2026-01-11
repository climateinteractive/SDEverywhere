<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Selector from '../../list/selector.svelte'
import { SelectorOptionViewModel, SelectorViewModel } from '../../list/selector-vm.svelte'

import type { InputPosition } from '@sdeverywhere/check-core'
import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

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
</script>

<!-- TEMPLATE -->
<div class="scenario-selector-section">
  <h3 class="scenario-selector-title">Scenario</h3>
  <div class="scenario-selector-field">
    <label for="scenario-position-select" class="scenario-selector-label">All Inputs</label>
    <Selector viewModel={allInputsPositionSelector} ariaLabel="All inputs position" />
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.scenario-selector-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scenario-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color-primary);
  border-bottom: 1px solid var(--border-color-normal);
  padding-bottom: 0.25rem;
}

.scenario-selector-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scenario-selector-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-color-primary);
}
</style>
