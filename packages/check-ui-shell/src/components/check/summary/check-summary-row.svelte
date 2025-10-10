<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import CheckGraphBox from './check-summary-graph-box.svelte'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'

export let viewModel: CheckSummaryRowViewModel
export let onLabelClicked: () => void = () => {}

$: graphVisible = viewModel.graphVisible
</script>

<!-- TEMPLATE -->
<div class={`row ${viewModel.rowClasses}`}>
  <span class="label" on:click={onLabelClicked}>{@html viewModel.span}</span>
</div>
{#if viewModel.graphBoxViewModel && $graphVisible}
  <div class={`row check-graph ${viewModel.rowClasses}`}>
    <CheckGraphBox viewModel={viewModel.graphBoxViewModel} />
  </div>
{/if}

<!-- STYLE -->
<style>
.check-graph {
  height: 23rem;
  margin-left: 8.5rem;
}
</style>
