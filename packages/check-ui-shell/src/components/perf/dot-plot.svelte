<!-- Copyright (c) 2021-2026 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { DotPlotViewModel } from './dot-plot-vm'

export let viewModel: DotPlotViewModel
export let colorClass: string
export let showAxisLabels = false
export let avgLabelPosition: 'above' | 'below' | undefined = undefined
export let avgLabelTextClass = ''
</script>

<!-- TEMPLATE -->
<div class="dot-plot-container">
  <div class="hline"></div>
  <div class="vline end-line" style="left: 0;"></div>
  <div class="vline end-line" style="left: 100%;"></div>
  {#each viewModel.points as point}
    <div class={`dot ${colorClass}`} style="left: {point}%;"></div>
  {/each}
  <div class={`vline avg-line ${colorClass}`} style="left: {viewModel.avgPoint}%;"></div>
  {#if viewModel.overflowCount > 0}
    <div class="overflow" title={`${viewModel.overflowCount} sample(s) beyond p95`}>+{viewModel.overflowCount}</div>
  {/if}
  {#if showAxisLabels}
    <div class="axis-label axis-label-left">{viewModel.min.toFixed(1)}</div>
    <div class="axis-label axis-label-right">{viewModel.max.toFixed(1)}</div>
  {/if}
  {#if avgLabelPosition === 'below'}
    <div class={`avg-label avg-label-below ${avgLabelTextClass}`} style="left: {viewModel.avgPoint}%;">
      {viewModel.avg.toFixed(1)}
    </div>
  {:else if avgLabelPosition === 'above'}
    <div class={`avg-label avg-label-above ${avgLabelTextClass}`} style="left: {viewModel.avgPoint}%;">
      {viewModel.avg.toFixed(1)}
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
$dot-size: 0.8rem;
$height: 1.4rem;
$line-color: #555;

.dot-plot-container {
  position: relative;
  width: 100%;
  height: $dot-size * 2;
}

.hline {
  position: absolute;
  left: 0;
  top: $height * 0.5;
  width: 100%;
  height: 1px;
  background-color: $line-color;
}

.vline {
  position: absolute;
  left: 0;
  height: $height;
  width: 1px;

  &.end-line {
    background-color: $line-color;
  }

  &.avg-line {
    width: 2px;
    margin-left: -1px;
  }
}

.dot {
  position: absolute;
  top: ($height * 0.5) - ($dot-size * 0.5);
  width: $dot-size;
  height: $dot-size;
  margin-left: -$dot-size * 0.5;
  border-radius: $dot-size * 0.5;
  opacity: 0.2;
}

.overflow {
  position: absolute;
  left: 100%;
  top: 0;
  height: $height;
  display: flex;
  align-items: center;
  margin-left: 0.4rem;
  color: #888;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: nowrap;
}

.axis-label {
  position: absolute;
  top: $height;
  margin-top: 0.1rem;
  color: #888;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: nowrap;
  transform: translateX(-50%);

  &.axis-label-left {
    left: 0;
  }

  &.axis-label-right {
    left: 100%;
  }
}

.avg-label {
  position: absolute;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: nowrap;

  &.avg-label-below {
    top: $height;
    margin-top: 0.1rem;
    transform: translateX(-50%);
  }

  &.avg-label-above {
    top: 0;
    margin-top: -0.1rem;
    transform: translate(-50%, -100%);
  }
}
</style>
