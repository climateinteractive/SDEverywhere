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
<template lang='pug'>

include compare-detail-row.pug

.detail-row
  +if('viewModel.showTitle')
    .title-row
      .title { viewModel.title }
      +if('viewModel.subtitle')
        .subtitle { @html viewModel.subtitle }
  .boxes
    .box-container(class:dimmed!='{isDimmed(0, expandedIndex)}')
      +if('viewModel.boxes[0]')
        DetailBox(on:toggle!='{() => onToggle(0)}' viewModel!='{viewModel.boxes[0]}')
    .spacer-flex
    .box-container(class:dimmed!='{isDimmed(1, expandedIndex)}')
      +if('viewModel.boxes[1]')
        DetailBox(on:toggle!='{() => onToggle(1)}' viewModel!='{viewModel.boxes[1]}')
    .spacer-flex
    .box-container(class:dimmed!='{isDimmed(2, expandedIndex)}')
      +if('viewModel.boxes[2]')
        DetailBox(on:toggle!='{() => onToggle(2)}' viewModel!='{viewModel.boxes[2]}')
  +if('expandedIndex !== undefined')
    .context-graphs-container
      +if('contextGraphRows')
        +contextgraphs

</template>




<!-- STYLE -->
<style lang='sass'>

.detail-row
  display: flex
  flex-direction: column

.title-row
  display: flex
  flex-direction: row
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
  flex: 1

.box-container
  // XXX: This needs to have a fixed width that matches content-container width in
  // compare-detail-box.svelte so that spacing is maintained when a box is undefined
  width: 31.6rem
  height: 29rem

.box-container.dimmed
  opacity: 0.2

.spacer-flex
  flex: 1

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
