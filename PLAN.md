# Implementation Plan: Override Constants Feature

## Overview

Implement the "override constants" feature to allow users to modify any constant variable at runtime, similar to the "override lookups" feature but simpler. Constants are scalar values that get reset on every `runModel` call by `initConstants()`, so overrides must be provided each time (unlike lookups which persist).

## Key Design Decisions

1. **No explicit reset support**: `ConstantDef.value` is required (not optional). Constants automatically reset to original values if not provided in options, since `initConstants()` is called at the start of every run.

2. **No persistence**: Unlike lookups, constant overrides do NOT persist across `runModel` calls. Users must provide them in options each time they want to override.

3. **Simple scalar values**: Constants are plain numbers, not arrays or lookup objects, making the implementation simpler than lookups.

## Implementation Steps

### 1. Create ConstantDef Interface ✅

**New file**: `packages/runtime/src/_shared/constant-def.ts`

```typescript
// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { VarRef } from './types'

/**
 * Specifies the constant value that will be used to override a constant variable.
 */
export interface ConstantDef {
  /** The reference that identifies the constant variable to be modified. */
  varRef: VarRef

  /** The new constant value. */
  value: number
}

/**
 * Create a `ConstantDef` instance.
 *
 * @param varRef The reference to the constant variable to be modified.
 * @param value The new constant value.
 */
export function createConstantDef(varRef: VarRef, value: number): ConstantDef {
  return {
    varRef,
    value
  }
}
```

**Update**: `packages/runtime/src/_shared/index.ts` - add export:
```typescript
export * from './constant-def'
```

### 2. Update RunModelOptions

**File**: `packages/runtime/src/runnable-model/run-model-options.ts`

Add `constants` field:
```typescript
import type { ConstantDef, LookupDef } from '../_shared'

export interface RunModelOptions {
  lookups?: LookupDef[]

  /**
   * If defined, override the values for the specified constant variables.
   *
   * Note that UNLIKE lookups (which persist across calls), constant overrides do
   * NOT persist after the `runModel` call. Because `initConstants` is called at
   * the beginning of each `runModel` call, all constants are reset to their default
   * values. If you want to override constants, you must provide them in the options
   * for each `runModel` call. To reset constants to their original values, simply
   * stop passing them in the options (or pass an empty array).
   */
  constants?: ConstantDef[]
}
```

### 3. Add Configuration Option

**File**: `packages/build/src/_shared/model-spec.ts`

Add to `ModelSpec` interface (after `customLookups`):
```typescript
/**
 * Whether to allow constants to be overridden at runtime using `setConstant`.
 *
 * If undefined or false, the generated model will implement `setConstant`
 * as a no-op, meaning that constants cannot be overridden at runtime.
 *
 * If true, all constants in the generated model will be available to be
 * overridden.
 *
 * If an array is provided, only those variable names in the array will
 * be available to be overridden.
 */
customConstants?: boolean | VarName[]
```

Add to `ResolvedModelSpec` interface:
```typescript
/**
 * Whether to allow constants to be overridden at runtime using `setConstant`.
 */
customConstants: boolean | VarName[]
```

### 4. Generate setConstant Function - JavaScript

**File**: `packages/compile/src/generate/gen-code-js.js`

Add `setConstantImpl` function (after `setLookupImpl`, around line 560):
```javascript
function setConstantImpl(varIndexInfo, customConstants) {
  // Emit case statements for all const variables that can be overridden at runtime
  let overrideAllowed
  if (Array.isArray(customConstants)) {
    const customConstantVarNames = customConstants.map(varName => {
      return canonicalVensimName(varName.split('[')[0])
    })
    overrideAllowed = varName => customConstantVarNames.includes(varName)
  } else {
    // Include a case statement for all constant variables
    overrideAllowed = () => true
  }
  const constVars = R.filter(info => {
    return info.varType === 'const' && overrideAllowed(info.varName)
  })
  const code = R.map(info => {
    let constVar = info.varName
    for (let i = 0; i < info.subscriptCount; i++) {
      constVar += `[subs[${i}]]`
    }
    let c = ''
    c += `    case ${info.varIndex}:\n`
    c += `      ${constVar} = value;\n`
    c += `      break;`
    return c
  })
  const section = R.pipe(constVars, code, lines)
  return section(varIndexInfo)
}
```

