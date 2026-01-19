<!-- Copyright (c) 2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import type { ListItemViewModel } from './list-item-vm.svelte'
import type { SelListViewModel } from './sel-list-vm.svelte'

interface Props {
  viewModel: SelListViewModel
}

let { viewModel }: Props = $props()

function onItemClicked(item: ListItemViewModel) {
  viewModel.selectedItemId = item.id
}
</script>

<!-- TEMPLATE -->
<div class="sel-list">
  <div class="items" role="listbox">
    {#each viewModel.items as item}
      <div class="item" role="option" tabindex="-1" aria-selected={item.id === viewModel.selectedItemId} onclick={() => onItemClicked(item)} class:active={item.id === viewModel.selectedItemId}>
        {@html item.label}
      </div>
    {/each}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.sel-list {
  .items {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .item {
    display: flex;
    align-items: center;
    height: 2rem;
    margin-bottom: 0.2rem;
    padding: 0 0.6rem;
    background-color: #fff;
    border-radius: 0.4rem;
    border: solid 1px #ccc;
    cursor: pointer;
    user-select: none;

    &.active {
      background-color: lightblue;
    }
  }
}
</style>
