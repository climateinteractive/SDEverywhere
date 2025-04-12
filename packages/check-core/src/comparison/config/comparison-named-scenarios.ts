// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { InputPosition, InputSetting } from '../../_shared/scenario-spec-types'
import type { VarId } from '../../_shared/types'
import type { InputScenarioName, ModelSpec } from '../../bundle/bundle-types'

import type {
  ComparisonScenarioId,
  ComparisonScenarioInputName,
  ComparisonScenarioInputPosition,
  ComparisonScenarioInputSpec,
  ComparisonScenarioSpec,
  ComparisonScenarioSubtitle,
  ComparisonScenarioTitle
} from './comparison-spec-types'

/**
 * Create a `ComparisonScenarioSpec` that configures each model to use the named
 * scenario advertised by each model.  If a bundle does not advertise a scenario
 * for the given name, the input settings array will be empty for that model.
 *
 * @hidden This is a convenience function that isn't quite ready for prime time;
 * it may be removed if we come up with a better way to work with named scenarios.
 *
 * @param modelSpecL The model spec for the "left" bundle being compared.
 * @param modelSpecR The model spec for the "right" bundle being compared.
 * @param scenarioName The name of the scenario, as used in `ModelSpec.inputScenarios`.
 * @param scenarioId The unique identifier for the created scenario.
 * @param title The display title of the scenario.  If undefined, the `scenarioName`
 * will be used as the title.
 * @param subtitle The display subtitle of the scenario, or undefined.
 */
export function comparisonScenarioSpecForNamedScenario(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  scenarioName: InputScenarioName,
  scenarioId: ComparisonScenarioId,
  title?: ComparisonScenarioTitle,
  subtitle?: ComparisonScenarioSubtitle
): ComparisonScenarioSpec {
  // XXX: Currently the `ComparisonScenarioInputSpec` must reference an input by
  // its full variable name or by its alias ("id 3").  But the lower-level
  // `InputSetting` interface only includes the input variable ID, so we need
  // to map from the variable ID to the variable name.
  function inputVarNameForVarId(modelSpec: ModelSpec, varId: VarId): ComparisonScenarioInputName {
    const inputVar = modelSpec.inputVars.get(varId)
    if (inputVar === undefined) {
      throw new Error(`No input var found for varId=${varId}`)
    }
    return inputVar.varName
  }

  // Convert an `InputPosition` into a `ComparisonScenarioInputPosition`
  function inputPositionForPosition(position: InputPosition): ComparisonScenarioInputPosition {
    switch (position) {
      case 'at-minimum':
        return 'min'
      case 'at-maximum':
        return 'max'
      case 'at-default':
        return 'default'
      default:
        throw new Error(`Unknown input position: ${position}`)
    }
  }

  // Convert an `InputSetting` into a `ComparisonScenarioInputSpec`
  function inputSpecForSetting(modelSpec: ModelSpec, inputSetting: InputSetting): ComparisonScenarioInputSpec {
    switch (inputSetting.kind) {
      case 'position':
        return {
          kind: 'input-at-position',
          inputName: inputVarNameForVarId(modelSpec, inputSetting.inputVarId),
          position: inputPositionForPosition(inputSetting.position)
        }
      case 'value':
        return {
          kind: 'input-at-value',
          inputName: inputVarNameForVarId(modelSpec, inputSetting.inputVarId),
          value: inputSetting.value
        }
      default:
        throw new Error(`Unknown input setting kind: ${inputSetting}`)
    }
  }

  // Convert the named scenario for a given model into a set of `ComparisonScenarioInputSpec` instances
  function inputSpecsForNamedScenario(modelSpec: ModelSpec): ComparisonScenarioInputSpec[] {
    const inputSettings = modelSpec.inputScenarios?.get(scenarioName)
    if (inputSettings === undefined) {
      // TODO: It would be better if we had a way to flag that the scenario is not
      // available for a particular model (instead of silently using an empty array)
      return []
    }
    return inputSettings.map(inputSetting => inputSpecForSetting(modelSpec, inputSetting))
  }

  // Create a scenario that sets each model to a specific scenario based on the named scenario
  // that is advertised by the bundle.  If a bundle does not advertise a scenario for the given
  // name, the default input settings will be used for now.
  const inputsL = inputSpecsForNamedScenario(modelSpecL)
  const inputsR = inputSpecsForNamedScenario(modelSpecR)
  return {
    kind: 'scenario-with-distinct-inputs',
    id: scenarioId,
    title: title || scenarioName,
    subtitle,
    inputsL,
    inputsR
  }
}
