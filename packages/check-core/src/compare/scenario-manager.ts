// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { InputPosition, InputSetting, Scenario } from '../_shared/scenario'
import { allInputsAtPositionScenario, inputAtPositionScenario } from '../_shared/scenario'
import type { ScenarioGroupKey, ScenarioKey, VarId } from '../_shared/types'

import type { ModelSpec } from '../bundle/bundle-types'
import type { InputVar, RelatedItem } from '../bundle/var-types'

import type { CompareGroupInfo } from './compare-group'
import type { CompareScenarios, CompareScenarioInfo } from './compare-scenarios'

/**
 * Manages a set of scenarios (corresponding to the available model inputs
 * in the given bundles) that can be used to compare two versions of the model.
 */
export class ScenarioManager implements CompareScenarios {
  private readonly scenarios: Map<ScenarioKey, Scenario> = new Map()
  private readonly scenarioInfo: Map<ScenarioKey, CompareScenarioInfo> = new Map()
  private readonly defaultInfoForGroup: Map<ScenarioGroupKey, CompareScenarioInfo> = new Map()
  private readonly groupInfo: Map<ScenarioGroupKey, CompareGroupInfo> = new Map()

  /**
   * @param modelSpecL The model spec for the "left" bundle being compared.
   * @param modelSpecR The model spec for the "right" bundle being compared.
   */
  constructor(private readonly modelSpecL: ModelSpec, private readonly modelSpecR: ModelSpec) {}

  // from CompareScenarios interface
  getScenarios(): Scenario[] {
    return [...this.scenarios.values()]
  }

  // from CompareScenarios interface
  getScenario(scenarioKey: ScenarioKey): Scenario | undefined {
    return this.scenarios.get(scenarioKey)
  }

  // from CompareScenarios interface
  getScenarioGroupInfo(groupKey: ScenarioGroupKey): CompareGroupInfo | undefined {
    return this.groupInfo.get(groupKey)
  }

  // from CompareScenarios interface
  getScenarioInfo(scenario: Scenario, groupKey: ScenarioGroupKey): CompareScenarioInfo | undefined {
    // If this is the "all inputs at default" scenario, see if we have custom
    // info for the given group
    if (scenario.key === 'all_inputs_at_default') {
      const defaultInfo = this.defaultInfoForGroup.get(groupKey)
      if (defaultInfo) {
        return defaultInfo
      }
    }

    // Otherwise, return the info that was provided or computed for the scenario
    return this.scenarioInfo.get(scenario.key)
  }

  /**
   * Override the title and subtitle that are displayed when the "all inputs at default"
   * scenario is included for a particular group.  This can be used to customize the
   * text instead of showing the default message ("...at default").
   *
   * @param groupKey The scenario group key.
   * @param scenarioInfo The custom info to be displayed.
   */
  setDefaultScenarioInfoForGroup(groupKey: ScenarioGroupKey, scenarioInfo: CompareScenarioInfo): void {
    this.defaultInfoForGroup.set(groupKey, scenarioInfo)
  }

  /**
   * Add an input scenario to the set.
   *
   * @param scenario The scenario to be added.
   * @param scenarioInfo The custom title/subtitle for the scenario.  If left undefined, the
   * default (possibly generic) info will be used.
   * @param groupInfo The custom title/subtitle for the group.  If left undefined, the
   * default (possibly generic) info will be used.
   */
  addScenario(scenario: Scenario, scenarioInfo?: CompareScenarioInfo, groupInfo?: CompareGroupInfo): void {
    // Add the scenario
    this.scenarios.set(scenario.key, scenario)

    // Add the provided scenario info or use defaults
    if (!scenarioInfo) {
      scenarioInfo = this.getInfoForInputScenario(scenario)
    }
    this.scenarioInfo.set(scenario.key, scenarioInfo)

    // Add the provided group info or use defaults
    if (!groupInfo) {
      groupInfo = this.getGroupInfoForInputScenario(scenario)
    }
    this.groupInfo.set(scenario.groupKey, groupInfo)
  }

  /**
   * Adds a set of scenarios that can be used to compare the two versions of
   * the given model.
   *
   * This function computes a matrix of input scenarios using the input variables
   * advertised by the given bundles.  It will generate scenarios such that for
   * any output variable, the model will be run:
   *   - once with all inputs at their default
   *   - twice for each input
   *       - once with single input at its minimum
   *       - once with single input at its maximum
   *
   * This is intended to be a simple, general purpose way to create a set of
   * scenarios, but every model is different, so you can replace this with a
   * function to generate a different set of scenarios that is better suited
   * for the model you are testing.
   */
  addScenarioMatrix(): void {
    // Get the set of input variable IDs for each model
    const inputVarIdsL = Array.from(this.modelSpecL.inputVars.keys())
    const inputVarIdsR = Array.from(this.modelSpecR.inputVars.keys())

    // Get the union of all input variables appearing in left and/or right
    // TODO: Omit the inputs that are in L but not in R
    const inputVarIds = new Set([...inputVarIdsL, ...inputVarIdsR])

    // Compute the matrix of scenarios based on the available input variables
    this.addScenario(allInputsAtPositionScenario('at-default'))
    for (const inputVarId of inputVarIds) {
      this.addScenario(inputAtPositionScenario(inputVarId, inputVarId, 'at-minimum'))
      this.addScenario(inputAtPositionScenario(inputVarId, inputVarId, 'at-maximum'))
    }
  }

