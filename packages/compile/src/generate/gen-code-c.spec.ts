import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readXlsx, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'

import { parseInlineVensimModel } from '../_tests/test-support'
import { generateC } from './gen-code-c'

type ExtData = Map<string, Map<number, number>>
type DirectDataSpec = Map<string, string>

function readInlineModelAndGenerateC(
  mdlContent: string,
  opts?: {
    modelDir?: string
    extData?: ExtData
    directDataSpec?: DirectDataSpec
    inputVarNames?: string[]
    outputVarNames?: string[]
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
  return generateC(parsedModel, {
    spec,
    operations: ['generateC'],
    extData: opts?.extData,
    directData,
    modelDirname: opts?.modelDir
  })
}

describe('generateC (Vensim -> C)', () => {
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
    const code = readInlineModelAndGenerateC(mdl, {
      extData,
      inputVarNames: ['input'],
      outputVarNames: ['x', 'y', 'z', 'a[A1]', 'b[A2,B1]', 'c', 'd[A1]', 'w'],
      customLookups: true,
      customOutputs: true
    })
    expect(code).toEqual(`\
#include "sde.h"

// Model variables
Lookup* __lookup1;
Lookup* _a_data[2];
Lookup* _b_data[2][2];
Lookup* _c_data;
Lookup* _d_game_inputs[2];
double _a[2];
double _b[2][2];
double _c;
double _d[2];
double _final_time;
double _initial_time;
double _input;
double _saveper;
double _time_step;
double _w;
double _x;
double _y;
double _z;

// Internal variables
const int numOutputs = 8;

// Array dimensions
const size_t _dima[2] = { 0, 1 };
const size_t _dimb[2] = { 0, 1 };

// Dimension mappings


// Lookup data arrays
double __lookup1_data_[12] = { 0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3 };
double _a_data_data__0_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _a_data_data__1_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _b_data_data__0__0_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _b_data_data__0__1_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _b_data_data__1__0_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _b_data_data__1__1_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };
double _c_data_data_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };

// Internal state
bool lookups_initialized = false;
bool data_initialized = false;

void initLookups0() {
  __lookup1 = __new_lookup(6, /*copy=*/false, __lookup1_data_);
  for (size_t i = 0; i < 2; i++) {
  _d_game_inputs[i] = __new_lookup(0, /*copy=*/false, NULL);
  }
}

void initLookups() {
  // Initialize lookups.
  if (lookups_initialized) {
    return;
  }
  initLookups0();
  lookups_initialized = true;
}

void initData0() {
  _a_data[0] = __new_lookup(3, /*copy=*/false, _a_data_data__0_);
  _a_data[1] = __new_lookup(3, /*copy=*/false, _a_data_data__1_);
  _b_data[0][0] = __new_lookup(3, /*copy=*/false, _b_data_data__0__0_);
  _b_data[0][1] = __new_lookup(3, /*copy=*/false, _b_data_data__0__1_);
  _b_data[1][0] = __new_lookup(3, /*copy=*/false, _b_data_data__1__0_);
  _b_data[1][1] = __new_lookup(3, /*copy=*/false, _b_data_data__1__1_);
  _c_data = __new_lookup(3, /*copy=*/false, _c_data_data_);
}

void initData() {
  // Initialize data.
  if (data_initialized) {
    return;
  }
  initData0();
  data_initialized = true;
}

void initConstants0() {
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

void initConstants() {
  // Initialize constants.
  initConstants0();
  initLookups();
  initData();
}

void initLevels() {
  // Initialize variables with initialization values, such as levels, and the variables they depend on.
  _time = _initial_time;
}

void evalAux0() {
  // a[DimA] = a data[DimA]
  for (size_t i = 0; i < 2; i++) {
  _a[i] = _LOOKUP(_a_data[i], _time);
  }
  // b[DimA,DimB] = b data[DimA,DimB]
  for (size_t i = 0; i < 2; i++) {
  for (size_t j = 0; j < 2; j++) {
  _b[i][j] = _LOOKUP(_b_data[i][j], _time);
  }
  }
  // c = c data
  _c = _LOOKUP(_c_data, _time);
  // x = input
  _x = _input;
  // w = WITH LOOKUP(x,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))
  _w = _WITH_LOOKUP(_x, __lookup1);
  // d[DimA] = GAME(x)
  for (size_t i = 0; i < 2; i++) {
  _d[i] = _GAME(_d_game_inputs[i], _x);
  }
  // y = :NOT: x
  _y = !_x;
  // z = ABS(y)
  _z = _ABS(_y);
}

void evalAux() {
  // Evaluate auxiliaries in order from the bottom up.
  evalAux0();
}

void evalLevels() {
  // Evaluate levels.
}

void setInputs(const char* inputData) {
  static double* inputVarPtrs[] = {
    &_input,
  };
  char* inputs = (char*)inputData;
  char* token = strtok(inputs, " ");
  while (token) {
    char* p = strchr(token, ':');
    if (p) {
      *p = '\\0';
      int modelVarIndex = atoi(token);
      double value = atof(p+1);
      *inputVarPtrs[modelVarIndex] = value;
    }
    token = strtok(NULL, " ");
  }
}

void setInputsFromBuffer(double* inputData) {
  _input = inputData[0];
}

void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints) {
  Lookup** pLookup = NULL;
  switch (varIndex) {
    case 6:
      pLookup = &_d_game_inputs[subIndices[0]];
      break;
    case 7:
      pLookup = &_a_data[subIndices[0]];
      break;
    case 8:
      pLookup = &_b_data[subIndices[0]][subIndices[1]];
      break;
    case 9:
      pLookup = &_c_data;
      break;
    default:
      fprintf(stderr, "No lookup found for var index %zu in setLookup\\n", varIndex);
      break;
  }
  if (pLookup != NULL) {
    if (*pLookup == NULL) {
      *pLookup = __new_lookup(numPoints, /*copy=*/true, points);
    } else {
      __set_lookup(*pLookup, numPoints, points);
    }
  }
}

const char* getHeader() {
  return "x\\ty\\tz\\ta[A1]\\tb[A2,B1]\\tc\\td[A1]\\tw";
}

void storeOutputData() {
  outputVar(_x);
  outputVar(_y);
  outputVar(_z);
  outputVar(_a[0]);
  outputVar(_b[1][0]);
  outputVar(_c);
  outputVar(_d[0]);
  outputVar(_w);
}

void storeOutput(size_t varIndex, size_t* subIndices) {
  switch (varIndex) {
    case 1:
      outputVar(_final_time);
      break;
    case 2:
      outputVar(_initial_time);
      break;
    case 3:
      outputVar(_saveper);
      break;
    case 4:
      outputVar(_time_step);
      break;
    case 5:
      outputVar(_input);
      break;
    case 10:
      outputVar(_a[subIndices[0]]);
      break;
    case 11:
      outputVar(_b[subIndices[0]][subIndices[1]]);
      break;
    case 12:
      outputVar(_c);
      break;
    case 13:
      outputVar(_x);
      break;
    case 14:
      outputVar(_w);
      break;
    case 15:
      outputVar(_d[subIndices[0]]);
      break;
    case 16:
      outputVar(_y);
      break;
    case 17:
      outputVar(_z);
      break;
    default:
      fprintf(stderr, "No variable found for var index %zu in storeOutput\\n", varIndex);
      break;
  }
}
`)
  })

  it('should generate setLookup that reports error when customLookups is disabled', () => {
    const mdl = `
      x = 1 ~~|
      y = WITH LOOKUP(x, ( [(0,0)-(2,2)], (0,0),(2,1.3) )) ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: [],
      outputVarNames: ['x', 'y']
    })
    expect(code).toMatch(`\
void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints) {
  fprintf(stderr, "The setLookup function was not enabled for the generated model. Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.\\n");
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
    const code = readInlineModelAndGenerateC(mdl, {
      extData,
      inputVarNames: [],
      outputVarNames: ['x', 'y[A1]', 'z', 'q'],
      customLookups: ['y data[A1]', 'q data']
    })
    expect(code).toMatch(`\
void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints) {
  Lookup** pLookup = NULL;
  switch (varIndex) {
    case 6:
      pLookup = &_q_data;
      break;
    case 7:
      pLookup = &_y_data[subIndices[0]];
      break;
    default:
      fprintf(stderr, "No lookup found for var index %zu in setLookup\\n", varIndex);
      break;
  }
  if (pLookup != NULL) {
    if (*pLookup == NULL) {
      *pLookup = __new_lookup(numPoints, /*copy=*/true, points);
    } else {
      __set_lookup(*pLookup, numPoints, points);
    }
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
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: [],
      outputVarNames: ['y']
    })
    expect(code).toMatch(`\
void storeOutput(size_t varIndex, size_t* subIndices) {
  fprintf(stderr, "The storeOutput function was not enabled for the generated model. Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.\\n");
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
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: [],
      outputVarNames: ['v[A1]', 'y'],
      customOutputs: ['u[A1]', 'x']
    })
    expect(code).toMatch(`\
void storeOutput(size_t varIndex, size_t* subIndices) {
  switch (varIndex) {
    case 5:
      outputVar(_u[subIndices[0]]);
      break;
    case 6:
      outputVar(_x);
      break;
    default:
      fprintf(stderr, "No variable found for var index %zu in storeOutput\\n", varIndex);
      break;
  }
}`)
  })

  it('should work when valid input variable name without subscript is provided in spec file', () => {
    const mdl = `
      x = 10 ~~|
      y = x + 1 ~~|
    `
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: ['x'],
      outputVarNames: ['y']
    })
    expect(code).toMatch(`\
#include "sde.h"

// Model variables
double _x;
double _y;`)
  })

  it('should work when valid input variable name with subscript (referenced by output variable) is provided in spec file', () => {
    const mdl = `
      DimA: A1, A2 ~~|
      A[DimA] = 10, 20 ~~|
      B[DimA] = A[DimA] + 1 ~~|
    `
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: ['A[A1]'],
      outputVarNames: ['B[A1]', 'B[A2]']
    })
    expect(code).toMatch(`\
#include "sde.h"

// Model variables
double _a[2];
double _b[2];`)
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
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: ['A[A1]'],
      outputVarNames: ['B[A1]', 'B[A2]']
    })
    expect(code).toMatch(`\
#include "sde.h"

// Model variables
double _a[2];
double _b[2];`)
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

    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: ['x0'],
      outputVarNames: [`x${n}`]
    })
    for (let i = 0; i <= n; i++) {
      expect(code).toContain(`double _x${i};`)
    }
  })

  it('should throw error when unknown input variable name is provided in spec file', () => {
    const mdl = `
      DimA: A1, A2 ~~|
      A[DimA] = 10, 20 ~~|
      B = 30 ~~|
    `
    expect(() =>
      readInlineModelAndGenerateC(mdl, {
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
    expect(() => readInlineModelAndGenerateC(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x →\n_y')
  })

  it('should throw error when cyclic dependency is detected for init variable', () => {
    const mdl = `
      X = INITIAL(Y) ~~|
      Y = X + 1 ~~|
    `
    expect(() => readInlineModelAndGenerateC(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x →\n_y')
  })
})
