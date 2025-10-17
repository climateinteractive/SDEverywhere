// Copyright (c) 2025 Climate Interactive / New Venture Fund

export type FilterCheckboxState = 'checked' | 'unchecked' | 'indeterminate'

export type FilterItemKey = string

export interface FilterItem {
  key: FilterItemKey
  label: string
  titleParts?: {
    [key: string]: string
  }
  children?: FilterItem[]
}

export type FilterStateMap = Map<FilterItemKey, boolean>

export interface FilterStates {
  [key: FilterItemKey]: {
    titleParts: {
      [key: string]: string
    }
    checked: boolean
  }
}

export class FilterPanelViewModel {
  private readonly itemStates: FilterStateMap = new Map()

  constructor(
    public readonly items: FilterItem[],
    initialStates: FilterStateMap,
    private readonly onStateChanged?: (states: FilterStates) => void
  ) {
    const addLeafItemsToState = (items: FilterItem[]) => {
      for (const item of items) {
        if (item.children) {
          // Parent items don't get their own state - they're calculated from children
          addLeafItemsToState(item.children)
        } else {
          // Only leaf items get their own state
          const initialState = initialStates.get(item.key)
          this.itemStates.set(item.key, initialState !== undefined ? initialState : true)
        }
      }
    }
    addLeafItemsToState(this.items)
  }

  // XXX: _updateCount is a hack to force a re-render of the component when the state changes
  getCheckboxState(item: FilterItem, _updateCount: number): FilterCheckboxState {
    if (!item.children) {
      // For leaf items, check the state in itemStates
      const state = this.itemStates.get(item.key)
      return state === true ? 'checked' : 'unchecked'
    }

    // For parent items, check children states
    const childStates = item.children.map(child => this.getCheckboxState(child, _updateCount))
    const checkedCount = childStates.filter(state => state === 'checked').length
    const uncheckedCount = childStates.filter(state => state === 'unchecked').length

    if (checkedCount === childStates.length) {
      return 'checked'
    } else if (uncheckedCount === childStates.length) {
      return 'unchecked'
    } else {
      return 'indeterminate'
    }
  }

  toggleItem(item: FilterItem): void {
    const currentState = this.getCheckboxState(item, 0)
    const newChecked = currentState === 'checked' ? false : true

    if (item.children) {
      // This is a parent item; update children to match the state of this item
      const toggleChildren = (items: FilterItem[]) => {
        for (const child of items) {
          if (child.children) {
            toggleChildren(child.children)
          } else {
            // Only leaf items have state in itemStates
            this.itemStates.set(child.key, newChecked)
          }
        }
      }
      toggleChildren(item.children)
    } else {
      // This is a leaf item; update its state
      this.itemStates.set(item.key, newChecked)
    }

    // Create a new `FilterStates` object that contains the state of each leaf item
    const filterStates: FilterStates = {}
    const addLeafItemStates = (items: FilterItem[]) => {
      for (const item of items) {
        if (item.children) {
          addLeafItemStates(item.children)
        } else {
          const checked = this.itemStates.get(item.key)
          filterStates[item.key] = {
            titleParts: item.titleParts,
            checked: checked !== undefined ? checked : false
          }
        }
      }
    }
    addLeafItemStates(this.items)

    // Notify the callback that the state has changed
    this.onStateChanged?.(filterStates)
  }
}

export function createFilterPanelViewModel(
  filterItems: FilterItem[],
  initialStates: FilterStateMap,
  onStateChanged?: (states: FilterStates) => void
): FilterPanelViewModel {
  return new FilterPanelViewModel(filterItems, initialStates, onStateChanged)
}
