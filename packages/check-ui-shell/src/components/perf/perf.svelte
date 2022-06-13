<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { PerfRunner } from '@sdeverywhere/check-core'

import DotPlot from './dot-plot.svelte'
import type { PerfViewModel } from './perf-vm'

export let viewModel: PerfViewModel
const rows = viewModel.rows

let running = false

function onRun() {
  running = true

  const perfRunner = new PerfRunner(viewModel.bundleModelL, viewModel.bundleModelR)
  perfRunner.onComplete = (summaryL, summaryR) => {
    viewModel.addRow(summaryL, summaryR)
    running = false
  }
  perfRunner.onError = error => {
    // TODO: Show error message in view
    console.error(error)
    running = false
  }
  perfRunner.start()
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include perf.pug

.perf-container
  .controls-container
    +if('!running')
      button.run(on:click!='{onRun}' disabled!='{running}') Run
      +else
        div Running performance tests, please wait…
  .table-container
    +if('$rows.length > 0')
      table
        tr
          th run
          th min
          th avg
          th max
        +rows

</template>




<!-- STYLE -->
<style lang='sass'>

.perf-container
  display: flex
  flex-direction: column
  padding: 0 1rem

.controls-container
  display: flex
  flex-direction: column
  align-items: flex-start
  height: 3rem

.table-container
  display: flex
  flex: 1

table
  border-collapse: collapse

td, th
  padding-top: .2rem
  padding-bottom: .2rem

th
  color: #aaa
  text-align: right
  font-weight: 500

td
  width: 4.5rem
  text-align: right
  font-family: monospace

td.rownum
  width: 2rem

td.dim
  color: #777

td.plot
  width: 30rem
  padding-left: 2rem
  padding-right: 2rem

</style>
