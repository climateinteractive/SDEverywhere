// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { ComparisonScenario, ComparisonScenarioKey } from '../_shared/comparison-resolved-types'

export interface ComparisonScenarios {
  /**
   * Return all `ComparisonScenario` instances that are available for comparisons.
   */
  getAllScenarios(): IterableIterator<ComparisonScenario>

  /**
   * Return the scenario definition for the given key.
   *
   * @param key The key for the scenario.
   */
  getScenario(key: ComparisonScenarioKey): ComparisonScenario | undefined
}

/**
 * Create an instance of the `ComparisonScenarios` interface that uses the given
 * array of `ComparisonScenario` instances.
 *
 * @param scenarios The comparison scenario definitions.
 */
export function getComparisonScenarios(scenarios: ComparisonScenario[]): ComparisonScenarios {
  return new ComparisonScenariosImpl(scenarios)
}

/**
 * Provides access to the set of input scenario definitions (`ComparisonScenario` instances) that are used
 * when comparing the two models.
 */
class ComparisonScenariosImpl {
  private readonly scenarioDefs: Map<ComparisonScenarioKey, ComparisonScenario> = new Map()

  constructor(scenarios: ComparisonScenario[]) {
    // Create a map to allow for looking up by `ComparisonScenarioKey`
    for (const scenario of scenarios) {
      this.scenarioDefs.set(scenario.key, scenario)
    }
  }

  /**
   * Return all `ComparisonScenario` instances that are available for comparisons.
   */
  getAllScenarios(): IterableIterator<ComparisonScenario> {
    return this.scenarioDefs.values()
  }

  /**
   * Return the scenario definition for the given key.
   *
   * @param key The key for the scenario.
   */
  getScenario(key: ComparisonScenarioKey): ComparisonScenario | undefined {
    return this.scenarioDefs.get(key)
  }
}
