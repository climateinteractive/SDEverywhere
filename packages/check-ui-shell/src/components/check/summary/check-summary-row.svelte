<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import CheckGraphBox from './check-summary-graph-box.svelte'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'

export let viewModel: CheckSummaryRowViewModel
export let onShowContextMenu: (event: MouseEvent, viewModel: CheckSummaryRowViewModel) => void | undefined

$: childRows = viewModel.childRows
$: expanded = viewModel.expanded

function onLabelClicked() {
  viewModel.onClicked()
}

function onContextMenu(event: MouseEvent) {
  // Show context menu for test rows (with testInfo) or scenario rows (with scenario spec)
  if (!viewModel.testInfo && !viewModel.scenarioReport?.checkScenario?.spec) {
    return
  }
  event.preventDefault()
  onShowContextMenu?.(event, viewModel)
}
</script>

<!-- TEMPLATE -->
<div class={`row ${viewModel.rowClasses}`} on:contextmenu={onContextMenu}>
  <span class="label" on:click={onLabelClicked}>{@html viewModel.span}</span>
</div>
{#if $expanded}
  {#if viewModel.graphBoxViewModel}
    <div class="row check-graph">
      <CheckGraphBox viewModel={viewModel.graphBoxViewModel} />
    </div>
  {:else}
    <div class="child-rows">
      {#each $childRows as childRow}
        <svelte:self viewModel={childRow} {onShowContextMenu} />
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