  private getGroupInfoForInputScenario(scenario: Scenario): CompareGroupInfo {
    switch (scenario.kind) {
      case 'all-inputs':
        return {
          title: 'All Inputs',
          relatedItems: []
        }
      case 'settings':
        if (scenario.settings.length === 1) {
          const inputVar = this.getInputVarForSetting(scenario.settings[0])
          let relatedItems: RelatedItem[]
          let subtitle: string
          if (inputVar?.relatedItem) {
            relatedItems = [inputVar.relatedItem]
            subtitle = inputVar.relatedItem.locationPath.join('&nbsp;<span class="related-sep">&gt;</span>&nbsp;')
          } else {
            relatedItems = []
            subtitle = undefined
          }
          return {
            title: inputVar?.varName || 'Unknown Input',
            subtitle,
            relatedItems
          }
        } else {
          return {
            title: 'Multiple Inputs',
            relatedItems: this.getRelatedItemsForSettings(scenario.settings)
          }
        }
      default:
        assertNever(scenario)
    }
  }

  private getInfoForInputScenario(scenario: Scenario): CompareScenarioInfo {
    switch (scenario.kind) {
      case 'all-inputs':
        return this.getInfoForPositionSetting(undefined, scenario.position)
      case 'settings':
        // For now we only attempt to build info for single-input-at-position scenarios;
        // for all others, use a placeholder message, which should encourage the user to
        // provide custom info
        if (scenario.settings.length === 1 && scenario.settings[0].kind === 'position') {
          const setting = scenario.settings[0]
          return this.getInfoForPositionSetting(setting.inputVarId, setting.position)
        } else {
          return {
            title: `PLACEHOLDER (scenario info not provided)`,
            position: 1
          }
        }
      default:
        assertNever(scenario)
    }
  }

  private getInfoForPositionSetting(inputVarId: VarId | undefined, inputPosition: InputPosition): CompareScenarioInfo {
    const title = inputPosition.replace('-', ' ')

    let subtitle: string
    if (inputVarId) {
      const inputVarL = this.modelSpecL.inputVars.get(inputVarId)
      const inputVarR = this.modelSpecR.inputVars.get(inputVarId)
      const valueL = inputValue(inputVarL, inputPosition)
      const valueR = inputValue(inputVarR, inputPosition)
      if (valueL !== valueR) {
        // The values are different, so show both in different colors
        let values = ''
        values += '('
        values += `<span class='dataset-color-0'>${valueL}</span>`
        values += '&nbsp;|&nbsp;'
        values += `<span class='dataset-color-1'>${valueR}</span>`
        values += ')'
        subtitle = values
      } else {
        // The values are the same, so just show a single value in gray
        subtitle = `(${valueL})`
      }
    } else {
      subtitle = undefined
    }

    // TODO: For now the positioning is fixed; should make it customizable since
    // sometimes it makes more sense to have the default scenario in the middle
    let position: number
    switch (inputPosition) {
      case 'at-default':
        position = 0
        break
      case 'at-minimum':
        position = 1
        break
      case 'at-maximum':
        position = 2
        break
      default:
        assertNever(inputPosition)
    }

    return {
      title,
      subtitle,
      position
    }
  }

  private getRelatedItemsForSettings(settings: InputSetting[]): RelatedItem[] {
    const relatedItems: RelatedItem[] = []
    for (const setting of settings) {
      const inputVar = this.getInputVarForSetting(setting)
      if (inputVar?.relatedItem) {
        relatedItems.push(inputVar.relatedItem)
      }
    }
    return relatedItems
  }

  private getInputVarForSetting(setting: InputSetting): InputVar | undefined {
    const inputVarId = setting.inputVarId
    const inputVarL = this.modelSpecL.inputVars.get(inputVarId)
    const inputVarR = this.modelSpecR.inputVars.get(inputVarId)
    return inputVarR || inputVarL
  }
}

function inputValue(inputVar: InputVar | undefined, position: InputPosition): string {
  if (inputVar) {
    switch (position) {
      case 'at-default':
        return inputVar.defaultValue.toString()
      case 'at-minimum':
        return inputVar.minValue.toString()
      case 'at-maximum':
        return inputVar.maxValue.toString()
      default:
        assertNever(position)
    }
  } else {
    return 'n/a'
  }
}
