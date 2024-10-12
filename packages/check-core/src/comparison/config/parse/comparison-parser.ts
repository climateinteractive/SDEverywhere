// Copyright (c) 2023 Climate Interactive / New Venture Fund

import Ajv from 'ajv'
import assertNever from 'assert-never'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import yaml from 'yaml'

import type {
  ComparisonDatasetSpec,
  ComparisonGraphGroupSpec,
  ComparisonScenarioGroupRefSpec,
  ComparisonScenarioGroupSpec,
  ComparisonScenarioId,
  ComparisonScenarioInputPosition,
  ComparisonScenarioInputSpec,
  ComparisonScenarioRefSpec,
  ComparisonScenarioSpec,
  ComparisonSpecs,
  ComparisonSpecsSource,
  ComparisonViewBoxSpec,
  ComparisonViewGraphOrder,
  ComparisonViewGraphsSpec,
  ComparisonViewGroupSpec,
  ComparisonViewRowSpec,
  ComparisonViewSpec
} from '../comparison-spec-types'

import jsonSchema from './comparison.schema'

/*
 * Note that the following types match the JSON/YAML schema, so they use snake case (underscores)
 * instead of the usual camel case.  They also are in an unusual (not user friendly) format, with
 * different optional fields in the same interface instead of using discriminated union types.
 * These "Parsed" types are internal to this file; the parsed types are converted to the public
 * "Spec" types defined in `comparison-spec.ts`, which use camel case names and union types.  The
 * goal of this split is to allow a user to define comparisons using either JSON/YAML format, or
 * programmatically using the "Spec" types.  The rest of the code deals only with the "Spec" types,
 * so the "Parsed" types are just an implementation detail of the parser.
 *
 * TODO: Share the parsing types and code with the `check` module.
 */

//
// DATASETS
//

type ParsedDatasetName = string
type ParsedDatasetSource = string

interface ParsedDataset {
  name?: ParsedDatasetName
  source?: ParsedDatasetSource
}

//
// SCENARIOS
//

type ParsedScenarioId = string

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
  id?: ParsedScenarioId
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

/** A reference to a scenario definition with optional title/subtitle overrides. */
interface ParsedScenarioRefObject {
  id: ParsedScenarioId
  title?: ParsedScenarioTitle
  subtitle?: ParsedScenarioSubtitle
}

/** A reference to a scenario definition. */
interface ParsedScenarioRef {
  scenario_ref: ParsedScenarioId | ParsedScenarioRefObject
}

//
// SCENARIO GROUPS
//

type ParsedScenarioGroupId = string

type ParsedScenarioGroupTitle = string

type ParsedScenarioGroupScenariosItem = ParsedScenarioArrayItem | ParsedScenarioRef

/**
 * A definition of a group of input scenarios.  Multiple scenarios can be grouped together under a single name, and
 * can later be referenced by group ID in a view definition.
 */
interface ParsedScenarioGroup {
  id?: ParsedScenarioGroupId
  title: ParsedScenarioGroupTitle
  scenarios: ParsedScenarioGroupScenariosItem[]
}

/** A single item in an array of scenario group definitions. */
interface ParsedScenarioGroupArrayItem {
  scenario_group: ParsedScenarioGroup
}

/** A reference to a scenario group definition. */
interface ParsedScenarioGroupRef {
  scenario_group_ref: ParsedScenarioGroupId
}

//
// GRAPHS
//

type ParsedGraphsPreset = 'all'

type ParsedGraphId = string

//
// GRAPH GROUPS
//

type ParsedGraphGroupId = string

/**
 * A definition of a group of graphs.  Multiple graphs can be grouped together and can later be
 * referenced by group ID in a view definition.
 */
interface ParsedGraphGroup {
  id: ParsedGraphGroupId
  graphs: ParsedGraphId[]
}

/** A single item in an array of graph group definitions. */
interface ParsedGraphGroupArrayItem {
  graph_group: ParsedGraphGroup
}

/** A reference to a graph group definition. */
interface ParsedGraphGroupRef {
  graph_group_ref: ParsedGraphGroupId
}

//
// VIEWS
//

type ParsedViewTitle = string
type ParsedViewSubtitle = string

type ParsedViewRowTitle = string
type ParsedViewRowSubtitle = string

type ParsedViewBoxTitle = string
type ParsedViewBoxSubtitle = string

type ParsedViewGraphs = ParsedGraphsPreset | ParsedGraphId[] | ParsedGraphGroupRef

/** A definition of a comparison (dataset + scenario) box. */
interface ParsedViewBox {
  title: ParsedViewBoxTitle
  subtitle?: ParsedViewBoxSubtitle
  dataset: ParsedDataset
  scenario_ref: ParsedScenarioId
}

/** A single comparison box in an array of view comparison box definitions. */
interface ParsedViewRowBoxesItem {
  box: ParsedViewBox
}

/** A definition of a row of comparison boxes. */
interface ParsedViewRow {
  title: ParsedViewRowTitle
  subtitle?: ParsedViewRowSubtitle
  boxes: ParsedViewRowBoxesItem[]
}

