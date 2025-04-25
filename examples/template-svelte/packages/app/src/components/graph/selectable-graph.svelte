<!-- SCRIPT -->
<script lang="ts">
import Selector from '../selector/selector.svelte'
import Graph from './graph.svelte'
import Legend from './legend.svelte'
import type { SelectableGraphViewModel } from './selectable-graph-vm'

export let viewModel: SelectableGraphViewModel
const selectedGraphViewModel = viewModel.selectedGraphViewModel
</script>

<!-- TEMPLATE -->
<div class="selectable-graph">
  <Selector viewModel={viewModel.selectorViewModel} />
  <div class="graph-container">
    <Graph viewModel={$selectedGraphViewModel} />
  </div>
  <Legend graphSpec={$selectedGraphViewModel.spec} />
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
