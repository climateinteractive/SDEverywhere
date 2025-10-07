<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import ContextGraph from '../../graphs/context-graph.svelte'
import DatasetRow from './compare-graphs-dataset.svelte'
import type { CompareGraphsRowViewModel } from './compare-graphs-row-vm'

export let viewModel: CompareGraphsRowViewModel
export let align: 'center' | 'left' = 'center'

</script>




<!-- TEMPLATE -->
<div class="graphs-row">
  {#if align === "center"}
    <div class="spacer-flex"></div>
  {/if}
  <div class="content">
    <div class="graphs-container">
      <ContextGraph viewModel={viewModel.graphL} />
      <div class="spacer-fixed"></div>
      <ContextGraph viewModel={viewModel.graphR} />
    </div>
    <div class="metadata-container">
      <div class="metadata-header">id {viewModel.graphId}</div>
      {#if viewModel.metadataRows.length > 0}
        <div class="metadata-header">Metadata differences:</div>
        {#each viewModel.metadataRows as row}
          <div class="metadata-row">
            <div class="metadata-col">
              <div class="metadata-key">{row.key}</div>
              <span>&nbsp;</span>
              <div class="metadata-value">{row.valueL || 'n/a'}</div>
            </div>
            <div class="spacer-fixed"></div>
            <div class="metadata-col">
              <div class="metadata-key">{row.key}</div>
              <span>&nbsp;</span>
              <div class="metadata-value">{row.valueR || 'n/a'}</div>
            </div>
          </div>
        {/each}
      {/if}
      {#if viewModel.datasetRows.length > 0}
        <div class="metadata-header">Dataset differences:</div>
        {#each viewModel.datasetRows as row}
          <DatasetRow viewModel={row} />
        {/each}
      {/if}
    </div>
  </div>
  {#if align === "center"}
    <div class="spacer-flex"></div>
  {/if}
</div>




<!-- STYLE -->
<style lang='scss'>

.graphs-row {
  display: flex;
  flex-direction: row;
  flex: 1;
}

.spacer-flex {
  flex: 1;
}

.spacer-fixed {
  flex: 0 0 2rem;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.graphs-container {
  display: flex;
  flex-direction: row;
}

.metadata-container {
  display: flex;
  flex-direction: column;
}

.metadata-header {
  margin-top: .6rem;
}

.metadata-row {
  display: flex;
  flex-direction: row;

  &:hover {
    background-color: rgba(255, 255, 255, .05);
  }
}

.metadata-col {
  display: flex;
  // XXX: This needs to match fixed `context-graph-container` width for now
  width: 38rem;
  align-items: baseline;
}

.metadata-key {
  color: #aaa;
  font-size: .8em;
  margin-left: 1rem;
}

</style>
