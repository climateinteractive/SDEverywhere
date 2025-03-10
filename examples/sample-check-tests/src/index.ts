// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonReportOptions,
  ComparisonReportSummaryRow,
  ComparisonReportSummarySection,
  ComparisonSpecs,
  ComparisonSpecsSource,
  ConfigInitOptions,
  ConfigOptions,
  DatasetKey
} from '@sdeverywhere/check-core'

import { createBaseComparisonSpecs } from './comparisons/comparison-specs'

const checksYamlGlob = import.meta.glob('./checks/*.yaml', { eager: true, query: '?raw', import: 'default' })
const checksYaml = Object.values(checksYamlGlob) as string[]

const comparisonsYamlGlob = import.meta.glob('./comparisons/*.yaml', { eager: true, query: '?raw', import: 'default' })
const comparisonsYaml: ComparisonSpecsSource[] = Object.entries(comparisonsYamlGlob).map(entry => {
  return {
    kind: 'yaml',
    filename: entry[0],
    content: entry[1] as string
  }
})

export function getConfigOptions(bundleL: Bundle, bundleR: Bundle, opts?: ConfigInitOptions): ConfigOptions {
  const nameL = 'Sample Model Current'
  const nameR = 'Sample Model Baseline'

  // Configure the set of input scenarios used for comparisons; this includes
  // the default matrix of scenarios
  const baseComparisonSpecs = createBaseComparisonSpecs(bundleL, bundleR)

  // If the user checked the "Simplify Scenarios" checkbox, we can include a smaller subset
  // of scenarios.  (This won't make a difference for this simple demo, but can be helpful
  // for large models that take a while to run.)
  const comparisonSpecs: (ComparisonSpecs | ComparisonSpecsSource)[] = [baseComparisonSpecs]
  if (opts?.simplifyScenarios !== true) {
    comparisonSpecs.push(...comparisonsYaml)
  }

  // Simulate a variable being renamed between two versions of the model
  // (see `getOutputVars` in `sample-model-bundle`)
  const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map([['Model__output_w_v1', 'Model__output_w_v2']])

  // Customize the report sections if the kind is 'custom'
  const reportKind: string = 'custom'
  // const reportKind: string = 'default'
  let reportOptions: ComparisonReportOptions
  if (reportKind === 'custom') {
    reportOptions = {
      summarySectionsForComparisonsByScenario: summaries => {
        return summarySectionsForComparisonsByScenario(summaries, nameL, nameR)
      },
      summarySectionsForComparisonsByDataset
    }
  }

  return {
    current: {
      name: nameL,
      bundle: bundleR
    },
    check: {
      tests: checksYaml
    },
    comparison: {
      baseline: {
        name: nameR,
        bundle: bundleL
      },
      thresholds: [1, 5, 10],
      specs: comparisonSpecs,
      datasets: {
        renamedDatasetKeys,
        referencePlotsForDataset: (dataset, scenario) => {
          if (dataset.key === 'Model__output_x' && scenario.title.startsWith('Input A')) {
            return [
              {
                datasetKey: 'StaticData__static_s',
                color: 'orange',
                style: 'dashed',
                lineWidth: 2
              }
            ]
          }
          return []
        }
      },
      report: reportOptions
    }
  }
}

function summarySectionsForComparisonsByScenario(
  summaries: ComparisonGroupSummariesByCategory,
  nameL: string,
  nameR: string
): ComparisonReportSummarySection[] {
  const allSummaries = Array.from(summaries.allGroupSummaries.values())

  const sections: ComparisonReportSummarySection[] = []
  function addSection(headerText: string, rows: ComparisonReportSummaryRow[] | undefined) {
    if (rows === undefined) {
      return
    }
    sections.push({
      headerText,
      rows
    })
  }

  function summaryForScenarioId(scenarioId: string): ComparisonGroupSummary | undefined {
    return allSummaries.find(summary => {
      if (summary.root.kind === 'scenario') {
        return summary.root.id === scenarioId
      }
      return false
    })
  }

  function addSectionWithScenarios(headerText: string, scenarios: (string | [string, string?])[]) {
    const rows: ComparisonReportSummaryRow[] = []
    const errorIds: string[] = []
    for (const scenario of scenarios) {
      let id: string
      let title: string | undefined
      if (typeof scenario === 'string') {
        id = scenario
      } else {
        id = scenario[0]
        title = scenario[1]
      }
      const summary = summaryForScenarioId(id)
      if (summary) {
        rows.push({
          groupSummary: summary,
          title,
          subtitle: title ? ' ' : undefined
        })
      } else {
        // TODO: We should create an error row, but for now we'll add the id to
        // an error message within the section title
        // return errorSummaryForScenarioId(id)
        errorIds.push(id)
      }
    }
    if (errorIds.length > 0) {
      headerText += ` (ERROR: Failed to resolve ${errorIds.join(', ')})`
    }
    addSection(headerText, rows)
  }

  function addSectionWithSummaries(
    headerText: string,
    summaries: ComparisonGroupSummary[],
    include?: (id?: string) => boolean
  ) {
    let rows: ComparisonReportSummaryRow[] = summaries.map(summary => ({ groupSummary: summary }))
    if (include) {
      rows = rows.filter(row => {
        const summary = row.groupSummary
        if (summary.root.kind === 'scenario') {
          const id = summary.root.id
          if (id) {
            return include(id)
          }
        }
        return false
      })
    }
    addSection(headerText, rows)
  }

  // Add a section with a couple key scenarios (this demonstrates that we can highlight
  // specific scenarios at top, and these scenarios can also appear in other sections)
  addSectionWithScenarios('Key scenarios', [
    ['baseline', 'Baseline'],
    'extreme_main_sliders_at_best_case',
    'non_existent_scenario'
  ])

  // Add sections for scenarios with issues
  addSectionWithSummaries('Scenarios with errors', summaries.withErrors)
  addSectionWithSummaries(`Scenarios only valid in ${datasetSpan(nameL, 'left')}`, summaries.onlyInLeft)
  addSectionWithSummaries(`Scenarios only valid in ${datasetSpan(nameR, 'right')}`, summaries.onlyInRight)

  // Add a section with all scenarios that produce differences
  addSectionWithSummaries('Scenarios producing differences', summaries.withDiffs)

  // Add a section with all scenarios that don't produce differences
  addSectionWithSummaries('Scenarios NOT producing differences', summaries.withoutDiffs)

  return sections
}

