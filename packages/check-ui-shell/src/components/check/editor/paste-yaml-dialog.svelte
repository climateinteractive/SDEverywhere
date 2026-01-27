<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** Whether the dialog is visible. */
  open: boolean
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { open = $bindable(false), viewModel }: Props = $props()

let pasteYamlText = $state('')
let pasteYamlError = $state<string | undefined>(undefined)

/**
 * Parse the pasted YAML and populate the form.
 */
function handleApply() {
  const error = viewModel.parseYamlAndInit(pasteYamlText)
  if (error) {
    pasteYamlError = error
  } else {
    // Success - close paste dialog
    open = false
    pasteYamlText = ''
    pasteYamlError = undefined
  }
}

/**
 * Cancel and close the dialog.
 */
function handleCancel() {
  open = false
  pasteYamlText = ''
  pasteYamlError = undefined
}

/**
 * Handle backdrop click to close.
 */
function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleCancel()
  }
}

/**
 * Handle key down for escape.
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleCancel()
    event.stopPropagation()
  }
}
</script>

<!-- TEMPLATE -->
{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="paste-yaml-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="paste-yaml-dialog-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="paste-yaml-dialog-content">
      <div class="paste-yaml-dialog-header">
        <h3 id="paste-yaml-dialog-title" class="paste-yaml-dialog-title">Paste YAML</h3>
        <button class="paste-yaml-dialog-close" onclick={handleCancel} aria-label="Close">✕</button>
      </div>
      <div class="paste-yaml-dialog-body">
        <textarea
          class="paste-yaml-dialog-textarea"
          bind:value={pasteYamlText}
          placeholder="Paste YAML here..."
          aria-label="Paste YAML"
          rows={12}
        ></textarea>
        {#if pasteYamlError}
          <div class="paste-yaml-dialog-error">{pasteYamlError}</div>
        {/if}
      </div>
      <div class="paste-yaml-dialog-footer">
        <button class="paste-yaml-dialog-btn paste-yaml-dialog-cancel-btn" onclick={handleCancel}>Cancel</button>
        <button class="paste-yaml-dialog-btn paste-yaml-dialog-apply-btn" onclick={handleApply}>Apply</button>
      </div>
    </div>
  </div>
{/if}

<!-- STYLE -->
<style lang="scss">
.paste-yaml-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
}

.paste-yaml-dialog-content {
  background-color: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--panel-border-radius);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.paste-yaml-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--panel-border);
}

.paste-yaml-dialog-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color-primary);
}

.paste-yaml-dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.paste-yaml-dialog-body {
  padding: 1.5rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.paste-yaml-dialog-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.85rem;
  resize: vertical;
  flex: 1;
  min-height: 200px;

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

.paste-yaml-dialog-error {
  padding: 0.5rem;
  background-color: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 4px;
  color: #ff6b6b;
  font-size: 0.85rem;
}

.paste-yaml-dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--panel-border);
}

.paste-yaml-dialog-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--border-color-focused);
  }
}

.paste-yaml-dialog-cancel-btn {
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  color: var(--text-color-primary);

  &:hover {
    background-color: var(--button-bg-hover);
  }
}

.paste-yaml-dialog-apply-btn {
  background-color: rgba(100, 180, 255, 0.2);
  border: 1px solid rgba(100, 180, 255, 0.4);
  color: var(--text-color-primary);

  &:hover {
    background-color: rgba(100, 180, 255, 0.3);
  }
}
</style>
