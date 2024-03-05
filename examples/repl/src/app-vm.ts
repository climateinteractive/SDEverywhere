import {
  generateJsCode,
  getModelListing,
  parseInlineVensimModel,
  resetState as resetCompileState
} from '@sdeverywhere/compile'

import type { ModelCore } from '@sdeverywhere/runtime'

export interface VarInfo {
  refId: string
  varName: string
  references: string[]
  hasInitValue: boolean
  varType: 'const' | 'data' | 'aux' | 'level'
  modelLHS: string
  modelFormula: string
  varIndex?: number
}

export interface GeneratedModel {
  jsCode: string
  // jsonList: string
  inputVars: VarInfo[]
  outputVars: VarInfo[]
}

export function readInlineModelAndGenerateJS(
  mdlContent: string,
  opts?: {
    // modelDir?: string
    // extData?: ExtData
    // directDataSpec?: DirectDataSpec
    inputVarNames?: string[]
    outputVarNames?: string[]
  }
): GeneratedModel {
  // XXX: This step is needed due to subs/dims and variables being in module-level storage
  resetCompileState()

  let spec
  if (opts?.inputVarNames || opts?.outputVarNames) {
    spec = {
      inputVarNames: opts?.inputVarNames || [],
      outputVarNames: opts?.outputVarNames || []
    }
  } else {
    spec = {}
  }

  // Parse the Vensim model
  const parsedModel = parseInlineVensimModel(mdlContent /*, opts?.modelDir*/)
  // console.log(parsedModel)

  // Generate JS code
  const jsCode = generateJsCode(parsedModel, {
    spec,
    operations: ['generateJS']
    // extData: opts?.extData,
    // directData,
    // modelDirname: opts?.modelDir
  })

  // Parse the JSON listing to determine input and output variables
  const jsonListStr = getModelListing()
  const listing = JSON.parse(jsonListStr)
  const inputVars = []
  const outputVars = []
  for (const varInfo of listing.variables) {
    // Ignore control variables
    switch (varInfo.varName) {
      case '_final_time':
      case '_initial_time':
      case '_time_step':
      case '_saveper':
        continue
      default:
        break
    }

    switch (varInfo.varType) {
      case 'const':
        inputVars.push(varInfo)
        break
      case 'aux':
      case 'level':
        outputVars.push(varInfo)
        break
      default:
        break
    }
  }

  return {
    jsCode,
    inputVars,
    outputVars
  }
}

export async function createModelCore(modelJs: string): Promise<ModelCore> {
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(modelJs)
  // TODO: Fix this so that we don't need the vite-ignore
  const module = await import(/* @vite-ignore */ dataUri)
  // console.log(module)
  return module as ModelCore
}
