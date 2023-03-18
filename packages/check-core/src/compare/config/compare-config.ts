// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { LoadedBundle, NamedBundle } from '../../bundle/bundle-types'
import type { ModelInputs } from '../../bundle/model-inputs'
import type { CompareViewGroup } from '../_shared/compare-resolved-types'

import type { CompareDatasets } from '../compare-datasets'

import type { CompareSpecs, CompareSpecsSource } from './compare-spec-types'
import { parseCompareSpecs } from './parse/compare-parser'
import type { CompareResolvedDefs } from './resolve/compare-resolver'
import { resolveCompareSpecs } from './resolve/compare-resolver'
import type { CompareScenarios } from './compare-scenarios'

export interface CompareOptions {
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
  specs: (CompareSpecs | CompareSpecsSource)[]
  /** The set of datasets that will be compared. */
  datasets: CompareDatasets
}

export interface CompareConfig {
  /** The loaded left-side ("baseline") bundle being compared. */
  bundleL: LoadedBundle
  /** The loaded right-side ("current") bundle being compared. */
  bundleR: LoadedBundle
  /**
   * The array of thresholds used to color differences, e.g., [1, 5, 10] will use
   * buckets of 0%, 0-1%, 1-5%, 5-10%, and >10%.
   */
  thresholds: number[]
  /** The set of resolved scenarios. */
  scenarios: CompareScenarios
  /** The set of resolved view groups. */
  viewGroups: CompareViewGroup[]
  /** The set of datasets that will be compared. */
  datasets: CompareDatasets
}

/**
 * Expand and resolve all the scenario and view specs in the provided sources, which can
 * be a mix of YAML, JSON, and object specs.
 *
 * @param modelInputsL The model inputs for the "left" bundle being compared.
 * @param modelInputsR The model inputs for the "right" bundle being compared.
 * @param specSources The scenario and view spec sources.
 */
export function resolveCompareSpecsFromSources(
  modelInputsL: ModelInputs,
  modelInputsR: ModelInputs,
  specSources: (CompareSpecs | CompareSpecsSource)[]
): CompareResolvedDefs {
  const combinedSpecs: CompareSpecs = {
    scenarios: [],
    scenarioGroups: [],
    viewGroups: []
  }

  for (const specSource of specSources) {
    let specs: CompareSpecs
    if ('kind' in specSource) {
      const parseResult = parseCompareSpecs(specSource)
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

  return resolveCompareSpecs(modelInputsL, modelInputsR, combinedSpecs)
}
