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
  /** Whether this card is a drop target. */
  isDropTarget?: boolean
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
  /** Callback for drag over. */
  onDragOver?: (e: DragEvent) => void
  /** Callback for drop. */
  onDrop?: (e: DragEvent) => void
}

let {
  config,
  getGraphData,
  isDropTarget = false,
  onTitleChange,
  onVariableUpdate,
  onVariableRemove,
  onVariablesReorder,
  onRemove,
  onDragOver,
  onDrop
}: Props = $props()

// Build graph view model from the first variable (for now)
const graphViewModel = $derived.by(() => {
  const firstVar = config.variables[0]
  if (!firstVar) return undefined

  return {
    key: `${config.id}-${config.variables.map(v => v.varId).join('-')}`,
    points: getGraphData(firstVar.varId)
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

function handleVarDragStart(index: number) {
  draggedVarIndex = index
}

function handleVarDragEnd() {
  draggedVarIndex = undefined
}

function handleVarDragOver(e: DragEvent, index: number) {
  if (draggedVarIndex !== undefined && draggedVarIndex !== index) {
    e.preventDefault()
  }
}

function handleVarDrop(e: DragEvent, index: number) {
  if (draggedVarIndex !== undefined && draggedVarIndex !== index) {
    e.preventDefault()
    onVariablesReorder?.(draggedVarIndex, index)
  }
  draggedVarIndex = undefined
}
</script>

<!-- TEMPLATE -->
<div
  class="graph-card"
  class:graph-card-drop-target={isDropTarget}
  role="figure"
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <!-- Header -->
  <div class="graph-card-header">
    <div class="graph-card-drag-handle" title="Drag to reorder">
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
    <button class="graph-card-close" onclick={onRemove} title="Remove graph">×</button>
  </div>

  <!-- Graph -->
  <div class="graph-card-content">
    {#if graphViewModel}
      <Graph viewModel={graphViewModel} width={380} height={180} />
    {/if}
  </div>

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
          <tr
            class="graph-card-row"
            class:graph-card-row-dragging={draggedVarIndex === index}
            draggable="true"
            ondragstart={() => handleVarDragStart(index)}
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
              <span class="graph-card-var-name">{varConfig.varId}</span>
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
