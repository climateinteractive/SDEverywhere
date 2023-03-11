// Copyright (c) 2023 Climate Interactive / New Venture Fund

import Ajv from 'ajv'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import yaml from 'yaml'

import type {
  CompareScenarioGroupRefSpec,
  CompareScenarioGroupSpec,
  CompareScenarioInputPosition,
  CompareScenarioInputSpec,
  CompareScenarioRefSpec,
  CompareScenarioSpec,
  CompareSpec,
  CompareViewGraphsSpec,
  CompareViewGroupSpec,
  CompareViewSpec
} from './compare-spec'

import jsonSchema from './compare.schema'

/*
 * Note that the following types match the JSON/YAML schema, so they use snake case (underscores)
 * instead of the usual camel case.  They also are in an unusual (not user friendly) format, with
 * different optional fields in the same interface instead of using discriminated union types.
 * These "Parsed" types are internal to this file; the parsed types are converted to the public
 * "Spec" types defined in `compare-spec.ts`, which use camel case names and union types.  The
 * goal of this split is to allow a user to define comparisons using either JSON/YAML format, or
 * programmatically using the "Spec" types.  The rest of the code deals only with the "Spec" types,
 * so the "Parsed" types are just an implementation detail of the parser.
 *
 * TODO: Share the parsing types and code with the `check` module.
 */

//
// SCENARIOS
//

type ParsedScenarioTitle = string
type ParsedScenarioSubtitle = string

type ParsedScenarioInputName = string

type ParsedScenarioInputPosition = 'default' | 'min' | 'max'

/**
 * A single input setting for a scenario.  An input can be set to a specific number value,
 * or it can be set to a "position" (default / min / max), which depends on how a particular
 * model input is configured.
 */
interface ParsedScenarioInput {
  input: ParsedScenarioInputName
  at: ParsedScenarioInputPosition | number
}

/**
 * A definition of an input scenario.  A scenario can set one input to a value/position, or it
 * can set multiple inputs to particular values/positions.
 */
interface ParsedScenario {
  title?: ParsedScenarioTitle
  subtitle?: ParsedScenarioSubtitle
  preset?: 'matrix'
  with?: ParsedScenarioInputName | ParsedScenarioInput[]
  with_inputs?: 'all'
  // with_inputs_in?: string
  at?: ParsedScenarioInputPosition | number
}

/** A single item in an array of scenario definitions. */
interface ParsedScenarioArrayItem {
  scenario: ParsedScenario
}

/** A reference to a scenario definition. */
interface ParsedScenarioRef {
  scenario_ref: ParsedScenarioTitle
}

//
// SCENARIO GROUPS
//

type ParsedScenarioGroupName = string

type ParsedScenarioGroupScenariosItem = ParsedScenarioArrayItem | ParsedScenarioRef

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group name in a view definition.
 */
interface ParsedScenarioGroup {
  name: ParsedScenarioGroupName
  scenarios: ParsedScenarioGroupScenariosItem[]
}

/** A single item in an array of scenario group definitions. */
interface ParsedScenarioGroupArrayItem {
  scenario_group: ParsedScenarioGroup
}

/** A reference to a scenario group definition. */
interface ParsedScenarioGroupRef {
  scenario_group_ref: ParsedScenarioGroupName
}

//
// VIEWS
//

type ParsedViewName = string

type ParsedViewScenariosItem = ParsedScenarioRef | ParsedScenarioGroupRef

type ParsedViewGraphsPreset = 'all'

type ParsedViewGraphId = string

/**
 * A definition of a view.  A view presents a set of graphs for a single input scenario.  This
 * definition allows for specifying a set of graphs to be shown in a number of different scenarios.
 */
interface ParsedView {
  name: ParsedViewName
  // desc?: string
  scenarios?: ParsedViewScenariosItem[]
  graphs?: ParsedViewGraphsPreset | ParsedViewGraphId[]
}

//
// VIEW GROUPS
//

type ParsedViewGroupName = string

/**
 * A definition of a group of views.  Multiple related views can be grouped together under a single name
 * to make them easy to distinguish in a report.
 */
interface ParsedViewGroupViewsItem {
  view: ParsedView
}

/** A definition of a view group. */
interface ParsedViewGroup {
  name: ParsedViewGroupName
  views: ParsedViewGroupViewsItem[]
}

/** A single item in an array of view definitions. */
interface ParsedViewGroupArrayItem {
  view_group: ParsedViewGroup
}

//
// TOP-LEVEL DEFS
//

type ParsedTopLevelDefItem = ParsedScenarioArrayItem | ParsedScenarioGroupArrayItem | ParsedViewGroupArrayItem

/**
 * Parse the comparison test definitions in the given YAML strings.
 *
 * @param yamlStrings The YAML formatted strings to parse.
 */
