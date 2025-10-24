// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  CheckNameSpec,
  CheckReport,
  ComparisonReport,
  ComparisonScenarioTitleSpec,
  Config
} from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries, comparisonSummaryFromReport } from '@sdeverywhere/check-core'

import type { FilterItem, FilterPanelViewModel, FilterStateMap } from './filter-panel-vm'
import {
  createFilterPanelViewModel,
  loadFilterItemTreeFromLocalStorage,
  saveFilterItemTreeToLocalStorage
} from './filter-panel-vm'

const checksFilterTreeKey = 'sde-check-test-filters'
const comparisonScenariosFilterTreeKey = 'sde-check-comparison-scenario-filters'

export interface FilterPopoverViewModel {
  checksPanel?: FilterPanelViewModel
  comparisonScenariosPanel?: FilterPanelViewModel
}

/**
 * Create a `FilterPopoverViewModel` using the tree structure that was saved to
 * LocalStorage.  This is used to provide a functional filter popover while checks
 * are still running in the browser.
 */
export function loadFiltersFromLocalStorage(devMode: boolean): {
  filterPopoverViewModel: FilterPopoverViewModel | undefined
  skipChecks: CheckNameSpec[]
  skipComparisonScenarios: ComparisonScenarioTitleSpec[]
} {
  if (!devMode) {
    // For non-dev mode, we don't allow filtering or skipping tests
    return {
      filterPopoverViewModel: undefined,
      skipChecks: [],
      skipComparisonScenarios: []
    }
  }

  // Load check filter states from LocalStorage
  const checkTree = loadFilterItemTreeFromLocalStorage(checksFilterTreeKey)
  const checkStates = checkTree.states || {}
  const checkStatesMap: FilterStateMap = new Map()
  for (const [key, { checked }] of Object.entries(checkStates)) {
    checkStatesMap.set(key, checked)
  }
  const skipChecks = Object.keys(checkStates)
    .filter(key => {
      const state = checkStates[key]
      return state && state.checked === false
    })
    .map(key => {
      const state = checkStates[key]
      return {
        groupName: state.titleParts?.groupName || '',
        testName: state.titleParts?.testName || ''
      }
    })

  // Load comparison scenario filter states from LocalStorage
  const scenarioTree = loadFilterItemTreeFromLocalStorage(comparisonScenariosFilterTreeKey)
  const scenarioStates = scenarioTree.states || {}
  const scenarioStatesMap: FilterStateMap = new Map()
  for (const [key, { checked }] of Object.entries(scenarioStates)) {
    scenarioStatesMap.set(key, checked)
  }
  const skipComparisonScenarios = Object.keys(scenarioStates)
    .filter(key => {
      const state = scenarioStates[key]
      return state && state.checked === false
    })
    .map(key => {
      const state = scenarioStates[key]
      return {
        title: state.titleParts?.title || '',
        subtitle: state.titleParts?.subtitle
      }
    })

  // Create the initial popover view model
  let checksPanel: FilterPanelViewModel | undefined = undefined
  if (checkStatesMap.size > 0) {
    checksPanel = createFilterPanelViewModel(checkTree.items || [], checkStatesMap, tree =>
      saveFilterItemTreeToLocalStorage(checksFilterTreeKey, tree)
    )
  }
  let comparisonScenariosPanel: FilterPanelViewModel | undefined = undefined
  if (scenarioStatesMap.size > 0) {
    comparisonScenariosPanel = createFilterPanelViewModel(scenarioTree.items || [], scenarioStatesMap, tree =>
      saveFilterItemTreeToLocalStorage(comparisonScenariosFilterTreeKey, tree)
    )
  }
  const filterPopoverViewModel: FilterPopoverViewModel = {
    checksPanel,
    comparisonScenariosPanel
  }

  return {
    filterPopoverViewModel,
    skipChecks,
    skipComparisonScenarios
  }
}

/**
 * Create a `FilterPopoverViewModel` from the given check and comparison reports (so that
 * the tree structure is based on the checks and comparisons that were run in the browser).
 */
export function createFilterPopoverViewModelFromReports(
  config: Config,
  checkReport: CheckReport,
  comparisonReport?: ComparisonReport
): FilterPopoverViewModel {
  const checksPanel = createChecksFilterPanelViewModelFromReport(checkReport)

  let comparisonScenariosPanel: FilterPanelViewModel | undefined
  if (comparisonReport) {
    comparisonScenariosPanel = createComparisonScenariosFilterPanelViewModelFromReport(config, comparisonReport)
  }

  return {
    checksPanel,
    comparisonScenariosPanel
  }
}

function createChecksFilterPanelViewModelFromReport(checkReport: CheckReport): FilterPanelViewModel | undefined {
  // Extract check items from the check report
  const checkGroupItems: FilterItem[] = []
  const checkStates: FilterStateMap = new Map()
  for (const group of checkReport.groups) {
    const groupChildren: FilterItem[] = []

    for (const test of group.tests) {
      const testKey = `${group.name}__${test.name}`
      groupChildren.push({
        key: testKey,
        titleParts: {
          groupName: group.name,
          testName: test.name
        },
        label: test.name
      })

      // Set initial state based on whether this test was skipped
      checkStates.set(testKey, test.status !== 'skipped')
    }

    if (groupChildren.length > 0) {
      checkGroupItems.push({
        key: group.name,
        label: group.name,
        children: groupChildren
      })
    }
  }

  if (checkGroupItems.length === 0) {
    // There are no checks; return undefined so that a message is shown in place
    // of the filter panel
    return undefined
  }

  // Put all check groups under a single "All checks" group
  const checkItems: FilterItem[] = [
    {
      key: '__all_checks',
      label: 'All checks',
      children: checkGroupItems
    }
  ]

  // Create a view model that saves the tree to LocalStorage when it changes
  const viewModel = createFilterPanelViewModel(checkItems, checkStates, tree =>
    saveFilterItemTreeToLocalStorage(checksFilterTreeKey, tree)
  )

  // Save the initial computed tree to LocalStorage
  saveFilterItemTreeToLocalStorage(checksFilterTreeKey, viewModel.getItemTree())

  return viewModel
}

