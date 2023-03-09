// Copyright (c) 2023 Climate Interactive / New Venture Fund

import Ajv from 'ajv'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import yaml from 'yaml'

import type {
  CompareScenarioGroupSpec,
  CompareScenarioSpec,
  CompareSpec,
  CompareTopLevelDefItem,
  CompareViewGroupSpec
} from './compare-spec'

import jsonSchema from './compare.schema'

export function parseComparisonScenariosYaml(yamlStrings: string[]): Result<CompareSpec, Error> {
  const scenarios: CompareScenarioSpec[] = []
  const scenarioGroups: CompareScenarioGroupSpec[] = []
  const viewGroups: CompareViewGroupSpec[] = []

  // Prepare the yaml parser/validator
  const ajv = new Ajv()
  // TODO: Ideally we would use JSONSchemaType here, but it doesn't
  // seem to work if we import the schema.json file directly
  // const schema: JSONSchemaType<CompareSpec> = jsonSchema
  const validate = ajv.compile<CompareTopLevelDefItem[]>(jsonSchema)

  // Parse the yaml strings
  for (const yamlString of yamlStrings) {
    const parsed = yaml.parse(yamlString)

    if (validate(parsed)) {
      for (const specItem of parsed) {
        if ('scenario' in specItem) {
          scenarios.push(specItem.scenario)
        } else if ('scenario_group' in specItem) {
          scenarioGroups.push(specItem.scenario_group)
        } else if ('view_group' in specItem) {
          viewGroups.push(specItem.view_group)
        }
      }
    } else {
      let msg = 'Failed to parse YAML comparison definitions'
      for (const error of validate.errors || []) {
        if (error.message) {
          msg += `\n${error.message}`
        }
      }
      return err(new Error(msg))
    }
  }

  return ok({
    scenarios,
    scenarioGroups,
    viewGroups
  })
}
