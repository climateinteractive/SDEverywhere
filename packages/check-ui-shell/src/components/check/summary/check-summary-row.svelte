<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import CheckGraphBox from './check-summary-graph-box.svelte'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'

export let viewModel: CheckSummaryRowViewModel
const graphVisible = viewModel.graphVisible

function onLabelClicked() {
  graphVisible.update(v => !v)
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.row(class!='{viewModel.rowClasses}')
  span.label(on:click!='{onLabelClicked}') {@html viewModel.span}
+if('viewModel.graphBoxViewModel && $graphVisible')
  .row.check-graph(class!='{viewModel.rowClasses}')
    CheckGraphBox(viewModel!='{viewModel.graphBoxViewModel}')

</template>




<!-- STYLE -->
<style lang='sass'>

.check-graph
  height: 23rem
  margin-left: 8.5rem

</style>
