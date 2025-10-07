<!-- Copyright (c)2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import type { BundleGraphData, BundleGraphView } from '@sdeverywhere/check-core'
import type { GraphViewConfig } from './graph-view-config'

/** The graph view configuration. */
export let config: GraphViewConfig

/** The graph view model. */
export let viewModel: BundleGraphData

// TODO: Use height of parent
let containerStyle = `width: ${config.width}rem; height: 20rem;`

let canvas: HTMLCanvasElement
let graphView: BundleGraphView

onMount(() => {
  // Create the graph view
  graphView = viewModel.createGraphView(canvas)

  return () => {
    graphView?.destroy()
    graphView = undefined
  }
})
</script>

<!-- TEMPLATE -->
<div class="graph-inner-container" style={containerStyle}>
  <canvas bind:this={canvas}></canvas>
</div>

<!-- STYLE -->
<style lang="scss">
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
