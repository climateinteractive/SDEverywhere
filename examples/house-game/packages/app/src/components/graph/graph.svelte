<!-- SCRIPT -->
<script lang='ts'>

import { onMount } from 'svelte'

import type { GraphViewModel } from './graph-vm'
import { GraphView } from './graph-view'

/** The view model. */
export let viewModel: GraphViewModel

/** The fixed width (in px). */
export let width: number

/** The fixed height (in px). */
export let height: number

let container: HTMLElement
let containerStyle = `width: ${width}px; height: ${height}px;`

let graphView: GraphView
let dataChanged = viewModel.dataChanged

// When the view model changes, rebuild the graph view
$: if (graphView) {
  initGraphView()
}

// When the data changes, update the view
$: if ($dataChanged) {
  graphView?.updateData(/*animated=*/ false)
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
  graphView = new GraphView(canvas, viewModel)
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
<template>

<div class="graph-inner-container" bind:this={container} style={containerStyle} />

</template>




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
