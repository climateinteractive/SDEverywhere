<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import CheckSummary from '../check/summary/check-summary.svelte'
import ComparisonSummary from '../compare/summary/comparison-summary.svelte'
import StatsTable from '../stats/stats-table.svelte'

import TabBar from './tab-bar.svelte'
import type { SummaryViewModel } from './summary-vm'

export let viewModel: SummaryViewModel
const selectedTabId = viewModel.tabBarViewModel.selectedItemId

</script>




<!-- TEMPLATE -->
<div class="summary-container">
  <div class="scroll-container">
    {#if viewModel.statsTableViewModel}
      <div class="header-container">
        <StatsTable on:command viewModel={viewModel.statsTableViewModel} />
      </div>
      <div class="line"></div>
    {/if}
    <TabBar on:command viewModel={viewModel.tabBarViewModel} />
    {#if $selectedTabId === "checks"}
      <CheckSummary viewModel={viewModel.checkSummaryViewModel} />
    {:else if $selectedTabId === "comp-views"}
      <ComparisonSummary on:command viewModel={viewModel.comparisonViewsSummaryViewModel} />
    {:else if $selectedTabId === "comps-by-scenario"}
      <ComparisonSummary on:command viewModel={viewModel.comparisonsByScenarioSummaryViewModel} />
    {:else if $selectedTabId === "comps-by-dataset"}
      <ComparisonSummary on:command viewModel={viewModel.comparisonsByDatasetSummaryViewModel} />
    {/if}
  </div>
</div>




<!-- STYLE -->
<style lang='scss'>

.summary-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.scroll-container {
  position: relative;
  display: flex;
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px;
  flex-direction: column;
  padding: 0 1rem;
  overflow: auto;
}

.header-container {
  margin-bottom: 1rem;
}

.line {
  min-height: 1px;
  margin-bottom: .5rem;
  background-color: #555;
}

</style>
