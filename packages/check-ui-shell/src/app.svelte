<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import FontFaceObserver from 'fontfaceobserver'

import { clickOutside } from './components/_shared/click-outside'

import BundleSelectorPopover from './components/bundle/bundle-selector-popover.svelte'

import type { ComparisonGroupingKind } from './components/compare/_shared/comparison-grouping-kind'
import ComparisonDetail from './components/compare/detail/compare-detail.svelte'
import type { CompareDetailViewModel } from './components/compare/detail/compare-detail-vm'

import FilterPopover from './components/filter/filter-popover.svelte'

import type { FreeformViewModel } from './components/freeform/freeform-vm'
import Freeform from './components/freeform/freeform.svelte'

import Header from './components/header/header.svelte'

import type { PerfViewModel } from './components/perf/perf-vm'
import Perf from './components/perf/perf.svelte'

import Summary from './components/summary/summary.svelte'

import type { TraceViewModel } from './components/trace/trace-vm'
import Trace from './components/trace/trace.svelte'

import type { AppViewModel } from './app-vm'
import type { BundleSpec } from './components/bundle/bundle-spec'

export let viewModel: AppViewModel

const checksInProgress = viewModel.checksInProgress
const progress = viewModel.progress
const zoom = viewModel.headerViewModel.zoom

let compareDetailViewModel: CompareDetailViewModel
let perfViewModel: PerfViewModel
let traceViewModel: TraceViewModel
let freeformViewModel: FreeformViewModel

type ViewMode = 'summary' | 'comparison-detail' | 'perf' | 'freeform' | 'trace'
let viewMode: ViewMode = 'summary'

type BundleSelectorSide = 'left' | 'right' | undefined
let openedBundleSelectorSide: BundleSelectorSide = undefined

let filtersVisible = false

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

function toggleBundleSelector(side: 'left' | 'right'): void {
  if (side === openedBundleSelectorSide) {
    openedBundleSelectorSide = undefined
  } else {
    openedBundleSelectorSide = side
  }
}

function closeBundleSelector(): void {
  openedBundleSelectorSide = undefined
}

function onBundleSelected(bundle: BundleSpec): void {
  // When a bundle is selected, dispatch an event that will be handled at a higher level
  // to reload the UI using the selected bundle
  const side = openedBundleSelectorSide
  const changeEvent = new CustomEvent('sde-check-bundle', {
    detail: {
      side,
      name: bundle.local?.name || bundle.remote?.name,
      url: bundle.local?.url || bundle.remote?.url
    }
  })
  document.dispatchEvent(changeEvent)
}

function toggleFilters(): void {
  filtersVisible = !filtersVisible
}

function closeFilters(): void {
  filtersVisible = false
}

function onCommand(event: CustomEvent) {
  const cmdObj = event.detail
  const cmd = cmdObj.cmd
  switch (cmd) {
    case 'show-summary':
      showSummary()
      break
    case 'toggle-bundle-selector':
      toggleBundleSelector(cmdObj.side)
      break
    case 'toggle-filters':
      toggleFilters()
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
    case 'show-trace-view-with-scenario':
      traceViewModel = viewModel.createTraceViewModel(cmdObj.scenarioSpec, cmdObj.scenarioKind)
      viewMode = 'trace'
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
      if (viewMode !== 'trace') {
        traceViewModel = viewModel.createTraceViewModel()
        viewMode = 'trace'
        event.preventDefault()
      }
      break
    default:
      break
  }
}
</script>

<!-- TEMPLATE -->
<svelte:window on:keydown={onKeyDown} />

{#if !viewReady}
  <div class="loading-container"></div>
{:else}
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
      <Trace on:command={onCommand} viewModel={traceViewModel} />
    {:else if viewMode === 'perf'}
      <Perf on:command={onCommand} viewModel={perfViewModel} />
    {:else}
      <Summary on:command={onCommand} viewModel={viewModel.summaryViewModel} />
    {/if}

    {#if openedBundleSelectorSide !== undefined}
      <!-- svelte-ignore event_directive_deprecated -->
      <div class="popover-overlay" use:clickOutside on:clickout={closeBundleSelector}>
        <div class="popover-container bundle-selector-popover-container">
          <BundleSelectorPopover
            bundleManager={viewModel.bundleManager}
            onClose={closeBundleSelector}
            onSelect={bundle => {
              onBundleSelected(bundle)
              closeBundleSelector()
            }}
          />
        </div>
      </div>
    {/if}

    {#if filtersVisible}
      <!-- svelte-ignore event_directive_deprecated -->
      <div class="popover-overlay" use:clickOutside on:clickout={closeFilters}>
        <div class="popover-container filter-popover-container">
          <FilterPopover
            viewModel={viewModel.filterPopoverViewModel}
            onClose={closeFilters}
            onApplyAndRun={() => {
              viewModel.applyFilters()
              closeFilters()
            }}
          />
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- STYLE -->
<style lang="scss">
.app-container {
  position: relative;
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

.popover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: min(100%, 100vw);
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  pointer-events: none;
}

.popover-container {
  position: absolute;
  top: 26px;
  width: 500px;
  height: min(calc(100% - 60px), 600px);
  background-color: #2c2c2c;
  border: 1px solid #444;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  overflow: hidden;
}

.bundle-selector-popover-container {
  left: calc(50% - 250px);
  width: 500px;
  height: min(calc(100% - 60px), 500px);
}

.filter-popover-container {
  right: 24px;
  width: 500px;
  height: min(calc(100% - 60px), 600px);
}
</style>
