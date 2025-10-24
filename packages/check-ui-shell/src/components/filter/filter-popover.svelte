<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script lang="ts">
import FilterPanel from './filter-panel.svelte'
import type { FilterPopoverViewModel } from './filter-popover-vm'

interface Props {
  viewModel: FilterPopoverViewModel
  onClose: () => void
  onApplyAndRun?: () => void
}

let { viewModel, onClose, onApplyAndRun }: Props = $props()

// Tab state
let activeTab = $state<'checks' | 'scenarios'>('checks')

function setActiveTab(tab: 'checks' | 'scenarios') {
  activeTab = tab
}
</script>

<!-- TEMPLATE -->
<div class="filter-popover">
  <div class="filter-popover-header">
    <div class="filter-popover-header-title">Filters</div>
    <button class="filter-popover-button close" aria-label="Close" onclick={() => onClose()}></button>
  </div>

  <div class="filter-popover-tab-bar">
    <button
      class="filter-popover-tab-button"
      class:active={activeTab === 'checks'}
      onclick={() => setActiveTab('checks')}
    >
      Checks
    </button>
    <button
      class="filter-popover-tab-button"
      class:active={activeTab === 'scenarios'}
      onclick={() => setActiveTab('scenarios')}
    >
      Comparison Scenarios
    </button>
  </div>

  <div class="filter-popover-content">
    {#if activeTab === 'checks'}
      {#if viewModel.checksPanel}
        <FilterPanel viewModel={viewModel.checksPanel} />
      {:else}
        <div class="filter-popover-content-empty">
          <p>No checks configured</p>
        </div>
      {/if}
    {:else if activeTab === 'scenarios'}
      {#if viewModel.comparisonScenariosPanel}
        <FilterPanel viewModel={viewModel.comparisonScenariosPanel} />
      {:else}
        <div class="filter-popover-content-empty">
          <p>No comparisons configured</p>
        </div>
      {/if}
    {/if}
  </div>

  <div class="filter-popover-footer">
    <button class="filter-popover-button apply" onclick={() => onApplyAndRun?.()}>Apply and Run</button>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.filter-popover {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background-color: #2c2c2c;
  color: #fff;
}

.filter-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #282828;
  border-bottom: 1px solid #444;
}

.filter-popover-header-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.filter-popover-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: unset;
  border: 1px solid #555;
  border-radius: 8px;
  font-family: Roboto, sans-serif;
  font-size: 1.2rem;
  color: #fff;
  cursor: pointer;

  &:hover {
    background-color: #555;
  }
}

.filter-popover-button.close {
  width: 2rem;
  height: 2rem;
  font-size: 1.5rem;

  &::after {
    content: '×';
  }
}

.filter-popover-button.apply {
  padding: 4px 8px;
}

.filter-popover-tab-bar {
  display: flex;
  background-color: #333;
}

.filter-popover-tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: #2c2c2c;
  border: none;
  border-bottom: 1px solid #444;
  font-family: Roboto, sans-serif;
  font-size: 1rem;
  color: #ccc;
  cursor: pointer;

  &:hover {
    background-color: #444;
    color: #fff;
  }

  &.active {
    background-color: #333;
    color: #fff;
    border-bottom-color: #007acc;
  }
}

.filter-popover-content {
  flex: 1;
  overflow: auto;
}

.filter-popover-content :global(.filter-panel) {
  border-top: none;
}

.filter-popover-content-empty {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.filter-popover-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  background-color: #282828;
  border-top: 1px solid #444;
}
</style>
