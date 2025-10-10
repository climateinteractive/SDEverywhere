<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Lazy from '../../_shared/lazy.svelte'
import ComparisonGraph from '../../graphs/comparison-graph.svelte'
import type { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'

export let viewModel: CheckSummaryGraphBoxViewModel
let content = viewModel.content
let visible = false

// Rebuild the view state when the view model changes
let previousVisible = visible
let previousViewModel: CheckSummaryGraphBoxViewModel
$: if (visible !== previousVisible || viewModel.baseRequestKey !== previousViewModel?.baseRequestKey) {
  // If the view model is changing, or if the current view is becoming not visible,
  // clear the data in the view model
  previousViewModel?.clearData()
  previousVisible = visible
  previousViewModel = viewModel
  content = viewModel.content

  // Load the data when this view becomes visible
  if (visible) {
    viewModel.requestData()
  }
}
</script>

<!-- TEMPLATE -->
<Lazy bind:visible>
  {#if $content}
    <div class="graph-container">
      <ComparisonGraph viewModel={$content.comparisonGraphViewModel} />
    </div>
  {/if}
</Lazy>

<!-- STYLE -->
<style lang="scss">
.graph-container {
  position: relative;
  display: flex;
  width: 36rem;
  height: 22rem;
  margin-left: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}
</style>
