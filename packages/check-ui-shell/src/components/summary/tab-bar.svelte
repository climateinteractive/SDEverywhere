<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'

import type { TabBarViewModel } from './tab-bar-vm'
import TabItem from './tab-item.svelte'

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
<svelte:window on:keydown={onKeyDown} />

<div class="tab-bar">
  {#each viewModel.items as item, index}
    <TabItem
      title={item.title}
      subtitle={item.subtitle}
      subtitleClass={item.subtitleClass}
      selected={item.id === $selectedItemId}
      onClick={() => onItemClicked(index)}
    />
  {/each}
</div>

<!-- STYLE -->
<style lang="scss">
.tab-bar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: row;
  gap: 3rem;
  background-color: #272727;
  z-index: 1000;
  // XXX: Use negative margin to make the shadow stretch all the way
  // across, then use extra padding to compensate
  margin: 0 -1rem;
  padding: 0 1rem;
  box-shadow: 0 1rem 0.5rem -0.5rem rgba(0, 0, 0, 0.8);
}
</style>
