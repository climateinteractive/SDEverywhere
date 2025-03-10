<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import ComparisonSummarySection from './comparison-summary-section.svelte'
import ComparisonSummaryToc from './comparison-summary-toc.svelte'
import type { ComparisonSummaryViewModel } from './comparison-summary-vm'

export let viewModel: ComparisonSummaryViewModel

</script>




<!-- TEMPLATE -->
<template>

<div class="comparison-summary-container">
  {#if viewModel.kind !== 'views'}
    <ComparisonSummaryToc sections={viewModel.sections} />
  {/if}
  {#each viewModel.sections as section}
    <div class="section-container" id={section.header.rowKey}>
      <ComparisonSummarySection viewModel={section} on:command />
    </div>
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

.section-container
  display: flex
  flex-direction: column
  // Set scroll margin to account for headers when jumping to anchors
  scroll-margin-top: 5rem
  &:not(:last-child)
    margin-bottom: 1.5rem

.footer
  flex: 0 0 1rem

</style>
