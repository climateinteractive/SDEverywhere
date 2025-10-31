// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { BundleGraphId, LoadedBundle, ModelSpec, NamedBundle } from '../../bundle/bundle-types'

import type { ComparisonDataset, ComparisonScenario, ComparisonViewGroup } from '../_shared/comparison-resolved-types'
import type { ComparisonGroupSummariesByCategory, ComparisonGroupSummary } from '../report/comparison-group-types'
import type { ComparisonTestSummary } from '../report/comparison-report-types'

import type { ComparisonDatasets } from './comparison-datasets'
import type { ComparisonScenarios } from './comparison-scenarios'
import type { ComparisonSpecs, ComparisonSpecsSource } from './comparison-spec-types'
import { parseComparisonSpecs } from './parse/comparison-parser'
import type { ComparisonResolvedDefs } from './resolve/comparison-resolver'
import { resolveComparisonSpecs } from './resolve/comparison-resolver'

/**
 * Describes an extra plot to be shown in a comparison graph.
 */
export interface ComparisonPlot {
  /** The dataset key for the plot. */
  datasetKey: DatasetKey
  /** The plot color. */
  color: string
  /** The plot style.  If undefined, defaults to 'normal'. */
  style?: 'normal' | 'dashed'
  /** The plot line width, in px units.  If undefined, a default width will be used. */
  lineWidth?: number
}

export interface ComparisonDatasetOptions {
  /**
   * The mapping of renamed dataset keys (old or "left" name as the map key,
   * new or "right" name as the value).
   */
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>
  /**
   * An optional function that allows for limiting the datasets that are compared
   * for a given scenario.  By default, all datasets are compared for a given
   * scenario, but if a custom function is provided, it can return a subset of
   * datasets (for example, to omit datasets that are not relevant).
   */
  datasetKeysForScenario?: (allDatasetKeys: DatasetKey[], scenario: ComparisonScenario) => DatasetKey[]
  /**
   * An optional function that allows for including additional reference plots
   * on a comparison graph for a given dataset and scenario.  By default, no
   * additional reference plots are included, but if a custom function is
   * provided, it can return an array of `ComparisonPlot` objects.
   */
  referencePlotsForDataset?: (dataset: ComparisonDataset, scenario: ComparisonScenario) => ComparisonPlot[]
  /**
   * An optional function that allows for customizing the set of context graphs
   * that are shown for a given dataset and scenario.  By default, all graphs in
   * which the dataset appears will be shown, but if a custom function is provided,
   * it can return a different set of graphs (for example, to omit graphs that are
   * not relevant under the given scenario).
   */
  contextGraphIdsForDataset?: (dataset: ComparisonDataset, scenario: ComparisonScenario) => BundleGraphId[]
}

/**
 * Describes a row in the comparison report summary view.
 */
export interface ComparisonReportSummaryRow {
  /** The group summary represented by the row. */
  groupSummary: ComparisonGroupSummary
  /** The custom title for the row (this overrides the default title derived from the summary). */
  title?: string
  /** The custom subtitle for the row (this overrides the default subtitle derived from the summary). */
  subtitle?: string
}

/**
 * Describes a section in the comparison report summary view.
 */
export interface ComparisonReportSummarySection {
  /** The text to display for the section header. */
  headerText: string
  /** The summary rows to display in the section. */
  rows: ComparisonReportSummaryRow[]
  /**
   * The initial expanded state of the section.  If undefined, defaults to 'expanded-if-diffs',
   * meaning the section will be initially expanded only if any rows have differences, otherwise
   * it will be initially collapsed.
   */
  initialState?: 'collapsed' | 'expanded' | 'expanded-if-diffs'
  /**
   * Whether the items in the section are stable, i.e., not changing from run to run.  If
   * undefined, defaults to false.  This can be used to group items in the filter panel.
   * Set it to true if the group contains a stable set of rows where the order does not
   * change between runs.  Set it to false (or leave it undefined) if the group contains
   * rows that have a different order between runs (for example, "Scenarios producing
   * differences").
   */
  stable?: boolean
}

/**
 * Describes an item (box) in the comparison report detail view.
 */
export interface ComparisonReportDetailItem {
  /** The title of the item. */
  title: string
  /** The subtitle of the item (if any). */
  subtitle?: string
  /** The scenario for the item. */
  scenario: ComparisonScenario
  /** The test summary for the item. */
  testSummary: ComparisonTestSummary
}

/**
 * Describes a row in the comparison report detail view.
 */
export interface ComparisonReportDetailRow {
  /** The title of the row. */
  title: string
  /** The subtitle of the row (if any). */
  subtitle?: string
  /** The score for the row (the meaning of the value depends on the chosen statistical method). */
  score: number
  /** The items in this row (one item per box). */
  items: ComparisonReportDetailItem[]
}

