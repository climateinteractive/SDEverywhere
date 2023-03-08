// Copyright (c) 2023 Climate Interactive / New Venture Fund

import Ajv from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import yaml from 'yaml'

import type {
  CompareInputScenarioGroupSpec,
  CompareInputScenarioSpec,
  CompareSpec,
  CompareDefsSpec,
  CompareUserScenarioGroupSpec
} from './compare-spec'

import jsonSchema from './compare.schema'

export function parseComparisonScenariosYaml(yamlStrings: string[]): Result<CompareSpec, Error> {
  const inputScenarios: CompareInputScenarioSpec[] = []
  const inputScenarioGroups: CompareInputScenarioGroupSpec[] = []
  const userScenarioGroups: CompareUserScenarioGroupSpec[] = []

  // Prepare the yaml parser/validator
  const ajv = new Ajv()
  // TODO: Ideally we would use JSONSchemaType here, but it doesn't
  // seem to work if we import the schema.json file directly
  // const schema: JSONSchemaType<CompareSpec> = jsonSchema
  const validate = ajv.compile<CompareDefsSpec>(jsonSchema)

  // Parse the yaml strings
  for (const yamlString of yamlStrings) {
    const parsed = yaml.parse(yamlString)

    if (validate(parsed)) {
      if (parsed.input_scenarios) {
        for (const specItem of parsed.input_scenarios) {
          if (specItem.scenario) {
            inputScenarios.push(specItem.scenario)
          } else if (specItem.group) {
            inputScenarioGroups.push(specItem.group)
          }
        }
      }
      if (parsed.user_scenarios) {
        for (const specItem of parsed.user_scenarios) {
          if (specItem.group) {
            userScenarioGroups.push(specItem.group)
          }
        }
      }
    } else {
      const errDetail = betterAjvErrors(jsonSchema, parsed, validate.errors, { indent: 2 })
      const msg = `Failed to parse YAML tests\n\n${errDetail}`
      return err(new Error(msg))
    }
  }

  return ok({
    inputScenarios,
    inputScenarioGroups,
    userScenarioGroups
  })
}