/** A single row item in an array of view row definitions. */
interface ParsedViewRowsItem {
  row: ParsedViewRow
}

/**
 * A definition of a view.  A view presents a set of graphs, either for a single input scenario
 * or for a mix of different dataset/scenario combinations.
 */
interface ParsedView {
  title?: ParsedViewTitle
  subtitle?: ParsedViewSubtitle
  scenario_ref?: ParsedScenarioId
  rows?: ParsedViewRowsItem[]
  graphs?: ParsedViewGraphs
  graph_order?: ComparisonViewGraphOrder
}

//
// VIEW GROUPS
//

type ParsedViewGroupTitle = string

interface ParsedViewGroupViewsItem {
  view: ParsedView
}

type ParsedViewGroupScenariosItem = ParsedScenarioRef | ParsedScenarioGroupRef

/** A definition of a group of views. */
interface ParsedViewGroup {
  title: ParsedViewGroupTitle
  views?: ParsedViewGroupViewsItem[]
  scenarios?: ParsedViewGroupScenariosItem[]
  graphs?: ParsedViewGraphs
  graph_order?: ComparisonViewGraphOrder
}

/** A single item in an array of view definitions. */
interface ParsedViewGroupArrayItem {
  view_group: ParsedViewGroup
}

//
// TOP-LEVEL DEFS
//

type ParsedTopLevelDefItem =
  | ParsedScenarioArrayItem
  | ParsedScenarioGroupArrayItem
  | ParsedGraphGroupArrayItem
  | ParsedViewGroupArrayItem

/**
 * Parse the comparison test definitions in the given JSON or YAML strings.
 *
 * @param specSource The JSON or YAML formatted string to parse.
 */
