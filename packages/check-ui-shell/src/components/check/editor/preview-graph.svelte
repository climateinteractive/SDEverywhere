<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import CheckSummaryGraphBox from '../summary/check-summary-graph-box.svelte'

import type { CheckSummaryGraphBoxViewModel } from '../summary/check-summary-graph-box-vm'

interface Props {
  /** The view model for the graph box. */
  viewModel: CheckSummaryGraphBoxViewModel | undefined
}

let { viewModel }: Props = $props()
</script>

<!-- TEMPLATE -->
<div class="preview-graph-container">
  {#if viewModel}
    <CheckSummaryGraphBox {viewModel} />
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.preview-graph-container {
  flex: 1;
  min-width: 32rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 1rem;
  overflow: auto;
}
</style>
