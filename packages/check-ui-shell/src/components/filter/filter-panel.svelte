<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script lang="ts">
import type { FilterItem, FilterPanelViewModel } from './filter-panel-vm'

interface Props {
  viewModel: FilterPanelViewModel
}

let { viewModel }: Props = $props()

function getItemStyle(level: number) {
  return `padding-left: ${level * 20}px;`
}

// XXX: Create a reactive state that triggers updates when the view model changes
let updateCount = $state(0)
function triggerUpdate() {
  updateCount++
}
</script>

<!-- TEMPLATE -->
{#snippet filterItem(level: number, item: FilterItem)}
  {@const checkboxState = viewModel.getCheckboxState(item, updateCount)}
  {@const indentStyle = getItemStyle(level)}
  {@const isExpanded = viewModel.isExpanded(item, updateCount)}
  {@const hasChildren = item.children && item.children.length > 0}

  <div class="filter-item" style={indentStyle}>
    {#if hasChildren}
      <button
        class="filter-expand-button"
        data-testid="{item.key}-triangle"
        onclick={event => {
          const updateSiblingsToMatch = event.altKey
          viewModel.toggleExpanded(item, updateSiblingsToMatch)
          triggerUpdate()
        }}
      >
        <span class="filter-triangle" class:expanded={isExpanded}> ▶ </span>
      </button>
    {:else}
      <span class="filter-expand-spacer"></span>
    {/if}
    <label class="filter-label">
      <input
        type="checkbox"
        class="filter-checkbox"
        checked={checkboxState === 'checked'}
        indeterminate={checkboxState === 'indeterminate'}
        onchange={() => {
          viewModel.toggleChecked(item)
          triggerUpdate()
        }}
      />
      <span class="filter-text">{@html item.label}</span>
    </label>
  </div>

  {#if hasChildren}
    <div class="filter-children" data-testid="{item.key}-children" style="display: {isExpanded ? 'block' : 'none'}">
      {#each item.children as child (child.key)}
        {@render filterItem(level + 1, child)}
      {/each}
    </div>
  {/if}
{/snippet}

<div class="filter-panel">
  {#each viewModel.items as item (item.key)}
    {@render filterItem(0, item)}
  {/each}
</div>

<!-- STYLES -->
<style>
.filter-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
  background-color: var(--panel-bg);
  color: var(--text-color-primary);
  font-family: Roboto, sans-serif;
  font-size: 1rem;
  line-height: 1.3;
}

.filter-item {
  display: flex;
  align-items: center;
  margin: 0.2rem 0;
}

.filter-label {
  display: flex;
  align-items: center;
  user-select: none;
  cursor: pointer;
}

.filter-label:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  padding: 0.125rem 0.25rem;
  margin: -0.125rem -0.25rem;
}

.filter-checkbox {
  margin-right: 0.5rem;
  cursor: pointer;
}

.filter-text {
  flex: 1;
}

.filter-expand-button {
  background: none;
  border: none;
  padding: 0;
  margin-right: 0.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
}

.filter-expand-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.filter-triangle {
  font-size: 1rem;
  color: var(--text-color-secondary);
  user-select: none;
}

.filter-triangle.expanded {
  transform: rotate(90deg);
}

.filter-expand-spacer {
  width: 1.3rem;
  height: 1.3rem;
  margin-right: 0.25rem;
}
</style>
