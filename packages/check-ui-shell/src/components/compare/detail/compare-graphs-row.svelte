<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import ContextGraph from '../../graphs/context-graph.svelte'
import DatasetRow from './compare-graphs-dataset.svelte'
import type { CompareGraphsRowViewModel } from './compare-graphs-row-vm'

export let viewModel: CompareGraphsRowViewModel
export let align: 'center' | 'left' = 'center'

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-graphs-row.pug

.graphs-row
  +if('align === "center"')
    .spacer-flex
  .content
    .graphs-container
      ContextGraph(viewModel!='{viewModel.graphL}')
      .spacer-fixed
      ContextGraph(viewModel!='{viewModel.graphR}')
    .metadata-container
      .metadata-header id { viewModel.graphId }
      +if('viewModel.metadataRows.length > 0')
        .metadata-header Metadata differences:
        +metarows
      +if('viewModel.datasetRows.length > 0')
        .metadata-header Dataset differences:
        +datarows
  +if('align === "center"')
    .spacer-flex

</template>




<!-- STYLE -->
<style lang='sass'>

.graphs-row
  display: flex
  flex-direction: row
  flex: 1

.spacer-flex
  flex: 1

.spacer-fixed
  flex: 0 0 2rem

.content
  display: flex
  flex-direction: column
  flex: 1

.graphs-container
  display: flex
  flex-direction: row

.metadata-container
  display: flex
  flex-direction: column

.metadata-header
  margin-top: .6rem

.metadata-row
  display: flex
  flex-direction: row

.metadata-row:hover
  background-color: rgba(255, 255, 255, .05)

.metadata-col
  display: flex
  // XXX: This needs to match fixed `context-graph-container` width for now
  width: 38rem
  align-items: baseline

.metadata-key
  color: #aaa
  font-size: .8em
  margin-left: 1rem

</style>
