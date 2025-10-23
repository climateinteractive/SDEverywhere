<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import ComparisonGraph from '../graphs/comparison-graph.svelte'

import type { TraceTooltipViewModel } from './trace-tooltip-vm'

export let viewModel: TraceTooltipViewModel | undefined = undefined
export let x: number = 0
export let y: number = 0

let content = viewModel.content

// Rebuild the view state when the view model changes
let previousViewModel: TraceTooltipViewModel
$: if (viewModel?.requestKey !== previousViewModel?.requestKey) {
  // If the view model is changing, clear the data in the view model
  previousViewModel?.clearData()
  previousViewModel = viewModel
  content = viewModel.content

  // Load the data when this view becomes visible
  viewModel.requestData()
}
</script>

<!-- TEMPLATE -->
<div class="trace-tooltip" style="left: {x}px; top: {y}px;">
  <div class="tooltip-header">
    <div class="tooltip-title">{viewModel.varName}</div>
  </div>

  <div class="tooltip-data">
    <div class="data-point">
      <span class="data-label">Time:</span>
      <span class="data-value">{viewModel.diffPoint.time}</span>
    </div>
    <div class="data-point">
      <span class="data-label">Value 1:</span>
      <span class="data-value">{viewModel.diffPoint.valueL.toFixed(6)}</span>
    </div>
    <div class="data-point">
      <span class="data-label">Value 2:</span>
      <span class="data-value">{viewModel.diffPoint.valueR.toFixed(6)}</span>
    </div>
  </div>

  <div class="tooltip-graph">
    {#if $content?.loading}
      <div class="loading"></div>
    {:else if $content?.error}
      <div class="error">Error: {$content.error}</div>
    {:else if $content?.comparisonGraphViewModel}
      <ComparisonGraph viewModel={$content.comparisonGraphViewModel} />
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.trace-tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 400px;
  height: 300px;
  padding: 12px;
  background-color: #2a2a2a;
  border: 1px solid #555;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: inherit;
  z-index: 1000;
}

.tooltip-header {
  margin-bottom: 8px;
}

.tooltip-title {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.tooltip-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.data-point {
  display: flex;
  justify-content: flex-start;
  font-size: 12px;
}

.data-label {
  width: 50px;
  margin-right: 6px;
  color: #ccc;
  text-align: right;
}

.data-value {
  color: #fff;
  font-family: monospace;
}

.tooltip-graph {
  flex: 1;
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading,
.error {
  color: #ccc;
  font-size: 12px;
  text-align: center;
}

.error {
  color: #ff6b6b;
}
</style>
