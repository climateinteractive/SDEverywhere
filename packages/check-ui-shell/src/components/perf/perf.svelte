<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { PerfRunner } from '@sdeverywhere/check-core'

import DotPlot from './dot-plot.svelte'
import type { PerfViewModel } from './perf-vm'

export let viewModel: PerfViewModel
const rows = viewModel.rows

let running = false

function onRun() {
  running = true

  const perfRunner = new PerfRunner(viewModel.bundleModelL, viewModel.bundleModelR)
  perfRunner.onComplete = (summaryL, summaryR) => {
    viewModel.addRow(summaryL, summaryR)
    running = false
  }
  perfRunner.onError = error => {
    // TODO: Show error message in view
    console.error(error)
    running = false
  }
  perfRunner.start()
}
</script>

<!-- TEMPLATE -->
<div class="perf-container">
  <div class="controls-container">
    {#if !running}
      <button class="run" on:click={onRun} disabled={running}>Run</button>
    {:else}
      <div>Running performance tests, please wait…</div>
    {/if}
  </div>
  <div class="table-container">
    {#if $rows.length > 0}
      <table>
        <tr>
          <th>run</th>
          <th>min</th>
          <th>avg</th>
          <th>max</th>
        </tr>
        {#each $rows as row}
          <tr>
            <td class="rownum" rowspan="2">{row.num}</td>
            <td class="dim">{row.minTimeL}</td>
            <td class="value dataset-color-0">{row.avgTimeL}</td>
            <td class="dim">{row.maxTimeL}</td>
            <td class="plot">
              <DotPlot viewModel={row.dotPlotL} colorClass="dataset-bg-0" />
            </td>
          </tr>
          <tr>
            <td class="dim">{row.minTimeR}</td>
            <td class="value dataset-color-1">{row.avgTimeR}</td>
            <td class="dim">{row.maxTimeR}</td>
            <td class="plot">
              <DotPlot viewModel={row.dotPlotR} colorClass="dataset-bg-1" />
            </td>
          </tr>
        {/each}
      </table>
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.perf-container {
  display: flex;
  flex-direction: column;
  padding: 0 1rem;
}

.controls-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 3rem;
}

.table-container {
  display: flex;
  flex: 1;
}

table {
  border-collapse: collapse;
}

td,
th {
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
}

th {
  color: #aaa;
  text-align: right;
  font-weight: 500;
}

td {
  width: 4.5rem;
  text-align: right;
  font-family: monospace;

  &.rownum {
    width: 2rem;
  }

  &.dim {
    color: #777;
  }

  &.plot {
    width: 30rem;
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
</style>
