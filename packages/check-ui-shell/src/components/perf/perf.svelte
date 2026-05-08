<!-- Copyright (c) 2021-2026 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { runPerf } from '@sdeverywhere/check-core'

import DotPlot from './dot-plot.svelte'
import type { PerfViewModel } from './perf-vm'

export let viewModel: PerfViewModel
const rows = viewModel.rows

let running = false

function onRun() {
  if (running) {
    return
  }

  running = true

  runPerf({
    onComplete: (summaryL, summaryR) => {
      viewModel.addRow(summaryL, summaryR)
      running = false
    },
    onError: error => {
      // TODO: Show error message in view
      console.error(error)
      running = false
    }
  })
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
        <thead>
          <tr>
            <th>run</th>
            <th>median</th>
            <th>avg</th>
            <th class="pct">% change</th>
            <th>p95</th>
            <th>stddev</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each $rows as row}
            <tr class:summary={row.isSummary}>
              <td class="rownum" rowspan="2">{row.label}</td>
              <td class="dim">{row.medianTimeL}</td>
              <td class="value dataset-color-0">{row.avgTimeL}</td>
              <td class={`pct pct-${row.pctChangeKind}`} rowspan="2">{row.pctChange}</td>
              <td class="dim">{row.p95TimeL}</td>
              <td class="dim">{row.stdDevL}</td>
              <td class="plot">
                <DotPlot viewModel={row.dotPlotL} colorClass="dataset-bg-0" />
              </td>
            </tr>
            <tr class:summary={row.isSummary}>
              <td class="dim">{row.medianTimeR}</td>
              <td class="value dataset-color-1">{row.avgTimeR}</td>
              <td class="dim">{row.p95TimeR}</td>
              <td class="dim">{row.stdDevR}</td>
              <td class="plot">
                <DotPlot viewModel={row.dotPlotR} colorClass="dataset-bg-1" showAxisLabels={row.isSummary} />
              </td>
            </tr>
          {/each}
        </tbody>
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

// Add a vertical gap between each per-row pair (the second tr of a pair gets
// extra bottom padding so the L/R pair stays tight while runs are separated)
tbody > tr:nth-child(even) > td {
  padding-bottom: 1.2rem;
}

th {
  color: #aaa;
  text-align: right;
  font-weight: 500;

  &.pct {
    padding-left: 0.6rem;
    padding-right: 0.6rem;
  }
}

td {
  width: 4.5rem;
  text-align: right;
  font-family: monospace;
  vertical-align: middle;

  &.rownum {
    width: 2rem;
  }

  &.dim {
    color: #777;
  }

  &.pct {
    width: 5rem;
    padding-left: 0.6rem;
    padding-right: 0.6rem;
    font-size: 0.85em;

    &.pct-better {
      color: #4caf50;
    }

    &.pct-worse {
      color: #e57373;
    }

    &.pct-neutral {
      color: #777;
    }
  }

  &.plot {
    width: 30rem;
    padding-left: 2rem;
    padding-right: 3rem;
  }
}

tr.summary > td {
  border-top: 1px solid #444;
  padding-top: 1.4rem;
}

tr.summary + tr.summary > td {
  border-top: 0;
  padding-top: 0.2rem;
}
</style>
