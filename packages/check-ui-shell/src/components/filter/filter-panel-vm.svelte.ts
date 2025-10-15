// Copyright (c) 2025 Climate Interactive / New Venture Fund

export type FilterCheckboxState = 'checked' | 'unchecked' | 'indeterminate'

export interface FilterItem {
  key: string
  label: string
  children?: FilterItem[]
}

export interface FilterState {
  [key: string]: FilterCheckboxState
}

export class FilterPanelViewModel {
  private readonly itemState: FilterState = {}

  constructor(
    public readonly items: FilterItem[],
    initialState: FilterState
  ) {
    // Start with all leaf items enabled by default
    const defaultState: FilterState = {}

    const addLeafItemsToState = (items: FilterItem[]) => {
      for (const item of items) {
        if (item.children) {
          // Parent items don't get their own state - they're calculated from children
          addLeafItemsToState(item.children)
        } else {
          // Only leaf items get their own state
          defaultState[item.key] = 'checked'
        }
      }
    }

    addLeafItemsToState(this.items)

    // Merge with initial state (initial state takes precedence)
    Object.assign(this.itemState, defaultState, initialState)
  }

  // XXX: _updateCount is a hack to force a re-render of the component when the state changes
  getCheckboxState(item: FilterItem, _updateCount: number): FilterCheckboxState {
    if (!item.children) {
      // Leaf items: check their state in itemState
      return this.itemState[item.key] || 'unchecked'
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
    const newState = currentState === 'checked' ? 'unchecked' : 'checked'

    if (item.children) {
      // This is a parent item; update children to match the state of this item
      const toggleChildren = (items: FilterItem[]) => {
        for (const child of items) {
          if (child.children) {
            toggleChildren(child.children)
          } else {
            // Only leaf items have state in itemState
            this.itemState[child.key] = newState
          }
        }
      }
      toggleChildren(item.children)
    } else {
      // This is a leaf item; update its state
      this.itemState[item.key] = newState
    }
  }

  getStateAsJson(): string {
    // Return item states as JSON
    return JSON.stringify(this.itemState)
  }
}

export function createFilterPanelViewModel(filterItems: FilterItem[], initialState: FilterState) {
  return new FilterPanelViewModel(filterItems, initialState)
}
