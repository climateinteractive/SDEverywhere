<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import SummaryRow from './check-summary-row.svelte'
import type { CheckSummaryTestViewModel } from './check-summary-test-vm'

export let viewModel: CheckSummaryTestViewModel
const expandAll = viewModel.expandAll

function onTestClicked() {
  expandAll.update(v => !v)
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include check-summary-test.pug

.row.test
  span.label(on:click!='{onTestClicked}') {@html viewModel.testRow.span}{$expandAll || viewModel.testRow.status !== 'passed' ? ':' : ''}
.test-rows(class:expand-all!='{$expandAll}')
  +rows

</template>
