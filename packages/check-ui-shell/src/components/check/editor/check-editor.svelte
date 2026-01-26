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
      <div class="check-editor-description-section">
        <input
          id="describe-input"
          class="check-editor-input"
          type="text"
          bind:value={viewModel.describeText}
          placeholder="Variable or group"
          aria-label="Describe text"
        />
        <input
          id="test-input"
          class="check-editor-input"
          type="text"
          bind:value={viewModel.testText}
          placeholder="should [have behavior] when [conditions]"
          aria-label="Test text"
        />
      </div>

      <ScenarioSelector {viewModel} />
      <DatasetSelector {viewModel} />
      <PredicateSelector {viewModel} />
    </div>

    <TabbedPreview {viewModel} />
  </div>
</Dialog>

<!-- STYLE -->
<style lang="scss">
.check-editor-container {
  display: flex;
  gap: 2rem;
  min-width: 800px;
  min-height: 340px;
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

.check-editor-description-section {
  display: flex;
  gap: 0.5rem;
}

.check-editor-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }

  &::placeholder {
    color: var(--text-color-secondary);
    opacity: 0.6;
  }
}
</style>
