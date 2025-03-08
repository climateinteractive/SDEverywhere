<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import SummaryRow from './comparison-summary-row.svelte'
import type { ComparisonSummarySectionViewModel } from './comparison-summary-section-vm'

export let viewModel: ComparisonSummarySectionViewModel
const expanded = viewModel.expanded

function onHeaderClicked() {
  expanded.update(value => !value)
}

</script>



<!-- TEMPLATE -->
<template>

<div class="section-container">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="header-container {$expanded ? 'expanded' : 'collapsed'}" on:click={onHeaderClicked}>
    <SummaryRow viewModel={viewModel.header} />
  </div>
  {#if $expanded}
    {#each viewModel.rows as rowViewModel}
      <SummaryRow viewModel={rowViewModel} on:command />
    {/each}
  {/if}
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.section-container
  display: flex
  flex-direction: column
  &:not(:last-child)
    margin-bottom: 1.5rem

.header-container
  display: flex
  align-items: center
  cursor: pointer
  &.collapsed
    opacity: 0.5
  &:hover
    opacity: 0.8

</style>
