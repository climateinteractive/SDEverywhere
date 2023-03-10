// Copyright (c) 2023 Climate Interactive / New Venture Fund

export const foo = 1

// import type { CompareScenarios } from './compare-scenarios'
// import { ScenarioManager } from './scenario-manager'

// /**
//  * Create a `CompareResolvedScenarios` instance that combines an existing `CompareScenarios`
//  * (containing custom or programmatically-defined scenarios) with YAML comparison scenario
//  * definitions.
//  *
//  * @param modelSpecL The model spec for the "left" bundle being compared.
//  * @param modelSpecR The model spec for the "right" bundle being compared.
//  * @param baseScenarios The `scenarios` from the `CompareConfig`.
//  * @param yamlDefs The `scenarioYaml` definitions from the `CompareConfig`.
//  */
// export function resolveCompareScenarios(
//   modelSpecL: ModelSpec,
//   modelSpecR: ModelSpec,
//   baseScenarios?: CompareScenarios,
//   yamlDefs?: string[]
// ): CompareResolvedScenarios {
//   // Create a new `ScenarioManager` instance that will hold the available scenarios
//   const scenarioManager = new ScenarioManager(modelSpecL, modelSpecR)

//   // TODO: If the user provided a `CompareScenarios` instance, use the data from that one
//   // to populate the new `ScenarioManager`
//   console.log(baseScenarios)

//   // TODO: Parse the yaml defs and add to the scenario manager
//   console.log(yamlDefs)

//   return scenarioManager
// }
