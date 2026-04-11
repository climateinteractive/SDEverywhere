// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { DatasetKey, ImplVar, InputVar, OutputVar, VarId } from '@sdeverywhere/check-core'

export function inputVar(inputId: string, varName: string): [VarId, InputVar] {
  const varId = varIdForName(varName)
  const v: InputVar = {
    inputId,
    varId,
    varName,
    defaultValue: 50,
    minValue: 0,
    maxValue: 100
  }
  return [varId, v]
}

export function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = varIdForName(varName)
  const datasetKey = `${source || 'Model'}_${varId}`
  const v: OutputVar = {
    datasetKey,
    sourceName: source,
    varId,
    varName
  }
  return [datasetKey, v]
}

export function implVar(varName: string, varType: string = 'aux'): [DatasetKey, ImplVar] {
  const varId = varIdForName(varName)
  const datasetKey = `ModelImpl_${varId}`
  const v: ImplVar = {
    varId,
    varName,
    varType,
    varIndex: 1
  }
  return [datasetKey, v]
}

export function varIdForName(varName: string): VarId {
  return `_${varName.toLowerCase().replace(/\s/g, '_')}`
}
