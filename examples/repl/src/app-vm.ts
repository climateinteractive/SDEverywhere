import {
  generateJsCode,
  getModelListing,
  parseInlineVensimModel,
  resetState as resetCompileState
} from '@sdeverywhere/compile'

export interface ModelCore {
  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveStep(): number
  setTime(time: number): void

  setInputs(inputs: number[]): void
  storeOutputs(outputs: number[], storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}

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

export function runModel(core: ModelCore, inputs: number[], outputs: number[]) {
  // TODO
  const useOutputIndices = false

  // Initialize constants (including control variables)
  core.initConstants()

  // Get the control variable values
  const finalTime = core.getFinalTime()
  const initialTime = core.getInitialTime()
  const timeStep = core.getTimeStep()

  // Initialize time with the required `INITIAL TIME` control variable
  let time = initialTime
  core.setTime(time)

  // These values will be initialized after the first call to `evalAux` (see
  // note in main loop below)
  let saveStep: number
  let numSavePoints: number

  // Set the user-defined input values.  This needs to happen after `initConstants`
  // since the input values will override the default constant values.
  core.setInputs(inputs)

  // Initialize level variables
  core.initLevels()

  // Set up a run loop using a fixed number of time steps
  let savePointIndex = 0
  // let outputIndex = 0
  let outputVarIndex = 0
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  while (step <= lastStep) {
    // Evaluate aux variables
    core.evalAux()

    if (saveStep === undefined) {
      // Note that many Vensim models set `SAVEPER = TIME STEP`, in which case SDE
      // treats `SAVEPER` as an aux rather than a constant.  Therefore, we need to
      // initialize `numSavePoints` here, after the first `evalAux` call, to be
      // certain that `_saveper` has been initialized before it is used.
      saveStep = core.getSaveStep()
      numSavePoints = Math.round((finalTime - initialTime) / saveStep) + 1
    }

    if (time % saveStep < 1e-6) {
      outputVarIndex = 0
      if (useOutputIndices) {
        //         // Store the outputs as specified in the current output index buffer
        //         for (size_t i = 0; i < maxOutputIndices; i++) {
        //           size_t indexBufferOffset = i * INDICES_PER_OUTPUT;
        //           size_t varIndex = (size_t)outputIndexBuffer[indexBufferOffset];
        //           if (varIndex > 0) {
        //             size_t subIndex0 = (size_t)outputIndexBuffer[indexBufferOffset + 1];
        //             size_t subIndex1 = (size_t)outputIndexBuffer[indexBufferOffset + 2];
        //             size_t subIndex2 = (size_t)outputIndexBuffer[indexBufferOffset + 3];
        //             storeOutput(varIndex, subIndex0, subIndex1, subIndex2);
        //           } else {
        //             // Stop when we reach the first zero index
        //             break;
        //           }
        //         }
      } else {
        // Store the normal outputs
        core.storeOutputs(outputs, value => {
          // Write each value into the preallocated buffer; each variable has a "row" that
          // contains `numSavePoints` values, one value for each save point
          const outputBufferIndex = outputVarIndex * numSavePoints + savePointIndex
          outputs[outputBufferIndex] = value
          outputVarIndex++
        })
      }
      savePointIndex++
    }

    if (step == lastStep) {
      // This is the last step, so we are done
      break
    }

    // Propagate levels for the next time step
    core.evalLevels()

    // Advance time by one step
    time += timeStep
    core.setTime(time)
    step++
  }
}
