<!-- SCRIPT -->
<script lang='ts'>

import { onMount } from 'svelte'

import type { GraphViewOptions } from './graph-view'
import { GraphView } from './graph-view'
import type { GraphViewModel } from './graph-vm'

/** The view model. */
export let viewModel: GraphViewModel

let container: HTMLElement
let containerParent: HTMLElement
let containerStyle = ''
let availableWidth: number
let availableHeight: number

let graphView: GraphView
let dataChanged = viewModel.dataChanged

// When the view model changes, rebuild the graph view
$: if (graphView && graphView.viewModel.spec.id !== viewModel.spec.id) {
  graphView.destroy()
  initGraphView()
}

// When the data changes, update the view
$: if ($dataChanged) {
  graphView?.updateData(/*animated=*/ false)
}

const viewOptions: GraphViewOptions = {
  fontFamily: 'sans-serif',
  fontStyle: 'normal',
  fontColor: '#333'
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
  graphView = new GraphView(canvas, viewModel, viewOptions)
  updateContainerSize(viewModel.spec)
}

function updateContainerSize(graphSpec: GraphSpec) {
  const width = Math.round(availableWidth)
  const height = Math.round(availableHeight)
  containerStyle = `width: ${width}px; height: ${height}px;`
}

onMount(() => {
  // Observe resize events on the parent container.  When the size changes,
  // update the `style` attribute of our inner container.  This will cause
  // Chart.js to perform a responsive resize on the chart canvas.
  let resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0]
    const boxSize = entry.contentBoxSize[0]
    const containerWidth = Math.ceil(boxSize.inlineSize)
    const containerHeight = Math.ceil(boxSize.blockSize)
    availableWidth = containerWidth
    availableHeight = containerHeight
    updateContainerSize(viewModel.spec)
  })
  containerParent = container.parentElement
  availableWidth = containerParent.offsetWidth
  availableHeight = containerParent.offsetHeight
  resizeObserver.observe(containerParent)

  // Create the GraphView that wraps the canvas element
  initGraphView()

  return () => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
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
<style lang='sass'>

// This container is set up to allow for automatic responsive sizing
// by Chart.js.  For this to work, we need the canvas element to have
// this parent container with `position: absolute` and configured with
// zero offsets so that it fills its parent.
.graph-inner-container
  position: absolute
  top: 0
  left: 0
  bottom: 0
  right: 0

</style>
