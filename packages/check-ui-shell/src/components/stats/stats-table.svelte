<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import StatsTableRow from './stats-table-row.svelte'
import type { StatsTableViewModel } from './stats-table-vm'

export let viewModel: StatsTableViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

table.header
  tr
    th
    th inputs
    th outputs
    th model size (bytes)
    th data size (bytes)
    th avg time (ms)
    th.dim min time (ms)
    th.dim max time (ms)
    th
  tr
    StatsTableRow(on:command viewModel!='{viewModel.row1}')
  tr
    StatsTableRow(on:command viewModel!='{viewModel.row2}')
  tr
    StatsTableRow(on:command viewModel!='{viewModel.row3}')

</template>




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
