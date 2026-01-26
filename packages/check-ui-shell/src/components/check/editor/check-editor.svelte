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

// State for paste YAML mode
let showPasteYaml = $state(false)
let pasteYamlText = $state('')
let pasteYamlError = $state<string | undefined>(undefined)

/**
 * Toggle paste YAML mode.
 */
function togglePasteYaml() {
  showPasteYaml = !showPasteYaml
  if (!showPasteYaml) {
    pasteYamlText = ''
    pasteYamlError = undefined
  }
}

/**
 * Parse the pasted YAML and populate the form.
 */
function parsePastedYaml() {
  const error = viewModel.parseYamlAndInit(pasteYamlText)
  if (error) {
    pasteYamlError = error
  } else {
    // Success - close paste mode
    showPasteYaml = false
    pasteYamlText = ''
    pasteYamlError = undefined
  }
}
</script>

<!-- TEMPLATE -->
<Dialog bind:open title="Configure Check Test" maxWidth={1000}>
  <div class="check-editor-container">
    <div class="check-editor-form">
      <div class="check-editor-header-row">
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
        <button
          class="check-editor-paste-btn"
          class:active={showPasteYaml}
          onclick={togglePasteYaml}
          aria-label="Paste YAML"
          title="Paste YAML to prepopulate form"
        >
          📋
        </button>
      </div>

      {#if showPasteYaml}
        <div class="check-editor-paste-section">
          <textarea
            class="check-editor-paste-textarea"
            bind:value={pasteYamlText}
            placeholder="Paste YAML here..."
            aria-label="Paste YAML"
            rows={6}
          ></textarea>
          {#if pasteYamlError}
            <div class="check-editor-paste-error">{pasteYamlError}</div>
          {/if}
          <div class="check-editor-paste-actions">
            <button class="check-editor-paste-action-btn" onclick={parsePastedYaml}>
              Apply
            </button>
            <button class="check-editor-paste-action-btn check-editor-paste-cancel-btn" onclick={togglePasteYaml}>
              Cancel
            </button>
          </div>
        </div>
      {/if}

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

.check-editor-paste-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  flex-shrink: 0;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &.active {
    background-color: rgba(100, 180, 255, 0.2);
    border-color: rgba(100, 180, 255, 0.4);
  }
}

.check-editor-paste-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: rgba(100, 180, 255, 0.05);
  border: 1px solid rgba(100, 180, 255, 0.2);
  border-radius: 4px;
}

.check-editor-paste-textarea {
  width: 100%;
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;

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

.check-editor-paste-error {
  padding: 0.5rem;
  background-color: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  color: #ff6b6b;
  font-size: 0.85rem;
}

.check-editor-paste-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.check-editor-paste-action-btn {
  padding: 0.35rem 0.75rem;
  background-color: rgba(100, 180, 255, 0.2);
  border: 1px solid rgba(100, 180, 255, 0.4);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background-color: rgba(100, 180, 255, 0.3);
  }
}

.check-editor-paste-cancel-btn {
  background-color: var(--button-bg);
  border-color: var(--border-color-normal);

  &:hover {
    background-color: var(--button-bg-hover);
  }
}
</style>
