// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { CompareScenario } from '../_shared/compare-resolved-types'

export type CompareScenarioDefKey = string & { _brand: 'CompareScenarioDefKey' }

/**
 * Provides access to the set of input scenario definitions (`CompareScenario` instances) that are used
 * when comparing the two models.
 */
export class CompareScenarios {
  private readonly scenarioDefs: Map<CompareScenarioDefKey, CompareScenario> = new Map()

  constructor(scenarios: CompareScenario[]) {
    // Assign a unique ID to each scenario
    let id = 1
    for (const scenario of scenarios) {
      this.scenarioDefs.set(`${id++}` as CompareScenarioDefKey, scenario)
    }
  }

  getAllDefKeys(): IterableIterator<CompareScenarioDefKey> {
    return this.scenarioDefs.keys()
  }

  getByDefKey(key: CompareScenarioDefKey): CompareScenario | undefined {
    return this.scenarioDefs.get(key)
  }
}