function summarySectionsForComparisonsByDataset(
  summaries: ComparisonGroupSummariesByCategory
): ComparisonReportSummarySection[] {
  const allSummaries = Array.from(summaries.allGroupSummaries.values())

  const sections: ComparisonReportSummarySection[] = []
  function addSection(headerText: string, rows: ComparisonReportSummaryRow[] | undefined) {
    if (rows === undefined) {
      return
    }
    sections.push({
      headerText,
      rows
    })
  }

  function summaryForDatasetKey(datasetKey: string): ComparisonGroupSummary | undefined {
    return allSummaries.find(summary => {
      if (summary.root.kind === 'dataset') {
        return summary.root.key === datasetKey
      }
      return false
    })
  }

  function addSectionWithDatasets(headerText: string, datasets: (string | [string, string?])[]) {
    const rows: ComparisonReportSummaryRow[] = []
    const errorKeys: string[] = []
    for (const dataset of datasets) {
      let key: string
      let title: string | undefined
      if (typeof dataset === 'string') {
        key = dataset
      } else {
        key = dataset[0]
        title = dataset[1]
      }
      const summary = summaryForDatasetKey(key)
      if (summary) {
        rows.push({
          groupSummary: summary,
          title,
          subtitle: title ? ' ' : undefined
        })
      } else {
        // TODO: We should create an error row, but for now we'll add the id to
        // an error message within the section title
        // return errorSummaryForDatasetKey(id)
        errorKeys.push(key)
      }
    }
    if (errorKeys.length > 0) {
      headerText += ` (ERROR: Failed to resolve ${errorKeys.join(', ')})`
    }
    addSection(headerText, rows)
  }

  function addSectionWithSummaries(
    headerText: string,
    summaries: ComparisonGroupSummary[],
    include?: (id?: string) => boolean
  ) {
    let rows: ComparisonReportSummaryRow[] = summaries.map(summary => ({ groupSummary: summary }))
    if (include) {
      rows = rows.filter(row => {
        const summary = row.groupSummary
        if (summary.root.kind === 'dataset') {
          return include(summary.root.key)
        }
        return false
      })
    }
    addSection(headerText, rows)
  }

  // Add a section with a couple key outputs (this demonstrates that we can highlight
  // specific datasets at top, and these datasets can also appear in other sections)
  addSectionWithDatasets('Key model outputs', ['Model__output_x', 'Model__output_y'])

  // Add sections for datasets with errors and removed/added datasets
  addSectionWithSummaries('Datasets with errors', summaries.withErrors)
  addSectionWithSummaries('Removed datasets', summaries.onlyInLeft)
  addSectionWithSummaries('Added datasets', summaries.onlyInRight)

  // Add a section with all model outputs that have differences
  addSectionWithSummaries('Model outputs with differences', summaries.withDiffs, key => key.startsWith('Model__'))

  // Add a section with all model outputs that have no differences
  addSectionWithSummaries('Model outputs without differences', summaries.withoutDiffs, key => key.startsWith('Model__'))

  // Add a section with all other non-output datasets (this demonstrates that we
  // can customize the sorting of datasets)
  const staticWithDiffs = summaries.withDiffs.filter(summary => !summary.root.key.startsWith('Model__'))
  const staticWithoutDiffs = summaries.withoutDiffs.filter(summary => !summary.root.key.startsWith('Model__'))
  addSectionWithSummaries('All static datasets', [
    ...staticWithDiffs,
    ...staticWithoutDiffs.sort((a, b) => a.root.key.localeCompare(b.root.key))
  ])

  return sections
}

/**
 * Return an string containing an HTML `<span>` element with the appropriate
 * color for the given bundle side (left or right).
 */
export function datasetSpan(name: string, side: 'left' | 'right'): string {
  const color = side === 'left' ? 0 : 1
  return `<span class="dataset-color-${color}">${name}</span>`
}
