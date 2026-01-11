<!-- Copyright (c) 2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { ListItemViewModel } from './list-item-vm.svelte'
import type { SearchListViewModel } from './search-list-vm.svelte'

interface Props {
  viewModel: SearchListViewModel
}

let { viewModel }: Props = $props()

// Reset the active index when the filtered list changes
let activeIndex = $state(-1)
$effect(() => {
  if (viewModel.filteredItems.length > 0) {
    activeIndex = 0
  } else {
    activeIndex = -1
  }
})

function onInput() {
  // console.log(viewModel.query)
}

function onKeyDown(e: KeyboardEvent) {
  const itemCount = viewModel.filteredItems.length
  if (e.key === 'ArrowDown') {
    // Set the next item as active
    if (activeIndex < 0 || activeIndex >= itemCount - 1) {
      activeIndex = 0
    } else {
      activeIndex++
    }
    e.preventDefault()
    return false
  } else if (e.key === 'ArrowUp') {
    // Set the previous item as active
    if (activeIndex < 1) {
      activeIndex = itemCount - 1
    } else {
      activeIndex--
    }
    e.preventDefault()
    return false
  } else if (e.key === 'Enter') {
    // Select the active item
    if (activeIndex >= 0) {
      // Notify that the item has been selected
      const selectedItem = viewModel.filteredItems[activeIndex]
      viewModel.onItemSelected?.(selectedItem)

      // Clear the query
      viewModel.query = ''
    }
    e.preventDefault()
    return false
  }
}

function onItemClicked(item: ListItemViewModel) {
  // Notify that the item has been selected
  viewModel.onItemSelected?.(item)
}
</script>

<svelte:window on:keydown={onKeyDown} />

<!-- TEMPLATE -->
<div class="search-list">
  <input type="text" placeholder="Search variables..." bind:value={viewModel.query} oninput={onInput} />
  <div class="items">
    {#each viewModel.filteredItems as item, i}
      <div class="item" onclick={() => onItemClicked(item)} class:active={i === activeIndex}>{@html item.label}</div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.search-list {
  input {
    height: 1.7rem;
    font-size: inherit;
    border: 1px solid #aaa;
    outline: none;

    &:focus {
      border-color: blue;
    }
  }

  .items {
    display: flex;
    flex-direction: column;
    min-height: 8rem;
    max-height: 8rem;
    overflow-y: auto;
    background-color: #fff;
  }

  .item {
    display: flex;
    align-items: center;
    min-height: 1.6rem;
    padding: 0 0.4rem;
    background-color: #fff;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: #ddd;
    }

    &.active {
      background-color: #ccccff;
    }
  }
}
</style>
