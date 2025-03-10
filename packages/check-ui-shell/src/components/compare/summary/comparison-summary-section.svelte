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
  <div class="header-row {$expanded ? 'expanded' : 'collapsed'}" on:click={onHeaderClicked}>
    <div class="header-bar"></div>
    <div class="header-title">{ @html viewModel.header.title }</div>
    {#if viewModel.rowsWithDiffs > 0}
      <div class="header-count">{viewModel.rowsWithDiffs}</div>
    {/if}
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

// TODO: Share with comparison-summary-row
$bar-width: 15rem

.section-container
  display: flex
  flex-direction: column
  &:not(:last-child)
    margin-bottom: 1.5rem

.header-row
  display: flex
  flex-direction: row
  align-items: center
  margin: .4rem 0
  cursor: pointer
  &.collapsed
    opacity: 0.5
  &:hover
    opacity: 0.8

.header-bar
  display: flex
  width: $bar-width
  height: 1px
  background-color: #555

.header-title
  margin-left: .8rem
  color: #fff
  font-size: 1.2em

.header-count
  margin-left: .5rem
  padding: .1rem .5rem
  border-radius: 1rem
  background-color: #9f7f20
  color: #eee
  font-size: .85em

</style>
