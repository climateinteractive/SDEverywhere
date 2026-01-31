// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'

import type { ListItemViewModel } from './list-item-vm'

/** View model for a selection list control. */
export class SelListViewModel {
  /** Called when the user has removed an item from the list. */
  public onItemRemoved?: (item: ListItemViewModel) => void

  /**
   * @param items The list items.
   * @param selectedItemId The selected item ID.
   */
  constructor(
    public readonly items: Readable<ListItemViewModel[]>,
    public readonly selectedItemId: Writable<string>
  ) {}
}
