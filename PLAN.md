# XMILE Integration Test Fixes - Analysis and Plan

This document analyzes the errors found when running XMILE/Stella integration tests (`INPUT_FORMAT=stmx ./tests/modeltests`) and proposes fixes for each issue.

## Summary of Test Results

| Model | Status | Error Type |
|-------|--------|------------|
| active_initial | ✅ **FIXED** | Was: Cyclic dependency (init_eqn handling added) |
| allocate | ❌ FAIL | Unhandled function `_ALLOCATE` (incompatible signatures, deferred) |
| arrays | ❌ FAIL | Undefined subscript mapping `_dim_ab_map` (HIGH complexity, deferred) |
| comments | ✅ PASS | - |
| delay | ❌ FAIL | Data differences (numerical errors) - requires investigation |
| delayfixed | ✅ **FIXED** | Was: Unhandled function `_DELAY` |
| delayfixed2 | ✅ **FIXED** | Was: Unhandled function `_DELAY` |
| depreciate | ✅ **FIXED** | Was: Unhandled function `_DEPRECIATE_STRAIGHTLINE` |
| elmcount | ✅ **FIXED** | Was: Unhandled function `_SIZE` |
| interleaved | ✅ PASS | - |
| trend | ⚠️ Runs | Was: Unhandled function `_SAFEDIV` (now fixed, but TREND has numerical issues) |

**Current Score: 7 passing, 4 failing** (improved from 2 passing initially)

---

## Error 1: active_initial - Cyclic Dependency (✅ FIXED)

### Symptom (RESOLVED)
```
Error: Found cyclic dependency during toposort:
_capacity_utilization → _capacity_1 → _target_capacity → _utilization_adjustment → _capacity_utilization
```

### Root Cause

The XMILE parser was ignoring the `<init_eqn>` element for auxiliary variables. In XMILE, a variable can have separate init-time and eval-time equations:

```xml
<aux name="Target Capacity">
  <eqn>Capacity_1*Utilization_Adjustment</eqn>
  <init_eqn>Initial_Target_Capacity</init_eqn>
</aux>
```

In Vensim, this is expressed using the `ACTIVE INITIAL` function:
```vensim
Target Capacity = ACTIVE INITIAL(Capacity*Utilization Adjustment, Initial Target Capacity)
```

### Fix Applied

The XMILE parser was updated to handle `<init_eqn>` elements by synthesizing an `ACTIVE_INITIAL` function call when both `<eqn>` and `<init_eqn>` elements exist for aux variables.

---

## Error 2: allocate - Unhandled _ALLOCATE Function

### Symptom
```
Error: Unhandled function '_ALLOCATE' in readEquations for 'shipments[region]'
```

### Root Cause

**Critical Incompatibility:** Stella's `ALLOCATE` function has a fundamentally different signature than Vensim's `ALLOCATE AVAILABLE`:

**Vensim (3 parameters):**
```vensim
shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], supply available)
```

**Stella (6 parameters):**
```xml
<eqn>ALLOCATE(total_supply_available, region, demand, priority_vector[*,ppriority], priority_vector[region,pwidth], priority_vector[region,ptype])</eqn>
```

Key differences:
- Stella has 6 parameters vs Vensim's 3
- Parameter order is different (Stella puts availability FIRST, Vensim puts it LAST)
- Stella explicitly names the dimension to iterate over
- Stella separates priority parameters (mean, width, type) instead of packing them in a 2D array

### Current Implementation Status

- **Vensim:** Fully implemented
  - Parsing in `read-equations.js` (lines 478-481)
  - C code generation in `gen-expr.js` (lines 855-928)
  - C runtime in `vensim.c` (lines 408-504)
- **Stella:** NOT implemented (4 test cases explicitly skipped in `read-equations-xmile.spec.ts`)

### Proposed Fix

**Option A: Full Implementation (Recommended for Completeness)**
1. Add `case '_ALLOCATE':` to `validateStellaFunctionCall()` in `read-equations.js`
2. Create parameter adapter to map Stella's 6-param signature to internal representation
3. Either:
   - Create new C runtime function for Stella's signature, OR
   - Create wrapper that converts Stella params to Vensim format

**Option B: Skip for Now**
- Document incompatibility
- Keep tests skipped
- Focus on higher-priority functions first

### Complexity: HIGH
- Fundamentally incompatible parameter signatures
- Would require ~700-1200 lines of implementation + tests
- May require new C runtime function or adapter layer

---

## Error 3: arrays - Undefined Subscript Mapping

### Symptom
```
ERROR: undefined hasMapping fromSubscript : '_dim_ab_map'
TypeError: Cannot read properties of undefined (reading 'mappings')
```

### Root Cause

The XMILE parser **does not support subscript mappings**. In `packages/parse/src/xmile/parse-xmile-dimension-def.ts` (lines 55-56):

```typescript
// TODO: Does XMILE support mappings?
subscriptMappings: [],
```