export interface ComparisonReportOptions {
  /**
   * An optional function that allows for customizing the order and grouping of
   * sections and rows in the "comparisons by scenario" summary view.
   *
   * @param summaries The comparison summaries, one summary per scenario.
   * @returns The sections to display in the "comparisons by scenario" summary view.
   */
  summarySectionsForComparisonsByScenario?: (
    summaries: ComparisonGroupSummariesByCategory
  ) => ComparisonReportSummarySection[]

  /**
   * An optional function that allows for customizing the order and grouping of
   * sections and rows in the "comparisons by dataset" summary view.
   *
   * @param summaries The comparison summaries, one summary per dataset.
   * @returns The sections to display in the "comparisons by dataset" summary view.
   */
  summarySectionsForComparisonsByDataset?: (
    summaries: ComparisonGroupSummariesByCategory
  ) => ComparisonReportSummarySection[]

  /**
   * An optional function that allows for customizing the order of rows and boxes
   * in the detail view for a scenario.
   *
   * @param rows The original rows to be displayed in the detail view for a scenario.
   * @returns The customized rows to display in the detail view for a scenario.
   */
  detailRowsForScenario?: (rows: ComparisonReportDetailRow[]) => ComparisonReportDetailRow[]

  /**
   * An optional function that allows for customizing the order of rows and boxes
   * in the detail view for a dataset.
   *
   * @param rows The original rows to be displayed in the detail view for a dataset.
   * @returns The customized rows to display in the detail view for a dataset.
   */
  detailRowsForDataset?: (rows: ComparisonReportDetailRow[]) => ComparisonReportDetailRow[]
}

export interface ComparisonOptions {
  /** The left-side ("baseline") bundle being compared. */
  baseline: NamedBundle
  /**
   * The array of thresholds used to color differences.  Defaults to [1, 5, 10]
   * which will use buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds?: number[]
  /**
   * The array of ratio thresholds used to color differences when relative sorting is
   * active.  Defaults to [1, 2, 3] which will use buckets of 0, 0-1, 1-2, 2-3, and >3.
   */
  ratioThresholds?: number[]
  /**
   * The requested comparison scenario and view specifications.  These can be
   * specified in YAML or JSON files, or using `Spec` objects.
   */
  specs: (ComparisonSpecs | ComparisonSpecsSource)[]
  /** Optional configuration for the datasets that are compared for different scenarios. */
  datasets?: ComparisonDatasetOptions
  /** Options for customizing the comparison report. */
  report?: ComparisonReportOptions
}

export interface ComparisonConfig {
  /** The loaded left-side ("baseline") bundle being compared. */
  bundleL: LoadedBundle
  /** The loaded right-side ("current") bundle being compared. */
  bundleR: LoadedBundle
  /**
   * The array of thresholds used to color differences.  For example, [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /**
   * The array of ratio thresholds used to color differences when relative sorting is
   * active.  For example, [1, 2, 3] will use buckets of 0, 0-1, 1-2, 2-3, and >3.
   */
  ratioThresholds: number[]
  /** The set of resolved scenarios that will be compared. */
  scenarios: ComparisonScenarios
  /** The set of resolved datasets that will be compared. */
  datasets: ComparisonDatasets
  /** The set of resolved view groups. */
  viewGroups: ComparisonViewGroup[]
  /** Options for customizing the comparison report. */
  reportOptions?: ComparisonReportOptions
}

/**
 * Expand and resolve all the scenario and view specs in the provided sources, which can
 * be a mix of YAML, JSON, and object specs.
 *
 * @param modelSpecL The model spec for the "left" bundle being compared.
 * @param modelSpecR The model spec for the "right" bundle being compared.
 * @param specSources The scenario and view spec sources.
 */
export function resolveComparisonSpecsFromSources(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  specSources: (ComparisonSpecs | ComparisonSpecsSource)[]
): ComparisonResolvedDefs {
  const combinedSpecs: ComparisonSpecs = {
    scenarios: [],
    scenarioGroups: [],
    graphGroups: [],
    viewGroups: []
  }

  for (const specSource of specSources) {
    let specs: ComparisonSpecs
    if ('kind' in specSource) {
      const parseResult = parseComparisonSpecs(specSource)
      if (parseResult.isOk()) {
        specs = parseResult.value
      } else {
        // TODO: Fail fast instead of logging errors?
        const filenamePart = specSource.filename ? ` in ${specSource.filename}` : ''
        console.error(`ERROR: Failed to parse comparison spec${filenamePart}, skipping`)
        continue
      }
    } else {
      specs = specSource
    }
    combinedSpecs.scenarios.push(...(specs.scenarios || []))
    combinedSpecs.scenarioGroups.push(...(specs.scenarioGroups || []))
    combinedSpecs.graphGroups.push(...(specs.graphGroups || []))
    combinedSpecs.viewGroups.push(...(specs.viewGroups || []))
  }

  return resolveComparisonSpecs(modelSpecL, modelSpecR, combinedSpecs)
}
