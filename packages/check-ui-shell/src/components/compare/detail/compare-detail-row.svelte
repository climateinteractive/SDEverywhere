<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import ContextGraph from '../../graphs/context-graph.svelte'

import type {
  CompareDetailContextGraphRowViewModel,
  CompareDetailRowViewModel,
} from './compare-detail-row-vm'
import { createContextGraphRows } from './compare-detail-row-vm'
import DetailBox from './compare-detail-box.svelte'

export let viewModel: CompareDetailRowViewModel
let expandedIndex: number
let contextGraphRows: CompareDetailContextGraphRowViewModel[]

// Rebuild the view state when the view model changes
$: if (viewModel) {
  expandedIndex = undefined
  contextGraphRows = undefined
}

const dispatch = createEventDispatcher()

function onContextMenu(e: Event) {
  dispatch('show-context-menu', {
    kind: 'row',
    itemKey: viewModel.pinnedItemKey,
    clickEvent: e
  })
}

function isDimmed(index: number, expanded: number): boolean {
  return expanded !== undefined && index !== expanded
}

function onToggleContextGraphs(index: number): void {
  if (index === expandedIndex) {
    // This box is already expanded, so collapse it
    expandedIndex = undefined
    contextGraphRows = undefined
  } else {
    // Expand the clicked item
    expandedIndex = index
    contextGraphRows = createContextGraphRows(viewModel.boxes[index])
  }
}

function getContextGraphPadding(index: number): number {
  if (index === undefined) {
    return 0
  }

  if (viewModel.boxes.length > 0) {
    // Calculate the center of the box as a percentage of the width of the row
    return ((index + 0.5) / (viewModel.boxes.length)) * 100
  } else {
    return 0
  }
}

</script>




<!-- TEMPLATE -->
<template>

<div class="detail-row">
  {#if viewModel.title}
    <div class="title-row" on:contextmenu|preventDefault={onContextMenu}>
      <div class="title">{ @html viewModel.title }</div>
      {#if viewModel.subtitle}
        <div class="subtitle">{ @html viewModel.subtitle }</div>
      {/if}
    </div>
  {/if}

  <div class="boxes">
    {#each viewModel.boxes as boxViewModel, i}
      {#if i > 0}
        <div class="spacer-fixed"></div>
      {/if}
      <div class="box-container" class:dimmed={isDimmed(i, expandedIndex)}>
        <DetailBox viewModel={boxViewModel} on:toggle-context-graphs={() => onToggleContextGraphs(i)} on:show-context-menu />
      </div>
    {/each}
  </div>

  {#if expandedIndex !== undefined}
    <div class="context-graphs-container">
      <div style="min-width: max(0%, min(calc({getContextGraphPadding(expandedIndex)}% - 38.75rem), calc(100% - 77.5rem)))"></div>
      <div class="context-graphs-column">
        {#if contextGraphRows}
          {#each contextGraphRows as rowViewModel}
            <div class="context-graph-row">
              <ContextGraph viewModel={rowViewModel.graphL} />
              <div class="context-graph-spacer"></div>
              <ContextGraph viewModel={rowViewModel.graphR} />
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.detail-row
  display: flex
  flex-direction: column

.title-row
  align-items: baseline
  margin-bottom: .5rem

.title
  margin-right: .8rem
  font-size: 1.5em
  font-weight: 700

.subtitle
  font-size: 1.3em
  color: #aaa

.subtitle :global(.subtitle-sep)
  color: #666

.boxes
  display: flex
  flex-direction: row

.box-container.dimmed
  opacity: 0.2

.spacer-fixed
  min-width: 1.5rem

.context-graphs-container
  display: inline-flex
  flex-direction: row
  margin-top: 1rem
  padding: 0 1rem
  background-color: #555

.context-graphs-column
  display: inline-flex
  flex-direction: column

.context-graph-row
  display: flex
  flex-direction: row
  // XXX: Remove this hardcoded value
  width: 77.5rem
  margin: 1rem 0

.context-graph-spacer
  min-width: 1.5rem

</style>
