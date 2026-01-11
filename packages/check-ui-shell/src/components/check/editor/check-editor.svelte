<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Button from '../../_shared/button.svelte'
import Dialog from '../../_shared/dialog.svelte'
import ScenarioSelector from './scenario-selector.svelte'
import DatasetSelector from './dataset-selector.svelte'
import PredicateSelector from './predicate-selector.svelte'
import PreviewGraph from './preview-graph.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { open = $bindable(false), viewModel }: Props = $props()

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
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Configure Check Test">
  <div class="check-editor-container">
    <div class="check-editor-form">
      <!-- Scenario Section -->
      <ScenarioSelector {viewModel} />

      <!-- Dataset Section -->
      <DatasetSelector {viewModel} />

      <!-- Predicate Section -->
      <PredicateSelector {viewModel} />

      <!-- Actions -->
      <div class="check-editor-actions">
        <Button onClick={handleCancel}>Cancel</Button>
        <Button primary onClick={handleSave}>Save</Button>
      </div>
    </div>

    <!-- Graph Preview -->
    <PreviewGraph viewModel={viewModel.graphViewModel} />
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

.check-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-normal);
}
</style>
