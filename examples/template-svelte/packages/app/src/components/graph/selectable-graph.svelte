<!-- SCRIPT -->
<script lang="ts">
import Selector from '../selector/selector.svelte'
import Graph from './graph.svelte'
import type { SelectableGraphViewModel } from './selectable-graph-vm'

export let viewModel: SelectableGraphViewModel

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
    />
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.selectable-graph
  display: flex
  flex-direction: column
  flex: 1
  gap: 1rem

.graph-container
  position: relative
  width: 100%
  height: 100%
</style>
