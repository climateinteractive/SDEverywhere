// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ListItemViewModel } from './list-item-vm.svelte'

/** View model for a selection list control. */
export class SelListViewModel {
  public selectedItemId = $state<string>('')

  /** Called when the user has removed an item from the list. */
  public onItemRemoved?: (item: ListItemViewModel) => void

  /**
   * @param items The list items.
   */
  constructor(public readonly items: ListItemViewModel[]) {}
}
