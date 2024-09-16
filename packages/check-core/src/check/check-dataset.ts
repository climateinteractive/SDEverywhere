// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../_shared/types'
import type { ModelSpec } from '../bundle/bundle-types'
import type { CheckDatasetSpec } from './check-spec'
import type { ImplVar, OutputVar } from '../bundle/var-types'

export type CheckDatasetError = 'no-matches-for-dataset' | 'no-matches-for-group' | 'no-matches-for-type'

export interface CheckDataset {
  /** The key for the matched dataset; can be undefined if no dataset matched. */
  datasetKey?: DatasetKey
  /** The name of the matched dataset, or the name associated with the error, if defined. */
  name: string
  /** The error info if the dataset query failed to match. */
  error?: CheckDatasetError
}

interface Match {
  datasetKey: DatasetKey
  outputVar?: OutputVar
  implVar?: ImplVar
}

interface ExpandResult {
  /** The resolved dataset matches. */
  matches: Match[]
  error?: {
    /** The error kind if the dataset query failed to match. */
    kind: CheckDatasetError
    /** The name associated with the error, if any. */
    name: string
  }
}

/**
 * Return the list of datasets that match the given spec.  If a matched dataset
 * is subscripted (i.e., contains dimensions), those dimensions will be expanded
 * so that one dataset is included for each subscript combination.
 *
 * @param modelSpec The model spec that provides output and impl var information.
 * @param datasetSpec The dataset spec from a check test.
 */
export function expandDatasets(modelSpec: ModelSpec, datasetSpec: CheckDatasetSpec): CheckDataset[] {
  // Find datasets that match the given query
  let result: ExpandResult
  if (datasetSpec.name) {
    result = matchByName(modelSpec, datasetSpec.name, datasetSpec.source)
  } else if (datasetSpec.group) {
    result = matchByGroup(modelSpec, datasetSpec.group)
  } else if (datasetSpec.matching?.type) {
    result = matchByType(modelSpec, datasetSpec.matching.type)
  }
  if (result.error) {
    // We didn't match any datasets; add a check dataset with undefined
    // `datasetKey` so that we can report the error later
    return [
      {
        name: result.error.name,
        error: result.error.kind
      }
    ]
  }

  // Convert matches to `CheckDataset` instances
  const matches: Match[] = result.matches
  const checkDatasets: CheckDataset[] = []
  for (const match of matches) {
    if (match.outputVar) {
      // Output vars are already expanded
      checkDatasets.push({
        datasetKey: match.datasetKey,
        name: match.outputVar.varName
      })
    } else if (match.implVar) {
      // Impl vars are already expanded
      checkDatasets.push({
        datasetKey: match.datasetKey,
        name: match.implVar.varName
      })
    }
  }

  return checkDatasets
}

function matchByName(modelSpec: ModelSpec, datasetName: string, datasetSource: string | undefined): ExpandResult {
  // Ignore case when matching by name
  const varNameToMatch = datasetName.toLowerCase()
  const sourceToMatch = datasetSource?.toLowerCase()

  // When matching by name, first consult output vars, and failing that,
  // try impl vars
  for (const [datasetKey, outputVar] of modelSpec.outputVars) {
    if (outputVar.sourceName?.toLowerCase() === sourceToMatch && outputVar.varName.toLowerCase() === varNameToMatch) {
      return {
        matches: [
          {
            datasetKey,
            outputVar
          }
        ]
      }
    }
  }

  // We didn't match an output var, so try impl vars
  for (const [datasetKey, implVar] of modelSpec.implVars) {
    if (implVar.varName.toLowerCase() === varNameToMatch) {
      return {
        matches: [
          {
            datasetKey,
            implVar
          }
        ]
      }
    }
  }

  // We didn't match anything; return the name so that we can report the
  // error later
  return {
    matches: [],
    error: {
      kind: 'no-matches-for-dataset',
      name: datasetName
    }
  }
}

function matchByGroup(modelSpec: ModelSpec, groupName: string): ExpandResult {
  let matchedGroupName: string
  let matchedGroupDatasetKeys: DatasetKey[]
  if (modelSpec.datasetGroups) {
    // Ignore case when matching by group
    const groupToMatch = groupName.toLowerCase()

    // Find the group that matches the given name
    for (const [group, datasetKeys] of modelSpec.datasetGroups) {
      if (group.toLowerCase() === groupToMatch) {
        matchedGroupName = group
        matchedGroupDatasetKeys = datasetKeys
        break
      }
    }
  }
  if (matchedGroupName === undefined) {
    // We didn't match a group; return the name so that we can report the
    // error later
    return {
      matches: [],
      error: {
        kind: 'no-matches-for-group',
        name: groupName
      }
    }
  }

  // Find datasets for the given group; first consult output vars, and failing that,
  // try impl vars
  const matches: Match[] = []
  for (const datasetKey of matchedGroupDatasetKeys) {
    // First consult output vars
    const outputVar = modelSpec.outputVars.get(datasetKey)
    if (outputVar) {
      matches.push({
        datasetKey,
        outputVar
      })
      continue
    }

    // We didn't match an output var, so try impl vars
    const implVar = modelSpec.implVars.get(datasetKey)
    if (implVar) {
      matches.push({
        datasetKey,
        implVar
      })
      continue
    }

    // We didn't find a match; return the key so that we can report the
    // error later
    return {
      matches: [],
      error: {
        kind: 'no-matches-for-dataset',
        name: datasetKey
      }
    }
  }

  if (matches.length === 0) {
    // We didn't match anything; return the group name so that we can report the
    // error later
    return {
      matches: [],
      error: {
        kind: 'no-matches-for-group',
        name: matchedGroupName
      }
    }
  }

  return {
    matches
  }
}

function matchByType(modelSpec: ModelSpec, varTypeToMatch: string): ExpandResult {
  // When matching by type, we need to consult impl vars since those
  // have an associated type
  // TODO: If we match an impl var, see if there's a corresponding model
  // output and if so, use that instead (to avoid special model runs
  // to fetch impl var data)
  const matches: Match[] = []
  for (const [datasetKey, implVar] of modelSpec.implVars) {
    if (implVar.varType === varTypeToMatch) {
      matches.push({
        datasetKey,
        implVar
      })
    }
  }

  if (matches.length === 0) {
    // We didn't match anything; return the query so that we can report
    // the error later
    return {
      matches: [],
      error: {
        kind: 'no-matches-for-type',
        name: varTypeToMatch
      }
    }
  }

  return {
    matches
  }
}
