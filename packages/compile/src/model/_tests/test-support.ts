// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { resolve } from 'path'
import { fileURLToPath } from 'url'

import type { VensimModelParseTree } from '../../parse/parser'
import { parseModel } from '../../parse/parser'
import { preprocessModel } from '../../preprocess/preprocessor'
import { canonicalName } from '../../_shared/helpers'

export type DimModelName = string
export type DimCName = string
export type SubModelName = string
export type SubCName = string
export type DimOrSubModelName = string

export interface DimModelMapping {
  toDim: DimModelName
  value: DimOrSubModelName[]
}

export type DimCMappings = Record<DimCName, SubCName[]>

export interface Dim {
  modelName: DimModelName // 'DimB'
  // TODO: In "unresolved" dimensions, `modelValue` can be an empty string instead of an array
  modelValue: SubModelName[] | SubModelName // ['B1', 'B2', 'B3']
  modelMappings: DimModelMapping[] // [{ toDim: 'DimA', value: [] }]
  name: DimCName // '_dimb'
  // TODO: Differentiate between "unresolved" dimensions (where `value` can initially contain
  // a dimension name) and "resolved" dimensions (where `value` only (?) contains subscript names)
  // TODO: In "unresolved" dimensions, `value` can be an empty string instead of an array
  value: SubCName[] | SubCName // ['_b1', '_b2', '_b3']
  size: number // 3
  family: DimCName // '_dimb'
  mappings: DimCMappings // { _dima: ['_b1', '_b2', '_b3'] }
}

export function dimMapping(toDim: DimModelName, value: DimOrSubModelName[] = []): DimModelMapping {
  return {
    toDim,
    value
  }
}

export function dim(
  modelName: DimModelName,
  modelValue: SubModelName[] | SubModelName,
  family?: DimModelName,
  resolvedValue?: SubModelName[] | SubModelName,
  modelMappings: DimModelMapping[] = [],
  mappings: DimCMappings = {}
): Dim {
  const dimCName = canonicalName(modelName)
  const familyCName = family ? canonicalName(family) : dimCName

  // In simple cases, the resolved sub names can be derived from the
  // model value, but for non-simple cases, the caller needs to supply
  // specific names
  let resolvedSubCNames: SubCName[] | SubCName
  if (resolvedValue) {
    if (Array.isArray(resolvedValue)) {
      resolvedSubCNames = resolvedValue.map(canonicalName)
    } else {
      resolvedSubCNames = resolvedValue !== '' ? canonicalName(resolvedValue) : ''
    }
  } else {
    if (Array.isArray(modelValue)) {
      resolvedSubCNames = modelValue.map(canonicalName)
    } else {
      resolvedSubCNames = modelValue !== '' ? canonicalName(modelValue) : ''
    }
  }

  return {
    modelName,
    modelValue,
    modelMappings,
    name: dimCName,
    value: resolvedSubCNames,
    size: resolvedSubCNames.length,
    family: familyCName,
    mappings
  }
}

export interface Sub {
  name: SubCName // '_b1'
  value: number // 0
  size: number // 1
  family: DimCName // '_dima'
  // TODO: Is mappings ever used for subscripts?  (Currently it always seems to be set to empty object.)
  mappings: {} // {}
}

export function sub(modelName: SubModelName, family: DimModelName, value: number): Sub {
  return {
    name: canonicalName(modelName),
    value,
    size: 1,
    family: canonicalName(family),
    mappings: {}
  }
}

export function sampleModelDir(modelName: string): string {
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  return resolve(__dirname, '..', '..', '..', '..', '..', 'models', modelName)
}

export function parseVensimModel(modelName: string): VensimModelParseTree {
  const modelFile = resolve(sampleModelDir(modelName), `${modelName}.mdl`)
  const preprocessed = preprocessModel(modelFile, undefined, 'genc', false)
  return parseModel(preprocessed)
}
