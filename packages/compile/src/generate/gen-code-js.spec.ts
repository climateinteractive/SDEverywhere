import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readXlsx, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'

import { parseInlineVensimModel } from '../_tests/test-support'
import { generateCode } from './gen-code-js'

type ExtData = Map<string, Map<number, number>>
type DirectDataSpec = Map<string, string>

function readInlineModelAndGenerateJS(
  mdlContent: string,
  opts?: {
    modelDir?: string
    extData?: ExtData
    directDataSpec?: DirectDataSpec
    inputVarNames?: string[]
    outputVarNames?: string[]
  }
): string {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  let spec
  if (opts?.inputVarNames || opts?.outputVarNames) {
    spec = {
      inputVarNames: opts?.inputVarNames || [],
      outputVarNames: opts?.outputVarNames || []
    }
  } else {
    spec = {}
  }

  const directData = new Map()
  if (opts?.modelDir && opts?.directDataSpec) {
    for (const [file, xlsxFilename] of opts.directDataSpec.entries()) {
      const xlsxPath = path.join(opts.modelDir, xlsxFilename)
      directData.set(file, readXlsx(xlsxPath))
    }
  }

  const parsedModel = parseInlineVensimModel(mdlContent, opts?.modelDir)
  return generateCode(parsedModel, {
    spec,
    operations: ['generateJS'],
    extData: opts?.extData,
    directData,
    modelDirname: opts?.modelDir
  })
}

interface ModelCore {
  outputVarIds: string[]

  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveFreq(): number

  setModelFunctions(functions: /*CoreFunctions*/ any): void
  setTime(time: number): void

