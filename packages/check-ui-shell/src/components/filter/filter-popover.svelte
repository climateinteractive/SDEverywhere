<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script lang="ts">
import Button from '../_shared/button.svelte'
import CloseButton from '../_shared/close-button.svelte'
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
    <CloseButton onClick={() => onClose()} />
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
    <Button onClick={() => onApplyAndRun?.()}>Apply and Run</Button>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.filter-popover {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background-color: var(--panel-bg);
  color: var(--text-color-primary);
}

.filter-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--panel-header-bg);
  border-bottom: 1px solid var(--panel-border);
}

.filter-popover-header-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.filter-popover-tab-bar {
  display: flex;
  background-color: #333;
}

.filter-popover-tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: var(--panel-bg);
  border: none;
  border-bottom: 1px solid var(--panel-border);
  font-family: Roboto, sans-serif;
  font-size: 1rem;
  color: var(--text-color-secondary);
  cursor: pointer;

  &:hover {
    background-color: var(--input-bg);
    color: var(--text-color-primary);
  }

  &.active {
    background-color: #333;
    color: var(--text-color-primary);
    border-bottom-color: var(--border-color-focused);
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
  background-color: var(--panel-footer-bg);
  border-top: 1px solid var(--panel-border);
}
</style>
