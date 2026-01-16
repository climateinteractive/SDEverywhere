<!-- Copyright (c) 2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import type { BundleGraphData, BundleGraphView } from '@sdeverywhere/check-core'

/** The graph view model. */
export let viewModel: BundleGraphData

let container: HTMLElement
let graphView: BundleGraphView

onMount(() => {
  // Create the graph view
  graphView = viewModel.createGraphView(container)

  return () => {
    graphView?.destroy()
    graphView = undefined
  }
})
</script>

<!-- TEMPLATE -->
<div bind:this={container} class="bundle-graph-container"></div>

<!-- STYLE -->
<style lang="scss">
.bundle-graph-container {
  width: 100%;
  height: 100%;
}
</style>
