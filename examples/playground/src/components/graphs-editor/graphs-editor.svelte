<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { GeneratedModelInfo, VarInfo } from '../../app-vm.svelte'
import type { ModelRunner, Outputs } from '@sdeverywhere/runtime'

import VarSidebar from './var-sidebar.svelte'
import GraphCard from './graph-card.svelte'
import SliderCard from './slider-card.svelte'
import { GraphsEditorViewModel } from './graphs-editor-vm.svelte'

interface Props {
  /** The generated model info. */
  modelInfo: GeneratedModelInfo | undefined
  /** The model runner (for running simulations). */
  runner: ModelRunner | undefined
  /** The model outputs. */
  outputs: Outputs | undefined
}

let { modelInfo, runner, outputs }: Props = $props()

// Create the view model
const vm = new GraphsEditorViewModel()

// Update model info when it changes
$effect(() => {
  vm.setModelInfo(modelInfo)
})

// Filter out special variables from sidebars
const filteredOutputVars = $derived(
  modelInfo?.outputVars.filter(v => !isSpecialVariable(v)) || []
)

const filteredInputVars = $derived(
  modelInfo?.inputVars
    .filter(v => !isSpecialVariable(v))
    .toSorted((a, b) => a.refId.localeCompare(b.refId)) || []
)

/**
 * Check if a variable is a special/internal variable that should be hidden.
 *
 * @param varInfo The variable info.
 * @returns True if the variable should be hidden.
 */
function isSpecialVariable(varInfo: VarInfo): boolean {
  const name = varInfo.varName.toLowerCase()
  return (
    name === '_time' ||
    name === 'time' ||
    name === '_initial_time' ||
    name === '_final_time' ||
    name === '_time_step' ||
    name === '_saveper'
  )
}

/**
 * Get graph data points for a variable.
 *
 * @param varId The variable ID.
 * @returns Array of points.
 */
function getGraphData(varId: string): Array<{ x: number; y: number }> {
  if (!runner || !outputs) return []

  // Run the model with current slider values
  // TODO: Map slider values to input indices
  runner.runModelSync([], outputs)

  return outputs.getSeriesForVar(varId)?.points || []
}

/**
 * Handle drop on graphs area.
 *
 * @param e The drag event.
 * @param targetGraphId Optional target graph ID.
 */
function handleGraphDrop(e: DragEvent, targetGraphId?: string) {
  e.preventDefault()

  // Handle graph reordering
  if (vm.draggedGraphIndex !== undefined) {
    const dropIndex = vm.graphs.length // Drop at end if not on a specific graph
    if (vm.draggedGraphIndex !== dropIndex) {
      vm.reorderGraphs(vm.draggedGraphIndex, dropIndex)
    }
    vm.draggedGraphIndex = undefined
    return
  }

  // Handle variable drop
  if (!vm.draggedOutputVar) return

  if (targetGraphId) {
    vm.addVariableToGraph(targetGraphId, vm.draggedOutputVar)
  } else {
    vm.createGraph(vm.draggedOutputVar)
  }

  vm.draggedOutputVar = undefined
}

/**
 * Handle drop on a specific graph for reordering.
 *
 * @param e The drag event.
 * @param targetIndex The target index.
 */
function handleGraphReorderDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault()
  e.stopPropagation()

  if (vm.draggedGraphIndex !== undefined && vm.draggedGraphIndex !== targetIndex) {
    vm.reorderGraphs(vm.draggedGraphIndex, targetIndex)
  }
  vm.draggedGraphIndex = undefined
}

/**
 * Handle drop on sliders area.
 *
 * @param e The drag event.
 */
function handleSliderDrop(e: DragEvent) {
  e.preventDefault()
  if (!vm.draggedInputVar) return

  vm.createSlider(vm.draggedInputVar)
  vm.draggedInputVar = undefined
}

// Track update version to trigger re-renders (used in template via vm.updateVersion)
</script>

