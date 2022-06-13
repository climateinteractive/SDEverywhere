<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import CheckSummary from '../check/summary/check-summary.svelte'
import CompareSummary from '../compare/summary/compare-summary.svelte'
import StatsTable from '../stats/stats-table.svelte'
import type { SummaryViewModel } from './summary-vm'

export let viewModel: SummaryViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.summary-container
  .scroll-container
    +if('viewModel.statsTableViewModel')
      .header-container
        StatsTable(on:command viewModel!='{viewModel.statsTableViewModel}')
      .line
    .section-title Checks
    CheckSummary(viewModel!='{viewModel.checkSummaryViewModel}')
    +if('viewModel.compareSummaryViewModel')
      .line
      .section-title Comparisons
      CompareSummary(on:command viewModel!='{viewModel.compareSummaryViewModel}')

</template>




<!-- STYLE -->
<style lang='sass'>

.summary-container
  display: flex
  flex-direction: column
  flex: 1

.scroll-container
  display: flex
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px
  flex-direction: column
  padding: 0 1rem
  overflow: auto

.header-container
  margin-bottom: 1rem

.line
  min-height: 1px
  margin-bottom: 1rem
  background-color: #555

.section-title
  font-size: 1.7em
  font-weight: 700
  margin-bottom: 1rem

</style>
