<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import SummaryRow from './compare-summary-row.svelte'
import type { CompareSummaryViewModel } from './compare-summary-vm'

export let viewModel: CompareSummaryViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-summary.pug

.compare-summary-container
  +section('allGraphs')
  +section('datasetsAdded')
  +section('datasetsRemoved')
  +section('datasetsWithDiffs')
  +section('datasetsWithoutDiffs')
  +section('scenariosWithDiffs')
  +section('scenariosWithoutDiffs')
  .footer

</template>




<!-- STYLE -->
<style lang='sass'>

.compare-summary-container
  display: flex
  flex-direction: column

.section-container
  display: flex
  flex-direction: column
  align-items: flex-start
  margin-bottom: 1rem

.section-header
  margin-bottom: .5rem

.footer
  flex: 0 0 1rem

</style>