Add `setConstant` function generation in `emitIOCode()` (after `setLookup`, around line 750):
```javascript
// Generate the setConstant function
let setConstantBody
if (spec.customConstants === true || Array.isArray(spec.customConstants)) {
  setConstantBody = `\
  if (!varSpec) {
    throw new Error('Got undefined varSpec in setConstant');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  switch (varIndex) {
${setConstantImpl(Model.varIndexInfo(), spec.customConstants)}
    default:
      throw new Error(\`No constant found for var index \${varIndex} in setConstant\`);
  }`
} else {
  let msg = 'The setConstant function was not enabled for the generated model. '
  msg += 'Set the customConstants property in the spec/config file to allow for overriding constants at runtime.'
  setConstantBody = `  throw new Error('${msg}');`
}

io += `
/*export*/ function setConstant(varSpec /*: VarSpec*/, value /*: number*/) {
${setConstantBody}
}
`
```

### 5. Generate setConstant Function - C

**File**: `packages/compile/src/generate/gen-code-c.js`

Add `setConstantImpl` function (similar pattern as JS):
```javascript
function setConstantImpl(varIndexInfo, customConstants) {
  let overrideAllowed
  if (Array.isArray(customConstants)) {
    const customConstantVarNames = customConstants.map(varName => {
      return canonicalVensimName(varName.split('[')[0])
    })
    overrideAllowed = varName => customConstantVarNames.includes(varName)
  } else {
    overrideAllowed = () => true
  }
  const constVars = R.filter(info => {
    return info.varType === 'const' && overrideAllowed(info.varName)
  })
  const code = R.map(info => {
    let constVar = info.varName
    for (let i = 0; i < info.subscriptCount; i++) {
      constVar += `[subIndices[${i}]]`
    }
    let c = ''
    c += `    case ${info.varIndex}:\n`
    c += `      ${constVar} = value;\n`
    c += `      break;`
    return c
  })
  const section = R.pipe(constVars, code, lines)
  return section(varIndexInfo)
}
```

Add `setConstant` function generation in `emitIOCode()`:
```c
void setConstant(size_t varIndex, size_t* subIndices, double value) {
  switch (varIndex) {
    ${setConstantBody}
    default:
      break;
  }
}
```

### 6. Update JS Model Runtime

**File**: `packages/runtime/src/js-model/js-model.ts`

Add to `JsModel` interface (around line 53):
```typescript
/** @hidden */
setConstant(varSpec: VarSpec, value: number): void
```

Update `runJsModel` function signature (around line 121):
```typescript
function runJsModel(
  model: JsModel,
  // ... other params ...
  lookups: LookupDef[] | undefined,
  constants: ConstantDef[] | undefined,  // NEW
  stopAfterTime: number | undefined
): void
```

Add constant override logic after lookup overrides (after line 150):
```typescript
// Apply constant overrides, if provided
if (constants !== undefined) {
  for (const constantDef of constants) {
    model.setConstant(constantDef.varRef.varSpec, constantDef.value)
  }
}
```

Update call in `initJsModel` (around line 111):
```typescript
onRunModel: (inputs, outputs, options) => {
  runJsModel(
    model,
    // ... other params ...
    options?.lookups,
    options?.constants,  // NEW
    undefined
  )
}
```

### 7. Update Wasm Model Runtime

**File**: `packages/runtime/src/wasm-model/wasm-model.ts`

Add native function wrapper (around line 67):
```typescript
private readonly wasmSetConstant: (
  varIndex: number,
  subIndicesAddress: number,
  value: number
) => void
```

Initialize in constructor:
```typescript
this.wasmSetConstant = wasmModule.cwrap('setConstant', null, ['number', 'number', 'number'])
```

Add constant override logic in `runModel` after lookup overrides (around line 130):
```typescript
// Apply constant overrides, if provided
const constants = params.getConstants()
if (constants !== undefined) {
  for (const constantDef of constants) {
    const varSpec = constantDef.varRef.varSpec
    const numSubElements = varSpec.subscriptIndices?.length || 0
    let subIndicesAddress: number

    if (numSubElements > 0) {
      // Reuse the lookup sub indices buffer
      if (this.lookupSubIndicesBuffer === undefined ||
          this.lookupSubIndicesBuffer.numElements < numSubElements) {
        this.lookupSubIndicesBuffer?.dispose()
        this.lookupSubIndicesBuffer = createInt32WasmBuffer(this.wasmModule, numSubElements)
      }
      this.lookupSubIndicesBuffer.getArrayView().set(varSpec.subscriptIndices)
      subIndicesAddress = this.lookupSubIndicesBuffer.getAddress()
    } else {
      subIndicesAddress = 0
    }

    this.wasmSetConstant(varSpec.varIndex, subIndicesAddress, constantDef.value)
  }
}
```

### 8. Update RunModelParams Interface

**File**: `packages/runtime/src/runnable-model/run-model-params.ts`

Add method:
```typescript
/**
 * Return an array containing constant overrides, or undefined if no constants
 * were passed to the latest `runModel` call.
 */
getConstants(): ConstantDef[] | undefined
```

### 9. Update BaseRunnableModel

**File**: `packages/runtime/src/runnable-model/base-runnable-model.ts`

Update `OnRunModelFunc` type (line 12):
```typescript
export type OnRunModelFunc = (
  inputs: Float64Array | undefined,
  outputs: Float64Array,
  options?: {
    outputIndices?: Int32Array
    lookups?: LookupDef[]
    constants?: ConstantDef[]  // NEW
  }
) => void
```

Update `runModel` call (line 98):
```typescript
this.onRunModel?.(inputsArray, outputsArray, {
  outputIndices: outputIndicesArray,
  lookups: params.getLookups(),
  constants: params.getConstants()  // NEW
})
```

### 10. Create Integration Test

**New directory**: `tests/integration/override-constants/`

Create 4 files:

1. **override-constants.mdl** - Vensim model with 1D, 2D, and non-subscripted constants
2. **sde.config.js** - Config with `customConstants: true`
3. **run-tests.js** - Test script that:
   - Tests default constant values
   - Tests overriding constants (by name and by ID)
   - Tests that overrides do NOT persist (must be provided each call)
   - Tests subscripted constants (1D and 2D arrays)
   - Tests both synchronous and asynchronous model runners
4. **package.json** - Package file with test script

### 11. Add Unit Tests

**File**: `packages/compile/src/generate/gen-code-js.spec.ts`

Add test cases for `setConstant` generation similar to existing `setLookup` tests.

## Files Summary

### New Files (5):
1. `packages/runtime/src/_shared/constant-def.ts`
2. `tests/integration/override-constants/override-constants.mdl`
3. `tests/integration/override-constants/sde.config.js`
4. `tests/integration/override-constants/run-tests.js`
5. `tests/integration/override-constants/package.json`

### Modified Files (10):
1. `packages/runtime/src/_shared/index.ts` - export ConstantDef
2. `packages/runtime/src/runnable-model/run-model-options.ts` - add constants field
3. `packages/runtime/src/runnable-model/run-model-params.ts` - add getConstants()
4. `packages/runtime/src/runnable-model/base-runnable-model.ts` - pass constants through
5. `packages/runtime/src/js-model/js-model.ts` - add setConstant, integrate with runJsModel
6. `packages/runtime/src/wasm-model/wasm-model.ts` - add native wrapper, integrate with runModel
7. `packages/build/src/_shared/model-spec.ts` - add customConstants config option
8. `packages/compile/src/generate/gen-code-js.js` - generate setConstant function
9. `packages/compile/src/generate/gen-code-c.js` - generate C setConstant function
10. `packages/compile/src/generate/gen-code-js.spec.ts` - add unit tests

## Key Differences from Override Lookups

This implementation is **simpler** than override lookups:

1. **Scalar values** - just `number`, not `Float64Array`
2. **No persistence** - constants reset on every run, no state to manage
3. **Simpler C signature** - `(varIndex, subIndices, value)` vs `(varIndex, subIndices, points, numPoints)`
4. **No reset logic** - automatic reset via `initConstants()`
5. **No buffer encoding complexity** - single number vs array of points
6. **Fewer edge cases** - no array size changes, empty arrays, etc.

## Testing Strategy

1. **Unit tests**: Verify switch statement generation in both JS and C
2. **Integration tests**: Validate end-to-end functionality:
   - Default values work correctly
   - Overrides work (by name and ID)
   - Overrides do NOT persist across calls
   - Subscripted constants work (1D, 2D, non-subscripted)
   - Both sync and async runners work
3. **Test both formats**: Run with `GEN_FORMAT=js` and `GEN_FORMAT=c`

## Progress Tracking

- [x] Create top-level PLAN.md file
- [ ] Create ConstantDef interface and export
- [ ] Update RunModelOptions with constants field
- [ ] Add customConstants to ModelSpec
- [ ] Generate setConstant function in JS code generator
- [ ] Generate setConstant function in C code generator
- [ ] Update JS model runtime
- [ ] Update Wasm model runtime
- [ ] Update RunModelParams interface
- [ ] Update BaseRunnableModel
- [ ] Create integration test
- [ ] Run tests and verify implementation
