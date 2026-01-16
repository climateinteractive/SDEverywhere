<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'
import DotPlot from '../perf/dot-plot.svelte'
import type { StatsTableRowViewModel } from './stats-table-row-vm'

export let viewModel: StatsTableRowViewModel
const classNum = viewModel.datasetClassIndex
const modelTextClass = classNum !== undefined ? `dataset-color-${classNum}` : 'row-header'
const modelBgClass = classNum !== undefined ? `dataset-bg-${classNum}` : ''

const dispatch = createEventDispatcher()

function onShowPerf() {
  dispatch('command', { cmd: 'show-perf' })
}
</script>

<!-- TEMPLATE -->
<td class={`name ${modelTextClass}`}>
  {viewModel.modelName}
</td>
<td>
  <div class="cell">
    <div class="value">{viewModel.inputs}</div>
    <div class="change"></div>
  </div>
</td>
<td>
  <div class="cell">
    <div class="value">{viewModel.outputs}</div>
    <div class="change"></div>
  </div>
</td>
<td>
  <div class="cell">
    <div class="value">{viewModel.modelSize}</div>
    <div class="change">{viewModel.modelSizePctChange}</div>
  </div>
</td>
<td>
  <div class="cell">
    <div class="value">{viewModel.dataSize}</div>
    <div class="change">{viewModel.dataSizePctChange}</div>
  </div>
</td>
<td>
  <div class="cell">
    <div class="value">{viewModel.avgTime}</div>
    <div class="change">{viewModel.avgTimePctChange}</div>
  </div>
</td>
<td>
  <div class="cell dim">
    <div class="value">{viewModel.minTime}</div>
    <div class="change"></div>
  </div>
</td>
<td>
  <div class="cell dim">
    <div class="value">{viewModel.maxTime}</div>
    <div class="change"></div>
  </div>
</td>
{#if viewModel.dotPlot}
  <td class="plot" on:click={onShowPerf}>
    <DotPlot viewModel={viewModel.dotPlot} colorClass={modelBgClass} />
  </td>
{/if}

<!-- STYLE -->
<style lang="scss">
td {
  padding: 0;
  height: 1.8rem;
}

.name {
  padding-right: 3rem;
  max-width: 20rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.row-header) {
  color: #aaa;
}

.cell {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: baseline;
  font-family: monospace;

  &.dim {
    color: #777;
  }
}

.value {
  flex: 1;
  padding-right: 0.4rem;
  text-align: right;
}

.change {
  flex: 1;
  padding-left: 0.4rem;
  text-align: left;
  font-size: 0.8em;
}

.plot {
  width: 12rem;
  padding-left: 2rem;
  padding-right: 2rem;
  cursor: pointer;
}
</style>
