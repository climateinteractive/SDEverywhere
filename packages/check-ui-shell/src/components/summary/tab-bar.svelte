<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { createEventDispatcher } from 'svelte'

import type { TabBarViewModel } from './tab-bar-vm'

export let viewModel: TabBarViewModel
const selectedItemId = viewModel.selectedItemId

const dispatch = createEventDispatcher()

function onItemClicked(index: number): void {
  viewModel.selectedIndex.set(index)
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    viewModel.selectedIndex.update(index => {
      return index > 0 ? index - 1 : index
    })
    event.preventDefault()
  } else if (event.key === 'ArrowRight') {
    viewModel.selectedIndex.update(index => {
      return index < viewModel.items.length - 1 ? index + 1 : index
    })
    event.preventDefault()
  } else if (event.key === 'ArrowDown') {
    dispatch('command', { cmd: 'enter-tab', itemId: $selectedItemId })
    event.preventDefault()
  }
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include tab-bar.pug

svelte:window(on:keydown!='{onKeyDown}')

.tab-bar(on:command)
  +items

</template>




<!-- STYLE -->
<style lang='sass'>

.tab-bar
  position: sticky
  top: 0
  display: flex
  flex-direction: row
  gap: 3rem
  background-color: #272727
  z-index: 1000
  // XXX: Use negative margin to make the shadow stretch all the way 
  // across, then use extra padding to compensate
  margin: 0 -1rem
  padding: 0 1rem
  box-shadow: 0 1rem .5rem -.5rem rgba(0,0,0,.8)

.tab-item
  display: flex
  flex-direction: column
  padding: .5rem 3rem .3rem 0
  cursor: pointer
  opacity: 0.7
  border-bottom: solid 1px transparent

.tab-item:hover
  opacity: 1.0

.tab-item.selected
  opacity: 1.0
  border-bottom: solid 1px #555

.tab-title
  font-size: 1.6rem
  font-weight: 700
  color: #fff
  margin-bottom: .2rem
  cursor: pointer

.tab-subtitle
  font-size: 1rem
  font-weight: 400

</style>
