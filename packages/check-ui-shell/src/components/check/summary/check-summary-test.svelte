<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import SummaryRow from './check-summary-row.svelte'
import type { CheckSummaryTestViewModel } from './check-summary-test-vm'

export let viewModel: CheckSummaryTestViewModel
const expandAll = viewModel.expandAll

function onTestClicked() {
  expandAll.update(v => !v)
}
</script>

<!-- TEMPLATE -->
<div class="row test">
  <span class="label" on:click={onTestClicked}
    >{@html viewModel.testRow.span}{$expandAll || viewModel.testRow.status !== 'passed' ? ':' : ''}</span
  >
</div>
<div class="test-rows" class:expand-all={$expandAll}>
  {#each viewModel.childRows as row}
    <SummaryRow viewModel={row} />
  {/each}
</div>
