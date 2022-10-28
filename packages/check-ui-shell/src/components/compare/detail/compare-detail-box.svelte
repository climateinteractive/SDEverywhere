<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import Lazy from '../../_shared/lazy.svelte'
import ComparisonGraph from '../../graphs/comparison-graph.svelte'

import type { CompareDetailBoxViewModel } from './compare-detail-box-vm'

export let viewModel: CompareDetailBoxViewModel
let content = viewModel.content
let visible = false

// Rebuild the view state when the view model changes
let previousVisible = visible
let previousViewModel: CompareDetailBoxViewModel
$: if (visible !== previousVisible || viewModel.requestKey !== previousViewModel?.requestKey) {
  // If the view model is changing, or if the current view is becoming not visible,
  // clear the data in the view model
  previousViewModel?.clearData()
  previousVisible = visible
  previousViewModel = viewModel
  content = viewModel.content

  // Load the data when this view becomes visible
  if (visible) {
    viewModel.requestData()
  }
}

const dispatch = createEventDispatcher()

function onTitleClicked() {
  dispatch('toggle')
}

function diffPct(x: number | undefined | null): string {
  if (x !== undefined && x !== null) {
    return `${x.toFixed(2)}%`
  } else {
    return 'n/a'
  }
}

function diffPoint(x: number | undefined | null): string {
  if (x !== undefined && x !== null) {
    return x.toFixed(4)
  } else {
    return 'undefined'
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.detail-box
  +if('viewModel.title')
    .title-row.no-selection
      .title(on:click!='{onTitleClicked}') {@html viewModel.title}
      +if('viewModel.subtitle')
        .subtitle {@html viewModel.subtitle}
  .content-container
    Lazy(bind:visible!='{visible}')
      +if('$content')
        .content(class!='bucket-border-{$content.bucketIndex}')
          .graph-container
            ComparisonGraph(viewModel!='{$content.comparisonGraphViewModel}' width=30 height=22)
          .message-container
            +if('$content.message')
              .message {@html $content.message}
              +else
                .data-row
                  .data-label avg
                  .data-value {diffPct($content.diffReport.avgDiff)}
                .data-row
                  .data-label min
                  .data-value {diffPct($content.diffReport.minDiff)}
                .data-row
                  .data-label max
                  .data-value {diffPct($content.diffReport.maxDiff)}
                  +if('$content.diffReport.maxDiffPoint')
                    .data-value &nbsp;(
                    .data-value.dataset-color-0 {diffPoint($content.diffReport.maxDiffPoint.valueL)}
                    .data-value &nbsp;|&nbsp;
                    .data-value.dataset-color-1 {diffPoint($content.diffReport.maxDiffPoint.valueR)}
                    .data-value ) at {$content.diffReport.maxDiffPoint.time}

</template>




<!-- STYLE -->
<style lang='sass'>

.detail-box
  display: flex
  flex-direction: column

.title-row
  display: flex
  flex-direction: row
  align-items: baseline

.title
  font-size: 1.1em
  font-weight: 700
  cursor: pointer

.subtitle
  color: #aaa
  margin-left: .4rem

.content-container
  display: flex
  flex-direction: column
  // XXX: This is content width + padding + border; we use a fixed size so that
  // the box layout remains stable when the graph content is loaded lazily
  width: 31.6rem
  // XXX: This is content height + padding + border; has to be a fixed size
  // (rather than using inline-flex), otherwise lazy loading doesn't work well
  height: 27.6rem

.content
  display: flex
  flex-direction: column
  height: 26rem
  padding: .5rem
  border-width: .3rem
  border-style: solid

.graph-container
  position: relative
  display: flex
  width: 30rem
  height: 22rem
  margin-bottom: .2rem

.message-container
  display: flex
  flex-direction: column
  flex: 1
  justify-content: center

.data-row
  display: flex
  flex-direction: row
  align-items: baseline

.data-label
  font-size: .9em
  color: #aaa
  width: 2rem
  margin-right: .4rem
  text-align: right

</style>
