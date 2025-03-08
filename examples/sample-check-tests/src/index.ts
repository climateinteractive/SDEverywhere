// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonReportOptions,
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
  function addSection(
    headerText: string,
    summaries: ComparisonGroupSummary[] | undefined,
    include?: (id?: string) => boolean
  ) {
    if (summaries === undefined) {
      return
    }
    if (include) {
      summaries = summaries.filter(summary => {
        if (summary.root.kind === 'scenario') {
          const id = summary.root.id
          if (id) {
            return include(id)
          }
        }
        return false
      })
    }
    sections.push({
      headerText,
      summaries
    })
  }

  // Add a section with a couple key scenarios (this demonstrates that we can highlight
  // specific scenarios at top, and these scenarios can also appear in other sections)
  addSection('Key scenarios', allSummaries, id => {
    return id === 'baseline' || id === 'extreme_main_sliders_at_best_case'
  })

  // Add sections for scenarios with issues
  addSection('Scenarios with errors', summaries.withErrors)
  addSection(`Scenarios only valid in ${datasetSpan(nameL, 'left')}`, summaries.onlyInLeft)
  addSection(`Scenarios only valid in ${datasetSpan(nameR, 'right')}`, summaries.onlyInRight)

  // Add a section with all scenarios that produce differences
  addSection('Scenarios producing differences', summaries.withDiffs)

  // Add a section with all scenarios that don't produce differences
  addSection('Scenarios NOT producing differences', summaries.withoutDiffs)

  return sections
}

function summarySectionsForComparisonsByDataset(
  summaries: ComparisonGroupSummariesByCategory
): ComparisonReportSummarySection[] {
  const allSummaries = Array.from(summaries.allGroupSummaries.values())

  const sections: ComparisonReportSummarySection[] = []
  function addSection(
    headerText: string,
    summaries: ComparisonGroupSummary[] | undefined,
    include?: (key: string) => boolean
  ) {
    if (summaries === undefined) {
      return
    }
    if (include) {
      summaries = summaries.filter(summary => include(summary.root.key))
    }
    sections.push({
      headerText,
      summaries
    })
  }

  // Add a section with a couple key outputs (this demonstrates that we can highlight
  // specific datasets at top, and these datasets can also appear in other sections)
  addSection('Key model outputs', allSummaries, key => {
    return key === 'Model__output_x' || key === 'Model__output_y'
  })

  // Add sections for datasets with errors and removed/added datasets
  addSection('Datasets with errors', summaries.withErrors)
  addSection('Removed datasets', summaries.onlyInLeft)
  addSection('Added datasets', summaries.onlyInRight)

  // Add a section with all model outputs that have differences
  addSection('Model outputs with differences', summaries.withDiffs, key => key.startsWith('Model__'))

  // Add a section with all model outputs that have no differences
  addSection('Model outputs without differences', summaries.withoutDiffs, key => key.startsWith('Model__'))

  // Add a section with all other non-output datasets (this demonstrates that we
  // can customize the sorting of datasets)
  const staticWithDiffs = summaries.withDiffs.filter(summary => !summary.root.key.startsWith('Model__'))
  const staticWithoutDiffs = summaries.withoutDiffs.filter(summary => !summary.root.key.startsWith('Model__'))
  addSection('All static datasets', [
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
