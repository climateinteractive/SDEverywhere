// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { CompareScenario, CompareScenarioKey } from '../_shared/compare-resolved-types'

/**
 * Provides access to the set of input scenario definitions (`CompareScenario` instances) that are used
 * when comparing the two models.
 */
export class CompareScenarios {
  private readonly scenarioDefs: Map<CompareScenarioKey, CompareScenario> = new Map()

  constructor(scenarios: CompareScenario[]) {
    // Create a map to allow for looking up by `CompareScenarioKey`
    for (const scenario of scenarios) {
      this.scenarioDefs.set(scenario.key, scenario)
    }
  }

  /**
   * Return all `CompareScenario` instances that are available for comparisons.
   */
  getAllScenarios(): IterableIterator<CompareScenario> {
    return this.scenarioDefs.values()
  }

  /**
   * Return the scenario definition for the given key.
   *
   * @param key The key for the scenario.
   */
  getScenario(key: CompareScenarioKey): CompareScenario | undefined {
    return this.scenarioDefs.get(key)
  }
}
