// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

export interface TabItemViewModel {
  id: string
  title: string
  subtitle: string
  subtitleClass: string
}

export class TabBarViewModel {
  public readonly selectedIndex: Writable<number>
  public readonly selectedItem: Readable<TabItemViewModel>
  public readonly selectedItemId: Readable<string>

  constructor(public readonly items: TabItemViewModel[], initialIndex: number) {
    this.selectedIndex = writable(initialIndex)
    this.selectedItem = derived(this.selectedIndex, $selectedIndex => items[$selectedIndex])
    this.selectedItemId = derived(this.selectedItem, $selectedItem => $selectedItem.id)
  }
}
