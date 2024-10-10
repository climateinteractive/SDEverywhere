<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import SummaryRow from './comparison-summary-row.svelte'
import type { ComparisonSummaryViewModel } from './comparison-summary-vm'

export let viewModel: ComparisonSummaryViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include comparison-summary.pug

.comparison-summary-container
  +if('viewModel.kind === "views"')
    +view-group-sections
    +else
      +section('withErrors')
      +section('onlyInLeft')
      +section('onlyInRight')
      +section('withDiffs')
      +section('withoutDiffs')
  .footer

</template>




<!-- STYLE -->
<style lang='sass'>

.comparison-summary-container
  display: flex
  flex-direction: column
  padding-top: 2rem

.section-container
  display: flex
  flex-direction: column
  &:not(:last-child)
    margin-bottom: 1.5rem

.footer
  flex: 0 0 1rem

</style>
