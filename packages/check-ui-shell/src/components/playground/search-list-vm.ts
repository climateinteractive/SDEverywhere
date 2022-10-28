// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import type { ListItemViewModel } from './list-item-vm'

/** View model for a searchable list control. */
export class SearchListViewModel {
  public readonly query: Writable<string>
  public readonly filteredItems: Readable<ListItemViewModel[]>
  public readonly activeItemId: Writable<string>

  /** Called when the user has selected an item. */
  public onItemSelected?: (item: ListItemViewModel) => void

  /**
   * @param items The list items.
   */
  constructor(public readonly items: Readable<ListItemViewModel[]>) {
    // Keep the query field empty by default
    this.query = writable('')

    // Filter the list and only keep items that match the query.
    // The fuzzy matching is similar to how "Go To File" and similar
    // search functions work in VS Code.
    this.filteredItems = derived([this.query, items], ([$query, $items]) => {
      const trimmed = $query.trim()
      if (trimmed.length === 0) {
        return $items
      } else {
        const chars = trimmed.split('').filter(c => c.trim().length > 0)
        const regex = new RegExp(`^.*${chars.join('.*')}.*$`, 'i')
        const filtered = $items.filter(item => item.label.match(regex) !== null)
        return filtered
      }
    })

    // Keep track of which item is "active", i.e., highlighted for
    // keyboard navigation.  Note that this is separate from the
    // "hover" state, which is tracked in the view only.
    this.activeItemId = writable(undefined)
  }
}