export function parseComparisonSpecs(specSource: ComparisonSpecsSource): Result<ComparisonSpecs, Error> {
  const scenarios: ComparisonScenarioSpec[] = []
  const scenarioGroups: ComparisonScenarioGroupSpec[] = []
  const graphGroups: ComparisonGraphGroupSpec[] = []
  const viewGroups: ComparisonViewGroupSpec[] = []

  // Prepare the JSON validator
  const ajv = new Ajv()
  // TODO: Ideally we would use JSONSchemaType here, but it doesn't
  // seem to work if we import the schema.json file directly
  // const schema: JSONSchemaType<ComparisonSpec> = jsonSchema
  const validate = ajv.compile<ParsedTopLevelDefItem[]>(jsonSchema)

  // Parse the JSON or YAML string
  let parsed: unknown
  switch (specSource.kind) {
    case 'json':
      parsed = JSON.parse(specSource.content)
      break
    case 'yaml':
      parsed = yaml.parse(specSource.content)
      break
    default:
      assertNever(specSource.kind)
  }

  // Validate and convert the parsed objects to specs
  if (validate(parsed)) {
    for (const specItem of parsed) {
      if ('scenario' in specItem) {
        scenarios.push(scenarioSpecFromParsed(specItem.scenario))
      } else if ('scenario_group' in specItem) {
        scenarioGroups.push(scenarioGroupSpecFromParsed(specItem.scenario_group))
      } else if ('graph_group' in specItem) {
        graphGroups.push(graphGroupSpecFromParsed(specItem.graph_group))
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

  return ok({
    scenarios,
    scenarioGroups,
    graphGroups,
    viewGroups
  })
}

//
// DATASETS
//

function datasetSpecFromParsed(parsedDataset: ParsedDataset): ComparisonDatasetSpec {
  return {
    kind: 'dataset',
    name: parsedDataset.name,
    source: parsedDataset.source
  }
}

//
// SCENARIOS
//

function scenarioSpecFromParsed(parsedScenario: ParsedScenario): ComparisonScenarioSpec {
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
    let inputSpecs: ComparisonScenarioInputSpec[]
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
      id: parsedScenario.id,
      title: parsedScenario.title,
      subtitle: parsedScenario.subtitle,
      inputs: inputSpecs
    }
  }

  if (parsedScenario.with_inputs === 'all') {
    // Create an "all inputs at <position>" scenario
    return {
      kind: 'scenario-with-all-inputs',
      id: parsedScenario.id,
      title: parsedScenario.title,
      subtitle: parsedScenario.subtitle,
      position: parsedScenario.at as ComparisonScenarioInputPosition
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

function inputSpecFromParsed(parsedInput: ParsedScenarioInput): ComparisonScenarioInputSpec {
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
      position: parsedInput.at as ComparisonScenarioInputPosition
    }
  }
}

//
// SCENARIO GROUPS
//

function scenarioGroupSpecFromParsed(parsedScenarioGroup: ParsedScenarioGroup): ComparisonScenarioGroupSpec {
  const scenarioSpecs: (ComparisonScenarioSpec | ComparisonScenarioRefSpec)[] = parsedScenarioGroup.scenarios.map(
    parsedScenarioOrRef => {
      if ('scenario_ref' in parsedScenarioOrRef) {
        return scenarioRefSpecFromParsed(parsedScenarioOrRef)
      } else {
        return scenarioSpecFromParsed(parsedScenarioOrRef.scenario)
      }
    }
  )
  return {
    kind: 'scenario-group',
    id: parsedScenarioGroup.id,
    title: parsedScenarioGroup.title,
    scenarios: scenarioSpecs
  }
}

function scenarioRefSpecFromParsed(parsedScenarioRef: ParsedScenarioRef): ComparisonScenarioRefSpec {
  if (typeof parsedScenarioRef.scenario_ref === 'string') {
    return {
      kind: 'scenario-ref',
      scenarioId: parsedScenarioRef.scenario_ref
    }
  } else {
    return {
      kind: 'scenario-ref',
      scenarioId: parsedScenarioRef.scenario_ref.id,
      title: parsedScenarioRef.scenario_ref.title,
      subtitle: parsedScenarioRef.scenario_ref.subtitle
    }
  }
}

function scenarioGroupRefSpecFromParsed(parsedGroupRef: ParsedScenarioGroupRef): ComparisonScenarioGroupRefSpec {
  return {
    kind: 'scenario-group-ref',
    groupId: parsedGroupRef.scenario_group_ref
  }
}

//
// GRAPH GROUPS
//

function graphGroupSpecFromParsed(parsedGraphGroup: ParsedGraphGroup): ComparisonGraphGroupSpec {
  return {
    kind: 'graph-group',
    id: parsedGraphGroup.id,
    graphIds: parsedGraphGroup.graphs
  }
}

//
// VIEWS
//

function viewSpecFromParsed(parsedView: ParsedView): ComparisonViewSpec {
  let scenarioId: ComparisonScenarioId
  let rows: ComparisonViewRowSpec[]
  if (parsedView.scenario_ref !== undefined) {
    scenarioId = parsedView.scenario_ref
  } else if (parsedView.rows !== undefined) {
    rows = parsedView.rows.map(item => viewRowSpecFromParsed(item.row))
  }

  let graphs: ComparisonViewGraphsSpec
  if (parsedView.graphs !== undefined) {
    graphs = viewGraphsSpecFromParsed(parsedView.graphs)
  }

  return {
    kind: 'view',
    title: parsedView.title,
    subtitle: parsedView.subtitle,
    scenarioId,
    rows,
    graphs,
    graphOrder: parsedView.graph_order
  }
}

function viewRowSpecFromParsed(parsedRow: ParsedViewRow): ComparisonViewRowSpec {
  return {
    kind: 'view-row',
    title: parsedRow.title,
    subtitle: parsedRow.subtitle,
    boxes: parsedRow.boxes.map(item => viewBoxSpecFromParsed(item.box))
  }
}

function viewBoxSpecFromParsed(parsedBox: ParsedViewBox): ComparisonViewBoxSpec {
  return {
    kind: 'view-box',
    title: parsedBox.title,
    subtitle: parsedBox.subtitle,
    dataset: datasetSpecFromParsed(parsedBox.dataset),
    scenarioId: parsedBox.scenario_ref
  }
}

function viewGraphsSpecFromParsed(parsedGraphs: ParsedViewGraphs): ComparisonViewGraphsSpec {
  if (parsedGraphs === 'all') {
    return {
      kind: 'graphs-preset',
      preset: 'all'
    }
  } else if (Array.isArray(parsedGraphs)) {
    return {
      kind: 'graphs-array',
      graphIds: parsedGraphs
    }
  } else if ('graph_group_ref' in parsedGraphs) {
    return {
      kind: 'graph-group-ref',
      groupId: parsedGraphs.graph_group_ref
    }
  } else {
    // Internal error (this should have already been rejected by the validator)
    throw new Error('Invalid graphs spec in comparison view')
  }
}

//
// VIEW GROUPS
//

function viewGroupSpecFromParsed(parsedViewGroup: ParsedViewGroup): ComparisonViewGroupSpec {
  if (parsedViewGroup.views !== undefined) {
    // This is a view group with an array of views
    return {
      kind: 'view-group-with-views',
      title: parsedViewGroup.title,
      views: parsedViewGroup.views.map(item => viewSpecFromParsed(item.view))
    }
  } else if (parsedViewGroup.scenarios !== undefined) {
    // This is a view group with an array of scenario (or scenario group) references
    const scenarios: (ComparisonScenarioRefSpec | ComparisonScenarioGroupRefSpec)[] = parsedViewGroup.scenarios.map(
      parsedScenarioOrGroupRef => {
        if ('scenario_ref' in parsedScenarioOrGroupRef) {
          return scenarioRefSpecFromParsed(parsedScenarioOrGroupRef)
        } else if ('scenario_group_ref' in parsedScenarioOrGroupRef) {
          return scenarioGroupRefSpecFromParsed(parsedScenarioOrGroupRef)
        } else {
          // Internal error (this should have already been rejected by the validator)
          throw new Error('Invalid view group')
        }
      }
    )
    return {
      kind: 'view-group-with-scenarios',
      title: parsedViewGroup.title,
      scenarios,
      graphs: viewGraphsSpecFromParsed(parsedViewGroup.graphs)
    }
  } else {
    // Internal error (this should have already been rejected by the validator)
    throw new Error('Invalid view group')
  }
}
