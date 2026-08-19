// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// Generate the body of one "instruction" (i.e., the code that evaluates one variable
// instance) against the flat buffer layout computed in `ir.mjs`.
//
// The same generator emits either WGSL or JavaScript.  Emitting both from one place keeps
// the GPU and the CPU baseline honest: any difference in benchmark results comes from the
// execution model, not from two independently written code generators.
//
// The shape of a generated instruction is always:
//
//   fn instr_<n>(cell: u32, run: u32) {
//     let i = <subscript index derived from cell>;
//     ...
//     V[(<flat cell index>) * R + run] = <expression>;
//   }
//
// where `cell` enumerates the LHS subscript combinations for this instance and `run`
// selects the ensemble member.
//

import {
  sub,
  isDimension,
  isIndex,
  isTrivialDimension,
  hasMapping
} from '../../../packages/compile/src/_shared/subscript.js'

const LOOP_INDEX_NAMES = ['i', 'j', 'k', 'l', 'm']
const ARRAY_INDEX_NAMES = ['u', 'v', 'w', 's', 't', 'q', 'r']

/** The largest finite f32 value; stands in for `Number.MAX_VALUE` on the GPU. */
export const F32_MAX = 3.4028234663852886e38

/**
 * Return a source-language literal for the given number.
 *
 * @param {'wgsl' | 'js'} lang The target language.
 * @param {number} value The numeric value.
 * @return {string} The literal text.
 */
function numLit(lang, value) {
  if (lang === 'js') {
    return `${value}`
  }
  // WGSL needs a decimal point (or exponent) for a float literal, and cannot represent
  // magnitudes beyond the f32 range
  let v = value
  if (v > F32_MAX) v = F32_MAX
  if (v < -F32_MAX) v = -F32_MAX
  if (Number.isInteger(v) && Math.abs(v) < 1e15) {
    return `${v}.0`
  }
  const s = `${v}`
  return s.includes('.') || s.includes('e') || s.includes('E') ? s : `${s}.0`
}

/**
 * A small counter that hands out (and remembers) a loop index variable name per dimension.
 * This mirrors `LoopIndexVars` in the production code generator.
 */
class IndexVars {
  constructor(names) {
    this.names = names
    this.map = new Map()
  }
  index(dimId) {
    let name = this.map.get(dimId)
    if (name === undefined) {
      name = this.names[this.map.size]
      if (name === undefined) {
        throw new Error(`Ran out of loop index variable names for dimension ${dimId}`)
      }
      this.map.set(dimId, name)
    }
    return name
  }
}

/**
 * Generate the body statements for one variable instance.
 *
 * @param {Object} opts The generation options.
 * @param {Object} opts.ir The model IR.
 * @param {Object} opts.variable The `Variable` instance to generate code for.
 * @param {'init-constants' | 'init-levels' | 'eval'} opts.mode The generation mode.
 * @param {'wgsl' | 'js'} opts.lang The target language.
 * @return {Object} An object with `lines` (the generated statements), `cellCount` (the
 * number of LHS subscript combinations) and `dimIds` (the iterated LHS dimensions).
 */
