// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { LoadedBundle, NamedBundle } from '../../bundle/bundle-types'
import type { ModelInputs } from '../../bundle/model-inputs'

import type { ComparisonScenario, ComparisonViewGroup } from '../_shared/comparison-resolved-types'

import type { ComparisonDatasets } from './comparison-datasets'
import type { ComparisonScenarios } from './comparison-scenarios'
import type { ComparisonSpecs, ComparisonSpecsSource } from './comparison-spec-types'
import { parseComparisonSpecs } from './parse/comparison-parser'
import type { ComparisonResolvedDefs } from './resolve/comparison-resolver'
import { resolveComparisonSpecs } from './resolve/comparison-resolver'

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
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param specSources The scenario and view spec sources.
 */
export function resolveComparisonSpecsFromSources(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  specSources: (ComparisonSpecs | ComparisonSpecsSource)[]
): ComparisonResolvedDefs {
  const combinedSpecs: ComparisonSpecs = {
    scenarios: [],
    scenarioGroups: [],
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
    combinedSpecs.scenarios.push(...specs.scenarios)
    combinedSpecs.scenarioGroups.push(...specs.scenarioGroups)
    combinedSpecs.viewGroups.push(...specs.viewGroups)
  }

  return resolveComparisonSpecs(modelInputsL, modelInputsR, combinedSpecs)
}
