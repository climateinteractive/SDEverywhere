// Copyright (c) 2025 Climate Interactive / New Venture Fund

import {
  categorizeComparisonTestSummaries,
  comparisonSummaryFromReport,
  type CheckReport,
  type ComparisonReport,
  type Config
} from '@sdeverywhere/check-core'
import {
  createFilterPanelViewModel,
  type FilterItem,
  type FilterPanelViewModel,
  type FilterStateMap
} from './filter-panel-vm'

export interface FilterPopoverViewModel {
  checksPanel: FilterPanelViewModel
  comparisonScenariosPanel?: FilterPanelViewModel
}

export function createFilterPopoverViewModel(
  config: Config,
  checkReport: CheckReport,
  comparisonReport?: ComparisonReport
): FilterPopoverViewModel {
  const checksPanel = createChecksFilterPanelViewModel(checkReport)

  let comparisonScenariosPanel: FilterPanelViewModel | undefined
  if (comparisonReport) {
    comparisonScenariosPanel = createComparisonScenariosFilterPanelViewModel(config, comparisonReport)
  }

  return {
    checksPanel,
    comparisonScenariosPanel
  }
}

function createChecksFilterPanelViewModel(checkReport: CheckReport): FilterPanelViewModel {
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

  // Put all check groups under a single "All checks" group
  const checkItems: FilterItem[] = [
    {
      key: '__all_checks',
      label: 'All checks',
      children: checkGroupItems
    }
  ]

  return createFilterPanelViewModel(checkItems, checkStates, states =>
    saveCheckFilterStatesToLocalStorage(JSON.stringify(states))
  )
}

function createComparisonScenariosFilterPanelViewModel(
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

  return createFilterPanelViewModel(scenarioItems, scenarioStates, states =>
    saveComparisonScenarioFilterStatesToLocalStorage(JSON.stringify(states))
  )
}

function saveCheckFilterStatesToLocalStorage(json: string): void {
  try {
    localStorage.setItem('sde-check-filter-states', json)
  } catch (error) {
    console.warn('Failed to save check filter states to LocalStorage:', error)
  }
}

function saveComparisonScenarioFilterStatesToLocalStorage(json: string): void {
  try {
    localStorage.setItem('sde-comparison-scenario-filter-states', json)
  } catch (error) {
    console.warn('Failed to save comparison scenario filter states to LocalStorage:', error)
  }
}
