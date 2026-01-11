<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import ComparisonGraph from '../../graphs/comparison-graph.svelte'

import type { ComparisonGraphViewModel } from '../../graphs/comparison-graph-vm'

interface Props {
  /** The view model for the comparison graph. */
  viewModel: ComparisonGraphViewModel | undefined
}

let { viewModel }: Props = $props()
</script>

<!-- TEMPLATE -->
<div class="preview-graph-container">
  {#if viewModel}
    <ComparisonGraph {viewModel} />
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.preview-graph-container {
  flex: 1;
  min-width: 32rem;
  min-height: 24rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  padding: 1rem;
}
</style>