The arrays.stmx model uses Vensim-style subscript mapping patterns:
```xml
<aux name="dim ab map">
  <dimensions><dim name="DimB"/></dimensions>
  <eqn>DimB</eqn>
</aux>
```

And references it in expressions like:
```xml
<eqn>inputA[dim_ab_map]*10</eqn>
```

The problem:
1. `dim ab map` is parsed as a regular variable, not a subscript dimension
2. When the compiler tries to resolve `dim_ab_map` as a subscript, it doesn't exist
3. `hasMapping()` receives `undefined` and crashes trying to access `.mappings`

### Proposed Fix

**Option A: Implement XMILE Subscript Mapping Support**

Research how XMILE represents dimension mappings and implement parsing support. This may require:
1. Understanding XMILE's mapping syntax (if it exists)
2. Modifying `parse-xmile-dimension-def.ts` to populate `subscriptMappings`

**Option B: Handle Variables as Subscript References**

If XMILE uses variables to represent mappings (like the `dim ab map` aux variable):
1. Detect when a subscript reference is actually a variable name
2. Evaluate the variable to get the actual subscript value
3. This is more complex as it involves runtime subscript resolution

**Option C: Skip Test with Documentation**

If XMILE fundamentally doesn't support subscript mappings:
1. Document this limitation
2. Skip the arrays test for XMILE
3. Users would need to restructure models without mappings

### Complexity: HIGH (Options A/B) or LOW (Option C)
- Requires understanding XMILE subscript semantics
- May involve fundamental parser changes
- Could require runtime subscript resolution

---

## Error 4: delay - Numerical Data Differences

### Symptom
```
_d11[_a1] time=7.00 vensim=0 sde=-10920 diff=1092000.000000%
_d8[_a1] time=7.00 vensim=0 sde=-260 diff=26000.000000%
```

### Root Cause

**UPDATE: After investigation, the initial analysis was incorrect.** The issue is NOT a simple canonicalization bug in `read-equation-fn-delay.js`. The generated C code structure appears correct when compared to the Vensim version.

The failing variables are:
- `d8[DimA] = DELAY3(input, delay_a[DimA])` - subscripted apply-to-all DELAY3
- `d11[DimA] = k*DELAY3(input, delay_a[DimA])` - DELAY3 nested in multiplication

**Observations:**
1. The Vensim version (MDL) works correctly
2. The XMILE version (STMX) produces wildly incorrect negative values
3. The generated C code structure (integration chain, init values) looks correct
4. The variable numbering differs between versions but the mathematical structure appears equivalent

**Possible causes requiring further investigation:**
1. **XMILE parsing issue**: Something in how the DELAY3 arguments are parsed from XMILE
2. **Variable ordering issue**: Different evaluation order in XMILE vs Vensim compilation
3. **Subscript handling difference**: How subscripted delay time arguments are handled in XMILE

**Note:** The canonicalization fix (changing `canonicalName` to `canonicalVensimName`) does NOT resolve this issue.

### Complexity: HIGH
- Requires deep debugging of XMILE compilation path
- May need to compare intermediate representations between Vensim and XMILE parsing

---

## Error 5: delayfixed/delayfixed2 - Unhandled _DELAY Function (FIXED)

### Symptom
```
Error: Unhandled function '_DELAY' in readEquations for 'receiving'
```

### Root Cause

XMILE uses `DELAY(input, delay_time, initial)` which gets canonicalized to `_DELAY`, but this function is not handled in `validateStellaFunctionCall()` in `read-equations.js`.

Vensim has the equivalent `DELAY FIXED` which is already fully implemented (lines 493-503).

### Proposed Fix

**File:** `packages/compile/src/model/read-equations.js`

Add case in `validateStellaFunctionCall()` (around line 630-735):

```javascript
case '_DELAY':
  validateCallDepth(callExpr, context)
  validateCallArgs(callExpr, 3)
  v.varType = 'level'
  v.varSubtype = 'fixedDelay'
  v.hasInitValue = true
  v.fixedDelayVarName = canonicalName(newFixedDelayVarName())
  argModes[1] = 'init'
  argModes[2] = 'init'
  break
```

### Complexity: LOW
- Copy existing `_DELAY_FIXED` case logic
- May need to verify parameter order matches Stella's

---

## Error 6: depreciate - Unhandled _DEPRECIATE_STRAIGHTLINE Function

### Symptom
```
Error: Unhandled function '_DEPRECIATE_STRAIGHTLINE' in readEquations for 'Depreciated Amount'
```

### Root Cause

`_DEPRECIATE_STRAIGHTLINE` is already handled for Vensim (lines 505-517 in `read-equations.js`) but not added to `validateStellaFunctionCall()`.

### Proposed Fix

**File:** `packages/compile/src/model/read-equations.js`

Add case in `validateStellaFunctionCall()`:

```javascript
case '_DEPRECIATE_STRAIGHTLINE':
  validateCallDepth(callExpr, context)
  validateCallArgs(callExpr, 4)
  v.varSubtype = 'depreciation'
  v.hasInitValue = true
  v.depreciationVarName = canonicalName(newDepreciationVarName())
  argModes[1] = 'init'
  argModes[2] = 'init'
  break
```

