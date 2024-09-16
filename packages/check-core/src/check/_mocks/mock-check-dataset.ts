// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { ImplVar, OutputVar } from '../../bundle/var-types'
import type { CheckDataset } from '../check-dataset'

export function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = varIdForName(varName)
  const datasetKey = `${source || 'Model'}${varId}`
  const v: OutputVar = {
    datasetKey,
    sourceName: source,
    varId,
    varName
  }
  return [datasetKey, v]
}

export function implVar(varName: string, subscriptIndices?: number[]): [DatasetKey, ImplVar] {
  const varId = varIdForName(varName)
  const datasetKey = `ModelImpl${varId}`
  const v: ImplVar = {
    varId,
    varName,
    varIndex: 1,
    subscriptIndices,
    varType: 'aux'
  }
  return [datasetKey, v]
}

export function dataset(prefix: string, varName: string): CheckDataset {
  const varId = varIdForName(varName)
  const datasetKey = `${prefix}${varId}`
  return {
    datasetKey,
    name: varName
  }
}

function varIdForName(varName: string): string {
  const parts = varName.split('[')
  const baseVarId = `_${parts[0].toLowerCase()}`
  let subs: string
  if (parts.length > 1) {
    const subParts = parts[1].replace(']', '').split(',')
    const subIds = subParts.map(part => `_${part.toLowerCase()}`)
    subs = `[${subIds.join(',')}]`
  } else {
    subs = ''
  }
  return `${baseVarId}${subs}`
}
