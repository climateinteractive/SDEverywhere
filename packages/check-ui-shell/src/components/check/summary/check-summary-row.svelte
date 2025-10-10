<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import CheckGraphBox from './check-summary-graph-box.svelte'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'

export let viewModel: CheckSummaryRowViewModel
$: childRowsVisible = viewModel.childRowsVisible
$: childRows = viewModel.childRows

function onLabelClicked() {
  viewModel.onClicked()
}
</script>

<!-- TEMPLATE -->
<div class={`row ${viewModel.rowClasses}`}>
  <span class="label" on:click={onLabelClicked}>{@html viewModel.span}</span>
</div>
{#if $childRowsVisible}
  {#if viewModel.graphBoxViewModel}
    <div class={`row check-graph ${viewModel.rowClasses}`}>
      <CheckGraphBox viewModel={viewModel.graphBoxViewModel} />
    </div>
  {:else}
    <div class="child-rows">
      {#each $childRows as childRow}
        <svelte:self viewModel={childRow} />
      {/each}
    </div>
  {/if}
{/if}

<!-- STYLE -->
<style lang="scss">
.check-graph {
  height: 23rem;
  margin-left: 8.5rem;
}
</style>
