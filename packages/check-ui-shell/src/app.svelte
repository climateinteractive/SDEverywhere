<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import FontFaceObserver from 'fontfaceobserver'

import CompareDetail from './components/compare/detail/compare-detail.svelte'
import type { CompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import CompareGraphs from './components/compare/graphs/compare-graphs.svelte'
import Header from './components/header/header.svelte'
import type { PerfViewModel } from './components/perf/perf-vm'
import Perf from './components/perf/perf.svelte'
import Summary from './components/summary/summary.svelte'

import type { AppViewModel } from './app-vm'

export let viewModel: AppViewModel
const checksInProgress = viewModel.checksInProgress
const progress = viewModel.progress

let compareDetailViewModel: CompareDetailViewModel
let perfViewModel: PerfViewModel

type ViewMode = 'summary' | 'compare-graphs' | 'compare-detail' | 'perf'
let viewMode: ViewMode = 'summary'

// Under normal circumstances, the font face used in graphs might not be fully
// loaded by the browser before one or more graphs are rendered for the first time,
// which means they could be displayed with an ugly fallback (serif) font.  (This
// occurs more frequently in Firefox and Chrome than in Safari.)  As a workaround,
// observe loading of the font used by the graphs (Roboto Condensed 400) so
// that we can wait for it to be loaded before rendering the app.
const graphFont = new FontFaceObserver('Roboto Condensed', { weight: 400 })
let graphFontReady = false
graphFont.load().then(() => {
  graphFontReady = true
})

// Wait for the fonts to be loaded before we render the app
let viewReady = false
$: if (graphFontReady) {
  // Set a flag indicating that the view is ready to be displayed
  viewReady = true

  // Run the check/compare test suite
  viewModel.runTestSuite()
}

function onCommand(event: CustomEvent) {
  const cmdObj = event.detail
  const cmd = cmdObj.cmd
  switch (cmd) {
    case 'show-summary':
      compareDetailViewModel = undefined
      viewMode = 'summary'
      break
    case 'show-compare-graphs':
      viewMode = 'compare-graphs'
      break
    case 'show-compare-detail':
      compareDetailViewModel = viewModel.createCompareDetailViewModelForSummaryRow(cmdObj.summaryRow)
      viewMode = 'compare-detail'
      break
    case 'show-compare-detail-at-index':
      compareDetailViewModel = viewModel.createCompareDetailViewModelForSummaryRowIndex(cmdObj.index)
      viewMode = 'compare-detail'
      break
    case 'show-perf':
      if (!perfViewModel) {
        perfViewModel = viewModel.createPerfViewModel()
      }
      viewMode = 'perf'
      break
    default:
      console.error(`ERROR: Unhandled command ${cmd}`)
      break
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

+await('viewReady')
  .loading-container
  +then('ignored')
    .app-container
      Header(on:command!='{onCommand}' viewModel!='{viewModel.headerViewModel}')
      +if('$checksInProgress')
        .progress-container
          .progress {$progress}
        +elseif('viewMode === "compare-detail"')
          CompareDetail(on:command!='{onCommand}' viewModel!='{compareDetailViewModel}')
        +elseif('viewMode === "compare-graphs"')
          CompareGraphs(viewModel!='{viewModel.summaryViewModel.compareGraphsViewModel}')
        +elseif('viewMode === "perf"')
          Perf(on:command!='{onCommand}' viewModel!='{perfViewModel}')
        +else
          Summary(on:command!='{onCommand}' viewModel!='{viewModel.summaryViewModel}')

</template>




<!-- STYLE -->
<style lang='sass'>

.app-container
  display: flex
  flex-direction: column
  flex: 1

.loading-container
  display: flex
  flex-direction: column
  flex: 1 1 auto
  align-items: center
  justify-content: center

.progress-container
  display: flex
  height: 100vh
  align-items: center
  justify-content: center
  font-size: 2em

</style>
