<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Graph from '../graph/graph.svelte'
import type { GraphConfig, GraphVariable, LineStyle } from './graphs-editor-vm.svelte'

interface Props {
  /** The graph configuration. */
  config: GraphConfig
  /** Callback to get graph data points. */
  getGraphData: (varId: string) => Array<{ x: number; y: number }>
  /** Whether this card is a drop target for variables. */
  isDropTarget?: boolean
  /** Whether the graph has any missing variables. */
  hasErrors?: boolean
  /** Check if a specific variable is valid. */
  isVarValid?: (varId: string) => boolean
  /** Callback when title changes. */
  onTitleChange?: (title: string) => void
  /** Callback when a variable is updated. */
  onVariableUpdate?: (varConfigId: string, updates: Partial<Omit<GraphVariable, 'id' | 'varId'>>) => void
  /** Callback when a variable is removed. */
  onVariableRemove?: (varConfigId: string) => void
  /** Callback when variables are reordered. */
  onVariablesReorder?: (fromIndex: number, toIndex: number) => void
  /** Callback when the graph is removed. */
  onRemove?: () => void
  /** Callback for variable drag over. */
  onDragOver?: (e: DragEvent) => void
  /** Callback for variable drop. */
  onDrop?: (e: DragEvent) => void
  /** Callback when graph card drag starts. */
  onGraphDragStart?: () => void
  /** Callback when graph card drag ends. */
  onGraphDragEnd?: () => void
  /** Callback for graph card drag over. */
  onGraphDragOver?: (e: DragEvent) => void
  /** Callback for graph card drop. */
  onGraphDrop?: (e: DragEvent) => void
}

let {
  config,
  getGraphData,
  isDropTarget = false,
  hasErrors = false,
  isVarValid = () => true,
  onTitleChange,
  onVariableUpdate,
  onVariableRemove,
  onVariablesReorder,
  onRemove,
  onDragOver,
  onDrop,
  onGraphDragStart,
  onGraphDragEnd,
  onGraphDragOver,
  onGraphDrop
}: Props = $props()

// Build graph view model with all variables
const graphViewModel = $derived.by(() => {
  if (config.variables.length === 0) return undefined

  // Build key from all variable configs
  const key = `${config.id}-${config.variables.map(v => `${v.varId}-${v.color}-${v.style}`).join('-')}`

  // Get data for all valid variables
  const datasets = config.variables
    .filter(v => isVarValid(v.varId))
    .map(v => ({
      varId: v.varId,
      label: v.label,
      color: v.color,
      style: v.style,
      points: getGraphData(v.varId)
    }))

  if (datasets.length === 0) return undefined

  return {
    key,
    datasets
  }
})

// Line style options
const styleOptions: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'area', label: 'Area' },
  { value: 'none', label: 'None' }
]

// Drag state for reordering variables
let draggedVarIndex: number | undefined = $state(undefined)

function handleVarDragStart(e: DragEvent, index: number) {
  e.stopPropagation() // Prevent triggering graph card drag
  draggedVarIndex = index
}

function handleVarDragEnd() {
  draggedVarIndex = undefined
}

