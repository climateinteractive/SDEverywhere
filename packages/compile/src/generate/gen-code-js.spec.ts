import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readXlsx, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'

import { parseInlineVensimModel } from '../_tests/test-support'
import { generateJS } from './gen-code-js'

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
    bundleListing?: boolean
    customLookups?: boolean | string[]
    customOutputs?: boolean | string[]
  }
): string {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const spec = {
    inputVarNames: opts?.inputVarNames,
    outputVarNames: opts?.outputVarNames,
    bundleListing: opts?.bundleListing,
    customLookups: opts?.customLookups,
    customOutputs: opts?.customOutputs
  }

  const directData = new Map()
  if (opts?.modelDir && opts?.directDataSpec) {
    for (const [file, xlsxFilename] of opts.directDataSpec.entries()) {
      const xlsxPath = path.join(opts.modelDir, xlsxFilename)
      directData.set(file, readXlsx(xlsxPath))
    }
  }

  const parsedModel = parseInlineVensimModel(mdlContent, opts?.modelDir)
  return generateJS(parsedModel, {
    spec,
    operations: ['generateJS'],
    extData: opts?.extData,
    directData,
    modelDirname: opts?.modelDir
  })
}

// Note: This should be kept in sync with the code that is generated
// by `generateJS` and also with the "real" `JsModel` interface that
// is exported by the runtime package.
interface JsModel {
  readonly kind: 'js'
  readonly outputVarIds: string[]
  readonly outputVarNames: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly modelListing?: any

  getInitialTime(): number
  getFinalTime(): number
  getTimeStep(): number
  getSaveFreq(): number

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModelFunctions(): /*JsModelFunctions*/ any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModelFunctions(functions: /*JsModelFunctions*/ any): void

  setTime(time: number): void
  setInputs(inputValue: (index: number) => number): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLookup(varSpec: /*VarSpec*/ any, lookup: /*Lookup*/ any): void

  storeOutputs(storeValue: (value: number) => void): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storeOutput(varSpec: /*VarSpec*/ any, storeValue: (value: number) => void): void

  initConstants(): void
  initLevels(): void
  evalAux(): void
  evalLevels(): void
}

async function initJsModel(generatedJsCode: string): Promise<JsModel> {
  const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(generatedJsCode)
  const module = await import(dataUri)
  return (await module.default()) as JsModel
}

