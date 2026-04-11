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
  private expandStates: FilterStates = {}

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
          // Expand all parent items by default
          this.expandStates[item.key] = true
        } else {
          // Only leaf items get their own state
          const initialState = initialStates[item.key]
          this.itemStates[item.key] = initialState !== undefined ? initialState : true
        }
      }
    }
    addLeafItemsToState(this.items)
  }

  /**
   * Return the current item tree and states.
   */
  getItemTree(): FilterItemTree {
    return {
      items: this.items,
      states: this.itemStates
    }
  }

  /**
   * Return the checkbox state for the given item.
   */
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

  /**
   * Toggle the checked state for the given item.
   */
  toggleChecked(item: FilterItem): void {
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

  /**
   * Return true if the given item is expanded.
   */
  // XXX: _updateCount is a hack to force a re-render of the component when the state changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isExpanded(item: FilterItem, _updateCount: number): boolean {
    return this.expandStates[item.key] ?? false
  }

  /**
   * Toggle the expanded state for the given item.
   *
   * @param updateSiblingsToMatch If true, update the expanded state of all siblings to match
   * the new state of the item.
   */
  toggleExpanded(item: FilterItem, updateSiblingsToMatch = false): void {
    if (updateSiblingsToMatch) {
      this.toggleExpandedIncludingSiblings(item)
    } else {
      if (item.children) {
        this.expandStates[item.key] = !this.expandStates[item.key]
      }
    }
  }

  /**
   * Toggle the expanded state for all sibling items at the same level.  If the given item
   * is expanded, collapse it and all siblings.  If the given item is collapsed, expand
   * it and all siblings.
   */
  private toggleExpandedIncludingSiblings(item: FilterItem): void {
    // Find the parent of this item
    const parent = this.findParent(item)

    // Determine which items are siblings
    let siblings: FilterItem[]
    if (!parent) {
      // If no parent, this is a root-level item, so siblings are all root items
      siblings = this.items
    } else if (!parent.children) {
      return
    } else {
      siblings = parent.children
    }

    // Determine the target state based on current item's state
    const currentExpanded = this.isExpanded(item, 0)
    const targetState = !currentExpanded

    // Apply the target state to all siblings
    for (const sibling of siblings) {
      if (sibling.children) {
        this.expandStates[sibling.key] = targetState
      }
    }
  }

  /**
   * Find the parent of the given item in the tree.
   */
  private findParent(targetItem: FilterItem): FilterItem | null {
    const findParentRecursive = (items: FilterItem[], parent: FilterItem | null = null): FilterItem | null => {
      for (const item of items) {
        if (item === targetItem) {
          return parent
        }
        if (item.children) {
          const found = findParentRecursive(item.children, item)
          if (found !== null) {
            return found
          }
        }
      }
      return null
    }
    return findParentRecursive(this.items)
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
