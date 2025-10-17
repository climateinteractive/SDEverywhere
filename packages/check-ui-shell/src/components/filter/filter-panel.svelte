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

  <div class="filter-item" style={indentStyle}>
    <label class="filter-label">
      <input
        type="checkbox"
        class="filter-checkbox"
        checked={checkboxState === 'checked'}
        indeterminate={checkboxState === 'indeterminate'}
        onchange={() => {
          viewModel.toggleItem(item)
          triggerUpdate()
        }}
      />
      <span class="filter-text">{@html item.label}</span>
    </label>
  </div>
{/snippet}

<div class="filter-panel">
  {#each viewModel.items as item (item.key)}
    {@render filterItem(0, item)}

    {#if item.children}
      {#each item.children as child (child.key)}
        {@render filterItem(1, child)}

        {#if child.children}
          {#each child.children as grandchild (grandchild.key)}
            {@render filterItem(2, grandchild)}
          {/each}
        {/if}
      {/each}
    {/if}
  {/each}
</div>

<!-- STYLES -->
<style>
.filter-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
  background-color: #2c2c2c;
  color: #fff;
  font-family: Roboto, sans-serif;
  font-size: 1rem;
  line-height: 1.3;
}

.filter-item {
  margin: 0.2rem 0;
}

.filter-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.filter-checkbox {
  margin-right: 0.5rem;
  cursor: pointer;
}

.filter-text {
  flex: 1;
}

.filter-label:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  padding: 0.125rem 0.25rem;
  margin: -0.125rem -0.25rem;
}
</style>
