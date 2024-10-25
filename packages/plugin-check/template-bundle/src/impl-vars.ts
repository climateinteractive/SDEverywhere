// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ImplVar, ImplVarGroup } from '@sdeverywhere/check-core'

/** The shape of the `varInstances` section from the JSON model listing. */
export interface ImplVarInstancesSpec {
  constants?: ImplVar[]
  lookupVars?: ImplVar[]
  dataVars?: ImplVar[]
  initVars?: ImplVar[]
  levelVars?: ImplVar[]
  auxVars?: ImplVar[]
}

/** The properties related to impl variables that will be included in the bundle model spec. */
export interface ImplSpec {
  /** The map of all variables (both internal and exported) in this version of the model. */
  implVars: Map<DatasetKey, ImplVar>
  /** The groupings of internal/implementation variables in this version of the model. */
  implVarGroups?: ImplVarGroup[]
}

/**
 * Gather the set of internal/implementation variables used in this version of the model.
 */
export function getImplVars(implVarInstancesSpec: ImplVarInstancesSpec): ImplSpec {
  const implVars: Map<DatasetKey, ImplVar> = new Map()
  const implVarGroups: ImplVarGroup[] = []

  function addGroup(fn: string, implVarInstances: ImplVar[]): void {
    // Add the var instances for this group to the map
    const datasetKeysForGroup: DatasetKey[] = []
    for (const implVarInstance of implVarInstances) {
      // TODO: For now, skip lookup and data variables because we have no way to
      // access them in the model
      if (implVarInstance.varType === 'lookup' || implVarInstance.varType === 'data') {
        continue
      }
      const varId = implVarInstance.varId
      const datasetKey = `ModelImpl_${varId}`
      implVars.set(datasetKey, implVarInstance)
      datasetKeysForGroup.push(datasetKey)
    }

    // Add the group info
    implVarGroups.push({
      title: fn,
      fn,
      datasetKeys: datasetKeysForGroup
    })
  }

  addGroup('initConstants', implVarInstancesSpec.constants || [])
  // TODO: Include lookups and data variables
  // addGroup('initLookups', implVarInstancesSpec.lookupVars || [])
  // addGroup('initData', implVarInstancesSpec.dataVars || [])
  addGroup('initLevels', implVarInstancesSpec.initVars || [])
  addGroup('evalLevels', implVarInstancesSpec.levelVars || [])
  addGroup('evalAux', implVarInstancesSpec.auxVars || [])

  return {
    implVars,
    implVarGroups
  }
}
