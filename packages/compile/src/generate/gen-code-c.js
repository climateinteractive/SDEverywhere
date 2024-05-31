import * as R from 'ramda'

import { asort, lines, strlist, mapIndexed } from '../_shared/helpers.js'
import { sub, allDimensions, allMappings, subscriptFamilies } from '../_shared/subscript.js'
import Model from '../model/model.js'

import { generateEquation } from './gen-equation.js'
import { expandVarNames } from './expand-var-names.js'

export function generateC(parsedModel, opts) {
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

  // Each code section follows in an outline of the generated model code.

  //
  // Declaration section
  //
  function emitDeclCode() {
    mode = 'decl'
    return `#include "sde.h"

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
    return chunkedFunctions(
      'initConstants',
      Model.constVars(),
      '  // Initialize constants.',
      '  initLookups();\n  initData();'
    )
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
    let headerVarNames = outputAllVars ? expandedVarNames(true) : spec.outputVarNames
    let outputVarIds = outputAllVars ? expandedVarNames() : spec.outputVars
    mode = 'io'
    return `\
void setInputs(const char* inputData) {
${inputsFromStringImpl()}
}

void setInputsFromBuffer(double* inputData) {
${inputsFromBufferImpl()}
}

void replaceLookup(Lookup** lookup, double* points, size_t numPoints) {
  if (lookup == NULL) {
    return;
  }
  if (*lookup != NULL) {
    __delete_lookup(*lookup);
    *lookup = NULL;
  }
  if (points != NULL) {
    *lookup = __new_lookup(numPoints, /*copy=*/true, points);
  }
}

void setLookup(size_t varIndex, size_t* subIndices, double* points, size_t numPoints) {
  switch (varIndex) {
${setLookupImpl(Model.varIndexInfo())}
    default:
      break;
  }
}

const char* getHeader() {
  return "${R.map(varName => varName.replace(/"/g, '\\"'), headerVarNames).join('\\t')}";
}

void storeOutputData() {
${specOutputSection(outputVarIds)}
}

void storeOutput(size_t varIndex, size_t subIndex0, size_t subIndex1, size_t subIndex2) {
#if SDE_USE_OUTPUT_INDICES
  switch (varIndex) {
${fullOutputSection(Model.varIndexInfo())}
    default:
      break;
  }
#endif
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
    return decls(Model.allVars()) + fixedDelayDecls + depreciationDecls
  }
  function internalVarsSection() {
    // Declare internal variables to run the model.
    let decls
    if (outputAllVars) {
      decls = `const int numOutputs = ${expandedVarNames().length};`
    } else {
      decls = `const int numOutputs = ${spec.outputVars.length};`
    }
    decls += `\n#define SDE_USE_OUTPUT_INDICES 0`
    decls += `\n#define SDE_MAX_OUTPUT_INDICES 1000`
    decls += `\nconst int maxOutputIndices = SDE_USE_OUTPUT_INDICES ? SDE_MAX_OUTPUT_INDICES : 0;`
    return decls
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
    // Emit output calls using varNames in C format.
    let code = R.map(varName => `  outputVar(${varName});`)
    let section = R.pipe(code, lines)
    return section(varNames)
  }
  function fullOutputSection(varIndexInfo) {
    // Emit `storeValue` calls for all variables that can be accessed as an output.
    // This excludes data and lookup variables; at this time, the data for these
    // cannot be output like for other types of variables.
    const outputVars = R.filter(info => info.varType !== 'lookup' && info.varType !== 'data')
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
      return `\
    case ${info.varIndex}:
      outputVar(${varAccess});
      break;`
    })
    const section = R.pipe(outputVars, code, lines)
    return section(varIndexInfo)
  }
  function inputsFromStringImpl() {
    // If there was an I/O spec file, then emit code to parse input variables.
    // The user can replace this with a parser for a different serialization format.
    let inputVars = ''
    if (spec.inputVars && spec.inputVars.length > 0) {
      let inputVarPtrs = R.reduce((a, inputVar) => R.concat(a, `    &${inputVar},\n`), '', spec.inputVars)
      inputVars = `\
  static double* inputVarPtrs[] = {\n${inputVarPtrs}  };
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
  }`
    }
    return inputVars
  }
  function inputsFromBufferImpl() {
    let inputVars = []
    if (spec.inputVars && spec.inputVars.length > 0) {
      for (let i = 0; i < spec.inputVars.length; i++) {
        const inputVar = spec.inputVars[i]
        inputVars.push(`  ${inputVar} = inputData[${i}];`)
      }
    }
    return inputVars.join('\n')
  }
  function setLookupImpl(varIndexInfo) {
    // Emit `createLookup` calls for all lookups and data variables that can be overridden
    // at runtime
    const lookupAndDataVars = R.filter(info => info.varType === 'lookup' || info.varType === 'data')
    const code = R.map(info => {
      let lookupVar = info.varName
      for (let i = 0; i < info.subscriptCount; i++) {
        lookupVar += `[subIndices[${i}]]`
      }
      let c = ''
      c += `    case ${info.varIndex}:\n`
      c += `      replaceLookup(&${lookupVar}, points, numPoints);\n`
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
