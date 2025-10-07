<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import StatsTableRow from './stats-table-row.svelte'
import type { StatsTableViewModel } from './stats-table-vm'

export let viewModel: StatsTableViewModel

</script>




<!-- TEMPLATE -->
<table class="header">
  <tr>
    <th></th>
    <th>inputs</th>
    <th>outputs</th>
    <th>model size (bytes)</th>
    <th>data size (bytes)</th>
    <th>avg time (ms)</th>
    <th class="dim">min time (ms)</th>
    <th class="dim">max time (ms)</th>
    <th></th>
  </tr>
  <tr>
    <StatsTableRow on:command viewModel={viewModel.row1} />
  </tr>
  <tr>
    <StatsTableRow on:command viewModel={viewModel.row2} />
  </tr>
  <tr>
    <StatsTableRow on:command viewModel={viewModel.row3} />
  </tr>
</table>




<!-- STYLE -->
<style lang='sass'>

table
  border-collapse: collapse

th
  color: #aaa
  text-align: left
  font-family: Roboto
  font-weight: 500

th.dim
  color: #555

th:nth-child(2), th:nth-child(3)
  width: 6rem

th:nth-child(4), th:nth-child(5)
  width: 10rem

th:nth-child(6)
  width: 8rem

th:nth-child(7), th:nth-child(8)
  width: 8rem

</style>
