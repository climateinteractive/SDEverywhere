<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>
import type { Snippet } from 'svelte'

/** A single tab definition. */
export interface Tab {
  /** Unique identifier for the tab. */
  id: string
  /** Display label for the tab. */
  label: string
  /** Optional badge text (e.g., error count). */
  badge?: string
  /** Badge variant for styling. */
  badgeVariant?: 'default' | 'error' | 'warning'
}

interface Props {
  /** The list of tabs to display. */
  tabs: Tab[]
  /** The currently selected tab ID. */
  selectedTab: string
  /** Callback when a tab is selected. */
  onSelect?: (tabId: string) => void
  /** The content snippet for each tab. */
  children: Snippet<[string]>
}

let { tabs, selectedTab = $bindable(), onSelect, children }: Props = $props()

function selectTab(tabId: string) {
  selectedTab = tabId
  onSelect?.(tabId)
}

function handleKeyDown(event: KeyboardEvent, tabId: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectTab(tabId)
  }
}
</script>




<!-- TEMPLATE -->
<div class="tabs-container">
  <div class="tabs-header" role="tablist">
    {#each tabs as tab}
      <button
        class="tabs-tab"
        class:tabs-tab-selected={selectedTab === tab.id}
        role="tab"
        aria-selected={selectedTab === tab.id}
        tabindex={selectedTab === tab.id ? 0 : -1}
        onclick={() => selectTab(tab.id)}
        onkeydown={(e) => handleKeyDown(e, tab.id)}
      >
        {tab.label}
        {#if tab.badge}
          <span class="tabs-badge" class:tabs-badge-error={tab.badgeVariant === 'error'} class:tabs-badge-warning={tab.badgeVariant === 'warning'}>
            {tab.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>
  <div class="tabs-content" role="tabpanel">
    {@render children(selectedTab)}
  </div>
</div>




<!-- STYLE -->
<style lang='scss'>

.tabs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.tabs-header {
  display: flex;
  flex-direction: row;
  background-color: #252526;
  border-bottom: 1px solid #3c3c3c;
  padding: 0 8px;
  gap: 4px;
}

.tabs-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #969696;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    color: #e0e0e0;
  }

  &.tabs-tab-selected {
    color: #ffffff;
    border-bottom-color: #0078d4;
  }
}

.tabs-badge {
  padding: 2px 6px;
  border-radius: 10px;
  background-color: #4d4d4d;
  color: #cccccc;
  font-size: 11px;
  font-weight: 500;

  &.tabs-badge-error {
    background-color: #f14c4c;
    color: #ffffff;
  }

  &.tabs-badge-warning {
    background-color: #cca700;
    color: #1e1e1e;
  }
}

.tabs-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

</style>
