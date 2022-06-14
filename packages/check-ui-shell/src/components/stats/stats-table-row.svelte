<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'
import DotPlot from '../perf/dot-plot.svelte'
import type { StatsTableRowViewModel } from './stats-table-row-vm'

export let viewModel: StatsTableRowViewModel
const classNum = viewModel.datasetClassIndex
const modelTextClass = classNum !== undefined ? `dataset-color-${classNum}` : 'row-header'
const modelBgClass = classNum !== undefined ? `dataset-bg-${classNum}` : ''

const dispatch = createEventDispatcher()

function onShowPerf() {
  dispatch('command', { cmd: 'show-perf' })
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

td.name(class!='{modelTextClass}') { viewModel.modelName }
td
  .cell
    .value { viewModel.inputs }
    .change
td
  .cell
    .value { viewModel.outputs }
    .change
td
  .cell
    .value { viewModel.modelSize }
    .change { viewModel.modelSizePctChange }
td
  .cell
    .value { viewModel.dataSize }
    .change { viewModel.dataSizePctChange }
td
  .cell
    .value { viewModel.avgTime }
    .change { viewModel.avgTimePctChange }
td
  .cell.dim
    .value { viewModel.minTime }
    .change
td
  .cell.dim
    .value { viewModel.maxTime }
    .change
+if('viewModel.dotPlot')
  td.plot(on:click!='{onShowPerf}')
    DotPlot(viewModel!='{viewModel.dotPlot}' colorClass!='{modelBgClass}')

</template>




<!-- STYLE -->
<style lang='sass'>

td
  padding: 0
  height: 1.8rem

.name
  padding-right: 3rem

:global(.row-header)
  color: #aaa

.cell
  display: flex
  width: 100%
  flex-direction: row
  align-items: baseline
  font-family: monospace

.cell.dim
  color: #777

.value
  flex: 1
  padding-right: .4rem
  text-align: right

.change
  flex: 1
  padding-left: .4rem
  text-align: left
  font-size: .8em

.plot
  width: 20rem
  padding-left: 2rem
  padding-right: 2rem
  cursor: pointer

</style>
