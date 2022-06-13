<!-- Copyright (c) 2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { get } from 'svelte/store'

import type { ListItemViewModel } from './list-item-vm'
import type { SearchListViewModel } from './search-list-vm'

export let viewModel: SearchListViewModel
const query = viewModel.query
const filteredItems = viewModel.filteredItems

// Reset the active index when the filtered list changes
let activeIndex = -1
$: if ($filteredItems.length > 0) {
  activeIndex = 0
} else {
  activeIndex = -1
}

function onInput() {
  // console.log($query)
}

function onKeyDown(e: KeyboardEvent) {
  const itemCount = $filteredItems.length
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
      const selectedItem = $filteredItems[activeIndex]
      viewModel.onItemSelected?.(selectedItem)

      // Clear the query
      query.set('')
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




<!-- TEMPLATE -->
<template lang='pug'>

include search-list.pug

input(type='text' placeholder='Search variables...' bind:value!='{$query}' on:input!='{onInput}')
.items
  +items

svelte:window(on:keydown!='{onKeyDown}')

</template>




<!-- STYLE -->
<style lang='sass'>

input
  height: 1.7rem
  font-size: inherit
  border: 1px solid #aaa
  outline: none

input:focus
  border-color: blue

.items
  display: flex
  flex-direction: column
  min-height: 8rem
  max-height: 8rem
  overflow-y: auto
  background-color: #fff

.item
  display: flex
  align-items: center
  min-height: 1.6rem
  padding: 0 .4rem
  background-color: #fff
  cursor: pointer
  user-select: none

.item:hover
  background-color: #ddd
  
.item.active
  background-color: #ccccff

</style>
