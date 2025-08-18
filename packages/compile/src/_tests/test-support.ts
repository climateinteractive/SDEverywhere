import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

import type { Model } from '@sdeverywhere/parse'

import { canonicalName } from '../_shared/helpers'
import { parseModel } from '../parse-and-generate'

export interface ParsedVensimModel {
  kind: 'vensim'
  root: Model
}

export type ParsedModel = ParsedVensimModel

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

export interface Sub {
  name: SubCName // '_b1'
  value: number // 0
  size: number // 1
  family: DimCName // '_dima'
  // TODO: Is mappings ever used for subscripts?  (Currently it always seems to be set to empty object.)
  mappings: {} // {}
}

export type VariableType = 'const' | 'aux' | 'level' | 'initial' | 'lookup' | 'data'

// TODO: Some of these default to empty string, could be default to omitted/undefined instead
export interface Variable {
  modelLHS: string // 'Target Capacity'
  modelFormula: string // 'ACTIVE INITIAL(Capacity*Utilization Adjustment,Initial Target Capacity)'
  origModelFormula?: string // 'IF THEN ELSE(cond, x, y)'
  varName: string // '_target_capacity'
  subscripts: string[] // TODO: sub type
  exceptSubscripts: string[] // TODO: This is only used during parsing, doesn't need to be exposed
  separationDims: string[] // TODO: dim type
  directDataArgs?: { file: string; tab: string; timeRowOrCol: string; startCell: string }
  directConstArgs?: { file: string; tab: string; startCell: string }
  range: [number, number][]
  points: [number, number][]
  refId: string
  varType: VariableType
  // TODO: Remove empty string variant
  varSubtype: '' | 'fixedDelay' | 'depreciation' | 'gameInputs'
  referencedFunctionNames?: string[]
  referencedLookupVarNames?: string[]
  references: string[]
  initReferences: string[]
  hasInitValue: boolean
  lookupArgVarName: string
  smoothVarRefId: string
  trendVarName: string
  npvVarName: string
  delayVarRefId: string
  delayTimeVarName: string
  fixedDelayVarName: string
  depreciationVarName: string
  gameLookupVarName: string
  includeInOutput: boolean
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
  return resolve(__dirname, '..', '..', '..', '..', 'models', modelName)
}

export function parseVensimModel(modelName: string): ParsedModel {
  const modelDir = sampleModelDir(modelName)
  const modelFile = resolve(modelDir, `${modelName}.mdl`)
  const mdlContent = readFileSync(modelFile, 'utf8')
  return parseModel(mdlContent, 'vensim', modelDir)
}

export function parseInlineVensimModel(mdlContent: string, modelDir?: string): ParsedModel {
  return parseModel(mdlContent, 'vensim', modelDir)
}

export function parseXmileModel(modelName: string): ParsedModel {
  const modelDir = sampleModelDir(modelName)
  const modelFile = resolve(modelDir, `${modelName}.stmx`)
  const mdlContent = readFileSync(modelFile, 'utf8')
  return parseModel(mdlContent, 'xmile', modelDir)
}

export function parseInlineXmileModel(mdlContent: string, modelDir?: string): ParsedModel {
  return parseModel(mdlContent, 'xmile', modelDir)
}

export function xmile(dimensions: string, variables: string): string {
  let dims: string
  if (dimensions.length > 0) {
    dims = `\
    <dimensions>
        ${dimensions}
    </dimensions>`
  } else {
    dims = ''
  }

  let vars: string
  if (variables.length > 0) {
    vars = `\
        <variables>
            ${variables}
        </variables>`
  } else {
    vars = ''
  }

  return `\
<xmile xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0" version="1.0">
<header>
    <options namespace="std"/>
    <vendor>Ventana Systems, xmutil</vendor>
    <product lang="en">Vensim, xmutil</product>
</header>
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>
${dims}
    <model>
    ${vars}
    </model>
</xmile>`
}

function prettyVar(variable: Variable): string {
  const stringify = (x: any) => {
    return JSON.stringify(x)
  }

  const others = []
  if (variable.delayTimeVarName.length > 0) {
    others.push(`delayTimeVarName: ${stringify(variable.delayTimeVarName)}`)
  }
  if (variable.delayVarRefId.length > 0) {
    others.push(`delayVarRefId: ${stringify(variable.delayVarRefId)}`)
  }
  if (variable.depreciationVarName.length > 0) {
    others.push(`depreciationVarName: ${stringify(variable.depreciationVarName)}`)
  }
  if (variable.directConstArgs) {
    others.push(`directConstArgs: ${stringify(variable.directConstArgs)}`)
  }
  if (variable.directDataArgs) {
    others.push(`directDataArgs: ${stringify(variable.directDataArgs)}`)
  }
  if (variable.fixedDelayVarName.length > 0) {
    others.push(`fixedDelayVarName: ${stringify(variable.fixedDelayVarName)}`)
  }
  if (variable.hasInitValue) {
    others.push(`hasInitValue: true`)
  }
  if (variable.includeInOutput === false) {
    others.push(`includeInOutput: false`)
  }
  if (variable.initReferences.length > 0) {
    others.push(`initReferences: ${stringify(variable.initReferences)}`)
  }
  if (variable.lookupArgVarName.length > 0) {
    others.push(`lookupArgVarName: ${stringify(variable.lookupArgVarName)}`)
  }
  if (variable.npvVarName.length > 0) {
    others.push(`npvVarName: ${stringify(variable.npvVarName)}`)
  }
  if (variable.points.length > 0) {
    others.push(`points: ${stringify(variable.points)}`)
  }
  if (variable.range.length > 0) {
    others.push(`range: ${stringify(variable.range)}`)
  }
  if (variable.refId.length > 0) {
    others.push(`refId: ${stringify(variable.refId)}`)
  }
  if (variable.referencedFunctionNames?.length > 0) {
    others.push(`referencedFunctionNames: ${stringify(variable.referencedFunctionNames)}`)
  }
  if (variable.referencedLookupVarNames?.length > 0) {
    others.push(`referencedLookupVarNames: ${stringify(variable.referencedLookupVarNames)}`)
  }
  if (variable.references.length > 0) {
    others.push(`references: ${stringify(variable.references)}`)
  }
  if (variable.separationDims.length > 0) {
    others.push(`separationDims: ${stringify(variable.separationDims)}`)
  }
  if (variable.smoothVarRefId.length > 0) {
    others.push(`smoothVarRefId: ${stringify(variable.smoothVarRefId)}`)
  }
  if (variable.subscripts.length > 0) {
    others.push(`subscripts: ${stringify(variable.subscripts)}`)
  }
  if (variable.trendVarName.length > 0) {
    others.push(`trendVarName: ${stringify(variable.trendVarName)}`)
  }
  if (variable.varSubtype.length > 0) {
    others.push(`varSubtype: ${stringify(variable.varSubtype)}`)
  }
  if (variable.varType !== 'aux') {
    others.push(`varType: ${stringify(variable.varType)}`)
  }
  let overrides = ''
  if (others.length > 0) {
    overrides = `, {\n${others.join(',\n')} }`
  }
  return `v("${variable.modelLHS}", "${variable.modelFormula}"${overrides})`
}

export function logPrettyVars(variables: Variable[]): void {
  variables.forEach(v => console.log(`${prettyVar(v)},`))
}