export function generateInstruction({ ir, variable, mode, lang }) {
  const loopIndexVars = new IndexVars(LOOP_INDEX_NAMES)
  const arrayIndexVars = new IndexVars(ARRAY_INDEX_NAMES)

  // Assign loop index names in LHS dimension order (matching the production generator)
  const lhsDimIds = variable.subscripts.filter(isDimension)
  for (const dimId of lhsDimIds) {
    loopIndexVars.index(dimId)
  }

  const isWgsl = lang === 'wgsl'
  const num = v => numLit(lang, v)
  const uint = n => (isWgsl ? `${n}u` : `${n}`)

  // Lines emitted before the assignment (used by array functions such as SUM)
  const preLines = []
  let tmpCount = 0

  //
  // Index helpers
  //

  /** Return the code for the family-relative index of a specific subscript/dimension. */
  function indexCode(subOrDimId) {
    if (subOrDimId.endsWith('!')) {
      // Marked dimension used by an array function (e.g., `SUM(x[DimA!])`)
      const dimId = subOrDimId.replace('!', '')
      return optimalIndex(arrayIndexVars, dimId)
    }
    if (isIndex(subOrDimId)) {
      return uint(sub(subOrDimId).value)
    }
    // Match against the LHS subscript positions
    const lhsSubRefs = variable.parsedEqn?.lhs?.varDef?.subscriptRefs
    const lhsSubIds = lhsSubRefs?.map(r => r.subId) || []
    const exactIndex = lhsSubIds.findIndex(id => id === subOrDimId)
    if (exactIndex >= 0) {
      const lhsSubOrDimId = variable.subscripts[exactIndex]
      if (isIndex(lhsSubOrDimId)) {
        return uint(sub(lhsSubOrDimId).value)
      }
      return optimalIndex(loopIndexVars, lhsSubOrDimId)
    }
    // Fall back to a dimension mapping
    const mappedIndex = lhsSubIds.findIndex(id => hasMapping(subOrDimId, id))
    if (mappedIndex >= 0) {
      const mappedLhsSubOrDimId = variable.subscripts[mappedIndex]
      const mappedLhsDimId = lhsSubIds[mappedIndex]
      if (isIndex(mappedLhsSubOrDimId)) {
        const lhsDim = sub(mappedLhsDimId)
        const rhsDim = sub(subOrDimId)
        const lhsSubIndex = lhsDim.value.indexOf(mappedLhsSubOrDimId)
        if (lhsSubIndex < 0) {
          throw new Error(`Failed to find mapped LHS subscript ${mappedLhsSubOrDimId} for ${subOrDimId}`)
        }
        return uint(sub(rhsDim.mappings[mappedLhsDimId][lhsSubIndex]).value)
      }
      const indexVarName = loopIndexVars.index(mappedLhsDimId)
      return `MAP_${subOrDimId}${mappedLhsDimId}[${indexVarName}]`
    }
    throw new Error(`Failed to resolve RHS dimension ${subOrDimId} for ${variable.refId}`)
  }

  function optimalIndex(indexVars, dimId) {
    const indexVarName = indexVars.index(dimId)
    if (isTrivialDimension(dimId)) {
      // A "trivial" dimension is the whole family in order, so the loop index is already
      // the family-relative index
      return indexVarName
    }
    return `DIM_${dimId}[${indexVarName}]`
  }

  /** Return the code for the flat cell index of a variable reference. */
  function cellCode(varName, subIds, allocMap) {
    const a = allocMap.get(varName)
    if (a === undefined) {
      throw new Error(`No allocation for variable '${varName}' (referenced by ${variable.refId})`)
    }
    const base = a.offset !== undefined ? a.offset : a.dirOffset
    const parts = [uint(base)]
    ;(subIds || []).forEach((subId, i) => {
      const idx = indexCode(subId)
      const stride = a.strides[i]
      if (stride === 1) {
        parts.push(idx)
      } else {
        parts.push(`${idx} * ${uint(stride)}`)
      }
    })
    return parts.length === 1 ? parts[0] : `(${parts.join(' + ')})`
  }

  /** Return the code that loads the value of a variable reference. */
  function loadCode(varRef) {
    const subIds = varRef.subscriptRefs?.map(r => r.subId)
    return `V[${cellCode(varRef.varId, subIds, ir.alloc)} * R + run]`
  }

  //
  // Expression generation
  //

  function expr(e) {
    switch (e.kind) {
      case 'number':
        return num(e.value)
      case 'keyword':
        if (e.text === ':NA:') {
          return num(-F32_MAX)
        }
        throw new Error(`Unsupported keyword '${e.text}' in ${variable.refId}`)
      case 'variable-ref': {
        // A reference to a lookup/data variable in a value position is a lookup call with
        // the current time as the input (SDE handles this the same way)
        if (ir.lookupAlloc.has(e.varId)) {
          return lookupCall(e, { kind: 'variable-ref', varName: 'Time', varId: '_time' })
        }
        if (ir.alloc.has(e.varId)) {
          return loadCode(e)
        }
        if (isDimension(e.varId)) {
          // A dimension used in expression position evaluates to the one-based position of
          // the current index within that dimension
          return isWgsl ? `(f32(${indexCode(e.varId)}) + 1.0)` : `(${indexCode(e.varId)} + 1)`
        }
        if (isIndex(e.varId)) {
          return num(sub(e.varId).value + 1)
        }
        throw new Error(`Unresolved variable reference '${e.varName}' in ${variable.refId}`)
      }
      case 'lookup-def':
        // A lookup def in expression position only occurs inside a `WITH LOOKUP` call; the
        // read phase already turned it into a generated lookup variable
        return lookupDirCode({ varId: variable.lookupArgVarName, subscriptRefs: undefined })
      case 'parens':
        return `(${expr(e.expr)})`
      case 'unary-op':
        if (e.op === ':NOT:') {
          return isWgsl ? `select(1.0, 0.0, ${boolExpr(e.expr)})` : `((${expr(e.expr)}) === 0 ? 1 : 0)`
        }
        return `${e.op}(${expr(e.expr)})`
      case 'binary-op':
        return binaryOp(e)
      case 'lookup-call':
        return lookupCall(e.varRef, e.arg)
      case 'function-call':
        return fnCall(e)
      default:
        throw new Error(`Unsupported expression kind '${e.kind}' in ${variable.refId}`)
    }
  }

  /** Return a boolean-valued expression (used for conditions). */
  function boolExpr(e) {
    if (e.kind === 'parens') {
      return `(${boolExpr(e.expr)})`
    }
    if (e.kind === 'binary-op') {
      switch (e.op) {
        case '=':
          return `${expr(e.lhs)} == ${expr(e.rhs)}`
        case '<>':
          return `${expr(e.lhs)} != ${expr(e.rhs)}`
        case '<':
        case '>':
        case '<=':
        case '>=':
          return `${expr(e.lhs)} ${e.op} ${expr(e.rhs)}`
        case ':AND:':
          return `(${boolExpr(e.lhs)}) && (${boolExpr(e.rhs)})`
        case ':OR:':
          return `(${boolExpr(e.lhs)}) || (${boolExpr(e.rhs)})`
        default:
          break
      }
    }
    if (e.kind === 'unary-op' && e.op === ':NOT:') {
      return `!(${boolExpr(e.expr)})`
    }
    // Any other expression is treated as a number that is true when non-zero
    return `(${expr(e)}) != ${num(0)}`
  }

  function binaryOp(e) {
    switch (e.op) {
      case '+':
      case '-':
      case '*':
      case '/':
        return `${expr(e.lhs)} ${e.op} ${expr(e.rhs)}`
      case '^':
        return `_pow(${expr(e.lhs)}, ${expr(e.rhs)})`
      case '=':
      case '<>':
      case '<':
      case '>':
      case '<=':
      case '>=':
      case ':AND:':
      case ':OR:':
        return isWgsl ? `select(0.0, 1.0, ${boolExpr(e)})` : `((${boolExpr(e)}) ? 1 : 0)`
      default:
        throw new Error(`Unsupported binary operator '${e.op}' in ${variable.refId}`)
    }
  }

  /** Return the code for the lookup directory index of a lookup variable reference. */
  function lookupDirCode(lookupVarRef) {
    const subIds = lookupVarRef.subscriptRefs?.map(r => r.subId)
    if (subIds === undefined && !ir.lookupAlloc.has(lookupVarRef.varId)) {
      throw new Error(`No lookup allocation for '${lookupVarRef.varId}' in ${variable.refId}`)
    }
    // A lookup that is generated for the LHS variable (e.g., the inline data of a
    // `WITH LOOKUP` call) is subscripted the same way as the LHS
    const effectiveSubIds = subIds !== undefined ? subIds : variable.subscripts
    return cellCode(lookupVarRef.varId, effectiveSubIds, ir.lookupAlloc)
  }

  function lookupCall(lookupVarRef, argExpr, mode = 0) {
    return `_lookup(${lookupDirCode(lookupVarRef)}, ${expr(argExpr)}, ${uint(mode)})`
  }

  const SIMPLE_FNS = {
    _ABS: 'abs',
    _ARCCOS: isWgsl ? 'acos' : 'Math.acos',
    _ARCSIN: isWgsl ? 'asin' : 'Math.asin',
    _ARCTAN: isWgsl ? 'atan' : 'Math.atan',
    _COS: isWgsl ? 'cos' : 'Math.cos',
    _EXP: isWgsl ? 'exp' : 'Math.exp',
    _LN: isWgsl ? 'log' : 'Math.log',
    _MAX: isWgsl ? 'max' : 'Math.max',
    _MIN: isWgsl ? 'min' : 'Math.min',
    _SIN: isWgsl ? 'sin' : 'Math.sin',
    _SQRT: isWgsl ? 'sqrt' : 'Math.sqrt',
    _TAN: isWgsl ? 'tan' : 'Math.tan',
    _INTEGER: isWgsl ? 'trunc' : 'Math.trunc',
    _INT: isWgsl ? 'trunc' : 'Math.trunc'
  }
  if (!isWgsl) {
    SIMPLE_FNS._ABS = 'Math.abs'
  }

  // Functions that are implemented by hand in the generated prelude for both languages
  const PRELUDE_FNS = {
    _POW: '_pow',
    _POWER: '_pow',
    _MODULO: '_modulo',
    _MOD: '_modulo',
    _QUANTUM: '_quantum',
    _ZIDZ: '_zidz',
    _SAFEDIV: '_zidz',
    _XIDZ: '_xidz',
    _STEP: '_step',
    _RAMP: '_ramp',
    _PULSE: '_pulse',
    _PULSE_TRAIN: '_pulse_train'
  }

  // These prelude functions depend on the current simulation time, which is per-run state,
  // so the caller passes it in as an extra leading argument
  const TIME_DEP_FNS = new Set(['_step', '_ramp', '_pulse', '_pulse_train'])

  /** Return the code that loads the current simulation time for this run. */
  function timeCode() {
    return `V[${uint(ir.alloc.get('_time').offset)} * R + run]`
  }

  function fnCall(e) {
    const fnId = e.fnId
    const simple = SIMPLE_FNS[fnId]
    if (simple) {
      return `${simple}(${e.args.map(expr).join(', ')})`
    }
    const prelude = PRELUDE_FNS[fnId]
    if (prelude) {
      const args = e.args.map(expr)
      if (TIME_DEP_FNS.has(prelude)) {
        args.unshift(timeCode())
      }
      return `${prelude}(${args.join(', ')})`
    }

    switch (fnId) {
      case '_IF_THEN_ELSE':
        return isWgsl
          ? `select(${expr(e.args[2])}, ${expr(e.args[1])}, ${boolExpr(e.args[0])})`
          : `((${boolExpr(e.args[0])}) ? (${expr(e.args[1])}) : (${expr(e.args[2])}))`

      case '_WITH_LOOKUP': {
        const lookupArg = e.args[1]
        const lookupRef =
          lookupArg.kind === 'lookup-def' ? { varId: variable.lookupArgVarName } : (lookupArg.varRef ?? lookupArg)
        return lookupCall(lookupRef, e.args[0])
      }

      // These functions were expanded into additional level/aux variables during the read
      // phase, so in place of the call we emit a reference to the expanded variable
      case '_SMOOTH':
      case '_SMOOTHI':
      case '_SMOOTH3':
      case '_SMOOTH3I':
      case '_SMTH1':
      case '_SMTH3':
        return loadCode(ir.Model.varWithRefId(variable.smoothVarRefId).parsedEqn.lhs.varDef)

      case '_TREND':
        return loadCode(ir.Model.varWithRefId(variable.trendVarName).parsedEqn.lhs.varDef)

      case '_NPV':
        return loadCode(ir.Model.varWithRefId(variable.npvVarName).parsedEqn.lhs.varDef)

      case '_DELAY1':
      case '_DELAY1I':
      case '_DELAY3':
      case '_DELAY3I': {
        const delayVar = ir.Model.varWithRefId(variable.delayVarRefId)
        const delayVarDef = delayVar.parsedEqn.lhs.varDef
        const delayTimeRef = { varId: variable.delayTimeVarName, subscriptRefs: delayVarDef.subscriptRefs }
        return `(${loadCode(delayVarDef)} / ${loadCode(delayTimeRef)})`
      }

      case '_LOOKUP':
        return lookupCall(e.args[0], e.args[1])
      case '_LOOKUP_FORWARD':
        return lookupCall(e.args[0], e.args[1], 1)
      case '_LOOKUP_BACKWARD':
        return lookupCall(e.args[0], e.args[1], 2)

      case '_INITIAL':
      case '_INIT':
        if (mode.startsWith('init')) {
          return expr(e.args[0])
        }
        // Outside of the init passes, the value was already stored at init time
        return `V[${lhsCellCode()} * R + run]`

      case '_ACTIVE_INITIAL':
        return mode.startsWith('init') ? expr(e.args[1]) : expr(e.args[0])

      case '_INTEG':
        if (mode.startsWith('init')) {
          return expr(e.args[1])
        }
        return `V[${lhsCellCode()} * R + run] + (${expr(e.args[0])}) * TIME_STEP`

      case '_SAMPLE_IF_TRUE':
        if (mode.startsWith('init')) {
          return expr(e.args[2])
        }
        return isWgsl
          ? `select(V[${lhsCellCode()} * R + run], ${expr(e.args[1])}, ${boolExpr(e.args[0])})`
          : `((${boolExpr(e.args[0])}) ? (${expr(e.args[1])}) : (V[${lhsCellCode()} * R + run]))`

      case '_SUM':
      case '_VMIN':
      case '_VMAX':
      case '_PROD':
        return arrayFnCall(e)

      case '_ELMCOUNT':
      case '_SIZE':
        return num(sub(e.args[0].varId ?? e.args[0].subId).size)

      default:
        // The Vensim grammar cannot distinguish a call on a non-subscripted lookup from a
        // function call, so a "function" whose name matches a lookup variable is a lookup
        if (ir.lookupAlloc.has(fnId.toLowerCase())) {
          return lookupCall({ varId: fnId.toLowerCase(), subscriptRefs: [] }, e.args[0])
        }
        throw new Error(`Unsupported function '${e.fnName}' in ${variable.refId}`)
    }
  }

  /** Generate a loop for a "marked dimension" array function such as `SUM`. */
  function arrayFnCall(e) {
    const arg = e.args[0]
    const markedDimIds = collectMarkedDims(arg)
    if (markedDimIds.length === 0) {
      throw new Error(`No marked dimension found in ${e.fnName} call in ${variable.refId}`)
    }

    const tmp = `_t${tmpCount++}`
    let init
    let combine
    switch (e.fnId) {
      case '_SUM':
        init = num(0)
        combine = (acc, x) => `${acc} + ${x}`
        break
      case '_PROD':
        init = num(1)
        combine = (acc, x) => `${acc} * ${x}`
        break
      case '_VMIN':
        init = num(F32_MAX)
        combine = (acc, x) => (isWgsl ? `min(${acc}, ${x})` : `Math.min(${acc}, ${x})`)
        break
      case '_VMAX':
        init = num(-F32_MAX)
        combine = (acc, x) => (isWgsl ? `max(${acc}, ${x})` : `Math.max(${acc}, ${x})`)
        break
      default:
        throw new Error(`Unsupported array function '${e.fnName}'`)
    }

    const openLines = []
    const closeLines = []
    for (const dimId of markedDimIds) {
      const idxName = arrayIndexVars.index(dimId)
      const n = sub(dimId).size
      if (isWgsl) {
        openLines.push(`for (var ${idxName}: u32 = 0u; ${idxName} < ${n}u; ${idxName} = ${idxName} + 1u) {`)
      } else {
        openLines.push(`for (let ${idxName} = 0; ${idxName} < ${n}; ${idxName}++) {`)
      }
      closeLines.push('}')
    }

    // The argument expression must be generated after the loop index vars are assigned
    const argCode = expr(arg)
    preLines.push(isWgsl ? `var ${tmp}: f32 = ${init};` : `let ${tmp} = ${init};`)
    preLines.push(...openLines)
    preLines.push(`${tmp} = ${combine(tmp, argCode)};`)
    preLines.push(...closeLines)
    return tmp
  }

  function collectMarkedDims(e, acc = []) {
    switch (e?.kind) {
      case 'variable-ref':
        for (const r of e.subscriptRefs || []) {
          if (r.subId.endsWith('!')) {
            const dimId = r.subId.replace('!', '')
            if (!acc.includes(dimId)) {
              acc.push(dimId)
            }
          }
        }
        break
      case 'parens':
        collectMarkedDims(e.expr, acc)
        break
      case 'unary-op':
        collectMarkedDims(e.expr, acc)
        break
      case 'binary-op':
        collectMarkedDims(e.lhs, acc)
        collectMarkedDims(e.rhs, acc)
        break
      case 'function-call':
        for (const a of e.args) {
          collectMarkedDims(a, acc)
        }
        break
      case 'lookup-call':
        collectMarkedDims(e.varRef, acc)
        collectMarkedDims(e.arg, acc)
        break
      default:
        break
    }
    return acc
  }

  //
  // LHS
  //

  function lhsCellCode() {
    return cellCode(variable.varName, variable.subscripts, ir.alloc)
  }

  //
  // Assemble the instruction body
  //

  const lines = []

  // Decompose the flat `cell` argument into one index per iterated LHS dimension
  const dimSizes = lhsDimIds.map(d => sub(d).size)
  const cellCount = dimSizes.reduce((a, b) => a * b, 1)
  // Integer division truncates in WGSL (u32) but not in JS, so JS needs an explicit floor
  const idiv = (a, b) => (isWgsl ? `${a} / ${uint(b)}` : `Math.floor(${a} / ${b})`)
  let divisor = cellCount
  lhsDimIds.forEach((dimId, n) => {
    const idxName = loopIndexVars.index(dimId)
    divisor = divisor / dimSizes[n]
    let code
    if (divisor === 1) {
      code = lhsDimIds.length === 1 ? 'cell' : `cell % ${uint(dimSizes[n])}`
    } else if (n === 0) {
      code = idiv('cell', divisor)
    } else {
      code = `(${idiv('cell', divisor)}) % ${uint(dimSizes[n])}`
    }
    lines.push(isWgsl ? `let ${idxName} = ${code};` : `const ${idxName} = ${code};`)
  })

  const parsedEqn = variable.parsedEqn
  if (parsedEqn === undefined) {
    throw new Error(`Variable ${variable.refId} has no parsed equation`)
  }

  if (parsedEqn.rhs.kind === 'const-list') {
    // A const list assigns a different literal to each subscript combination.  Each
    // separated `Variable` instance covers exactly one element of the list.
    const constIndex = constListIndex(variable)
    const value = parsedEqn.rhs.constants[constIndex]
    if (value === undefined) {
      throw new Error(`Failed to resolve const list element for ${variable.refId}`)
    }
    lines.push(`V[${lhsCellCode()} * R + run] = ${num(value.value)};`)
    return { lines, cellCount, dimIds: lhsDimIds }
  }

  if (parsedEqn.rhs.kind !== 'expr') {
    throw new Error(`Unsupported equation kind '${parsedEqn.rhs.kind}' for ${variable.refId}`)
  }

  const rhs = expr(parsedEqn.rhs.expr)
  lines.push(...preLines)
  lines.push(`V[${lhsCellCode()} * R + run] = ${rhs};`)

  return { lines, cellCount, dimIds: lhsDimIds }
}

/**
 * Return the position of this separated variable instance within its const list.
 *
 * @param {Object} variable The `Variable` instance.
 * @return {number} The index into the const list.
 */
function constListIndex(variable) {
  // The instance's subscripts are all specific; compute the row-major position within
  // the LHS dimensions declared in the equation
  const lhsSubRefs = variable.parsedEqn.lhs.varDef.subscriptRefs || []
  const dimSizes = lhsSubRefs.map(r => (isDimension(r.subId) ? sub(r.subId).size : 1))
  let index = 0
  lhsSubRefs.forEach((r, i) => {
    let pos = 0
    if (isDimension(r.subId)) {
      pos = sub(r.subId).value.indexOf(variable.subscripts[i])
      if (pos < 0) {
        throw new Error(`Failed to locate ${variable.subscripts[i]} in ${r.subId}`)
      }
    }
    index = index * dimSizes[i] + pos
  })
  return index
}