<!-- TEMPLATE -->
<div class="graphs-editor">
  <!-- Top Section: Output Variables and Graphs -->
  <div class="graphs-editor-section">
    <VarSidebar
      title="Output Variables"
      variables={filteredOutputVars}
      onDragStart={(varId) => (vm.draggedOutputVar = varId)}
      onDragEnd={() => (vm.draggedOutputVar = undefined)}
    />

    <div
      class="graphs-editor-area"
      class:graphs-editor-drop-target={vm.draggedOutputVar !== undefined || vm.draggedGraphIndex !== undefined}
      role="region"
      aria-label="Graphs drop zone"
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => handleGraphDrop(e)}
    >
      {#if vm.graphs.length === 0}
        <div class="graphs-editor-placeholder">
          {#if vm.draggedOutputVar}
            Drop here to create a graph
          {:else}
            Drag output variables here to create graphs
          {/if}
        </div>
      {:else}
        <div class="graphs-editor-list">
          {#each vm.graphs as graphConfig, index}
            <GraphCard
              config={graphConfig}
              {getGraphData}
              isDropTarget={vm.draggedOutputVar !== undefined}
              hasErrors={vm.hasGraphErrors(graphConfig)}
              isVarValid={(varId) => vm.isVariableValid(varId, 'output')}
              onTitleChange={(title) => vm.updateGraphTitle(graphConfig.id, title)}
              onVariableUpdate={(varConfigId, updates) => vm.updateGraphVariable(graphConfig.id, varConfigId, updates)}
              onVariableRemove={(varConfigId) => vm.removeVariableFromGraph(graphConfig.id, varConfigId)}
              onVariablesReorder={(from, to) => vm.reorderGraphVariables(graphConfig.id, from, to)}
              onRemove={() => vm.removeGraph(graphConfig.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleGraphDrop(e, graphConfig.id)}
              onGraphDragStart={() => (vm.draggedGraphIndex = index)}
              onGraphDragEnd={() => (vm.draggedGraphIndex = undefined)}
              onGraphDragOver={(e) => {
                if (vm.draggedGraphIndex !== undefined) e.preventDefault()
              }}
              onGraphDrop={(e) => handleGraphReorderDrop(e, index)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Bottom Section: Input Variables and Sliders -->
  <div class="graphs-editor-section">
    <VarSidebar
      title="Input Variables"
      variables={filteredInputVars}
      onDragStart={(varId) => (vm.draggedInputVar = varId)}
      onDragEnd={() => (vm.draggedInputVar = undefined)}
    />

    <div
      class="graphs-editor-area"
      class:graphs-editor-drop-target={vm.draggedInputVar !== undefined}
      role="region"
      aria-label="Sliders drop zone"
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => handleSliderDrop(e)}
    >
      {#if vm.sliders.length === 0}
        <div class="graphs-editor-placeholder">
          {#if vm.draggedInputVar}
            Drop here to create a slider
          {:else}
            Drag input variables here to create sliders
          {/if}
        </div>
      {:else}
        <div class="graphs-editor-sliders">
          {#each vm.sliders as sliderConfig}
            <SliderCard
              config={sliderConfig}
              hasErrors={vm.hasSliderErrors(sliderConfig)}
              onValueChange={(value) => vm.updateSliderValue(sliderConfig.id, value)}
              onRemove={() => vm.removeSlider(sliderConfig.id)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">

.graphs-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.graphs-editor-section {
  display: flex;
  flex-direction: row;
  flex: 1;
  gap: 12px;
  min-height: 0;
}

.graphs-editor-area {
  flex: 1;
  background-color: #252526;
  border-radius: 6px;
  padding: 12px;
  overflow-y: auto;
  transition: background-color 0.15s, border-color 0.15s;
  border: 2px solid transparent;

  &.graphs-editor-drop-target {
    background-color: #2d3748;
    border-color: #0078d4;
  }
}

.graphs-editor-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6e6e6e;
  font-size: 13px;
  text-align: center;
}

.graphs-editor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.graphs-editor-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

</style>
