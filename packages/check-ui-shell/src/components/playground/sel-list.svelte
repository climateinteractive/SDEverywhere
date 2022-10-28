<!-- Copyright (c) 2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import type { ListItemViewModel } from './list-item-vm'
import type { SelListViewModel } from './sel-list-vm'

export let viewModel: SelListViewModel
const items = viewModel.items
const selectedItemId = viewModel.selectedItemId

let inputElem: HTMLInputElement
let inputValue = ''

function onItemClicked(item: ListItemViewModel) {
  viewModel.selectedItemId.set(item.id)
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

include sel-list.pug

.items
  +items

</template>




<!-- STYLE -->
<style lang='sass'>

.items
  display: flex
  flex-direction: column
  overflow-y: auto

.item
  display: flex
  align-items: center
  height: 2rem
  margin-bottom: .2rem
  padding: 0 .6rem
  background-color: #fff
  border-radius: .4rem
  border: solid 1px #ccc
  cursor: pointer
  user-select: none

.item.active
  background-color: lightblue

</style>
