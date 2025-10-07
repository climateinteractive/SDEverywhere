<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import StatsTableRow from './stats-table-row.svelte'
import type { StatsTableViewModel } from './stats-table-vm'

export let viewModel: StatsTableViewModel
</script>

<!-- TEMPLATE -->
<table class="header">
  <thead>
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
  </thead>
  <tbody>
    <tr>
      <StatsTableRow on:command viewModel={viewModel.row1} />
    </tr>
    <tr>
      <StatsTableRow on:command viewModel={viewModel.row2} />
    </tr>
    <tr>
      <StatsTableRow on:command viewModel={viewModel.row3} />
    </tr>
  </tbody>
</table>

<!-- STYLE -->
<style lang="scss">
table {
  border-collapse: collapse;
}

th {
  color: #aaa;
  text-align: left;
  font-family: Roboto;
  font-weight: 500;

  &.dim {
    color: #555;
  }

  &:nth-child(2),
  &:nth-child(3) {
    width: 6rem;
  }

  &:nth-child(4),
  &:nth-child(5) {
    width: 10rem;
  }

  &:nth-child(6) {
    width: 8rem;
  }

  &:nth-child(7),
  &:nth-child(8) {
    width: 8rem;
  }
}
</style>
