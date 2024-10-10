<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import { flip } from 'svelte/animate'
import { dndzone } from 'svelte-dnd-action'

import PinnedSection from './comparison-summary-pinned.svelte'
import type { ComparisonSummaryRowViewModel } from './comparison-summary-row-vm'
import SummaryRow from './comparison-summary-row.svelte'
import type { ComparisonSummaryViewModel } from './comparison-summary-vm'

export let viewModel: ComparisonSummaryViewModel
const pinnedKind = viewModel.kind === 'by-item' && viewModel.itemKind === 'scenario' ? 'scenarios' : 'outputs'
const pinnedTitle = `Pinned ${pinnedKind}…`
const pinnedRows = viewModel.kind === 'by-item' ? viewModel.pinnedRows : undefined

function onToggleItemPinned(row: ComparisonSummaryRowViewModel): void {
  if (viewModel.kind === 'by-item') {
    viewModel.toggleItemPinned(row)
  }
}

function onPinnedItemsReordered(rows: ComparisonSummaryRowViewModel[]): void {
  if (viewModel.kind === 'by-item') {
    viewModel.setReorderedPinnedItems(rows)
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include comparison-summary.pug

.comparison-summary-container
  +if('viewModel.kind === "views"')
    +view-group-sections
    +else
      +if('$pinnedRows.length > 0')
        .section-container
          SummaryRow(viewModel!=`{{ title: pinnedTitle, header: true }}`)
          PinnedSection(rows!='{viewModel.pinnedRows}' on:toggle!='{e => onToggleItemPinned(e.detail.row)}' on:reordered!='{e => onPinnedItemsReordered(e.detail.rows)}' on:command)
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
