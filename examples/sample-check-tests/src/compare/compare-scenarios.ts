// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, CompareGroupInfo, CompareScenarios, ScenarioInfo } from '@sdeverywhere/check-core'
import { ScenarioManager, inputAtValueScenario, settingsScenario, valueSetting } from '@sdeverywhere/check-core'

/**
 * Return the scenarios used for comparisons.
 */
export function getCompareScenarios(bundleL: Bundle, bundleR: Bundle): CompareScenarios {
  const scenarioManager = new ScenarioManager(bundleL, bundleR)

  // Add the default matrix of scenarios (each input at its extremes, etc)
  scenarioManager.addScenarioMatrix()

  // Add a custom scenario that sets an input to a specific value
  addInputAtValueScenarios(scenarioManager)

  // Add a couple custom scenarios that involve multiple inputs
  addMultiInputScenarios(scenarioManager)

  return scenarioManager
}

function addInputAtValueScenarios(scenarioManager: ScenarioManager): void {
  const groupKey = 'input_b_custom'
  const groupInfo: CompareGroupInfo = {
    title: 'Input B',
    relatedItems: [
      {
        id: '_input_b',
        locationPath: ['Assumptions', 'Input B']
      }
    ]
  }

  function addCustomScenario(position: number, value: number): void {
    const scenario = inputAtValueScenario('_input_b', groupKey, value)
    const scenarioInfo: ScenarioInfo = {
      title: `at ${value}`,
      position
    }
    scenarioManager.addScenario(scenario, scenarioInfo, groupInfo)
  }

  addCustomScenario(1, 10)
  addCustomScenario(2, 90)
}

function addMultiInputScenarios(scenarioManager: ScenarioManager): void {
  const groupKey = 'input_group'
  const groupInfo: CompareGroupInfo = {
    title: 'Input Group',
    relatedItems: [
      {
        id: '_input_a',
        locationPath: ['Assumptions', 'Input A']
      },
      {
        id: '_input_b',
        locationPath: ['Assumptions', 'Input B']
      }
    ]
  }

  function addCustomScenario(position: number, kind: string, value: number): void {
    const scenarioKey = `${groupKey}_${kind}`
    const scenario = settingsScenario(scenarioKey, groupKey, [
      valueSetting('_input_a', value),
      valueSetting('_input_b', value)
    ])
    const scenarioInfo: ScenarioInfo = {
      title: `with ${kind} settings`,
      subtitle: `(each input at ${value})`,
      position
    }
    scenarioManager.addScenario(scenario, scenarioInfo, groupInfo)
  }

  scenarioManager.setDefaultScenarioInfoForGroup(groupKey, {
    title: 'with default settings',
    position: 0
  })
  addCustomScenario(1, 'low', 25)
  addCustomScenario(2, 'high', 75)
}
