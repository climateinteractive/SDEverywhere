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

export interface FilterStates {
  [key: FilterItemKey]: boolean
}

export interface FilterItemTree {
  items: FilterItem[]
  states: FilterStates
}

export class FilterPanelViewModel {
  private itemStates: FilterStates = {}

  constructor(
    public readonly items: FilterItem[],
    initialStates: FilterStates,
    private readonly onTreeChanged?: (tree: FilterItemTree) => void
  ) {
    // Initialize the `itemStates` with the initial states
    const addLeafItemsToState = (items: FilterItem[]) => {
      for (const item of items) {
        if (item.children) {
          // Parent items don't get their own state - they're calculated from children
          addLeafItemsToState(item.children)
        } else {
          // Only leaf items get their own state
          const initialState = initialStates[item.key]
          this.itemStates[item.key] = initialState !== undefined ? initialState : true
        }
      }
    }
    addLeafItemsToState(this.items)
  }

  getItemTree(): FilterItemTree {
    return {
      items: this.items,
      states: this.itemStates
    }
  }

  // XXX: _updateCount is a hack to force a re-render of the component when the state changes
  getCheckboxState(item: FilterItem, _updateCount: number): FilterCheckboxState {
    if (!item.children) {
      // For leaf items, check the state in itemStates
      const state = this.itemStates[item.key]
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
            this.itemStates[child.key] = newChecked
          }
        }
      }
      toggleChildren(item.children)
    } else {
      // This is a leaf item; update its state
      this.itemStates[item.key] = newChecked
    }

    // Notify that the tree has changed
    this.onTreeChanged?.({
      items: this.items,
      states: this.itemStates
    })
  }
}

export function createFilterPanelViewModel(
  filterItems: FilterItem[],
  initialStates: FilterStates,
  onTreeChanged?: (tree: FilterItemTree) => void
): FilterPanelViewModel {
  return new FilterPanelViewModel(filterItems, initialStates, onTreeChanged)
}

export function loadFilterItemTreeFromLocalStorage(key: string): FilterItemTree {
  try {
    const json = localStorage.getItem(key)
    if (!json) {
      return { items: [], states: {} }
    }
    return JSON.parse(json) as FilterItemTree
  } catch (error) {
    console.warn(`Failed to load filter item tree from LocalStorage (${key}):`, error)
    return { items: [], states: {} }
  }
}

export function saveFilterItemTreeToLocalStorage(key: string, tree: FilterItemTree): void {
  try {
    localStorage.setItem(key, JSON.stringify(tree))
  } catch (error) {
    console.warn(`Failed to save filter item tree to LocalStorage (${key}):`, error)
  }
}
