// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { BundleGraphId, LoadedBundle, ModelSpec, NamedBundle } from '../../bundle/bundle-types'

import type { ComparisonDataset, ComparisonScenario, ComparisonViewGroup } from '../_shared/comparison-resolved-types'

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

export interface ComparisonOptions {
  /** The left-side ("baseline") bundle being compared. */
  baseline: NamedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /**
   * The requested comparison scenario and view specifications.  These can be
   * specified in YAML or JSON files, or using `Spec` objects.
   */
  specs: (ComparisonSpecs | ComparisonSpecsSource)[]
  /** Optional configuration for the datasets that are compared for different scenarios. */
  datasets?: ComparisonDatasetOptions
}

export interface ComparisonConfig {
  /** The loaded left-side ("baseline") bundle being compared. */
  bundleL: LoadedBundle
  /** The loaded right-side ("current") bundle being compared. */
  bundleR: LoadedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /** The set of resolved scenarios that will be compared. */
  scenarios: ComparisonScenarios
  /** The set of resolved datasets that will be compared. */
  datasets: ComparisonDatasets
  /** The set of resolved view groups. */
  viewGroups: ComparisonViewGroup[]
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
