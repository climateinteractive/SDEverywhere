// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { describe, it, expect, vi } from 'vitest'

import { FilterPanelViewModel, createFilterPanelViewModel, type FilterItem, type FilterStates } from './filter-panel-vm'

describe('FilterPanelViewModel', () => {
  const sampleItems: FilterItem[] = [
    {
      key: 'group1',
      label: 'Group 1',
      children: [
        { key: 'group1__test1', titleParts: { groupName: 'Group 1', testName: 'Test 1' }, label: 'Test 1' },
        { key: 'group1__test2', titleParts: { groupName: 'Group 1', testName: 'Test 2' }, label: 'Test 2' }
      ]
    },
    {
      key: 'group2',
      label: 'Group 2',
      children: [
        { key: 'group2__test1', titleParts: { groupName: 'Group 2', testName: 'Test 1' }, label: 'Test 1' },
        { key: 'group2__test2', titleParts: { groupName: 'Group 2', testName: 'Test 2' }, label: 'Test 2' }
      ]
    }
  ]

  describe('constructor', () => {
    it('should initialize with default checked state for all leaf items', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![1], 0)).toBe('checked')
    })

    it('should merge with initial states when provided', () => {
      const initialStates: FilterStates = {
        group1__test1: false,
        group1__test2: true
      }
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![1], 0)).toBe('checked')
    })
  })

  describe('getCheckboxState', () => {
    it('should return checked state for leaf items', () => {
      const initialStates: FilterStates = {
        group1__test1: true,
        group1__test2: false
      }
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('unchecked')
    })

    it('should return checked for parent when all children are checked', () => {
      const initialStates: FilterStates = {
        group1__test1: true,
        group1__test2: true
      }
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('checked')
    })

    it('should return unchecked for parent when all children are unchecked', () => {
      const initialStates: FilterStates = {
        group1__test1: false,
        group1__test2: false
      }
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('unchecked')
    })

    it('should return indeterminate for parent when children have mixed states', () => {
      const initialStates: FilterStates = {
        group1__test1: true,
        group1__test2: false
      }
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('indeterminate')
    })

    it('should return unchecked for leaf items with no state', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})

      // Create a leaf item that doesn't exist in the state
      const orphanItem: FilterItem = {
        key: 'orphan__test',
        titleParts: { orphanName: 'Orphan', testName: 'Test' },
        label: 'Orphan Test'
      }
      expect(viewModel.getCheckboxState(orphanItem, 0)).toBe('unchecked')
    })
  })

  describe('toggleChecked', () => {
    it('should toggle leaf item state', () => {
      const initialState: FilterStates = { group1__test1: true }

      const viewModel = new FilterPanelViewModel(sampleItems, initialState)
      const leafItem = sampleItems[0].children![0]

      expect(viewModel.getCheckboxState(leafItem, 0)).toBe('checked')

      viewModel.toggleChecked(leafItem)

      expect(viewModel.getCheckboxState(leafItem, 0)).toBe('unchecked')
    })

    it('should toggle all children when toggling parent', () => {
      const initialState: FilterStates = {
        group1__test1: true,
        group1__test2: true
      }

      const viewModel = new FilterPanelViewModel(sampleItems, initialState)
      const parentItem = sampleItems[0]

      // Initially all checked
      expect(viewModel.getCheckboxState(parentItem, 0)).toBe('checked')

      // Toggle parent to unchecked
      viewModel.toggleChecked(parentItem)

      expect(viewModel.getCheckboxState(parentItem, 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(parentItem.children![0], 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(parentItem.children![1], 0)).toBe('unchecked')
    })

    it('should call onTreeChanged callback when state changes', () => {
      const onTreeChanged = vi.fn()
      const viewModel = new FilterPanelViewModel(sampleItems, {}, onTreeChanged)

      viewModel.toggleChecked(sampleItems[0].children![0])

      expect(onTreeChanged).toHaveBeenCalledTimes(1)
      expect(onTreeChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.any(Array),
          states: expect.objectContaining({
            group1__test1: false
          })
        })
      )
    })

    it('should not call onTreeChanged callback when not provided', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})

      expect(() => {
        viewModel.toggleChecked(sampleItems[0].children![0])
      }).not.toThrow()
    })
  })

  describe('expand/collapse functionality', () => {
    it('should toggle expanded state for individual items', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})
      const parentItem = sampleItems[0]

      // Initially expanded (default)
      expect(viewModel.isExpanded(parentItem, 0)).toBe(true)

      // Toggle to collapsed
      viewModel.toggleExpanded(parentItem)
      expect(viewModel.isExpanded(parentItem, 0)).toBe(false)

      // Toggle back to expanded
      viewModel.toggleExpanded(parentItem)
      expect(viewModel.isExpanded(parentItem, 0)).toBe(true)
    })

    it('should toggle all siblings when updateSiblingsToMatch is true', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})
      const group1 = sampleItems[0]
      const group2 = sampleItems[1]

      // Initially both groups are expanded (default)
      expect(viewModel.isExpanded(group1, 0)).toBe(true)
      expect(viewModel.isExpanded(group2, 0)).toBe(true)

      // Toggle all siblings (should collapse both since group1 is expanded)
      viewModel.toggleExpanded(group1, /*updateSiblingsToMatch=*/ true)
      expect(viewModel.isExpanded(group1, 0)).toBe(false)
      expect(viewModel.isExpanded(group2, 0)).toBe(false)

      // Toggle all siblings again (should expand both since group1 is now collapsed)
      viewModel.toggleExpanded(group1, /*updateSiblingsToMatch=*/ true)
      expect(viewModel.isExpanded(group1, 0)).toBe(true)
      expect(viewModel.isExpanded(group2, 0)).toBe(true)
    })

    it('should affect all root-level siblings when item has no parent', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})
      const group1 = sampleItems[0]
      const group2 = sampleItems[1]

      // Initially both expanded
      expect(viewModel.isExpanded(group1, 0)).toBe(true)
      expect(viewModel.isExpanded(group2, 0)).toBe(true)

      // Toggle all siblings should affect all root-level items
      viewModel.toggleExpanded(group1, /*updateSiblingsToMatch=*/ true)
      expect(viewModel.isExpanded(group1, 0)).toBe(false)
      expect(viewModel.isExpanded(group2, 0)).toBe(false)
    })

    it('should not affect leaf items when calling toggleExpanded when updateSiblingsToMatch is true', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, {})
      const leafItem = sampleItems[0].children![0]

      // Leaf items don't have expand state, so this should not throw
      expect(() => {
        viewModel.toggleExpanded(leafItem, /*updateSiblingsToMatch=*/ true)
      }).not.toThrow()
    })
  })

  describe('state serialization', () => {
    it('should serialize state correctly', () => {
      const initialState: FilterStates = {
        group1__test1: true,
        group1__test2: false
      }

      const onTreeChanged = vi.fn()
      const viewModel = new FilterPanelViewModel(sampleItems, initialState, onTreeChanged)

      viewModel.toggleChecked(sampleItems[0].children![0])

      const tree = onTreeChanged.mock.calls[0][0]

      // The constructor creates default states for all leaf items, so we expect all items to be present
      expect(tree.states).toEqual({
        group1__test1: false,
        group1__test2: false,
        group2__test1: true,
        group2__test2: true
      })
    })
  })

  describe('createFilterPanelViewModel', () => {
    it('should create FilterPanelViewModel instance', () => {
      const initialState: FilterStates = { group1__test1: true }

      const viewModel = createFilterPanelViewModel(sampleItems, initialState)

      expect(viewModel).toBeInstanceOf(FilterPanelViewModel)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
    })

    it('should create FilterPanelViewModel with callback', () => {
      const onTreeChanged = vi.fn()
      const viewModel = createFilterPanelViewModel(sampleItems, {}, onTreeChanged)

      viewModel.toggleChecked(sampleItems[0].children![0])

      expect(onTreeChanged).toHaveBeenCalledTimes(1)
    })
  })
})