// Note: This function roughly matches the "real" code in the runtime package
// that runs a generated JS model.  It is implemented here so that we can exercise
// the generated code in tests without pulling in the runtime package.
function runJsModel(model: JsModel, inputs: number[], outputs: number[]) {
  // TODO
  const useOutputIndices = false

  // Configure the functions (this can be an empty object for the purposes
  // of this test)
  model.setModelFunctions({})

  // Get the control variable values.  Once the first 4 control variables are known,
  // we can compute `numSavePoints` here.
  const initialTime = model.getInitialTime()
  const finalTime = model.getFinalTime()
  const timeStep = model.getTimeStep()
  const saveFreq = model.getSaveFreq()
  const numSavePoints = Math.round((finalTime - initialTime) / saveFreq) + 1

  // Initialize time with the required `INITIAL TIME` control variable
  let time = initialTime
  model.setTime(time)

  // Set the user-defined input values.  This needs to happen after `initConstants`
  // since the input values will override the default constant values.
  model.setInputs(index => inputs[index])

  // Initialize level variables
  model.initLevels()

  // Set up a run loop using a fixed number of time steps
  let savePointIndex = 0
  let outputVarIndex = 0
  const lastStep = Math.round((finalTime - initialTime) / timeStep)
  let step = 0
  while (step <= lastStep) {
    // Evaluate aux variables
    model.evalAux()

    if (time % saveFreq < 1e-6) {
      outputVarIndex = 0
      if (useOutputIndices) {
        throw new Error('Not yet implemented')
      } else {
        // Store the normal outputs
        model.storeOutputs(value => {
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
    model.evalLevels()

    // Advance time by one step
    time += timeStep
    model.setTime(time)
    step++
  }
}

describe('generateJS (Vensim -> JS)', () => {
  it('should generate code for a simple model', () => {
    const extData: ExtData = new Map()
    function addData(varId: string) {
      extData.set(
        varId,
        new Map([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      )
    }
    addData('_a_data[_a1]')
    addData('_a_data[_a2]')
    addData('_b_data[_a1,_b1]')
    addData('_b_data[_a1,_b2]')
    addData('_b_data[_a2,_b1]')
    addData('_b_data[_a2,_b2]')
    addData('_c_data')
    const mdl = `
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      input = 1 ~~|
      x = input ~~|
      y = :NOT: x ~~|
      z = ABS(y) ~~|
      a data[DimA] ~~|
      a[DimA] = a data[DimA] ~~|
      b data[DimA, DimB] ~~|
      b[DimA, DimB] = b data[DimA, DimB] ~~|
      c data ~~|
      c = c data ~~|
      d[DimA] = GAME(x) ~~|
      w = WITH LOOKUP(x, ( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) )) ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      extData,
      inputVarNames: ['input'],
      outputVarNames: ['x', 'y', 'z', 'a[A1]', 'b[A2,B1]', 'c', 'd[A1]', 'w'],
      bundleListing: true,
      customLookups: true,
      customOutputs: true
    })
    expect(code).toEqual(`\
// Model variables
let __lookup1;
let _a = multiDimArray([2]);
let _a_data = multiDimArray([2]);
let _b = multiDimArray([2, 2]);
let _b_data = multiDimArray([2, 2]);
let _c;
let _c_data;
let _d = multiDimArray([2]);
let _d_game_inputs = multiDimArray([2]);
let _final_time;
let _initial_time;
let _input;
let _saveper;
let _time_step;
let _w;
let _x;
let _y;
let _z;

// Array dimensions
const _dima = [0, 1];
const _dimb = [0, 1];

// Dimension mappings


// Lookup data arrays
const __lookup1_data_ = [0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3];
const _a_data_data__0_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _a_data_data__1_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _b_data_data__0__0_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _b_data_data__0__1_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _b_data_data__1__0_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _b_data_data__1__1_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];
const _c_data_data_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];

// Time variable
let _time;
/*export*/ function setTime(time) {
  _time = time;
}

// Control variables
let controlParamsInitialized = false;
function initControlParamsIfNeeded() {
  if (controlParamsInitialized) {
    return;
  }

  if (fns === undefined) {
    throw new Error('Must call setModelFunctions() before running the model');
  }

  // We currently require INITIAL TIME and TIME STEP to be defined
  // as constant values.  Some models may define SAVEPER in terms of
  // TIME STEP (or FINAL TIME in terms of INITIAL TIME), which means
  // that the compiler may treat them as an aux, not as a constant.
  // We call initConstants() to ensure that we have initial values
  // for these control parameters.
  initConstants();
  if (_initial_time === undefined) {
    throw new Error('INITIAL TIME must be defined as a constant value');
  }
  if (_time_step === undefined) {
    throw new Error('TIME STEP must be defined as a constant value');
  }

  if (_final_time === undefined || _saveper === undefined) {
    // If _final_time or _saveper is undefined after calling initConstants(),
    // it means one or both is defined as an aux, in which case we perform
    // an initial step of the run loop in order to initialize the value(s).
    // First, set the time and initial function context.
    setTime(_initial_time);
    fns.setContext({
      timeStep: _time_step,
      currentTime: _time
    });

    // Perform initial step to initialize _final_time and/or _saveper
    initLevels();
    evalAux();
    if (_final_time === undefined) {
      throw new Error('FINAL TIME must be defined');
    }
    if (_saveper === undefined) {
      throw new Error('SAVEPER must be defined');
    }
  }

  controlParamsInitialized = true;
}
/*export*/ function getInitialTime() {
  initControlParamsIfNeeded();
  return _initial_time;
}
/*export*/ function getFinalTime() {
  initControlParamsIfNeeded();
  return _final_time;
}
/*export*/ function getTimeStep() {
  initControlParamsIfNeeded();
  return _time_step;
}
/*export*/ function getSaveFreq() {
  initControlParamsIfNeeded();
  return _saveper;
}

// Model functions
let fns;
/*export*/ function getModelFunctions() {
  return fns;
}
/*export*/ function setModelFunctions(functions /*: JsModelFunctions*/) {
  fns = functions;
}

// Internal helper functions
function multiDimArray(dimLengths) {
  if (dimLengths.length > 0) {
    const len = dimLengths[0]
    const arr = new Array(len)
    for (let i = 0; i < len; i++) {
      arr[i] = multiDimArray(dimLengths.slice(1))
    }
    return arr
  } else {
    return 0
  }
}

// Internal constants
const _NA_ = -Number.MAX_VALUE;

// Internal state
let lookups_initialized = false;
let data_initialized = false;

function initLookups0() {
  __lookup1 = fns.createLookup(6, __lookup1_data_);
  for (let i = 0; i < 2; i++) {
  _d_game_inputs[i] = fns.createLookup(0, undefined);
  }
}

function initLookups() {
  // Initialize lookups
  if (!lookups_initialized) {
    initLookups0();
    lookups_initialized = true;
  }
}

function initData0() {
  _a_data[0] = fns.createLookup(3, _a_data_data__0_);
  _a_data[1] = fns.createLookup(3, _a_data_data__1_);
  _b_data[0][0] = fns.createLookup(3, _b_data_data__0__0_);
  _b_data[0][1] = fns.createLookup(3, _b_data_data__0__1_);
  _b_data[1][0] = fns.createLookup(3, _b_data_data__1__0_);
  _b_data[1][1] = fns.createLookup(3, _b_data_data__1__1_);
  _c_data = fns.createLookup(3, _c_data_data_);
}

function initData() {
  // Initialize data
  if (!data_initialized) {
    initData0();
    data_initialized = true;
  }
}

function initConstants0() {
  // FINAL TIME = 2
  _final_time = 2.0;
  // INITIAL TIME = 0
  _initial_time = 0.0;
  // SAVEPER = 1
  _saveper = 1.0;
  // TIME STEP = 1
  _time_step = 1.0;
  // input = 1
  _input = 1.0;
}

/*export*/ function initConstants() {
  // Initialize constants
  initConstants0();
  initLookups();
  initData();
}

/*export*/ function initLevels() {
  // Initialize variables with initialization values, such as levels, and the variables they depend on
}

function evalAux0() {
  // a[DimA] = a data[DimA]
  for (let i = 0; i < 2; i++) {
  _a[i] = fns.LOOKUP(_a_data[i], _time);
  }
  // b[DimA,DimB] = b data[DimA,DimB]
  for (let i = 0; i < 2; i++) {
  for (let j = 0; j < 2; j++) {
  _b[i][j] = fns.LOOKUP(_b_data[i][j], _time);
  }
  }
  // c = c data
  _c = fns.LOOKUP(_c_data, _time);
  // x = input
  _x = _input;
  // w = WITH LOOKUP(x,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))
  _w = fns.WITH_LOOKUP(_x, __lookup1);
  // d[DimA] = GAME(x)
  for (let i = 0; i < 2; i++) {
  _d[i] = fns.GAME(_d_game_inputs[i], _x);
  }
  // y = :NOT: x
  _y = !_x;
  // z = ABS(y)
  _z = fns.ABS(_y);
}

/*export*/ function evalAux() {
  // Evaluate auxiliaries in order from the bottom up
  evalAux0();
}

/*export*/ function evalLevels() {
  // Evaluate levels
}

/*export*/ function setInputs(valueAtIndex /*: (index: number) => number*/) {
  _input = valueAtIndex(0);
}

/*export*/ function setLookup(varSpec /*: VarSpec*/, points /*: Float64Array | undefined*/) {
  if (!varSpec) {
    throw new Error('Got undefined varSpec in setLookup');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  let lookup;
  switch (varIndex) {
    case 6:
      lookup = _d_game_inputs[subs[0]];
      break;
    case 7:
      lookup = _a_data[subs[0]];
      break;
    case 8:
      lookup = _b_data[subs[0]][subs[1]];
      break;
    case 9:
      lookup = _c_data;
      break;
    default:
      throw new Error(\`No lookup found for var index \${varIndex} in setLookup\`);
  }
  if (lookup) {
    const size = points ? points.length / 2 : 0;
    lookup.setData(size, points);
  }
}

/*export*/ const outputVarIds = [
  '_x',
  '_y',
  '_z',
  '_a[_a1]',
  '_b[_a2,_b1]',
  '_c',
  '_d[_a1]',
  '_w'
];

/*export*/ const outputVarNames = [
  'x',
  'y',
  'z',
  'a[A1]',
  'b[A2,B1]',
  'c',
  'd[A1]',
  'w'
];

/*export*/ function storeOutputs(storeValue /*: (value: number) => void*/) {
  storeValue(_x);
  storeValue(_y);
  storeValue(_z);
  storeValue(_a[0]);
  storeValue(_b[1][0]);
  storeValue(_c);
  storeValue(_d[0]);
  storeValue(_w);
}

/*export*/ function storeOutput(varSpec /*: VarSpec*/, storeValue /*: (value: number) => void*/) {
  if (!varSpec) {
    throw new Error('Got undefined varSpec in storeOutput');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  switch (varIndex) {
    case 1:
      storeValue(_final_time);
      break;
    case 2:
      storeValue(_initial_time);
      break;
    case 3:
      storeValue(_saveper);
      break;
    case 4:
      storeValue(_time_step);
      break;
    case 5:
      storeValue(_input);
      break;
    case 10:
      storeValue(_a[subs[0]]);
      break;
    case 11:
      storeValue(_b[subs[0]][subs[1]]);
      break;
    case 12:
      storeValue(_c);
      break;
    case 13:
      storeValue(_x);
      break;
    case 14:
      storeValue(_w);
      break;
    case 15:
      storeValue(_d[subs[0]]);
      break;
    case 16:
      storeValue(_y);
      break;
    case 17:
      storeValue(_z);
      break;
    default:
      throw new Error(\`No variable found for var index \${varIndex} in storeOutput\`);
  }
}

/*export*/ const modelListing = {
  dimensions: [
    {
      id: '_dima',
      subIds: [
        '_a1',
        '_a2'
      ]
    },
    {
      id: '_dimb',
      subIds: [
        '_b1',
        '_b2'
      ]
    }
  ],
  variables: [
    {
      id: '_final_time',
      index: 1
    },
    {
      id: '_initial_time',
      index: 2
    },
    {
      id: '_saveper',
      index: 3
    },
    {
      id: '_time_step',
      index: 4
    },
    {
      id: '_input',
      index: 5
    },
    {
      id: '_d_game_inputs',
      dimIds: [
        '_dima'
      ],
      index: 6
    },
    {
      id: '_a_data',
      dimIds: [
        '_dima'
      ],
      index: 7
    },
    {
      id: '_b_data',
      dimIds: [
        '_dima',
        '_dimb'
      ],
      index: 8
    },
    {
      id: '_c_data',
      index: 9
    },
    {
      id: '_a',
      dimIds: [
        '_dima'
      ],
      index: 10
    },
    {
      id: '_b',
      dimIds: [
        '_dima',
        '_dimb'
      ],
      index: 11
    },
    {
      id: '_c',
      index: 12
    },
    {
      id: '_x',
      index: 13
    },
    {
      id: '_w',
      index: 14
    },
    {
      id: '_d',
      dimIds: [
        '_dima'
      ],
      index: 15
    },
    {
      id: '_y',
      index: 16
    },
    {
      id: '_z',
      index: 17
    }
  ]
}

export default async function () {
  return {
    kind: 'js',
    outputVarIds,
    outputVarNames,
    modelListing,

    getInitialTime,
    getFinalTime,
    getTimeStep,
    getSaveFreq,

    getModelFunctions,
    setModelFunctions,

    setTime,
    setInputs,
    setLookup,

    storeOutputs,
    storeOutput,

    initConstants,
    initLevels,
    evalAux,
    evalLevels
  }
}
`)
  })

  it('should generate undefined modelListing when bundleListing is disabled', () => {
    const mdl = `
      x = 1 ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: [],
      outputVarNames: ['x'],
      bundleListing: false
    })
    expect(code).toMatch(`/*export*/ const modelListing = undefined;`)
  })

  it('should generate setLookup that throws error when customLookups is disabled', () => {
    const mdl = `
      x = 1 ~~|
      y = WITH LOOKUP(x, ( [(0,0)-(2,2)], (0,0),(2,1.3) )) ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: [],
      outputVarNames: ['x', 'y'],
      bundleListing: true
    })
    expect(code).toMatch(`\
/*export*/ function setLookup(varSpec /*: VarSpec*/, points /*: Float64Array | undefined*/) {
  throw new Error('The setLookup function was not enabled for the generated model. Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.');
}`)
  })

  it('should generate setLookup that includes a subset of cases when customLookups is an array', () => {
    const extData: ExtData = new Map()
    function addData(varId: string) {
      extData.set(
        varId,
        new Map([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      )
    }
    addData('_y_data[_a1]')
    addData('_y_data[_a2]')
    addData('_z_data')
    addData('_q_data')
    const mdl = `
      DimA: A1, A2 ~~|
      x = 1 ~~|
      y data[DimA] ~~|
      y[DimA] = y data[DimA] ~~|
      z data ~~|
      z = z data ~~|
      q data ~~|
      q = q data ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      extData,
      inputVarNames: [],
      outputVarNames: ['x', 'y[A1]', 'z', 'q'],
      customLookups: ['y data[A1]', 'q data']
    })
    expect(code).toMatch(`\
/*export*/ function setLookup(varSpec /*: VarSpec*/, points /*: Float64Array | undefined*/) {
  if (!varSpec) {
    throw new Error('Got undefined varSpec in setLookup');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  let lookup;
  switch (varIndex) {
    case 6:
      lookup = _q_data;
      break;
    case 7:
      lookup = _y_data[subs[0]];
      break;
    default:
      throw new Error(\`No lookup found for var index \${varIndex} in setLookup\`);
  }
  if (lookup) {
    const size = points ? points.length / 2 : 0;
    lookup.setData(size, points);
  }
}`)
  })

  it('should generate storeOutput that reports error when customOutputs is disabled', () => {
    const mdl = `
      x = 1 ~~|
      y = x ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: [],
      outputVarNames: ['y']
    })
    expect(code).toMatch(`\
/*export*/ function storeOutput(varSpec /*: VarSpec*/, storeValue /*: (value: number) => void*/) {
  throw new Error('The storeOutput function was not enabled for the generated model. Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.');
}`)
  })

  it('should generate storeOutput that includes a subset of cases when customOutputs is an array', () => {
    const mdl = `
      DimA: A1, A2 ~~|
      u[DimA] = 10, 20 ~~|
      v[DimA] = u[DimA] + 1 ~~|
      x = 1 ~~|
      y = x ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: [],
      outputVarNames: ['v[A1]', 'y'],
      customOutputs: ['u[A1]', 'x']
    })
    expect(code).toMatch(`\
/*export*/ function storeOutput(varSpec /*: VarSpec*/, storeValue /*: (value: number) => void*/) {
  if (!varSpec) {
    throw new Error('Got undefined varSpec in storeOutput');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  switch (varIndex) {
    case 5:
      storeValue(_u[subs[0]]);
      break;
    case 6:
      storeValue(_x);
      break;
    default:
      throw new Error(\`No variable found for var index \${varIndex} in storeOutput\`);
  }
}`)
  })

  it('should generate a model that can be run', async () => {
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
    const jsModel = await initJsModel(code)
    const inputs: number[] = []
    const outputs: number[] = Array(outputVarNames.length * numSavePoints)
    runJsModel(jsModel, inputs, outputs)
    expect(outputs).toEqual([
      // x values
      2000, 2001, 2002,
      // y values
      2001, 2002, 2003
    ])
  })

  it('should work when valid input variable name without subscript is provided in spec file', () => {
    const mdl = `
      x = 10 ~~|
      y = x + 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: ['x'],
      outputVarNames: ['y']
    })
    expect(code).toMatch(`\
// Model variables
let _x;
let _y;`)
  })

  it('should work when valid input variable name with subscript (referenced by output variable) is provided in spec file', () => {
    const mdl = `
      DimA: A1, A2 ~~|
      A[DimA] = 10, 20 ~~|
      B[DimA] = A[DimA] + 1 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: ['A[A1]'],
      outputVarNames: ['B[A1]', 'B[A2]']
    })
    expect(code).toMatch(`\
// Model variables
let _a = multiDimArray([2]);
let _b = multiDimArray([2]);`)
  })

  it('should work when valid input variable name with subscript (not referenced by output variable) is provided in spec file', () => {
    // Note that `A` is specified as an input variable, but `A` is not referenced by output
    // variable `B`, which is an unusual (but valid) usage scenario, so `A` should not be
    // pruned by the `removeUnusedVariables` code (see #438)
    const mdl = `
      DimA: A1, A2 ~~|
      A[DimA] = 10, 20 ~~|
      B[DimA] = 30, 40 ~~|
    `
    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: ['A[A1]'],
      outputVarNames: ['B[A1]', 'B[A2]']
    })
    expect(code).toMatch(`\
// Model variables
let _a = multiDimArray([2]);
let _b = multiDimArray([2]);`)
  })

  // Note that this test takes a while (> 8 seconds) to run, so is skipped by default
  // TODO: This test has little to do with code gen; we should move this and other similar
  // tests to a separate file focused on the `removeUnusedVariables` step
  it.skip('should work without exceeding stack limits when model has deep dependency tree', () => {
    const n = 50000
    let mdl = 'x0 = 1 ~~|\n'
    for (let i = 1; i <= n; i++) {
      mdl += `x${i} = x${i - 1} + 1 ~~|`
    }

    const code = readInlineModelAndGenerateJS(mdl, {
      inputVarNames: ['x0'],
      outputVarNames: [`x${n}`]
    })
    for (let i = 0; i <= n; i++) {
      expect(code).toContain(`let _x${i};`)
    }
  })

  it('should throw error when unknown input variable name is provided in spec file', () => {
    const mdl = `
      DimA: A1, A2 ~~|
      A[DimA] = 10, 20 ~~|
      B = 30 ~~|
    `
    expect(() =>
      readInlineModelAndGenerateJS(mdl, {
        inputVarNames: ['C'],
        outputVarNames: ['A[A1]']
      })
    ).toThrow(
      'The input variable _c was declared in spec.json, but no matching variable was found in the model or external data sources'
    )
  })

  it('should throw error when cyclic dependency is detected for aux variable', () => {
    const mdl = `
      X = Y ~~|
      Y = X + 1 ~~|
    `
    expect(() => readInlineModelAndGenerateJS(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x →\n_y')
  })

  it('should throw error when cyclic dependency is detected for init variable', () => {
    const mdl = `
      X = INITIAL(Y) ~~|
      Y = X + 1 ~~|
    `
    expect(() => readInlineModelAndGenerateJS(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x →\n_y')
  })
})
