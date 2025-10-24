// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { describe, it, expect, vi } from 'vitest'

import {
  FilterPanelViewModel,
  createFilterPanelViewModel,
  type FilterItem,
  type FilterItemKey
} from './filter-panel-vm'

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
      const viewModel = new FilterPanelViewModel(sampleItems, new Map())
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![1], 0)).toBe('checked')
    })

    it('should merge with initial states when provided', () => {
      const initialStates: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', false],
        ['group1__test2', true]
      ])
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[1].children![1], 0)).toBe('checked')
    })
  })

  describe('getCheckboxState', () => {
    it('should return checked state for leaf items', () => {
      const initialStates: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', true],
        ['group1__test2', false]
      ])
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
      expect(viewModel.getCheckboxState(sampleItems[0].children![1], 0)).toBe('unchecked')
    })

    it('should return checked for parent when all children are checked', () => {
      const initialStates: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', true],
        ['group1__test2', true]
      ])
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('checked')
    })

    it('should return unchecked for parent when all children are unchecked', () => {
      const initialStates: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', false],
        ['group1__test2', false]
      ])
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('unchecked')
    })

    it('should return indeterminate for parent when children have mixed states', () => {
      const initialStates: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', true],
        ['group1__test2', false]
      ])
      const viewModel = new FilterPanelViewModel(sampleItems, initialStates)
      expect(viewModel.getCheckboxState(sampleItems[0], 0)).toBe('indeterminate')
    })

    it('should return unchecked for leaf items with no state', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, new Map())

      // Create a leaf item that doesn't exist in the state
      const orphanItem: FilterItem = {
        key: 'orphan__test',
        titleParts: { orphanName: 'Orphan', testName: 'Test' },
        label: 'Orphan Test'
      }
      expect(viewModel.getCheckboxState(orphanItem, 0)).toBe('unchecked')
    })
  })

  describe('toggleItem', () => {
    it('should toggle leaf item state', () => {
      const initialState: Map<FilterItemKey, boolean> = new Map([['group1__test1', true]])

      const viewModel = new FilterPanelViewModel(sampleItems, initialState)
      const leafItem = sampleItems[0].children![0]

      expect(viewModel.getCheckboxState(leafItem, 0)).toBe('checked')

      viewModel.toggleItem(leafItem)

      expect(viewModel.getCheckboxState(leafItem, 0)).toBe('unchecked')
    })

    it('should toggle all children when toggling parent', () => {
      const initialState: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', true],
        ['group1__test2', true]
      ])

      const viewModel = new FilterPanelViewModel(sampleItems, initialState)
      const parentItem = sampleItems[0]

      // Initially all checked
      expect(viewModel.getCheckboxState(parentItem, 0)).toBe('checked')

      // Toggle parent to unchecked
      viewModel.toggleItem(parentItem)

      expect(viewModel.getCheckboxState(parentItem, 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(parentItem.children![0], 0)).toBe('unchecked')
      expect(viewModel.getCheckboxState(parentItem.children![1], 0)).toBe('unchecked')
    })

    it('should call onStateChanged callback when state changes', () => {
      const onStateChanged = vi.fn()
      const viewModel = new FilterPanelViewModel(sampleItems, new Map(), onStateChanged)

      viewModel.toggleItem(sampleItems[0].children![0])

      expect(onStateChanged).toHaveBeenCalledTimes(1)
      expect(onStateChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          group1__test1: expect.objectContaining({
            titleParts: expect.any(Object),
            checked: expect.any(Boolean)
          })
        })
      )
    })

    it('should not call onStateChanged callback when not provided', () => {
      const viewModel = new FilterPanelViewModel(sampleItems, new Map())

      expect(() => {
        viewModel.toggleItem(sampleItems[0].children![0])
      }).not.toThrow()
    })
  })

  describe('state serialization', () => {
    it('should serialize state correctly', () => {
      const initialState: Map<FilterItemKey, boolean> = new Map([
        ['group1__test1', true],
        ['group1__test2', false]
      ])

      const onStateChanged = vi.fn()
      const viewModel = new FilterPanelViewModel(sampleItems, initialState, onStateChanged)

      viewModel.toggleItem(sampleItems[0].children![0])

      const filterStates = onStateChanged.mock.calls[0][0]

      // The constructor creates default states for all leaf items, so we expect all items to be present
      expect(filterStates).toEqual({
        group1__test1: {
          titleParts: { groupName: 'Group 1', testName: 'Test 1' },
          checked: false
        },
        group1__test2: {
          titleParts: { groupName: 'Group 1', testName: 'Test 2' },
          checked: false
        },
        group2__test1: {
          titleParts: { groupName: 'Group 2', testName: 'Test 1' },
          checked: true
        },
        group2__test2: {
          titleParts: { groupName: 'Group 2', testName: 'Test 2' },
          checked: true
        }
      })
    })
  })

  describe('createFilterPanelViewModel', () => {
    it('should create FilterPanelViewModel instance', () => {
      const initialState: Map<FilterItemKey, boolean> = new Map([['group1__test1', true]])

      const viewModel = createFilterPanelViewModel(sampleItems, initialState)

      expect(viewModel).toBeInstanceOf(FilterPanelViewModel)
      expect(viewModel.getCheckboxState(sampleItems[0].children![0], 0)).toBe('checked')
    })

    it('should create FilterPanelViewModel with callback', () => {
      const onStateChanged = vi.fn()
      const viewModel = createFilterPanelViewModel(sampleItems, new Map(), onStateChanged)

      viewModel.toggleItem(sampleItems[0].children![0])

      expect(onStateChanged).toHaveBeenCalledTimes(1)
    })
  })
})
