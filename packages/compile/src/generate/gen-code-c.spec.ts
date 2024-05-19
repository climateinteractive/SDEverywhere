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
    const extData: ExtData = new Map([
      [
        '_v_data',
        new Map([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      ]
    ])
    const mdl = `
      input = 1 ~~|
      x = input ~~|
      y = :NOT: x ~~|
      z = ABS(y) ~~|
      v data ~~|
      v = v data ~~|
      w = WITH LOOKUP(x, ( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) )) ~~|
      INITIAL TIME = 0 ~~|
      FINAL TIME = 2 ~~|
      TIME STEP = 1 ~~|
      SAVEPER = 1 ~~|
    `
    const code = readInlineModelAndGenerateC(mdl, {
      inputVarNames: ['input'],
      outputVarNames: ['x', 'y', 'z', 'v', 'w'],
      extData
    })
    console.log(code)
    expect(code).toEqual(`\
#include "sde.h"

// Model variables
Lookup* __lookup1;
Lookup* _v_data;
double _final_time;
double _initial_time;
double _input;
double _saveper;
double _time_step;
double _v;
double _w;
double _x;
double _y;
double _z;

// Internal variables
const int numOutputs = 5;
#define SDE_USE_OUTPUT_INDICES 0
#define SDE_MAX_OUTPUT_INDICES 1000
const int maxOutputIndices = SDE_USE_OUTPUT_INDICES ? SDE_MAX_OUTPUT_INDICES : 0;

// Array dimensions


// Dimension mappings


// Lookup data arrays
double __lookup1_data_[12] = { 0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3 };
double _v_data_data_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };

// Internal state
bool lookups_initialized = false;
bool data_initialized = false;

void initLookups0() {
  __lookup1 = __new_lookup(6, /*copy=*/false, __lookup1_data_);
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
  _v_data = __new_lookup(3, /*copy=*/false, _v_data_data_);
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
  // v = v data
  _v = _LOOKUP(_v_data, _time);
  // x = input
  _x = _input;
  // w = WITH LOOKUP(x,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))
  _w = _WITH_LOOKUP(_x, __lookup1);
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

const char* getHeader() {
  return "x\\ty\\tz\\tv\\tw";
}

void storeOutputData() {
  outputVar(_x);
  outputVar(_y);
  outputVar(_z);
  outputVar(_v);
  outputVar(_w);
}

void storeOutput(size_t varIndex, size_t subIndex0, size_t subIndex1, size_t subIndex2) {
#if SDE_USE_OUTPUT_INDICES
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
    case 7:
      outputVar(_v);
      break;
    case 8:
      outputVar(_x);
      break;
    case 9:
      outputVar(_w);
      break;
    case 10:
      outputVar(_y);
      break;
    case 11:
      outputVar(_z);
      break;
    default:
      break;
  }
#endif
}
`)
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
    expect(() => readInlineModelAndGenerateC(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x\n_y')
  })

  it('should throw error when cyclic dependency is detected for init variable', () => {
    const mdl = `
      X = INITIAL(Y) ~~|
      Y = X + 1 ~~|
    `
    expect(() => readInlineModelAndGenerateC(mdl)).toThrow('Found cyclic dependency during toposort:\n_y →\n_x\n_y')
  })
})
