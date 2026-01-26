<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import PreviewGraph from './preview-graph.svelte'
import type { CheckEditorViewModel } from './check-editor-vm.svelte'

interface Props {
  /** The view model for the editor. */
  viewModel: CheckEditorViewModel
}

let { viewModel }: Props = $props()

type Tab = 'preview' | 'code'
let activeTab = $state<Tab>('preview')

const yamlCode = $derived(viewModel.getYamlCode())

async function handleCopyToClipboard() {
  try {
    await navigator.clipboard.writeText(yamlCode)
  } catch (error) {
    // In test environments or when clipboard permissions are denied,
    // fail silently. In production, users will still see the button click.
    console.warn('Failed to copy to clipboard:', error)
  }
}
</script>

<!-- TEMPLATE -->
<div class="tabbed-preview-container">
  <div class="tabbed-preview-tabs">
    <button
      class="tabbed-preview-tab"
      class:active={activeTab === 'preview'}
      onclick={() => (activeTab = 'preview')}
      aria-label="Preview tab"
    >
      Preview
    </button>
    <button
      class="tabbed-preview-tab"
      class:active={activeTab === 'code'}
      onclick={() => (activeTab = 'code')}
      aria-label="Code tab"
    >
      Code
    </button>
  </div>

  <div class="tabbed-preview-content">
    {#if activeTab === 'preview'}
      {#key viewModel.configKey}
        <PreviewGraph viewModel={viewModel.graphBoxViewModel} />
      {/key}
    {:else if activeTab === 'code'}
      <div class="tabbed-preview-code-container">
        <button
          class="tabbed-preview-copy-btn"
          onclick={handleCopyToClipboard}
          aria-label="Copy to clipboard"
        >
          Copy to Clipboard
        </button>
        <pre class="tabbed-preview-code">{yamlCode}</pre>
      </div>
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.tabbed-preview-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.tabbed-preview-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--border-color-normal);
  flex-shrink: 0;
}

.tabbed-preview-tab {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: -2px;

  &:hover {
    color: var(--text-color-primary);
    background-color: rgba(200, 220, 240, 0.05);
  }

  &.active {
    color: var(--text-color-primary);
    border-bottom-color: rgba(100, 180, 255, 0.8);
    font-weight: 600;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--border-color-focused);
  }
}

.tabbed-preview-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabbed-preview-code-container {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabbed-preview-copy-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  color: var(--text-color-primary);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 10;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.tabbed-preview-code {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  padding-top: 3rem;
  margin: 0;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-top: none;
  border-radius: 0 0 4px 4px;
  color: var(--text-color-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
