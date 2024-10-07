<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

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

function isDimmed(index: number, expanded: number): boolean {
  return expanded !== undefined && index !== expanded
}

function onToggle(index: number): void {
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

</script>




<!-- TEMPLATE -->
<template>

<div class="detail-row">
  {#if viewModel.showTitle}
    <div class="title-row">
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
        <DetailBox viewModel={boxViewModel} on:toggle={() => onToggle(i)} />
      </div>
    {/each}
  </div>

  {#if expandedIndex !== undefined}
    <div class="context-graphs-container">
      {#if contextGraphRows}
        {#each contextGraphRows as rowViewModel}
          <div class="context-graph-row">
            <div class="spacer-flex"></div>
            <ContextGraph viewModel={rowViewModel.graphL} />
            <div class="context-graph-spacer"></div>
            <ContextGraph viewModel={rowViewModel.graphR} />
            <div class="spacer-flex"></div>
          </div>
        {/each}
      {/if}
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
  font-size: 1.6em
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
  width: 1.5rem

.context-graphs-container
  display: inline-flex
  flex-direction: column
  margin-top: 1rem
  background-color: #555

.context-graph-row
  display: flex
  flex-direction: row
  margin: 1rem 0

.context-graph-spacer
  flex: 0 0 2rem

</style>