function handleVarDragOver(e: DragEvent, index: number) {
  if (draggedVarIndex !== undefined && draggedVarIndex !== index) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function handleVarDrop(e: DragEvent, index: number) {
  if (draggedVarIndex !== undefined && draggedVarIndex !== index) {
    e.preventDefault()
    e.stopPropagation()
    onVariablesReorder?.(draggedVarIndex, index)
  }
  draggedVarIndex = undefined
}

// Handle graph card drag
function handleGraphDragStart(e: DragEvent) {
  // Set some data so the drag works
  e.dataTransfer?.setData('text/plain', config.id)
  onGraphDragStart?.()
}
</script>

<!-- TEMPLATE -->
<div
  class="graph-card"
  class:graph-card-drop-target={isDropTarget}
  class:graph-card-has-errors={hasErrors}
  role="figure"
  ondragover={(e) => {
    onDragOver?.(e)
    onGraphDragOver?.(e)
  }}
  ondrop={(e) => {
    onDrop?.(e)
    onGraphDrop?.(e)
  }}
>
  <!-- Header -->
  <div class="graph-card-header">
    <div
      class="graph-card-drag-handle"
      title="Drag to reorder"
      draggable="true"
      ondragstart={handleGraphDragStart}
      ondragend={onGraphDragEnd}
      role="button"
      tabindex="0"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <circle cx="3" cy="3" r="1.5"/>
        <circle cx="7" cy="3" r="1.5"/>
        <circle cx="11" cy="3" r="1.5"/>
        <circle cx="3" cy="7" r="1.5"/>
        <circle cx="7" cy="7" r="1.5"/>
        <circle cx="11" cy="7" r="1.5"/>
        <circle cx="3" cy="11" r="1.5"/>
        <circle cx="7" cy="11" r="1.5"/>
        <circle cx="11" cy="11" r="1.5"/>
      </svg>
    </div>
    <input
      type="text"
      class="graph-card-title"
      value={config.title}
      oninput={(e) => onTitleChange?.(e.currentTarget.value)}
      placeholder="Graph title"
    />
    {#if hasErrors}
      <span class="graph-card-error-badge" title="Some variables are missing from the model">⚠</span>
    {/if}
    <button class="graph-card-close" onclick={onRemove} title="Remove graph">×</button>
  </div>

  <!-- Graph -->
  <div class="graph-card-content">
    {#if graphViewModel}
      <Graph viewModel={graphViewModel} width={380} height={180} />
    {:else}
      <div class="graph-card-no-data">No valid variables to display</div>
    {/if}
  </div>

  <!-- Legend -->
  {#if config.variables.length > 0}
    <div class="graph-card-legend">
      {#each config.variables as varConfig}
        <div
          class="graph-card-legend-item"
          class:graph-card-legend-item-invalid={!isVarValid(varConfig.varId)}
          style="background-color: {varConfig.color}"
        >
          {varConfig.label}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Variables Table -->
  <div class="graph-card-variables">
    <table class="graph-card-table">
      <thead>
        <tr>
          <th class="graph-card-th-drag"></th>
          <th class="graph-card-th-label">Label</th>
          <th class="graph-card-th-var">Variable</th>
          <th class="graph-card-th-color">Color</th>
          <th class="graph-card-th-style">Style</th>
          <th class="graph-card-th-actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each config.variables as varConfig, index}
          {@const isValid = isVarValid(varConfig.varId)}
          <tr
            class="graph-card-row"
            class:graph-card-row-dragging={draggedVarIndex === index}
            class:graph-card-row-invalid={!isValid}
            draggable="true"
            ondragstart={(e) => handleVarDragStart(e, index)}
            ondragend={handleVarDragEnd}
            ondragover={(e) => handleVarDragOver(e, index)}
            ondrop={(e) => handleVarDrop(e, index)}
          >
            <td class="graph-card-td-drag">
              <span class="graph-card-row-handle" title="Drag to reorder">⋮⋮</span>
            </td>
            <td class="graph-card-td-label">
              <input
                type="text"
                class="graph-card-input"
                value={varConfig.label}
                oninput={(e) => onVariableUpdate?.(varConfig.id, { label: e.currentTarget.value })}
              />
            </td>
            <td class="graph-card-td-var">
              <span class="graph-card-var-name" class:graph-card-var-invalid={!isValid}>
                {#if !isValid}<span class="graph-card-var-error">⚠</span>{/if}
                {varConfig.varId}
              </span>
            </td>
            <td class="graph-card-td-color">
              <input
                type="color"
                class="graph-card-color"
                value={varConfig.color}
                oninput={(e) => onVariableUpdate?.(varConfig.id, { color: e.currentTarget.value })}
              />
              <input
                type="text"
                class="graph-card-color-text"
                value={varConfig.color}
                oninput={(e) => onVariableUpdate?.(varConfig.id, { color: e.currentTarget.value })}
              />
            </td>
            <td class="graph-card-td-style">
              <select
                class="graph-card-select"
                value={varConfig.style}
                onchange={(e) => onVariableUpdate?.(varConfig.id, { style: e.currentTarget.value as LineStyle })}
              >
                {#each styleOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </td>
            <td class="graph-card-td-actions">
              <button
                class="graph-card-row-remove"
                onclick={() => onVariableRemove?.(varConfig.id)}
                title="Remove variable"
              >×</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">

.graph-card {
  background-color: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.15s;

  &.graph-card-drop-target {
    border-color: #0078d4;
  }

  &.graph-card-has-errors {
    border-color: #f14c4c;
  }
}

.graph-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.graph-card-drag-handle {
  cursor: grab;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: #999;
    background-color: #3c3c3c;
  }

  &:active {
    cursor: grabbing;
  }
}

.graph-card-title {
  flex: 1;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 8px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover {
    border-color: #3c3c3c;
  }

  &:focus {
    outline: none;
    border-color: #0078d4;
    background-color: #1e1e1e;
  }
}

.graph-card-error-badge {
  color: #f14c4c;
  font-size: 14px;
}

.graph-card-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 4px;
  color: #969696;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background-color: #f14c4c;
    color: #ffffff;
  }
}

.graph-card-content {
  position: relative;
  height: 180px;
  padding: 8px;
  background-color: #252526;
}

.graph-card-no-data {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6e6e6e;
  font-size: 12px;
}

// Legend
.graph-card-legend {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #252526;
  border-top: 1px solid #3c3c3c;
}

.graph-card-legend-item {
  padding: 2px 8px;
  border-radius: 3px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;

  &.graph-card-legend-item-invalid {
    opacity: 0.5;
    text-decoration: line-through;
  }
}

// Variables table
.graph-card-variables {
  border-top: 1px solid #3c3c3c;
  max-height: 150px;
  overflow-y: auto;
}

.graph-card-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.graph-card-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  position: sticky;
  top: 0;
}

.graph-card-th-drag { width: 24px; }
.graph-card-th-label { width: 25%; }
.graph-card-th-var { width: 25%; }
.graph-card-th-color { width: 20%; }
.graph-card-th-style { width: 20%; }
.graph-card-th-actions { width: 32px; }

.graph-card-row {
  transition: background-color 0.15s;

  &:hover {
    background-color: #2a2a2a;
  }

  &.graph-card-row-dragging {
    opacity: 0.5;
  }

  &.graph-card-row-invalid {
    background-color: rgba(241, 76, 76, 0.1);
  }
}

.graph-card-row td {
  padding: 4px 8px;
  vertical-align: middle;
  border-bottom: 1px solid #2d2d2d;
}

.graph-card-td-drag {
  text-align: center;
}

.graph-card-row-handle {
  cursor: grab;
  color: #555;
  font-size: 12px;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.graph-card-input {
  width: 100%;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 3px 6px;
  color: #cccccc;
  font-size: 11px;

  &:hover {
    border-color: #3c3c3c;
  }

  &:focus {
    outline: none;
    border-color: #0078d4;
    background-color: #1e1e1e;
  }
}

.graph-card-var-name {
  color: #888;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 10px;

  &.graph-card-var-invalid {
    color: #f14c4c;
  }
}

.graph-card-var-error {
  margin-right: 4px;
}

.graph-card-td-color {
  display: flex;
  align-items: center;
  gap: 4px;
}

.graph-card-color {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.graph-card-color-text {
  width: 60px;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 2px 4px;
  color: #888;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 10px;

  &:hover {
    border-color: #3c3c3c;
  }

  &:focus {
    outline: none;
    border-color: #0078d4;
    background-color: #1e1e1e;
    color: #cccccc;
  }
}

.graph-card-select {
  width: 100%;
  background-color: #3c3c3c;
  border: 1px solid #4a4a4a;
  border-radius: 3px;
  padding: 3px 6px;
  color: #cccccc;
  font-size: 11px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #0078d4;
  }
}

.graph-card-row-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  border-radius: 3px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background-color: #f14c4c;
    color: #ffffff;
  }
}

</style>
