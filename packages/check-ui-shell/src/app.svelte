<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import FontFaceObserver from 'fontfaceobserver'

import type { ComparisonGroupingKind } from './components/compare/_shared/comparison-grouping-kind'
import ComparisonDetail from './components/compare/detail/compare-detail.svelte'
import type { CompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import type { FreeformViewModel } from './components/freeform/freeform-vm'
import Freeform from './components/freeform/freeform.svelte'
import Header from './components/header/header.svelte'
import type { PerfViewModel } from './components/perf/perf-vm'
import Perf from './components/perf/perf.svelte'
import Trace from './components/trace/trace.svelte'
import Summary from './components/summary/summary.svelte'

import type { AppViewModel } from './app-vm'

export let viewModel: AppViewModel
const checksInProgress = viewModel.checksInProgress
const progress = viewModel.progress
const zoom = viewModel.headerViewModel.zoom

let compareDetailViewModel: CompareDetailViewModel
let perfViewModel: PerfViewModel
let freeformViewModel: FreeformViewModel

type ViewMode = 'summary' | 'comparison-detail' | 'perf' | 'freeform' | 'trace'
let viewMode: ViewMode = 'summary'

$: appStyle = `--graph-zoom: ${$zoom}`

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

  // Run the check/comparison test suite
  viewModel.runTestSuite()
}

function showSummary(): void {
  compareDetailViewModel = undefined
  viewMode = 'summary'
}

function onCommand(event: CustomEvent) {
  const cmdObj = event.detail
  const cmd = cmdObj.cmd
  switch (cmd) {
    case 'show-summary':
      showSummary()
      break
    case 'enter-tab':
      if (cmdObj.itemId !== 'checks') {
        let kind: ComparisonGroupingKind
        switch (cmdObj.itemId) {
          case 'comp-views':
            kind = 'views'
            break
          case 'comps-by-scenario':
            kind = 'by-scenario'
            break
          case 'comps-by-dataset':
            kind = 'by-dataset'
            break
          default:
            return
        }
        const first = viewModel.createCompareDetailViewModelForFirstSummaryRow(kind)
        if (first) {
          compareDetailViewModel = first
          viewMode = 'comparison-detail'
        }
      }
      break
    case 'show-comparison-detail':
      compareDetailViewModel = viewModel.createCompareDetailViewModelForSummaryRow(cmdObj.summaryRow)
      viewMode = 'comparison-detail'
      break
    case 'show-comparison-detail-for-previous':
    case 'show-comparison-detail-for-next': {
      const delta = cmd === 'show-comparison-detail-for-previous' ? -1 : +1
      const adjacent = viewModel.createCompareDetailViewModelForSummaryRowWithDelta(
        cmdObj.kind,
        cmdObj.summaryRowKey,
        delta
      )
      if (adjacent) {
        compareDetailViewModel = adjacent
        viewMode = 'comparison-detail'
      }
      break
    }
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

function onKeyDown(event: KeyboardEvent) {
  // Ignore events when there is a modifier key involved
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) {
    return
  }

  switch (event.key) {
    case 'c':
      viewModel.headerViewModel.controlsVisible.update(v => !v)
      event.preventDefault()
      break
    case 'h':
      showSummary()
      event.preventDefault()
      break
    // case 'f':
    //   if (!freeformViewModel) {
    //     freeformViewModel = viewModel.createFreeformViewModel()
    //   }
    //   viewMode = 'freeform'
    //   event.preventDefault()
    //   break
    case 't':
      viewMode = 'trace'
      event.preventDefault()
      break
    default:
      break
  }
}
</script>

<!-- TEMPLATE -->
<svelte:window on:keydown={onKeyDown} />

{#await viewReady}
  <div class="loading-container"></div>
{:then}
  <div class="app-container" style={appStyle}>
    <Header on:command={onCommand} viewModel={viewModel.headerViewModel} />
    {#if $checksInProgress}
      <div class="progress-container">
        <div class="progress">{$progress}</div>
      </div>
    {:else if viewMode === 'comparison-detail'}
      <ComparisonDetail on:command={onCommand} viewModel={compareDetailViewModel} />
    {:else if viewMode === 'freeform'}
      <Freeform on:command={onCommand} viewModel={freeformViewModel} />
    {:else if viewMode === 'trace'}
      <Trace on:command={onCommand} viewModel={viewModel.traceViewModel} />
    {:else if viewMode === 'perf'}
      <Perf on:command={onCommand} viewModel={perfViewModel} />
    {:else}
      <Summary on:command={onCommand} viewModel={viewModel.summaryViewModel} />
    {/if}
  </div>
{/await}

<!-- STYLE -->
<style lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading-container {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
}

.progress-container {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  font-size: 2em;
}
</style>
