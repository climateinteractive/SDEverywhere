<!-- SCRIPT -->
<script lang="ts">
import Selector from '../selector/selector.svelte'
import Graph from './graph.svelte'
import type { SelectableGraphViewModel } from './selectable-graph-vm'

export let viewModel: SelectableGraphViewModel
export let width: number
export let height: number

const selectedGraphId = viewModel.selectedGraphId
const selectedGraphViewModel = viewModel.selectedGraphViewModel

console.log(viewModel.graphOptions)

</script>

<!-- TEMPLATE -->
<div class="selectable-graph">
  <Selector
    options={viewModel.graphOptions}
    bind:value={$selectedGraphId}
    onSelect={() => console.log('not implemented')}
  />
  <div class="graph-container">
    <Graph
      viewModel={$selectedGraphViewModel}
      {width}
      {height}
    />
  </div>
</div>

<!-- STYLE -->
<style>
.selectable-graph {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.graph-container {
  position: relative;
}
</style>
