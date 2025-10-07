<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { DotPlotViewModel } from './dot-plot-vm'

export let viewModel: DotPlotViewModel
export let colorClass: string

</script>




<!-- TEMPLATE -->
<div class="dot-plot-container">
  <div class="hline"></div>
  <div class="vline end-line" style="left: 0;"></div>
  <div class="vline end-line" style="left: 100%;"></div>
  {#each viewModel.points as point}
    <div class="dot" class:dataset-bg-0={colorClass === 'dataset-bg-0'} class:dataset-bg-1={colorClass === 'dataset-bg-1'} style="left: {point}%;"></div>
  {/each}
  <div class="vline avg-line" class:dataset-bg-0={colorClass === 'dataset-bg-0'} class:dataset-bg-1={colorClass === 'dataset-bg-1'} style="left: {viewModel.avgPoint}%;"></div>
</div>




<!-- STYLE -->
<style lang='scss'>

$dot-size: .8rem;
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
  opacity: .2;
}

</style>
