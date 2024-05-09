import * as R from 'ramda'

import { asort, lines, strlist, mapIndexed } from '../_shared/helpers.js'
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
  let outputAllVars
  if (spec.outputVars && spec.outputVars.length > 0) {
    outputAllVars = false
  } else if (spec.outputVarNames && spec.outputVarNames.length > 0) {
    outputAllVars = false
  } else {
    outputAllVars = true
  }
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

  // Some models may define the control parameters as variables that are
  // dependent on other values that are only known at runtime (after running
  // the initializers and/or one step of the model), so we need to perform
  // those steps once before the parameters are accessed
  // TODO: This approach doesn't work if one or more control parameters are
  // defined in terms of some value that is provided at runtime as an input
  initConstants();
  initLevels();
  setTime(_initial_time);
  evalAux();
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
    let outputVarNames = outputAllVars ? expandedVarNames(true) : spec.outputVars
    let outputVarIds = outputAllVars ? expandedVarNames() : spec.outputVars
    mode = 'io'
    return `\
/*export*/ function setInputs(valueAtIndex /*: (index: number) => number*/) {${inputsFromBufferImpl()}}

/*export*/ function getOutputVarIds() {
  return [
    ${outputVarIds.map(id => `'${id}'`).join(',\n    ')}
  ]
}

/*export*/ function getOutputVarNames() {
  return [
    ${outputVarNames.map(name => `'${Model.vensimName(name).replace(/'/g, `\\'`)}'`).join(',\n    ')}
  ]
}

/*export*/ function storeOutputs(storeValue /*: (value: number) => void*/) {
${specOutputSection(outputVarIds)}
}

/*export*/ function storeOutput(varIndex, subIndex0, subIndex1, subIndex2, storeValue /*: (value: number) => void*/) {
  switch (varIndex) {
${fullOutputSection(Model.varIndexInfo())}
    default:
      break;
  }
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
  // function internalVarsSection() {
  //   // Declare internal variables to run the model.
  //   let decls
  //   if (outputAllVars) {
  //     decls = `const numOutputs = ${expandedVarNames().length};`
  //   } else {
  //     decls = `const numOutputs = ${spec.outputVars.length};`
  //   }
  //   // TODO
  //   // decls += `\n#define SDE_USE_OUTPUT_INDICES 0`
  //   // decls += `\n#define SDE_MAX_OUTPUT_INDICES 1000`
  //   // decls += `\nconst int maxOutputIndices = SDE_USE_OUTPUT_INDICES ? SDE_MAX_OUTPUT_INDICES : 0;`
  //   return decls
  // }
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
    // Emit output calls using varNames in C format.
    let code = R.map(varName => `  storeValue(${varName});`)
    let section = R.pipe(code, lines)
    return section(varNames)
  }
  function fullOutputSection(varIndexInfo) {
    // Emit output calls for all variables.
    const code = R.map(info => {
      let varAccess = info.varName
      if (info.subscriptCount > 0) {
        varAccess += '[subIndex0]'
      }
      if (info.subscriptCount > 1) {
        varAccess += '[subIndex1]'
      }
      if (info.subscriptCount > 2) {
        varAccess += '[subIndex2]'
      }
      let c = ''
      c += `    case ${info.varIndex}:\n`
      c += `      storeValue(${varAccess});\n`
      c += `      break;`
      return c
    })
    const section = R.pipe(code, lines)
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

  return {
    generate: generate
  }

  //
  // Module exports
  //
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
    getInitialTime,
    getFinalTime,
    getTimeStep,
    getSaveFreq,

    getModelFunctions,
    setModelFunctions,

    setTime,

    setInputs,

    getOutputVarIds,
    getOutputVarNames,
    storeOutputs,

    initConstants,
    initLevels,
    evalAux,
    evalLevels
  }
}
`
  }
}
