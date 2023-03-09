// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Bundle } from '../bundle/bundle-types'
import type { CompareScenarios } from './compare-scenarios'
import { ScenarioManager } from './scenario-manager'

/**
 * Create a `CompareScenarios` instance that combines an existing `CompareScenarios`
 * (containing custom or programmatically-defined scenarios) with YAML comparison
 * scenario definitions.
 *
 * @param bundleL The "left" bundle being compared.
 * @param bundleR The "right" bundle being compared.
 * @param baseScenarios The `scenarios` from the `CompareConfig`.
 * @param yamlDefs The `scenarioYaml` definitions from the `CompareConfig`.
 */
export function resolveCompareScenarios(
  bundleL: Bundle,
  bundleR: Bundle,
  baseScenarios?: CompareScenarios,
  yamlDefs?: string[]
): CompareScenarios {
  // Create a new `ScenarioManager` instance that will hold the available scenarios
  const scenarioManager = new ScenarioManager(bundleL, bundleR)

  // TODO: If the user provided a `CompareScenarios` instance, use the data from that one
  // to populate the new `ScenarioManager`
  console.log(baseScenarios)

  // TODO: Parse the yaml defs and add to the scenario manager
  console.log(yamlDefs)

  return scenarioManager
}