function createComparisonScenariosFilterPanelViewModelFromReport(
  config: Config,
  comparisonReport: ComparisonReport
): FilterPanelViewModel {
  function scenarioKey(title: string, subtitle?: string): string {
    return subtitle ? `${title}__${subtitle}` : title
  }

  function filterItemForScenario(scenario: { title: string; subtitle?: string }): FilterItem {
    const key = scenarioKey(scenario.title, scenario.subtitle)
    return {
      key,
      titleParts: {
        title: scenario.title,
        subtitle: scenario.subtitle
      },
      label: scenario.subtitle ? `${scenario.title} ${scenario.subtitle}` : scenario.title
    }
  }

  // Put all scenarios in a map, keyed by title+subtitle to avoid duplicates
  const scenarioMap = new Map<string, { title: string; subtitle?: string; skipped: boolean }>()
  const comparisonScenarios = config.comparison?.scenarios
  for (const testReport of comparisonReport.testReports) {
    // Find the scenario details from the config
    const scenario = comparisonScenarios?.getScenario(testReport.scenarioKey)
    if (scenario) {
      const key = scenarioKey(scenario.title, scenario.subtitle)
      if (!scenarioMap.has(key)) {
        scenarioMap.set(key, {
          title: scenario.title,
          subtitle: scenario.subtitle,
          skipped: testReport.diffReport === undefined
        })
      }
    }
  }

  // Track the filter states for each scenario
  const scenarioStates: FilterStateMap = new Map()

  let scenarioItems: FilterItem[] = []
  if (config.comparison?.reportOptions?.summarySectionsForComparisonsByScenario) {
    // When ComparisonReportOptions is defined, use the result of `summarySectionsForComparisonsByScenario`
    // to group scenarios
    const comparisonSummary = comparisonSummaryFromReport(comparisonReport)
    const groupsByScenario = categorizeComparisonTestSummaries(
      config.comparison,
      comparisonSummary.testSummaries
    ).byScenario

    // Call the custom grouping function
    const customSections = config.comparison.reportOptions.summarySectionsForComparisonsByScenario(groupsByScenario)

    // Track which scenarios have been added to avoid duplicates
    const addedScenarioKeys = new Set<string>()

    // Create filter groups for sections with stable: true
    const stableGroups: FilterItem[] = []
    const otherScenarios: FilterItem[] = []

    for (const section of customSections) {
      if (section.stable === true) {
        // Create a filter group for this stable section
        const sectionChildren: FilterItem[] = []

        for (const row of section.rows) {
          if (row.groupSummary?.root.kind === 'scenario') {
            const scenario = row.groupSummary.root
            const key = scenarioKey(scenario.title, scenario.subtitle)
            if (!addedScenarioKeys.has(key)) {
              // Add the scenario to the section
              sectionChildren.push(filterItemForScenario(scenario))
              const scenarioData = scenarioMap.get(key)
              scenarioStates.set(key, scenarioData ? !scenarioData.skipped : true)
              addedScenarioKeys.add(key)
            }
          }
        }

        if (sectionChildren.length > 0) {
          stableGroups.push({
            key: section.headerText,
            label: section.headerText,
            children: sectionChildren
          })
        }
      }
    }

    // Add any remaining scenarios that weren't in any section to "Other scenarios"
    for (const [key, scenario] of scenarioMap) {
      if (!addedScenarioKeys.has(key)) {
        otherScenarios.push(filterItemForScenario(scenario))
        scenarioStates.set(key, !scenario.skipped)
        addedScenarioKeys.add(key)
      }
    }

    // Build the final scenario items
    scenarioItems = [
      {
        key: '__all_scenarios',
        label: 'All scenarios',
        children: [
          ...stableGroups,
          ...(otherScenarios.length > 0
            ? [
                {
                  key: 'Other scenarios',
                  label: 'Other scenarios',
                  children: otherScenarios
                }
              ]
            : [])
        ]
      }
    ]
  } else {
    // No custom grouping, use the default approach (put all scenarios in a single "All scenarios" group)
    const scenarioGroupItems: FilterItem[] = []
    for (const [key, scenario] of scenarioMap) {
      scenarioGroupItems.push(filterItemForScenario(scenario))
      scenarioStates.set(key, !scenario.skipped)
    }

    scenarioItems = [
      {
        key: '__all_scenarios',
        label: 'All scenarios',
        children: scenarioGroupItems
      }
    ]
  }

  // Create a view model that saves the tree to LocalStorage when it changes
  const viewModel = createFilterPanelViewModel(scenarioItems, scenarioStates, tree =>
    saveFilterItemTreeToLocalStorage(comparisonScenariosFilterTreeKey, tree)
  )

  // Save the initial computed tree to LocalStorage
  saveFilterItemTreeToLocalStorage(comparisonScenariosFilterTreeKey, viewModel.getItemTree())

  return viewModel
}
