<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import assertNever from 'assert-never'
import copyToClipboard from 'copy-text-to-clipboard'

import type { LinkItem } from '@sdeverywhere/check-core'

import Lazy from '../_shared/lazy.svelte'

import type { ContextGraphViewModel } from './context-graph-vm'
import type { GraphViewConfig } from './graph-view-config'
import Graph from './graph.svelte'
import Legend from './legend.svelte'

export let viewModel: ContextGraphViewModel
let content = viewModel.content
let visible = false

// If the width value is changed here, be sure to change the
// `graph-width` Sass variable below to match
const graphConfig: GraphViewConfig = {
  width: 38
}

// Rebuild the view state when the view model changes
let previousVisible = visible
let previousViewModel: ContextGraphViewModel
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

function onLinkClicked(linkItem: LinkItem) {
  switch (linkItem.kind) {
    case 'url':
      window.open(linkItem.content, '_blank')
      break
    case 'copy':
      copyToClipboard(linkItem.content)
      break
    default:
      assertNever(linkItem.kind)
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include context-graph.pug

.context-graph-container
  +if('viewModel.graphSpec')
    .graph-and-info
      .graph-title(class!='{viewModel.datasetClass}') { @html viewModel.graphSpec.title }
      +if('viewModel.requestKey')
        .graph-container
          Lazy(bind:visible!='{visible}')
            +if('$content && $content.graphData')
              Graph(viewModel!='{$content.graphData}' config!='{graphConfig}')
        Legend(graphSpec!='{viewModel.graphSpec}')
        +links
        +else
          .message.not-shown
            span Graph not shown: scenario is invalid in&nbsp;
            span(class!='{viewModel.datasetClass}') { viewModel.bundleName }
    +else
      .message.not-included
        span Graph not included in&nbsp;
        span(class!='{viewModel.datasetClass}') { viewModel.bundleName }

</template>




<!-- STYLE -->
<style lang='sass'>

// The graph columns have a fixed width of 38rem (38% of app width);
// this needs to match the `graphConfig.width` value above
$graph-width: 38rem
$graph-height: 20rem

.context-graph-container
  display: inline-flex
  flex-direction: column
  // Use a fixed width measured in viewport-relative units
  flex: 0 0 $graph-width
  background-color: #fff

.graph-and-info
  display: flex
  flex-direction: column

.graph-title
  margin: .5rem 0
  padding: 0 .8rem
  font-family: 'Roboto Condensed'
  font-size: 1.55rem

.graph-container
  display: block
  position: relative
  width: $graph-width
  height: $graph-height

.message
  display: flex
  flex: 1
  min-height: $graph-height
  align-items: center
  justify-content: center
  color: #aaa
  border: solid 1px #fff
  &.not-included
    background-color: #555

.link-container
  display: flex
  flex-direction: column
  align-items: flex-start
  margin-bottom: .4rem

.link-row
  height: 1.2rem
  margin: 0 .8rem
  color: #999
  cursor: pointer

.link-row:hover
  color: #000

</style>
