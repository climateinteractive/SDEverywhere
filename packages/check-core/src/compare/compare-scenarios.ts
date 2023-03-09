// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import type { ScenarioGroupKey, ScenarioKey } from '../_shared/types'
import type { CompareGroupInfo } from './compare-group'

/**
 * The human-readable title and subtitle for a scenario in a comparison test.
 */
export interface CompareScenarioInfo {
  /** The scenario title. */
  title: string
  /** The scenario subtitle. */
  subtitle?: string
  /**
   * The position of the scenario when displayed in a row.  Typically, 0 means
   * "left", 1 means "middle", and so on.
   */
  position: number
}

/**
 * Provides access to the set of input scenarios that are used when comparing the two models.
 */
export interface CompareScenarios {
  /**
   * Return an array containing all configured input scenarios.
   */
  getScenarios(): Scenario[]

  /**
   * Return the input scenario for the given key.
   *
   * @param scenarioKey The key for the scenario.
   */
  getScenario(scenarioKey: ScenarioKey): Scenario | undefined

  /**
   * Return the group info for the given group key.
   *
   * @param groupKey The scenario group key.
   */
  getScenarioGroupInfo(groupKey: ScenarioGroupKey): CompareGroupInfo | undefined

  /**
   * Return the title/subtitle info for the given scenario.
   *
   * Note that the given `groupKey` could be different than `scenario.groupKey`.  This
   * will be the case for the "all inputs at default" item that is included in each
   * row in the detail view for reference purposes.  The provided `groupKey` will be
   * used to customize the title and subtitle for that item (for example, it will show
   * the default value of the input associated with the row).
   *
   * @param scenario The scenario to be displayed.
   * @param groupKey The key for the group in which the scenario will be displayed.
   */
  getScenarioInfo(scenario: Scenario, groupKey: ScenarioGroupKey): CompareScenarioInfo | undefined
}
