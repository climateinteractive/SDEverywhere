<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'
import type { CheckSummaryTestViewModel } from './check-summary-test-vm'

import SummaryRow from './check-summary-row.svelte'

export let viewModel: CheckSummaryTestViewModel
const childRows = viewModel.childRows
const childrenVisible = viewModel.childrenVisible

function onTestClicked() {
  childrenVisible.update(v => !v)
}

function onChildRowLabelClicked(rowViewModel: CheckSummaryRowViewModel) {
  rowViewModel.onClicked()
}
</script>

<!-- TEMPLATE -->
<div class="row test">
  <span class="label" on:click={onTestClicked}>{@html viewModel.testRow.span}{$childrenVisible ? ':' : ''}</span>
</div>
<div class="test-rows" class:children-visible={$childrenVisible}>
  {#each $childRows as row}
    <SummaryRow viewModel={row} onLabelClicked={() => onChildRowLabelClicked(row)} />
  {/each}
</div>
