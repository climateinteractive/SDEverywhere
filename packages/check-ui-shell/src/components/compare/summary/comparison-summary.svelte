<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import ComparisonSummarySection from './comparison-summary-section.svelte'
import type { ComparisonSummaryViewModel } from './comparison-summary-vm'

export let viewModel: ComparisonSummaryViewModel

</script>




<!-- TEMPLATE -->
<template>

<div class="comparison-summary-container">
  {#each viewModel.sections as section}
    <ComparisonSummarySection viewModel={section} on:command />
  {/each}
  <div class="footer"></div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.comparison-summary-container
  display: flex
  flex-direction: column
  padding-top: 2rem

.footer
  flex: 0 0 1rem

</style>
