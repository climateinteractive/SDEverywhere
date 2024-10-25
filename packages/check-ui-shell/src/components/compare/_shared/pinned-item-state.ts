// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { get, writable, type Readable, type Writable } from 'svelte/store'

export type PinnedItemKey = string

export interface PinnedItemStates {
  pinnedDatasets: PinnedItemState
  pinnedScenarios: PinnedItemState
  pinnedFreeformRows: PinnedItemState
}

export class PinnedItemState {
  private readonly itemStates: Map<PinnedItemKey, Writable<boolean>>
  private readonly writableOrderedKeys: Writable<PinnedItemKey[]>
  public readonly orderedKeys: Readable<PinnedItemKey[]>

  constructor() {
    // TODO: Load initial state from LocalStorage
    this.itemStates = new Map()
    this.writableOrderedKeys = writable([])
    this.orderedKeys = this.writableOrderedKeys
  }

  public getPinned(key: PinnedItemKey): Readable<boolean> {
    validateKey(key)
    return this.getWritableItemState(key)
  }

  private getWritableItemState(key: PinnedItemKey): Writable<boolean> {
    validateKey(key)
    let store = this.itemStates.get(key)
    if (store === undefined) {
      store = writable(false)
      this.itemStates.set(key, store)
    }
    return store
  }

  public toggleItemPinned(key: PinnedItemKey): void {
    validateKey(key)
    const itemState = this.getWritableItemState(key)
    const isPinned = get(itemState)
    if (isPinned) {
      // The item is currently pinned, so remove it from the array of pinned items and
      // clear the pinned flag on the item
      itemState.set(false)
      this.removePinnedItem(key)
    } else {
      // The item is not currently pinned, so add it to the end of the array of pinned
      // items and set the pinned flag on the item
      itemState.set(true)
      this.addPinnedItem(key)
    }
  }

  private addPinnedItem(key: PinnedItemKey): void {
    // Add the new item to the end of the ordered array
    this.writableOrderedKeys.update(keys => {
      keys.push(key)
      return keys
    })
  }

  private removePinnedItem(key: PinnedItemKey): void {
    // Remove the item from the ordered item
    this.writableOrderedKeys.update(keys => {
      const index = keys.findIndex(k => k === key)
      if (index >= 0) {
        keys.splice(index, 1)
      }
      return keys
    })
  }

  public moveItemToTop(key: PinnedItemKey): void {
    validateKey(key)
    this.writableOrderedKeys.update(keys => {
      const index = keys.findIndex(k => k === key)
      if (index >= 0) {
        keys.splice(index, 1)
        keys.unshift(key)
      }
      return keys
    })
  }

  public setItemOrder(keys: PinnedItemKey[]): void {
    // Use the new order of items that resulted from a drag-and-drop operation
    keys.forEach(validateKey)
    this.writableOrderedKeys.set(keys)
  }
}

function validateKey(key: PinnedItemKey): void {
  // XXX: This class only expects "regular" row IDs (not the ones with the 'pinned_'
  // prefix used for pinned rows), so for now throw an error if we see 'pinned_'
  if (key.startsWith('pinned_')) {
    throw new Error(`PinnedItemState expects regular keys but got ${key}`)
  }
}

export function createPinnedItemStates(): PinnedItemStates {
  return {
    pinnedDatasets: new PinnedItemState(),
    pinnedScenarios: new PinnedItemState(),
    pinnedFreeformRows: new PinnedItemState()
  }
}
