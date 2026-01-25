<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Dialog from '../../_shared/dialog.svelte'
import ScenarioSelector from './scenario-selector.svelte'
import DatasetSelector from './dataset-selector.svelte'
import PredicateSelector from './predicate-selector.svelte'
import TabbedPreview from './tabbed-preview.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { open = $bindable(false), viewModel }: Props = $props()
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Configure Check Test" maxWidth={1000}>
  <div class="check-editor-container">
    <div class="check-editor-form">
      <!-- Scenario Section -->
      <ScenarioSelector {viewModel} />

      <!-- Dataset Section -->
      <DatasetSelector {viewModel} />

      <!-- Predicate Section -->
      <PredicateSelector {viewModel} />
    </div>

    <!-- Tabbed Preview -->
    <TabbedPreview {viewModel} />
  </div>
</Dialog>

<!-- STYLE -->
<style lang="scss">
.check-editor-container {
  display: flex;
  gap: 2rem;
  min-width: 800px;
  min-height: 600px;
}

.check-editor-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
  min-width: 24rem;
  min-height: 0;
  overflow: hidden;
}
</style>
