import * as R from 'ramda'

import { asort, canonicalVensimName, cdbl, lines, strlist, mapIndexed } from '../_shared/helpers.js'
import { sub, allDimensions, allMappings, subscriptFamilies } from '../_shared/subscript.js'
import Model from '../model/model.js'

import { generateEquation } from './gen-equation.js'
import { expandVarNames } from './expand-var-names.js'

// The control variables are declared in `sde.h` and read by the support code in `model.c`,
// so they always have to be emitted as mutable globals.
const controlVarNames = new Set(['_final_time', '_initial_time', '_saveper', '_time_step'])

export function generateC(parsedModel, opts) {
  return codeGenerator(parsedModel, opts).generate()
}

let codeGenerator = (parsedModel, opts) => {
  const { spec, operations, extData, directData, modelDirname } = opts
  // Set to 'decl', 'init-lookups', 'eval', etc depending on the section being generated.
  let mode = ''
  // Set to true to output all variables when there is no model run spec.
  let outputAllVars = spec.outputVarNames === undefined || spec.outputVarNames.length === 0
  // The constant variables that are emitted as C literals, keyed by variable name; see
  // `resolveLiteralConstVars` below.
  let literalConstVars = new Map()
  // Function to generate a section of the code
  let generateSection = R.map(v => {
    return generateEquation(v, mode, extData, directData, modelDirname, 'c')
  })
  let section = R.pipe(generateSection, R.flatten, lines)
  function generate() {
    // Read variables and subscript ranges from the model parse tree.
    // This is the main entry point for code generation and is called just once.
    Model.read(parsedModel, spec, extData, directData, modelDirname)
    // In list mode, print variables to the console instead of generating code.
    if (operations.includes('printRefIdTest')) {
      Model.printRefIdTest()
    }
    if (operations.includes('printRefGraph')) {
      Model.printRefGraph(opts.varname)
    }
    if (operations.includes('convertNames')) {
      // Do not generate output, but leave the results of model analysis.
    }
    if (operations.includes('generateC')) {
      // Decide which constants can be emitted as C literals; this must happen before any
      // code is generated, since it affects both the declaration and the init sections.
      resolveLiteralConstVars()
      // Generate code for each variable in the proper order.
      let code = emitDeclCode()
      code += emitInitLookupsCode()
      code += emitInitConstantsCode()
      code += emitInitLevelsCode()
      code += emitEvalCode()
      code += emitIOCode()
      return code
    }
  }

  //
  // Constant folding
  //

  /**
   * Determine which constant variables can be emitted as C literals (`static const double
   * _x = 2.0;`) instead of as mutable globals that are assigned in `initConstants`.
   *
   * The point is to let the C compiler see the values.  When a constant is a mutable global,
   * every use of it has to be compiled as a load of an unknown quantity; when it is a literal,
   * the compiler can fold it into the expressions that use it.  The largest effect by far is
   * that `pow(x, e)` calls where `e` is a named constant with a value like 2, 0.5, or 1 get
   * strength-reduced into multiplies and `sqrt`.
   *
   * That strength reduction is also why this is opt-in: `x*x` and `sqrt(x)` are correctly
   * rounded while `pow` is not, so results can change in the last few digits.  For En-ROADS
   * the largest observed relative difference is ~1e-13 (and the new value is usually the more
   * accurate one), but it is enough to change bit-exact regression baselines.  Set
   * `SDE_NONPUBLIC_EMIT_CONST_LITERALS=1` to enable.
   *
   * Only unsubscripted constants with a plain numeric value qualify.  Input variables are
   * excluded (they are assigned by `setInputs` on each run), as are constants that can be
   * overridden with `setConstant`, the control variables (which are declared in `sde.h`), and
   * constants that come from a `GET DIRECT CONSTANTS` call.
   */
  function resolveLiteralConstVars() {
    literalConstVars = new Map()

    if (process.env.SDE_NONPUBLIC_EMIT_CONST_LITERALS !== '1') {
      // Skip this optimization if not explicitly enabled
      return
    }

    if (spec.customConstants === true) {
      // Any constant can be overridden at runtime, so none of them can be emitted as literals
      return
    }

    let customConstantVarNames = []
    if (Array.isArray(spec.customConstants)) {
      // The developer might specify a variable name that includes subscripts, but we will
      // ignore the subscript part and only match on the base name
      customConstantVarNames = spec.customConstants.map(varName => canonicalVensimName(varName.split('[')[0]))
    }

    for (const v of Model.constVars()) {
      if (v.subscripts.length > 0) {
        // Skip subscripted constants.  Some Vensim functions (`ALLOCATE AVAILABLE`,
        // `VECTOR SORT ORDER`, `INVERT MATRIX`, etc) take array arguments as `double*`, and a
        // `static const double[]` cannot be passed to those.  Emitting a constant array as a
        // literal would require tracking which arrays are passed by address, so for now we only
        // handle the scalar case.
        continue
      }
      if (controlVarNames.has(v.varName)) {
        // Skip the control variables (`INITIAL TIME`, `FINAL TIME`, `TIME STEP`, and `SAVEPER`).
        // These are declared as `extern` in `sde.h` and read by `model.c`, so they must remain
        // mutable globals with external linkage.
        continue
      }
      if (Model.isInputVar(v.varName)) {
        // Skip input variables.  These are assigned by `setInputs` on every run, so their value
        // is not fixed at compile time.
        continue
      }
      if (customConstantVarNames.includes(v.varName)) {
        // Skip constants that the developer declared as overridable with `setConstant`; like
        // inputs, these can be assigned at runtime.
        continue
      }
      if (v.directConstArgs) {
        // Skip constants that get their value from a `GET DIRECT CONSTANTS` call.  Those values
        // are read from an external data file at init time, so they are not known here.
        continue
      }
      const rhs = v.parsedEqn?.rhs
      if (rhs?.kind !== 'expr') {
        // Skip constants that don't have a simple expression on the right-hand side
        continue
      }
      const value = constNumberValue(rhs.expr)
      if (value === undefined) {
        // Skip constants whose right-hand side doesn't resolve to a number.  An arithmetic
        // expression (even one over numbers only, like `2*3`) is emitted as generated code in
        // `initConstants` rather than as a value we can write out here.
        continue
      }
      literalConstVars.set(v.varName, cdbl(value))
    }
  }

  /**
   * Return the numeric value of the given expression, or undefined if it is not a number.
   *
   * This looks through parentheses and unary plus/minus operators, so an equation like
   * `x = -(1.5)` resolves to -1.5.  These are the only expressions that are reduced here;
   * folding arithmetic (`2*3` and the like) would mean computing the value in JavaScript
   * instead of letting the C compiler do it, which we avoid.
   *
   * @param {*} expr The expression to evaluate.
   * @returns {number | undefined} The numeric value of the expression, or undefined if the
   * expression is not a (possibly negated) number.
   */
  function constNumberValue(expr) {
    switch (expr?.kind) {
      case 'number':
        return expr.value
      case 'parens':
        return constNumberValue(expr.expr)
      case 'unary-op': {
        if (expr.op !== '-' && expr.op !== '+') {
          return undefined
        }
        const childValue = constNumberValue(expr.expr)
        if (childValue === undefined) {
          return undefined
        }
        return expr.op === '-' ? -childValue : childValue
      }
      default:
        return undefined
    }
  }

  // Each code section follows in an outline of the generated model code.

  //
  // Declaration section
  //
  function emitDeclCode() {
    mode = 'decl'
    return `#include "sde.h"
${literalConstSection()}
// Model variables
${declSection()}

// Internal variables
${internalVarsSection()}

// Array dimensions
${arrayDimensionsSection()}

// Dimension mappings
${dimensionMappingsSection()}

// Lookup data arrays
${section(Model.lookupVars())}
${section(Model.dataVars())}

`
  }

  //
  // Initialization section
  //
  function emitInitLookupsCode() {
    mode = 'init-lookups'
    let code = `\
// Internal state
bool lookups_initialized = false;
bool data_initialized = false;

`
    code += chunkedFunctions(
      'initLookups',
      Model.lookupVars(),
      `\
  // Initialize lookups.
  if (lookups_initialized) {
    return;
  }`,
      '  lookups_initialized = true;'
    )
    code += chunkedFunctions(
      'initData',
      Model.dataVars(),
      `\
  // Initialize data.
  if (data_initialized) {
    return;
  }`,
      '  data_initialized = true;'
    )
    return code
  }

  function emitInitConstantsCode() {
    mode = 'init-constants'
    // Skip the constants that are emitted as literals in the declaration section
    const constVars = R.reject(v => literalConstVars.has(v.varName), Model.constVars())
    return chunkedFunctions('initConstants', constVars, '  // Initialize constants.', '  initLookups();\n  initData();')
  }

  function emitInitLevelsCode() {
    mode = 'init-levels'
    return chunkedFunctions(
      'initLevels',
      Model.initVars(),
      `\
  // Initialize variables with initialization values, such as levels, and the variables they depend on.
  _time = _initial_time;`
    )
  }

  //
  // Evaluation section
  //
  function emitEvalCode() {
    mode = 'eval'

    return `\
${chunkedFunctions('evalAux', Model.auxVars(), '  // Evaluate auxiliaries in order from the bottom up.')}\
${chunkedFunctions('evalLevels', Model.levelVars(), '  // Evaluate levels.')}`
  }

  //
  // Input/output section
  //
  function emitIOCode() {
    // Configure the body of the `setConstant` function depending on the value
    // of the `customConstants` property in the spec file
    let setConstantBody
    if (spec.customConstants === true || Array.isArray(spec.customConstants)) {
      setConstantBody = `\
  switch (varIndex) {
${setConstantImpl(Model.varIndexInfo(), spec.customConstants)}
    default:
      fprintf(stderr, "No constant found for var index %zu in setConstant\\n", varIndex);
      break;
  }`
    } else {
      let msg = 'The setConstant function was not enabled for the generated model. '
      msg += 'Set the customConstants property in the spec/config file to allow for overriding constants at runtime.'
      setConstantBody = `\
  fprintf(stderr, "${msg}\\n");`
    }

    // Configure the body of the `setLookup` function depending on the value
    // of the `customLookups` property in the spec file
    // TODO: The fprintf calls should be replaced with a mechanism that throws
    // an error (we could add a wrapper function at the JS level)
    let setLookupBody
    if (spec.customLookups === true || Array.isArray(spec.customLookups)) {
      setLookupBody = `\
  Lookup** pLookup = NULL;
  switch (varIndex) {
${setLookupImpl(Model.varIndexInfo(), spec.customLookups)}
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
  }`
    } else {
      let msg = 'The setLookup function was not enabled for the generated model. '
      msg += 'Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.'
      setLookupBody = `\
  fprintf(stderr, "${msg}\\n");`
    }

    // Configure the output variables that appear in the generated `getHeader`
    // and `storeOutputData` functions
    let headerVarNames = outputAllVars ? expandedVarNames(true) : spec.outputVarNames
    let outputVarIds = outputAllVars ? expandedVarNames() : spec.outputVars

    // Configure the body of the `storeOutput` function depending on the value
    // of the `customOutputs` property in the spec file
    let storeOutputBody
    if (spec.customOutputs === true || Array.isArray(spec.customOutputs)) {
      storeOutputBody = `\
  switch (varIndex) {
${customOutputSection(Model.varIndexInfo(), spec.customOutputs)}
    default:
      fprintf(stderr, "No variable found for var index %zu in storeOutput\\n", varIndex);
      break;
  }`
    } else {
      let msg = 'The storeOutput function was not enabled for the generated model. '
      msg +=
        'Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.'
      storeOutputBody = `\
  fprintf(stderr, "${msg}\\n");`
    }

    mode = 'io'
    return `\
void setInputs(double* inputValues, int32_t* inputIndices) {
${setInputsImpl()}
}

void setConstant(size_t varIndex, size_t* subIndices, double value) {
${setConstantBody}
}

void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints) {
${setLookupBody}
}

const char* getHeader() {
  return "${R.map(varName => varName.replace(/"/g, '\\"'), headerVarNames).join('\\t')}";
}

void storeOutputData() {
${specOutputSection(outputVarIds)}
}

void storeOutput(size_t varIndex, size_t* subIndices) {
${storeOutputBody}
}
`
  }

  //
  // Chunked function helper
  //
  function chunkedFunctions(name, vars, preStep, postStep) {
    // Emit one function for each chunk
    let func = (chunk, idx) => {
      return `\
void ${name}${idx}() {
${section(chunk)}
}
`
    }
    let funcs = R.pipe(mapIndexed(func), lines)

    // Emit one roll-up function that calls the other chunk functions
    let funcCall = (chunk, idx) => {
      return `  ${name}${idx}();`
    }
    let funcCalls = R.pipe(mapIndexed(funcCall), lines)

    // Break the vars into chunks.  The default value of 30 was empirically
    // determined by looking at runtime performance and memory usage of the
    // En-ROADS model on various devices.
    let chunkSize
    if (process.env.SDE_CODE_GEN_CHUNK_SIZE) {
      chunkSize = parseInt(process.env.SDE_CODE_GEN_CHUNK_SIZE)
    } else {
      chunkSize = 30
    }
    let chunks
    if (chunkSize > 0) {
      chunks = R.splitEvery(chunkSize, vars)
    } else {
      chunks = [vars]
    }

    let funcsPart = funcs(chunks)
    let callsPart = funcCalls(chunks)

    let out = ''
    if (funcsPart.length > 0) {
      out += funcsPart + '\n'
    }
    out += `void ${name}() {\n`
    if (preStep) {
      out += preStep + '\n'
    }
    if (callsPart.length > 0) {
      out += callsPart + '\n'
    }
    if (postStep) {
      out += postStep + '\n'
    }
    out += '}\n\n'
    return out
  }

  //
  // Declaration section helpers
  //
  function declSection() {
    // Emit a declaration for each variable in the model.
    let fixedDelayDecls = ''
    let depreciationDecls = ''
    let decl = v => {
      // Build a C array declaration for the variable v.
      // This uses the subscript family for each dimension, which may overallocate
      // if the subscript is a subdimension.
      let varType = v.isLookup() || v.isData() ? 'Lookup* ' : 'double '
      let families = subscriptFamilies(v.subscripts)
      if (v.isFixedDelay()) {
        // Add the associated FixedDelay var decl.
        fixedDelayDecls += `\nFixedDelay* ${v.fixedDelayVarName}${R.map(
          family => `[${sub(family).size}]`,
          families
        ).join('')};`
      } else if (v.isDepreciation()) {
        // Add the associated Depreciation var decl.
        depreciationDecls += `\nDepreciation* ${v.depreciationVarName}${R.map(
          family => `[${sub(family).size}]`,
          families
        ).join('')};`
      }
      return varType + v.varName + R.map(family => `[${sub(family).size}]`, families).join('')
    }
    // Non-apply-to-all variables are declared multiple times, but coalesce using uniq.
    let decls = R.pipe(
      R.map(v => `${decl(v)};`),
      R.uniq,
      asort,
      lines
    )
    // Skip the constants that are emitted as literals in `literalConstSection`
    const vars = R.reject(v => literalConstVars.has(v.varName), Model.allVars())
    return decls(vars) + fixedDelayDecls + depreciationDecls
  }
  function literalConstSection() {
    // Emit a definition for each constant that is emitted as a C literal (see
    // `resolveLiteralConstVars`).  Note that this includes the section heading and a
    // leading blank line so that the whole section disappears when there are no such
    // constants.
    if (literalConstVars.size === 0) {
      return ''
    }
    const defs = [...literalConstVars].map(([varName, value]) => `static const double ${varName} = ${value};`)
    return `\n// Constants\n${lines(asort(defs))}\n`
  }
  function internalVarsSection() {
    // Declare internal variables to run the model.
    let numInputsDecl
    if (spec.inputVars && spec.inputVars.length > 0) {
      numInputsDecl = `const int numInputs = ${spec.inputVars.length};`
    } else {
      numInputsDecl = `const int numInputs = 0;`
    }
    let numOutputsDecl
    if (outputAllVars) {
      numOutputsDecl = `const int numOutputs = ${expandedVarNames().length};`
    } else {
      numOutputsDecl = `const int numOutputs = ${spec.outputVars.length};`
    }
    return `${numInputsDecl}\n${numOutputsDecl}`
  }
  function arrayDimensionsSection() {
    // Emit a declaration for each array dimension's index numbers.
    // These index number arrays will be used to indirectly reference array elements.
    // The indirection is required to support subdimensions that are a non-contiguous subset of the array elements.
    let a = R.map(dim => `const size_t ${dim.name}[${dim.size}] = { ${indexNumberList(sub(dim.name).value)} };`)
    let arrayDims = R.pipe(a, asort, lines)
    return arrayDims(allDimensions())
  }
  function dimensionMappingsSection() {
    // Emit a mapping array for each dimension mapping.
    let a = R.map(m => {
      return `const size_t __map${m.mapFrom}${m.mapTo}[${sub(m.mapTo).size}] = { ${indexNumberList(m.value)} };`
    })
    let mappingArrays = R.pipe(a, asort, lines)
    return mappingArrays(allMappings())
  }
  function indexNumberList(indices) {
    // Make a comma-delimited list of index numbers in the dimension working from the index names.
    let a = R.map(indexName => sub(indexName).value, indices)
    return strlist(a)
  }
  function expandedVarNames(vensimNames = false) {
    // Return a list of var names for all variables except lookups and data variables.
    // The names are in Vensim format if vensimNames is true, otherwise they are in C format.
    // Expand subscripted vars into separate var names with each index.
    const canonicalNames = !vensimNames
    return expandVarNames(canonicalNames)
  }
  //
  // Input/output section helpers
  //
  function specOutputSection(varNames) {
    // Emit `outputVar` calls for all variables listed in the `outputVarNames`
    // array in the spec file using varNames in C format.
    let code = R.map(varName => `  outputVar(${varName});`)
    let section = R.pipe(code, lines)
    return section(varNames)
  }
  function customOutputSection(varIndexInfo, customOutputs) {
    // Emit `outputVar` calls for all variables that can be accessed as an output.
    // This excludes data and lookup variables; at this time, the data for these
    // cannot be output like for other types of variables.
    let includeCase
    if (Array.isArray(customOutputs)) {
      // Only include a case statement if the variable was explicitly included
      // in the `customOutputs` array in the spec file
      const customOutputVarNames = customOutputs.map(varName => {
        // The developer might specify a variable name that includes subscripts,
        // but we will ignore the subscript part and only match on the base name
        return canonicalVensimName(varName.split('[')[0])
      })
      includeCase = varName => customOutputVarNames.includes(varName)
    } else {
      // Include a case statement for all accessible variables
      includeCase = () => true
    }
    const outputVars = R.filter(info => {
      return info.varType !== 'lookup' && info.varType !== 'data' && includeCase(info.varName)
    })
    const code = R.map(info => {
      let varAccess = info.varName
      for (let i = 0; i < info.subscriptCount; i++) {
        varAccess += `[subIndices[${i}]]`
      }
      return `\
    case ${info.varIndex}:
      outputVar(${varAccess});
      break;`
    })
    const section = R.pipe(outputVars, code, lines)
    return section(varIndexInfo)
  }
  function setInputsImpl() {
    if (!spec.inputVars || spec.inputVars.length === 0) {
      return ''
    }
    // Build the pointer table for input variables
    let inputVarPtrs = R.reduce((a, inputVar) => R.concat(a, `    &${inputVar},\n`), '', spec.inputVars)
    return `\
  static double* inputVarPtrs[] = {
${inputVarPtrs}  };
  if (inputIndices == NULL) {
    // When inputIndices is NULL, assume that inputValues contains all input values
    // in the same order that the variables are defined in the model spec
    for (size_t i = 0; i < numInputs; i++) {
      *inputVarPtrs[i] = inputValues[i];
    }
  } else {
    // When inputIndices is non-NULL, set the input values according to the indices
    // in the inputIndices array, where each index corresponds to the index of the
    // variable in the model spec
    size_t numInputsToSet = (size_t)inputIndices[0];
    for (size_t i = 0; i < numInputsToSet; i++) {
      size_t inputVarIndex = (size_t)inputIndices[i + 1];
      *inputVarPtrs[inputVarIndex] = inputValues[i];
    }
  }`
  }
  function setConstantImpl(varIndexInfo, customConstants) {
    // Emit case statements for all const variables that can be overridden at runtime
    let includeCase
    if (Array.isArray(customConstants)) {
      // Only include a case statement if the variable was explicitly included
      // in the `customConstants` array in the spec file
      const customConstantVarNames = customConstants.map(varName => {
        // The developer might specify a variable name that includes subscripts,
        // but we will ignore the subscript part and only match on the base name
        return canonicalVensimName(varName.split('[')[0])
      })
      includeCase = varName => customConstantVarNames.includes(varName)
    } else {
      // Include a case statement for all constant variables
      includeCase = () => true
    }
    const constVars = R.filter(info => {
      return info.varType === 'const' && includeCase(info.varName)
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
  function setLookupImpl(varIndexInfo, customLookups) {
    // Emit case statements for all lookups and data variables that can be overridden
    // at runtime
    let includeCase
    if (Array.isArray(customLookups)) {
      // Only include a case statement if the variable was explicitly included
      // in the `customLookups` array in the spec file
      const customLookupVarNames = customLookups.map(varName => {
        // The developer might specify a variable name that includes subscripts,
        // but we will ignore the subscript part and only match on the base name
        return canonicalVensimName(varName.split('[')[0])
      })
      includeCase = varName => customLookupVarNames.includes(varName)
    } else {
      // Include a case statement for all lookup and data variables
      includeCase = () => true
    }
    const lookupAndDataVars = R.filter(info => {
      return (info.varType === 'lookup' || info.varType === 'data') && includeCase(info.varName)
    })
    const code = R.map(info => {
      let lookupVar = info.varName
      for (let i = 0; i < info.subscriptCount; i++) {
        lookupVar += `[subIndices[${i}]]`
      }
      let c = ''
      c += `    case ${info.varIndex}:\n`
      c += `      pLookup = &${lookupVar};\n`
      c += `      break;`
      return c
    })
    const section = R.pipe(lookupAndDataVars, code, lines)
    return section(varIndexInfo)
  }

  return {
    generate: generate
  }
}
