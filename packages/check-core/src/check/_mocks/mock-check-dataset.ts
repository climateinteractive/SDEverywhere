// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { Dimension, ImplVar, OutputVar, Subscript } from '../../bundle/var-types'
import type { CheckDataset } from '../check-dataset'

export function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = `_${varName.toLowerCase()}`
  const datasetKey = `${source || 'Model'}${varId}`
  const v: OutputVar = {
    datasetKey,
    sourceName: source,
    varId,
    varName
  }
  return [datasetKey, v]
}

export function implVar(varName: string, dimensions: Dimension[] = []): [DatasetKey, ImplVar] {
  const varId = `_${varName.toLowerCase()}`
  const datasetKey = `ModelImpl${varId}`
  const v: ImplVar = {
    varId,
    varName,
    varIndex: 1,
    dimensions,
    varType: 'aux'
  }
  return [datasetKey, v]
}

export function subscript(name: string): Subscript {
  const id = `_${name.toLowerCase()}`
  return {
    id,
    name
  }
}

export function dimension(name: string): Dimension {
  const id = `_${name.toLowerCase()}`
  const subscripts: Subscript[] = [subscript(`${name}1`), subscript(`${name}2`)]
  return {
    id,
    name,
    subscripts
  }
}

export function dataset(prefix: string, varName: string, subNames: string[] = []): CheckDataset {
  const varId = `_${varName.toLowerCase()}`
  let subIdsPart = ''
  let subNamesPart = ''
  if (subNames.length > 0) {
    subIdsPart = subNames.map(n => `[_${n.toLowerCase()}]`).join('')
    subNamesPart = `[${subNames.join(',')}]`
  }
  const datasetKey = `${prefix}${varId}${subIdsPart}`
  return {
    datasetKey,
    name: `${varName}${subNamesPart}`
  }
}
