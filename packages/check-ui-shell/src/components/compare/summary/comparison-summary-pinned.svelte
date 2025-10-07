<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import { type Readable } from 'svelte/store'

import { flip } from 'svelte/animate'
import { dndzone } from 'svelte-dnd-action'

import type { ComparisonSummaryRowViewModel } from './comparison-summary-row-vm'
import SummaryRow from './comparison-summary-row.svelte'

export let rows: Readable<ComparisonSummaryRowViewModel[]>

const flipDurationMs = 300
const dispatch = createEventDispatcher()

// Rebuild the local array of pinned items when the source array is changed
type LocalItem = { id: string, row: ComparisonSummaryRowViewModel }
$: localItems = $rows.map(row => {
  // TODO: This isn't currently used, so not sure if `rowKey` is correct here
  return {
    id: row.rowKey,
    row
  }
})

function onDndConsider(e: CustomEvent): void {
  localItems = e.detail.items
}

function onDndFinalize(e: CustomEvent): void {
  // Apply the new order that resulted from the drag-and-drop event to the source array;
  // the `localItems` array will be updated as a result of changing the source array
  const items = e.detail.items as LocalItem[]
  dispatch('reordered', {
    rows: items.map(item => item.row)
  })
}

function onToggleItemPinned(row: ComparisonSummaryRowViewModel): void {
  dispatch('toggle', {
    row
  })
}

</script>




<!-- TEMPLATE -->
<template>

<div class="dnd-section" use:dndzone={{items: localItems, flipDurationMs}} on:consider={onDndConsider} on:finalize={onDndFinalize}>
  {#each localItems as item(item.id)}
    <div class="dnd-item" animate:flip={{duration: flipDurationMs}}>
      <SummaryRow viewModel={item.row} on:toggle-item-pinned={() => onToggleItemPinned(item.row)} on:command/>
    </div>
  {/each}
</div>

</template>




<!-- STYLE -->
<style lang='scss'>

.dnd-section {
  padding: .2rem 0;
}

.dnd-item {
  display: flex;
  width: fit-content;
  background-color: #272727;
}

</style>
