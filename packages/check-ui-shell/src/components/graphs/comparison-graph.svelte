<!-- Copyright (c)2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { onMount } from 'svelte'

import type { ComparisonGraphViewModel } from './comparison-graph-vm'
import { ComparisonGraphView } from './comparison-graph-view'

/** The view model. */
export let viewModel: ComparisonGraphViewModel

let container: HTMLElement
let graphView: ComparisonGraphView

// When the view model changes, rebuild the graph view
let previousKey: string
$: if (graphView && viewModel.key !== previousKey) {
  initGraphView()
}

function initGraphView() {
  // Destroy the previous graph view, if present
  graphView?.destroy()

  // XXX: Sometimes when the chart is being swapped out rapidly, Chart.js fails
  // to remove the responsive wrapper.  As a workaround, clear out the container
  // programmatically and add a fresh canvas each time.  Possible related issue:
  //   https://github.com/chartjs/Chart.js/issues/4630
  const canvas = document.createElement('canvas')
  while (container.firstChild) {
    container.firstChild.remove()
  }
  container.appendChild(canvas)

  // Create the graph view that wraps the canvas element
  previousKey = viewModel.key
  graphView = new ComparisonGraphView(canvas, viewModel)

  // Update the view when the view model is changed
  viewModel.onUpdated = () => {
    graphView?.update()
  }
}

onMount(() => {
  // Create the graph view when the component is mounted
  initGraphView()

  return () => {
    graphView?.destroy()
    graphView = undefined
  }
})

</script>




<!-- TEMPLATE -->
<div class="graph-inner-container" bind:this={container}></div>




<!-- STYLE -->
<style lang='scss'>

// This container is set up to allow for automatic responsive sizing
// by Chart.js.  For this to work, we need the canvas element to have
// this parent container with `position: absolute` and configured with
// zero offsets so that it fills its parent.
.graph-inner-container {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}

</style>
