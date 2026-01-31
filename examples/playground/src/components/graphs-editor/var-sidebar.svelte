<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { VarInfo } from '../../app-vm.svelte'

interface Props {
  /** Header title for the sidebar. */
  title: string
  /** List of variables to display. */
  variables: VarInfo[]
  /** Callback when drag starts. */
  onDragStart?: (varId: string) => void
  /** Callback when drag ends. */
  onDragEnd?: () => void
}

let { title, variables, onDragStart, onDragEnd }: Props = $props()

/**
 * Get the type badge letter for a variable.
 *
 * @param varInfo The variable info.
 * @returns Single letter for the badge.
 */
function getTypeBadge(varInfo: VarInfo): string {
  switch (varInfo.varType) {
    case 'level':
      return 'L'
    case 'aux':
      return 'A'
    case 'const':
      return 'C'
    case 'data':
      return 'D'
    default:
      return '?'
  }
}

/**
 * Get display name for a variable.
 *
 * @param varId The variable reference ID.
 * @returns Display name.
 */
function getDisplayName(varId: string): string {
  let name = varId
  if (name.startsWith('_')) {
    name = name.slice(1)
  }
  return name.replace(/_/g, ' ')
}
</script>

<!-- TEMPLATE -->
<div class="var-sidebar">
  <div class="var-sidebar-header">{title}</div>
  <div class="var-sidebar-list" role="list">
    {#if variables.length > 0}
      {#each variables as varInfo}
        <div
          class="var-sidebar-item"
          role="listitem"
          draggable="true"
          ondragstart={() => onDragStart?.(varInfo.refId)}
          ondragend={onDragEnd}
          title={varInfo.refId}
        >
          <span class="var-sidebar-type">{getTypeBadge(varInfo)}</span>
          <span class="var-sidebar-name">{getDisplayName(varInfo.refId)}</span>
        </div>
      {/each}
    {:else}
      <div class="var-sidebar-empty">No variables</div>
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">

.var-sidebar {
  width: 180px;
  min-width: 180px;
  background-color: #252526;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.var-sidebar-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #969696;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #3c3c3c;
}

.var-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.var-sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: grab;
  font-size: 12px;
  color: #cccccc;
  transition: background-color 0.15s;

  &:hover {
    background-color: #3c3c3c;
  }

  &:active {
    cursor: grabbing;
  }
}

.var-sidebar-type {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  background-color: #4e4e4e;
  color: #e0e0e0;
  flex-shrink: 0;
}

.var-sidebar-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-sidebar-empty {
  padding: 12px;
  color: #6e6e6e;
  font-size: 12px;
  text-align: center;
}

</style>
