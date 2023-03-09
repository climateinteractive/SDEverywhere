// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import Ajv from 'ajv'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import yaml from 'yaml'

import type { CheckGroupSpec, CheckSpec } from './check-spec'

import jsonSchema from './check.schema'

export function parseTestYaml(yamlStrings: string[]): Result<CheckSpec, Error> {
  const groups: CheckGroupSpec[] = []

  // Prepare the yaml parser/validator
  const ajv = new Ajv()
  // TODO: Ideally we would use JSONSchemaType here, but it doesn't
  // seem to work if we import the schema.json file directly
  // const schema: JSONSchemaType<GroupSpec[]> = jsonSchema
  const validate = ajv.compile<CheckGroupSpec[]>(jsonSchema)

  // Parse the yaml strings
  for (const yamlString of yamlStrings) {
    const parsed = yaml.parse(yamlString)

    if (validate(parsed)) {
      for (const group of parsed) {
        groups.push(group)
      }
    } else {
      let msg = 'Failed to parse YAML check definitions'
      for (const error of validate.errors || []) {
        if (error.message) {
          msg += `\n${error.message}`
        }
      }
      return err(new Error(msg))
    }
  }

  const checkSpec: CheckSpec = {
    groups
  }

  return ok(checkSpec)
}
