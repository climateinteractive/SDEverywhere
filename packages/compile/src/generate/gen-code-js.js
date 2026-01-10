import * as R from 'ramda'

import { asort, canonicalVensimName, lines, strlist, mapIndexed } from '../_shared/helpers.js'
import { sub, allDimensions, allMappings, subscriptFamilies } from '../_shared/subscript.js'
import Model from '../model/model.js'

import { generateEquation } from './gen-equation.js'
import { expandVarNames } from './expand-var-names.js'

export function generateJS(parsedModel, opts) {
  return codeGenerator(parsedModel, opts).generate()
}

let codeGenerator = (parsedModel, opts) => {
  const { spec, operations, extData, directData, modelDirname } = opts
  // Set to 'decl', 'init-lookups', 'eval', etc depending on the section being generated.
  let mode = ''
  // Set to true to output all variables when there is no model run spec.
  let outputAllVars = spec.outputVarNames === undefined || spec.outputVarNames.length === 0
  // Function to generate a section of the code
  let generateSection = R.map(v => {
    return generateEquation(v, mode, extData, directData, modelDirname, 'js')
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
    if (operations.includes('generateJS')) {
      // Generate code for each variable in the proper order.
      let code = emitDeclCode()
      code += emitInitLookupsCode()
      code += emitInitConstantsCode()
      code += emitInitLevelsCode()
      code += emitEvalCode()
      code += emitIOCode()
      code += emitModelListing(spec.bundleListing)
      code += emitDefaultFunction()
      return code
    }
  }

  // Each code section follows in an outline of the generated model code.

  //
  // Declaration section
  //
  function emitDeclCode() {
    mode = 'decl'
    return `\
// Model variables
${declSection()}

// Array dimensions
${arrayDimensionsSection()}

// Dimension mappings
${dimensionMappingsSection()}

// Lookup data arrays
${section(Model.lookupVars())}
${section(Model.dataVars())}

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

`
  }

  //
  // Initialization section
  //
  function emitInitLookupsCode() {
    mode = 'init-lookups'
    let code = `// Internal state
let lookups_initialized = false;
let data_initialized = false;

`
    code += chunkedFunctions(
      'initLookups',
      false,
      Model.lookupVars(),
      '  // Initialize lookups\n  if (!lookups_initialized) {',
      '    lookups_initialized = true;\n  }'
    )
    code += '\n'
    code += chunkedFunctions(
      'initData',
      false,
      Model.dataVars(),
      '  // Initialize data\n  if (!data_initialized) {',
      '    data_initialized = true;\n  }'
    )
    return code
  }

  function emitInitConstantsCode() {
    mode = 'init-constants'
    return `
${chunkedFunctions(
  'initConstants',
  true,
  Model.constVars(),
  '  // Initialize constants',
  '  initLookups();\n  initData();'
)}`
  }

  function emitInitLevelsCode() {
    mode = 'init-levels'
    return `
${chunkedFunctions(
  'initLevels',
  true,
  Model.initVars(),
  '  // Initialize variables with initialization values, such as levels, and the variables they depend on'
)}`
  }

  //
  // Evaluation section
  //
  function emitEvalCode() {
    mode = 'eval'

    return `
${chunkedFunctions('evalAux', true, Model.auxVars(), '  // Evaluate auxiliaries in order from the bottom up')}
${chunkedFunctions('evalLevels', true, Model.levelVars(), '  // Evaluate levels')}
`
  }

  //
  // Input/output section
  //
  function emitIOCode() {
    mode = 'io'

    // Configure the body of the `setConstant` function depending on the value
    // of the `customConstants` property in the spec file
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

    // Configure the body of the `setLookup` function depending on the value
    // of the `customLookups` property in the spec file
    let setLookupBody
    if (spec.customLookups === true || Array.isArray(spec.customLookups)) {
      setLookupBody = `\
  if (!varSpec) {
    throw new Error('Got undefined varSpec in setLookup');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  let lookup;
  switch (varIndex) {
${setLookupImpl(Model.varIndexInfo(), spec.customLookups)}
    default:
      throw new Error(\`No lookup found for var index \${varIndex} in setLookup\`);
  }
  if (lookup) {
    const size = points ? points.length / 2 : 0;
    lookup.setData(size, points);
  }`
    } else {
      let msg = 'The setLookup function was not enabled for the generated model. '
      msg += 'Set the customLookups property in the spec/config file to allow for overriding lookups at runtime.'
      setLookupBody = `  throw new Error('${msg}');`
    }

    // This is the list of original output variable names (as supplied by the user in
    // the `spec.json` file), for example, `a[A2,B1]`.  These are exported mainly for
    // use in the implementation of the `sde exec` command, which generates a TSV file
    // with a header line that includes the original variable names for all outputs.
    const outputVarNames = outputAllVars ? expandedVarNames(true) : spec.outputVarNames
    const outputVarNameElems = outputVarNames
      .map(name => `'${Model.vensimName(name).replace(/'/g, `\\'`)}'`)
      .join(',\n  ')

    // This is the list of output variable identifiers (in canonical format), for
    // example, `_a[_a2,_b2]`.  These are exported for use in the runtime package
    // for having a canonical identifier associated with the data for each output.
    const outputVarIds = outputVarNames.map(canonicalVensimName)
    const outputVarIdElems = outputVarIds.map(id => `'${id}'`).join(',\n  ')

    // This is the list of output variable access declarations, which are in valid
    // C code format, with subscripts mapped to C index form, for example,
    // `_a[1][0]`.  These are used in the implementation of `storeOutputs`.
    const outputVarAccesses = outputAllVars ? expandedVarNames() : spec.outputVars

    // Configure the body of the `storeOutput` function depending on the value
    // of the `customOutputs` property in the spec file
    let storeOutputBody
    if (spec.customOutputs === true || Array.isArray(spec.customOutputs)) {
      storeOutputBody = `\
  if (!varSpec) {
    throw new Error('Got undefined varSpec in storeOutput');
  }
  const varIndex = varSpec.varIndex;
  const subs = varSpec.subscriptIndices;
  switch (varIndex) {
${customOutputSection(Model.varIndexInfo(), spec.customOutputs)}
    default:
      throw new Error(\`No variable found for var index \${varIndex} in storeOutput\`);
  }`
    } else {
      let msg = 'The storeOutput function was not enabled for the generated model. '
      msg +=
        'Set the customOutputs property in the spec/config file to allow for capturing arbitrary variables at runtime.'
      storeOutputBody = `  throw new Error('${msg}');`
    }

    return `\
/*export*/ function setInputs(valueAtIndex /*: (index: number) => number*/) {${inputsFromBufferImpl()}}

/*export*/ function setLookup(varSpec /*: VarSpec*/, points /*: Float64Array | undefined*/) {
${setLookupBody}
}

/*export*/ function setConstant(varSpec /*: VarSpec*/, value /*: number*/) {
${setConstantBody}
}

/*export*/ const outputVarIds = [
  ${outputVarIdElems}
];

/*export*/ const outputVarNames = [
  ${outputVarNameElems}
];

/*export*/ function storeOutputs(storeValue /*: (value: number) => void*/) {
${specOutputSection(outputVarAccesses)}
}

/*export*/ function storeOutput(varSpec /*: VarSpec*/, storeValue /*: (value: number) => void*/) {
${storeOutputBody}
}

`
  }

  //
  // Chunked function helper
  //
  function chunkedFunctions(name, exported, vars, preStep, postStep) {
    // Emit one function for each chunk
    let func = (chunk, idx) => {
      return `\
function ${name}${idx}() {
${section(chunk)}
}
`
    }
    let funcs = R.pipe(mapIndexed(func), lines)

    // Emit one roll-up function that calls the other chunk functions
    const indent = name === 'initLookups' || name === 'initData' ? 4 : 2
    let funcCall = (chunk, idx) => {
      return `${' '.repeat(indent)}${name}${idx}();`
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

    const chunkedFuncs = funcs(chunks)
    const chunkedCalls = funcCalls(chunks)

    let code = ''
    if (chunkedFuncs.length > 0) {
      code += `${chunkedFuncs}\n`
    }
    code += `${exported ? '/*export*/ ' : ''}function ${name}() {\n`
    if (preStep?.length > 0) {
      code += `${preStep}\n`
    }
    if (chunkedCalls.length > 0) {
      code += `${chunkedCalls}\n`
    }
    if (postStep?.length > 0) {
      code += `${postStep}\n`
    }
    code += '}\n'
    return code
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
      let families = subscriptFamilies(v.subscripts)
      if (v.isFixedDelay()) {
        // TODO
        // Add the associated FixedDelay var decl.
        fixedDelayDecls += `\nFixedDelay* ${v.fixedDelayVarName}${R.map(
          family => `[${sub(family).size}]`,
          families
        ).join('')};`
      } else if (v.isDepreciation()) {
        // TODO
        // Add the associated Depreciation var decl.
        depreciationDecls += `\nDepreciation* ${v.depreciationVarName}${R.map(
          family => `[${sub(family).size}]`,
          families
        ).join('')};`
      }
      if (families.length > 0) {
        const dimLengths = families.map(family => `${sub(family).size}`).join(', ')
        return `let ${v.varName} = multiDimArray([${dimLengths}]);`
      } else {
        return `let ${v.varName};`
      }
    }
    // Non-apply-to-all variables are declared multiple times, but coalesce using uniq.
    let decls = R.pipe(
      R.map(v => `${decl(v)}`),
      R.uniq,
      asort,
      lines
    )
    return decls(Model.allVars()) + fixedDelayDecls + depreciationDecls
  }
  function arrayDimensionsSection() {
    // Emit a declaration for each array dimension's index numbers.
    // These index number arrays will be used to indirectly reference array elements.
    // The indirection is required to support subdimensions that are a non-contiguous subset of the array elements.
    let a = R.map(dim => `const ${dim.name} = [${indexNumberList(sub(dim.name).value)}];`)
    let arrayDims = R.pipe(a, asort, lines)
    return arrayDims(allDimensions())
  }
  function dimensionMappingsSection() {
    // Emit a mapping array for each dimension mapping.
    let a = R.map(m => {
      return `const __map${m.mapFrom}${m.mapTo} = [${indexNumberList(m.value)}];`
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
    // Emit `storeValue` calls for all variables listed in the `outputVarNames`
    // array in the spec file using varNames in C/JS format.
    let code = R.map(varName => `  storeValue(${varName});`)
    let section = R.pipe(code, lines)
    return section(varNames)
  }
  function customOutputSection(varIndexInfo, customOutputs) {
    // Emit `storeValue` calls for all variables that can be accessed as an output.
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
        varAccess += `[subs[${i}]]`
      }
      let c = ''
      c += `    case ${info.varIndex}:\n`
      c += `      storeValue(${varAccess});\n`
      c += `      break;`
      return c
    })
    const section = R.pipe(outputVars, code, lines)
    return section(varIndexInfo)
  }
  function inputsFromBufferImpl() {
    let inputVars = ''
    if (spec.inputVars && spec.inputVars.length > 0) {
      inputVars += '\n'
      for (let i = 0; i < spec.inputVars.length; i++) {
        const inputVar = spec.inputVars[i]
        inputVars += `  ${inputVar} = valueAtIndex(${i});\n`
      }
    }
    return inputVars
  }
  function setConstantImpl(varIndexInfo, customConstants) {
    // Emit case statements for all const variables that can be overridden at runtime
    let overrideAllowed
    if (Array.isArray(customConstants)) {
      // Only include a case statement if the variable was explicitly included
      // in the `customConstants` array in the spec file
      const customConstantVarNames = customConstants.map(varName => {
        // The developer might specify a variable name that includes subscripts,
        // but we will ignore the subscript part and only match on the base name
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
  function setLookupImpl(varIndexInfo, customLookups) {
    // Emit case statements for all lookups and data variables that can be overridden
    // at runtime
    let overrideAllowed
    if (Array.isArray(customLookups)) {
      // Only include a case statement if the variable was explicitly included
      // in the `customLookups` array in the spec file
      const customLookupVarNames = customLookups.map(varName => {
        // The developer might specify a variable name that includes subscripts,
        // but we will ignore the subscript part and only match on the base name
        return canonicalVensimName(varName.split('[')[0])
      })
      overrideAllowed = varName => customLookupVarNames.includes(varName)
    } else {
      // Include a case statement for all lookup and data variables
      overrideAllowed = () => true
    }
    const lookupAndDataVars = R.filter(info => {
      return (info.varType === 'lookup' || info.varType === 'data') && overrideAllowed(info.varName)
    })
    const code = R.map(info => {
      let lookupVar = info.varName
      for (let i = 0; i < info.subscriptCount; i++) {
        lookupVar += `[subs[${i}]]`
      }
      let c = ''
      c += `    case ${info.varIndex}:\n`
      c += `      lookup = ${lookupVar};\n`
      c += `      break;`
      return c
    })
    const section = R.pipe(lookupAndDataVars, code, lines)
    return section(varIndexInfo)
  }

  return {
    generate: generate
  }

  //
  // Module exports
  //
  function emitModelListing(bundleListing) {
    let minimalListingJs
    if (bundleListing !== false) {
      const minimalListingJson = JSON.stringify(Model.jsonList().minimal, null, 2)
      minimalListingJs = minimalListingJson.replace(/"(\w+)"\s*:/g, '$1:').replaceAll('"', "'")
    } else {
      minimalListingJs = 'undefined;'
    }
    return `\
/*export*/ const modelListing = ${minimalListingJs}

`
  }
  function emitDefaultFunction() {
    // TODO: For now, the default function returns an object that has the shape of the
    // `JsModel` interface.  It is an async function for future proofing and so that it
    // has the same signature as the default function exported in a generated `WasmModule`.
    // One issue with the current implementation is that the generated code uses
    // module-level storage for variables, so if one were to call this default function
    // more than once, the returned objects would share the same underlying variables
    // (they are not distinct instances).  We can fix this by changing the code generator
    // to output a class, or some other approach that allows for creating distinct
    // instances.  This is unlikely to be a problem in practice though, so it isn't
    // high priority.
    return `\
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
`
  }
}
