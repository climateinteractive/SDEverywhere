<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import fuzzysort from 'fuzzysort'

import type { ListItemViewModel } from './list-item-vm.svelte'

interface Props {
  /** The list of items to choose from. */
  items: ListItemViewModel[]
  /** The currently selected item ID. */
  selectedId: string
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Aria label for accessibility. */
  ariaLabel?: string
  /** Callback when an item is selected. */
  onSelect?: (item: ListItemViewModel) => void
}

let { items, selectedId, placeholder = 'Search...', ariaLabel = 'Select item', onSelect }: Props = $props()

let showPopup = $state(false)
let searchQuery = $state('')
let activeIndex = $state(0)
let popupRef = $state<HTMLDivElement | null>(null)
let buttonRef = $state<HTMLButtonElement | null>(null)
let searchInputRef = $state<HTMLInputElement | null>(null)
let popupPosition = $state({ top: 0, left: 0, width: 0 })

const selectedItem = $derived(items.find(item => item.id === selectedId))

const filteredItems = $derived.by(() => {
  if (!searchQuery) {
    return items
  }

  const searchableItems = items.map(item => ({
    item,
    label: item.label
  }))

  const results = fuzzysort.go(searchQuery, searchableItems, {
    keys: ['label'],
    threshold: -10000
  })

  return results.map(result => result.obj.item)
})

// Reset active index when filtered items change
$effect(() => {
  if (filteredItems.length > 0) {
    activeIndex = Math.min(activeIndex, filteredItems.length - 1)
  } else {
    activeIndex = 0
  }
})

onMount(() => {
  // Focus the search input when popup opens
  if (showPopup && searchInputRef) {
    searchInputRef.focus()
  }
})

function handleButtonClick() {
  showPopup = !showPopup
  if (showPopup && buttonRef) {
    // Calculate popup position based on button position
    const rect = buttonRef.getBoundingClientRect()
    popupPosition = {
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width
    }
    searchQuery = ''
    activeIndex = 0
    // Focus search input after a brief delay
    setTimeout(() => {
      searchInputRef?.focus()
    }, 0)
  }
}

function handleItemClick(item: ListItemViewModel) {
  onSelect?.(item)
  showPopup = false
  searchQuery = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (!showPopup) return

  const itemCount = filteredItems.length
  if (e.key === 'ArrowDown') {
    activeIndex = activeIndex < itemCount - 1 ? activeIndex + 1 : 0
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    activeIndex = activeIndex > 0 ? activeIndex - 1 : itemCount - 1
    e.preventDefault()
  } else if (e.key === 'Enter') {
    if (activeIndex >= 0 && activeIndex < itemCount) {
      handleItemClick(filteredItems[activeIndex])
    }
    e.preventDefault()
  } else if (e.key === 'Escape') {
    showPopup = false
    searchQuery = ''
    e.preventDefault()
  }
}

function handleClickOutside(event: MouseEvent) {
  if (popupRef && buttonRef && !popupRef.contains(event.target as Node) && !buttonRef.contains(event.target as Node)) {
    showPopup = false
    searchQuery = ''
  }
}

$effect(() => {
  if (showPopup) {
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }
})
</script>

<!-- TEMPLATE -->
<div class="typeahead-selector">
  <button
    bind:this={buttonRef}
    class="typeahead-selector-button"
    onclick={handleButtonClick}
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={showPopup}
  >
    <span class="typeahead-selector-button-text">{selectedItem?.label || 'Select...'}</span>
    <span class="typeahead-selector-button-arrow">▼</span>
  </button>

  {#if showPopup}
    <div
      bind:this={popupRef}
      class="typeahead-selector-popup"
      style="position: fixed; top: {popupPosition.top}px; left: {popupPosition.left}px; width: {popupPosition.width}px;"
      role="listbox"
    >
      <input
        bind:this={searchInputRef}
        bind:value={searchQuery}
        class="typeahead-selector-search"
        type="text"
        {placeholder}
        onkeydown={handleKeyDown}
        aria-label="Search"
      />
      <div class="typeahead-selector-items">
        {#if filteredItems.length === 0}
          <div class="typeahead-selector-empty">No items found</div>
        {:else}
          {#each filteredItems as item, i}
            <div
              class="typeahead-selector-item"
              class:active={i === activeIndex}
              class:selected={item.id === selectedId}
              role="option"
              tabindex="-1"
              aria-selected={item.id === selectedId}
              onclick={() => handleItemClick(item)}
            >
              {item.label}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.typeahead-selector {
  display: inline-block;
  width: 100%;
}

.typeahead-selector-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: var(--button-bg-hover);
  }

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.typeahead-selector-button-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.typeahead-selector-button-arrow {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.typeahead-selector-popup {
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 250px;
}

.typeahead-selector-search {
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: none;
  border-bottom: 1px solid var(--border-color-normal);
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.85rem;
  flex-shrink: 0;

  &:focus {
    outline: none;
    background-color: var(--input-bg);
  }
}

.typeahead-selector-items {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.typeahead-selector-item {
  padding: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.85rem;

  &:hover,
  &.active {
    background-color: rgba(200, 220, 240, 0.1);
  }

  &.selected {
    background-color: rgba(100, 180, 255, 0.15);
    font-weight: 600;
  }
}

.typeahead-selector-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-color-secondary);
  font-style: italic;
  font-size: 0.85rem;
}
</style>
