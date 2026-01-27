<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { predicateMessage } from '@sdeverywhere/check-core'
import CheckSummaryGraphBox from '../summary/check-summary-graph-box.svelte'

import type { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

interface Props {
  /** The view model for the graph box. */
  viewModel: CheckSummaryGraphBoxViewModel | undefined
}

let { viewModel }: Props = $props()

// Generate the predicate message for display
const predicateMessageText = $derived.by(() => {
  if (!viewModel) {
    return ''
  }
  // Use a no-op styling function since we don't use HTML styling
  const noStyle = (s: string) => s
  return predicateMessage(viewModel.predicateReport, noStyle)
})
</script>

<!-- TEMPLATE -->
<div class="preview-graph-container">
  {#if viewModel}
    <div class="preview-graph-header">
      <span class="preview-graph-status preview-graph-status-passed">✓</span>
      <span class="preview-graph-label">{predicateMessageText}</span>
    </div>
    <div class="preview-graph-wrapper">
      <CheckSummaryGraphBox {viewModel} />
    </div>
  {:else}
    <div class="preview-graph-placeholder">
      Select a dataset and predicate to see preview
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.preview-graph-container {
  flex: 1;
  min-width: 0;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg);
  padding: 1rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.preview-graph-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color-normal);
  flex-shrink: 0;
}

.preview-graph-status {
  font-weight: bold;
  font-size: 1rem;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.preview-graph-status-passed {
  color: var(--status-color-passed, #4caf50);
}

.preview-graph-label {
  font-size: 0.9rem;
  color: var(--text-color-primary);
}

.preview-graph-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-graph-placeholder {
  color: var(--text-color-secondary);
  font-style: italic;
  text-align: center;
  padding: 2rem;
}
</style>
