<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faPaste } from '@fortawesome/free-solid-svg-icons'

import Dialog from '../../_shared/dialog.svelte'

import type { CheckEditorViewModel } from './check-editor-vm.svelte'
import DatasetEditor from './check-dataset-editor.svelte'
import PredicateEditor from './check-predicate-editor.svelte'
import ScenarioEditor from './check-scenario-editor.svelte'
import TabbedPreview from './check-tabbed-preview.svelte'
import CheckYamlDialog from './check-yaml-dialog.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { open = $bindable(false), viewModel }: Props = $props()

// State for paste YAML dialog
let showPasteYamlDialog = $state(false)

/**
 * Open paste YAML dialog.
 */
function openPasteYamlDialog() {
  showPasteYamlDialog = true
}
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Configure Check Test" maxWidth={1000}>
  <div class="check-editor-container">
    <div class="check-editor-form">
      <div class="check-editor-header-row">
        <button
          class="check-editor-paste-btn"
          onclick={openPasteYamlDialog}
          aria-label="Paste YAML"
          title="Paste YAML to prepopulate form"
        >
          <Icon data={faPaste} />
        </button>
        <div class="check-editor-description-section">
          <input
            id="describe-input"
            class="check-editor-input check-editor-describe-input"
            type="text"
            bind:value={viewModel.describeText}
            placeholder="Variable or group"
            aria-label="Describe text"
          />
          <input
            id="test-input"
            class="check-editor-input check-editor-test-input"
            type="text"
            bind:value={viewModel.testText}
            placeholder="should [have behavior] when..."
            aria-label="Test text"
          />
        </div>
      </div>

      <ScenarioEditor viewModel={viewModel.scenarioEditor} />
      <DatasetEditor viewModel={viewModel.datasetEditor} />
      <PredicateEditor viewModel={viewModel.predicateEditor} />
    </div>

    <TabbedPreview {viewModel} />
  </div>
</Dialog>

<CheckYamlDialog bind:open={showPasteYamlDialog} {viewModel} />

<!-- STYLE -->
<style lang="scss">
.check-editor-container {
  display: flex;
  gap: 2rem;
  min-width: 800px;
  min-height: 340px;
  max-height: 70vh;
}

.check-editor-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
  min-width: 24rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.check-editor-header-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.check-editor-description-section {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.check-editor-input {
  flex: 1;
  padding: 4px 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;

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

.check-editor-describe-input {
  flex: 0.3;
}

.check-editor-test-input {
  flex: 0.7;
}

.check-editor-paste-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  cursor: pointer;
  flex-shrink: 0;
  aspect-ratio: 1;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }

  :global(svg) {
    width: 10px;
    height: 10px;
  }
}
</style>
