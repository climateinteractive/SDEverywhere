<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import ContextGraph from '../../graphs/context-graph.svelte'
import DatasetRow from './compare-graphs-dataset.svelte'
import type { CompareGraphsRowViewModel } from './compare-graphs-row-vm'

export let viewModel: CompareGraphsRowViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include compare-graphs-row.pug

.graphs-row
  .content
    .graphs-container
      .spacer-flex
      ContextGraph(viewModel!='{viewModel.graphL}')
      .spacer-fixed
      ContextGraph(viewModel!='{viewModel.graphR}')
      .spacer-flex
    .metadata-container
      .metadata-header id { viewModel.graphId }
      +if('viewModel.metadataRows.length > 0')
        .metadata-header Metadata differences:
        +metarows
      +if('viewModel.datasetRows.length > 0')
        .metadata-header Dataset differences:
        +datarows

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
  flex: 1
  padding: 0 10rem

.metadata-header
  margin-top: .6rem

.metadata-row
  display: flex
  flex-direction: row
  flex: 1

.metadata-row:hover
  background-color: rgba(255, 255, 255, .05)

.metadata-col
  display: flex
  flex: 1
  align-items: baseline

.metadata-key
  color: #aaa
  font-size: .8em
  margin-left: .5rem

</style>