  setInputs(inputValue: (index: number) => number): void
  storeOutputs(storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}

async function createModelCore(modelJs: string): Promise<ModelCore> {
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(modelJs)
  const module = await import(dataUri)
  // console.log(module)
  return module as ModelCore
}

function runModel(core: ModelCore, inputs: number[], outputs: number[]) {
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
  let saveFreq: number
  let numSavePoints: number

  // Set the user-defined input values.  This needs to happen after `initConstants`
  // since the input values will override the default constant values.
  core.setInputs(index => inputs[index])

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

    if (saveFreq === undefined) {
      // Note that many Vensim models set `SAVEPER = TIME STEP`, in which case SDE
      // treats `SAVEPER` as an aux rather than a constant.  Therefore, we need to
      // initialize `numSavePoints` here, after the first `evalAux` call, to be
      // certain that `_saveper` has been initialized before it is used.
      saveFreq = core.getSaveFreq()
      numSavePoints = Math.round((finalTime - initialTime) / saveFreq) + 1
    }

    if (time % saveFreq < 1e-6) {
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
        core.storeOutputs(value => {
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

describe('generateCode (Vensim -> JS)', () => {
  it.only('should work for simple model', () => {
    const mdl = `
      input = 1 ~~|
      x = input ~~|
      y = :NOT: x ~~|
      z = ABS(y) ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: ['input'],
      outputVarNames: ['x', 'y', 'z']
    })
    // console.log(code)
    expect(code).toEqual(`\
// Model variables
let _input;
let _x;
let _y;
let _z;

// Output variable identifiers
export const outputVarIds = [
  '_x',
  '_y',
  '_z'
]

// Array dimensions


// Dimension mappings


// Lookup data arrays



// Time variable
let _time;
export function setTime(time) {
  _time = time;
}

// Control variables
let controlParamsInitialized = false;
function initControlParamsIfNeeded() {
  if (controlParamsInitialized) {
    return;
  }

  // Some models may define the control parameters as variables that are
  // dependent on other values that are only known at runtime (after running
  // the initializers and/or one step of the model), so we need to perform
  // those steps once before the parameters are accessed
  // TODO: This approach doesn't work if one or more control parameters are
  // defined in terms of some value that is provided at runtime as an input
  initConstants();
  initLevels();
  _time = _initial_time;
  evalAux();
  controlParamsInitialized = true;
}
export function getInitialTime() {
  initControlParamsIfNeeded();
  return _initial_time;
}
export function getFinalTime() {
  initControlParamsIfNeeded();
  return _final_time;
}
export function getTimeStep() {
  initControlParamsIfNeeded();
  return _time_step;
}
export function getSaveFreq() {
  initControlParamsIfNeeded();
  return _saveper;
}

// Model functions
let fns;
export function setModelFunctions(functions /*: CoreFunctions*/) {
  fns = functions
}

// Internal state
let lookups_initialized = false;
let data_initialized = false;



function initLookups() {
  // Initialize lookups.
  if (!lookups_initialized) {


      lookups_initialized = true;
  }

}
    


function initData() {
  // Initialize data.
  if (!data_initialized) {


      data_initialized = true;
  }

}
    


function initConstants0() {
    // input = 1
  _input = 1.0;
}


export function initConstants() {
  // Initialize constants.
  initConstants0();
  initLookups();
  initData();
}
    




export function initLevels() {

  // Initialize variables with initialization values, such as levels, and the variables they depend on.


}
    



function evalAux0() {
    // x = input
  _x = _input;
  // y = :NOT: x
  _y = !_x;
  // z = ABS(y)
  _z = fns.ABS(_y);
}


export function evalAux() {
  // Evaluate auxiliaries in order from the bottom up.
  evalAux0();

}
    




export function evalLevels() {
  // Evaluate levels.


}
    

export function setInputs(valueAtIndex /*: (index: number) => number*/) {
  _input = valueAtIndex(0);
}

function getHeader() {
  return "x\\ty\\tz";
}

export function storeOutputs(storeValue /*: (value: number) => void*/) {
  storeValue(_x);
  storeValue(_y);
  storeValue(_z);
}

export function storeOutput(varIndex, subIndex0, subIndex1, subIndex2, storeValue /*: (value: number) => void*/) {
  switch (varIndex) {
    case 1:
      storeValue(_input);
      break;
    case 2:
      storeValue(_x);
      break;
    case 3:
      storeValue(_y);
      break;
    case 4:
      storeValue(_z);
      break;
    default:
      break;
  }
}
`)
  })

  it.skip('test', async () => {
    // const code = 'export default function hello() { console.log("Hello World"); }'
    const code = `export function hello() { console.log("Hello World"); return 'hi' }`
    // const objectURL = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
    // const module = await import(objectURL)
    // console.log(module)
    // const myHello = module.default
    // myHello()

    const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(code)
    const module = await import(dataUri)
    // console.log(module)
    const foo = module.hello()
    expect(foo).toBe('hi')
  })

  it.only('should run model', async () => {
    // TODO: Change this test to call each exported function

    const initialTime = 2000
    const finalTime = 2002
    const numSavePoints = finalTime - initialTime + 1
    const mdl = `
      x = TIME ~~|
      y = x + 1 ~~|
      INITIAL TIME = ${initialTime} ~~|
      FINAL TIME = ${finalTime} ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const outputVarNames = ['x', 'y']
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: [],
      outputVarNames
    })
    // console.log(code)
    const core = await createModelCore(code)
    // console.log(core)
    const inputs: number[] = []
    const outputs: number[] = Array(outputVarNames.length * numSavePoints)
    runModel(core, inputs, outputs)
    expect(outputs).toEqual([
      // x values
      2000, 2001, 2002,
      // y values
      2001, 2002, 2003
    ])
  })

  // it('should throw error when unknown input variable name is provided in spec file', () => {
  //   const mdl = `
  //     DimA: A1, A2 ~~|
  //     A[DimA] = 10, 20 ~~|
  //     B = 30 ~~|
  //   `
  //   expect(() =>
  //     readInlineModelAndGenerateJS(mdl, {
  //       inputVarNames: ['C'],
  //       outputVarNames: ['A[A1]']
  //     })
  //   ).toThrow(
  //     'The input variable _c was declared in spec.json, but no matching variable was found in the model or external data sources'
  //   )
  // })

  // it('should throw error when cyclic dependency is detected for aux variable', () => {
  //   const mdl = `
  //     X = Y ~~|
  //     Y = X + 1 ~~|
  //   `
  //   expect(() => readInlineModelAndGenerateJS(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x\n_y')
  // })

  // it('should throw error when cyclic dependency is detected for init variable', () => {
  //   const mdl = `
  //     X = INITIAL(Y) ~~|
  //     Y = X + 1 ~~|
  //   `
  //   expect(() => readInlineModelAndGenerateJS(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x\n_y')
  // })
})