**Note:** The depreciate.stmx file includes a complete macro definition showing Stella's depreciation implementation. Need to verify the parameter semantics match Vensim's.

### Complexity: LOW-MEDIUM
- Similar to existing Vensim handling
- May need parameter verification between Vensim/Stella implementations

---

## Error 7: elmcount - Unhandled _SIZE Function (FIXED)

### Symptom
```
Error: Unhandled function '_SIZE' in readEquations for 'a'
```

### Root Cause

`SIZE(DimA)` is an XMILE-specific function that returns the number of elements in a dimension. There is no direct Vensim equivalent (Vensim uses `ELMCOUNT`).

Usage in elmcount model:
```xml
<eqn>SIZE(DimA)</eqn>
```

This should return 3 (since DimA has elements A1, A2, A3).

### Proposed Fix

**File:** `packages/compile/src/model/read-equations.js`

This is a **compile-time constant** that can be resolved during parsing:

1. Add case in `validateStellaFunctionCall()`:
```javascript
case '_SIZE':
  validateCallDepth(callExpr, context)
  validateCallArgs(callExpr, 1)
  // Mark as const since it can be resolved at compile time
  v.varType = 'const'
  break
```

2. In code generation (`gen-expr.js`), resolve the dimension size:
```javascript
case '_SIZE': {
  const dimArg = callExpr.args[0]
  const dimId = canonicalName(dimArg.name)
  const dim = sub(dimId)
  return String(dim.size)
}
```

### Complexity: LOW-MEDIUM
- Need to resolve dimension at compile time
- Simple once dimension lookup is implemented

---

## Error 8: trend - Unhandled _SAFEDIV Function (FIXED)

### Symptom
```
Error: Unhandled function '_SAFEDIV' in readEquations for 'trend1'
```

### Root Cause

`SAFEDIV(numerator, denominator)` is an XMILE-specific safe division function that returns 0 if the denominator is 0 (or near 0).

This is equivalent to Vensim's `ZIDZ` (Zero If Divide by Zero), which is already implemented in `js-model-functions.ts`.

Interestingly, the existing TREND function implementation already uses ZIDZ internally (in `read-equation-fn-trend.js`, line 41).

### Proposed Fix

**File:** `packages/compile/src/model/read-equations.js`

Add case in `validateStellaFunctionCall()`:

```javascript
case '_SAFEDIV':
  validateCallDepth(callExpr, context)
  validateCallArgs(callExpr, 2)
  // No special handling needed - treat as normal function
  break
```

**File:** `packages/compile/src/generate/gen-expr.js`

Either:
- Map `_SAFEDIV` to existing `_ZIDZ` implementation, OR
- Add inline code generation:
```javascript
case '_SAFEDIV': {
  const num = visitExpr(callExpr.args[0])
  const denom = visitExpr(callExpr.args[1])
  return `_ZIDZ(${num}, ${denom})`
}
```

### Complexity: LOW
- Direct mapping to existing ZIDZ function
- Minimal code changes

---

## Implementation Priority

Based on complexity and impact, here's the recommended implementation order:

### ✅ COMPLETED - Quick Wins
1. **_SAFEDIV** → Map to ZIDZ ✓ (commit 940d069f)
2. **_DELAY** → Copy DELAY_FIXED logic ✓ (commit 631cb38c)
3. **_SIZE** → Compile-time dimension resolution ✓ (commit 5099835c)
4. **active_initial** → Handle `<init_eqn>` in XMILE parser ✓
5. **_DEPRECIATE_STRAIGHTLINE** → Add to validateStellaFunctionCall ✓

### ⚠️ REQUIRES INVESTIGATION
6. **delay numerical fix** → NOT a simple canonicalization bug; requires deep debugging of XMILE compilation path
7. **trend numerical fix** → TREND function produces different numerical results than Vensim

### Priority 3 - Deferred (HIGH complexity)
8. **arrays subscript mapping** → Research XMILE mapping support
9. **_ALLOCATE** → Significant signature differences, may skip

---

## Files Modified

| File | Changes |
|------|---------|
| `packages/compile/src/model/read-equations.js` | Added cases for _DELAY, _SIZE, _SAFEDIV, _DEPRECIATE_STRAIGHTLINE, _ACTIVE_INITIAL to validateStellaFunctionCall() |
| `packages/compile/src/generate/gen-expr.js` | Added code generation for _SIZE (maps to ELMCOUNT), _SAFEDIV (maps to ZIDZ), _DELAY (maps to DELAY_FIXED) |
| `packages/parse/src/xmile/parse-xmile-variable-def.ts` | Added support for `<init_eqn>` element to synthesize ACTIVE_INITIAL function call |

## Files Still Needing Changes

| File | Changes |
|------|---------|
| `packages/parse/src/xmile/parse-xmile-dimension-def.ts` | (Future) Add subscript mapping support |
