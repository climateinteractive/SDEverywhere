// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ListItemViewModel } from './list-item-vm.svelte'

/** View model for a searchable list control. */
export class SearchListViewModel {
  public query = $state('')
  public readonly filteredItems = $derived.by(() => this.computeFilteredItems())
  public activeItemId = $state<string | undefined>(undefined)

  /** Called when the user has selected an item. */
  public onItemSelected?: (item: ListItemViewModel) => void

  /**
   * @param items The list items.
   */
  constructor(public readonly items: ListItemViewModel[]) {}

  private computeFilteredItems(): ListItemViewModel[] {
    const trimmed = this.query.trim()
    if (trimmed.length === 0) {
      return this.items
    } else {
      const chars = trimmed.split('').filter(c => c.trim().length > 0)
      const regex = new RegExp(`^.*${chars.join('.*')}.*$`, 'i')
      const filtered = this.items.filter(item => item.label.match(regex) !== null)
      return filtered
    }
  }
}
