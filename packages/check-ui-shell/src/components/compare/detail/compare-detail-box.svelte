<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import Lazy from '../../_shared/lazy.svelte'
import ComparisonGraph from '../../graphs/comparison-graph.svelte'

import type { CompareDetailBoxContent, CompareDetailBoxViewModel } from './compare-detail-box-vm'

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

function getMaxDiffSpan(content: CompareDetailBoxContent): string {
  const maxDiffPoint = content.diffReport.maxDiffPoint
  let span = ''
  span += diffPct(content.diffReport.maxDiff)
  if (maxDiffPoint) {
    span += '&nbsp;('
    span += `<span class="dataset-color-0">${diffPoint(maxDiffPoint.valueL)}</span>`
    span += '&nbsp;|&nbsp;'
    span += `<span class="dataset-color-1">${diffPoint(maxDiffPoint.valueR)}</span>`
    span += `) at ${maxDiffPoint.time}`
  }
  return span
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.detail-box
  +if('viewModel.title')
    .title-row.no-selection(on:click!='{onTitleClicked}')
      .title-content
        span.title {@html viewModel.title}
        +if('viewModel.subtitle')
          span.subtitle {@html viewModel.subtitle}
  .content-container
    Lazy(bind:visible!='{visible}')
      +if('$content')
        .content(class!='{$content.bucketClass}')
          .graph-container
            ComparisonGraph(viewModel!='{$content.comparisonGraphViewModel}')
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
                  .data-value {@html getMaxDiffSpan($content)}

</template>




<!-- STYLE -->
<style lang='sass'>

$border-w: .3rem
$border-w-2x: $border-w * 2

$padding-w: .5rem
$padding-w-2x: $padding-w * 2

$stats-h: 4rem

.detail-box
  display: flex
  flex-direction: column
  --box-graph-w: calc(30rem * var(--graph-zoom))
  --box-graph-h: calc(22rem * var(--graph-zoom))

.title-row
  position: relative
  max-width: calc(var(--box-graph-w) + 1rem)
  height: 1.4rem
  cursor: pointer

.title-content
  position: absolute
  max-width: calc(var(--box-graph-w) + 1rem)
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.title-content:hover
  width: max-content
  max-width: unset
  overflow: unset
  z-index: 100
  background-color: #3c3c3c

.title
  margin-left: .7rem
  font-size: 1.1em
  font-weight: 700

.subtitle
  color: #aaa
  margin-left: .4rem
  margin-right: .7rem

.content-container
  display: flex
  flex-direction: column
  // XXX: This is content size + padding + border; we use a fixed size so that
  // the box layout remains stable when the graph content is loaded lazily
  width: calc(var(--box-graph-w) + $padding-w-2x + $border-w-2x)
  max-width: calc(var(--box-graph-w) + $padding-w-2x + $border-w-2x)
  height: calc(var(--box-graph-h) + $stats-h + $padding-w-2x + $border-w-2x)
  max-height: calc(var(--box-graph-h) + $stats-h + $padding-w-2x + $border-w-2x)

.content
  display: flex
  flex-direction: column
  height: calc(var(--box-graph-h) + $stats-h)
  padding: $padding-w
  border-width: $border-w
  border-style: solid
  border-radius: .8rem

.graph-container
  position: relative
  display: flex
  width: var(--box-graph-w)
  height: var(--box-graph-h)

.message-container
  display: flex
  flex-direction: column
  max-width: var(--box-graph-w)
  height: $stats-h
  justify-content: flex-end

.message
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.data-row
  display: flex
  flex-direction: row
  align-items: baseline

.data-label
  font-size: .9em
  color: #aaa
  min-width: 2rem
  margin-right: .4rem
  text-align: right

.data-value
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

</style>