export function parseComparisonScenariosYaml(yamlStrings: string[]): Result<CompareSpec, Error> {
  const scenarios: CompareScenarioSpec[] = []
  const scenarioGroups: CompareScenarioGroupSpec[] = []
  const viewGroups: CompareViewGroupSpec[] = []

  // Prepare the JSON validator
  const ajv = new Ajv()
  // TODO: Ideally we would use JSONSchemaType here, but it doesn't
  // seem to work if we import the schema.json file directly
  // const schema: JSONSchemaType<CompareSpec> = jsonSchema
  const validate = ajv.compile<ParsedTopLevelDefItem[]>(jsonSchema)

  // Parse the YAML strings
  for (const yamlString of yamlStrings) {
    const parsed = yaml.parse(yamlString)

    if (validate(parsed)) {
      for (const specItem of parsed) {
        if ('scenario' in specItem) {
          scenarios.push(scenarioSpecFromParsed(specItem.scenario))
        } else if ('scenario_group' in specItem) {
          scenarioGroups.push(scenarioGroupSpecFromParsed(specItem.scenario_group))
        } else if ('view_group' in specItem) {
          viewGroups.push(viewGroupSpecFromParsed(specItem.view_group))
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

//
// SCENARIOS
//

function scenarioSpecFromParsed(parsedScenario: ParsedScenario): CompareScenarioSpec {
  if (parsedScenario.preset === 'matrix') {
    // Create matrix spec
    return {
      kind: 'scenario-matrix'
    }
  }

  // if (scenarioSpec.scenarios_for_each_input_in !== undefined) {
  //   // Create multiple scenarios (one scenario for each input in the given group)
  //   const groupName = scenarioSpec.scenarios_for_each_input_in
  //   const position = scenarioSpec.at as ParsedScenarioInputPosition
  //   TODO...
  // }

  if (parsedScenario.with !== undefined) {
    let inputSpecs: CompareScenarioInputSpec[]
    if (Array.isArray(parsedScenario.with)) {
      // Create one scenario that contains the given input settings
      const parsedInputs = parsedScenario.with as ParsedScenarioInput[]
      inputSpecs = parsedInputs.map(inputSpecFromParsed)
    } else {
      // Create a single "input at <position|value>" scenario
      inputSpecs = [
        inputSpecFromParsed({
          input: parsedScenario.with,
          at: parsedScenario.at
        })
      ]
    }
    return {
      kind: 'scenario-with-inputs',
      title: parsedScenario.title,
      subtitle: parsedScenario.subtitle,
      inputs: inputSpecs
    }
  }

  if (parsedScenario.with_inputs === 'all') {
    // Create an "all inputs at <position>" scenario
    return {
      kind: 'scenario-with-all-inputs',
      title: parsedScenario.title,
      subtitle: parsedScenario.subtitle,
      position: parsedScenario.at as CompareScenarioInputPosition
    }
  }

  // if (scenarioSpec.with_inputs_in !== undefined) {
  //   // Create one scenario that sets all inputs in the given group to a position
  //   const groupName = scenarioSpec.with_inputs_in
  //   const position = scenarioSpec.at as ParsedScenarioInputPosition
  //   TODO...
  // }

  // Internal error
  throw new Error(`Unable to convert parsed scenario: ${JSON.stringify(parsedScenario)}`)
}

function inputSpecFromParsed(parsedInput: ParsedScenarioInput): CompareScenarioInputSpec {
  if (typeof parsedInput.at === 'number') {
    const value = parsedInput.at as number
    return {
      kind: 'input-at-value',
      inputName: parsedInput.input,
      value
    }
  } else {
    return {
      kind: 'input-at-position',
      inputName: parsedInput.input,
      position: parsedInput.at as CompareScenarioInputPosition
    }
  }
}

//
// SCENARIO GROUPS
//

function scenarioGroupSpecFromParsed(parsedScenarioGroup: ParsedScenarioGroup): CompareScenarioGroupSpec {
  const scenarioSpecs: (CompareScenarioSpec | CompareScenarioRefSpec)[] = parsedScenarioGroup.scenarios.map(
    parsedScenarioOrRef => {
      if ('scenario_ref' in parsedScenarioOrRef) {
        return {
          kind: 'scenario-ref',
          scenarioName: parsedScenarioOrRef.scenario_ref
        }
      } else {
        return scenarioSpecFromParsed(parsedScenarioOrRef.scenario as ParsedScenario)
      }
    }
  )
  return {
    kind: 'scenario-group',
    name: parsedScenarioGroup.name,
    scenarios: scenarioSpecs
  }
}

//
// VIEWS
//

function viewSpecFromParsed(parsedView: ParsedView): CompareViewSpec {
  const scenarios: (CompareScenarioRefSpec | CompareScenarioGroupRefSpec)[] = parsedView.scenarios.map(
    parsedScenarioOrGroupRef => {
      if ('scenario_ref' in parsedScenarioOrGroupRef) {
        return {
          kind: 'scenario-ref',
          scenarioName: parsedScenarioOrGroupRef.scenario_ref
        }
      } else if ('scenario_group_ref' in parsedScenarioOrGroupRef) {
        return {
          kind: 'scenario-group-ref',
          groupName: parsedScenarioOrGroupRef.scenario_group_ref
        }
      } else {
        // Internal error (this should have already been rejected by the validator)
        throw new Error('Invalid view item')
      }
    }
  )

  let graphs: CompareViewGraphsSpec
  if (parsedView.graphs === 'all') {
    graphs = {
      kind: 'graphs-preset',
      preset: 'all'
    }
  } else {
    graphs = {
      kind: 'graphs-array',
      graphIds: parsedView.graphs
    }
  }

  return {
    kind: 'view',
    name: parsedView.name,
    scenarios,
    graphs
  }
}

//
// VIEW GROUPS
//

function viewGroupSpecFromParsed(parsedViewGroup: ParsedViewGroup): CompareViewGroupSpec {
  return {
    kind: 'view-group',
    name: parsedViewGroup.name,
    views: parsedViewGroup.views.map(item => viewSpecFromParsed(item.view))
  }
}
