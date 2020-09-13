const R = require('ramda')
const ModelLHSReader = require('./ModelLHSReader')
const EquationGen = require('./EquationGen')
const Model = require('./Model')
const { sub, allDimensions, allMappings, subscriptFamilies } = require('./Subscript')
const { asort, lines, strlist, abend, mapIndexed } = require('./Helpers')

let codeGenerator = (parseTree, opts) => {
  const { spec, operation, extData, directData } = opts
  // Set true when in the init section, false in the eval section.
  let initMode = false
  // Set true to output all variables when there is no model run spec.
  let outputAllVars = spec.outputVars && spec.outputVars.length > 0 ? false : true
  // Function to generate a section of the code
  let generateSection = R.map(v => new EquationGen(v, extData, directData, initMode).generate())
  let section = R.pipe(generateSection, R.flatten, lines)
  function generate() {
    // Read variables and subscript ranges from the model parse tree.
    // This is the main entry point for code generation and is called just once.
    try {
      Model.read(parseTree, spec, extData, directData)
      // In list mode, print variables to the console instead of generating code.
      if (operation === 'printRefIdTest') {
        Model.printRefIdTest()
      } else if (operation === 'printRefGraph') {
        Model.printRefGraph(opts.varname)
      } else if (operation === 'convertNames') {
        // Do not generate output, but leave the results of model analysis.
      } else if (operation === 'generateC') {
        // Generate code for each variable in the proper order.
        let code = emitDeclCode()
        code += emitInitCode()
        code += emitEvalCode()
        code += emitIOCode()
        return code
      }
    } catch (e) {
      abend(e)
    }
  }

  // Each code section follows in an outline of the generated model code.

  //
  // Declaration section
  //
  function emitDeclCode() {
    initMode = false
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
  function emitInitCode() {
    initMode = true
    return `// Internal state
bool lookups_initialized = false;

void initLookups() {
  // Initialize lookups.
  if (!lookups_initialized) {
    ${section(Model.lookupVars())}
    ${section(Model.dataVars())}
    lookups_initialized = true;
  }
}

${chunkedFunctions('initConstants', Model.constVars(),
'  // Initialize constants.',
'  initLookups();'
)}

${chunkedFunctions('initLevels', Model.initVars(), `
  // Initialize variables with initialization values, such as levels, and the variables they depend on.
  _time = _initial_time;`
)}
`
  }

  //
  // Evaluation section
  //
  function emitEvalCode() {
    initMode = false

    return `
${chunkedFunctions('evalAux', Model.auxVars(),
'  // Evaluate auxiliaries in order from the bottom up.'
)}

${chunkedFunctions('evalLevels', Model.levelVars(),
'  // Evaluate levels.'
)}
`
  }

  //
  // Input/output section
  //
  function emitIOCode() {
    let headerVars = outputAllVars ? expandedVarNames(true) : spec.outputVars
    let outputVars = outputAllVars ? expandedVarNames() : spec.outputVars
    initMode = false
    return `void setInputs(const char* inputData) {
${inputSection()}}
const char* getHeader() {
  return "${R.map(varName => headerTitle(varName), headerVars).join('\\t')}";
}

void storeOutputData() {
${outputSection(outputVars)}
}
`
  }

  //
  // Chunked function helper
  //
  function chunkedFunctions(name, vars, preStep, postStep) {
    // Emit one function for each chunk
    let func = (chunk, idx) => {
      return `
void ${name}${idx}() {
  ${section(chunk)}
}
`
    }
    let funcs = R.pipe(
      mapIndexed(func),
      lines
    )

    // Emit one roll-up function that calls the other chunk functions
    let funcCall = (chunk, idx) => {
      return `  ${name}${idx}();`
    }
    let funcCalls = R.pipe(
      mapIndexed(funcCall),
      lines
    )

    // Break the vars into chunks of 30; this number was empirically
    // determined by looking at runtime performance and memory usage
    // of the En-ROADS model on various devices
    let chunks = R.splitEvery(30, vars)

    if (!preStep) {
      preStep = ''
    }
    if (!postStep) {
      postStep = ''
    }

    return `
${funcs(chunks)}

void ${name}() {
${preStep}
${funcCalls(chunks)}
${postStep}
}
    `
  }

  //
  // Declaration section helpers
  //
  function declSection() {
    // Emit a declaration for each variable in the model.
    let decl = v => {
      // Build a C array declaration for the variable v.
      // This uses the subscript family for each dimension, which may overallocate
      // if the subscript is a subdimension.
      let varType = v.isLookup() || v.isData() ? 'Lookup* ' : 'double '
      let families = subscriptFamilies(v.subscripts)
      return varType + v.varName + R.map(family => `[${sub(family).size}]`, families).join('')
    }
    // Non-apply-to-all variables are declared multiple times, but coalesce using uniq.
    let decls = R.pipe(
      R.map(v => `${decl(v)};`),
      R.uniq,
      asort,
      lines
    )
    return decls(Model.allVars())
  }
  function internalVarsSection() {
    // Declare internal variables to run the model.
    if (outputAllVars) {
      return `const int numOutputs = ${expandedVarNames().length};`
    } else {
      return `const int numOutputs = ${spec.outputVars.length};`
    }
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
  function expandedVarNames(vensimNames) {
    // Return a list of var names for all variables except lookups and data variables.
    // The names are in Vensim format if vensimNames is true, otherwise they are in C format.
    // Expand subscripted vars into separate var names with each index.
    function sortedVars() {
      // Return a list of all vars sorted by the model LHS var name (without subscripts), case insensitive.
      return R.sortBy(v => {
        let modelLHSReader = new ModelLHSReader()
        modelLHSReader.read(v.modelLHS)
        return modelLHSReader.varName.toUpperCase()
      }, Model.variables)
    }
    return R.uniq(
      R.reduce(
        (a, v) => {
          if (v.varType !== 'lookup' && v.varType !== 'data' && v.includeInOutput) {
            let modelLHSReader = new ModelLHSReader()
            modelLHSReader.read(v.modelLHS)
            if (vensimNames) {
              return R.concat(a, modelLHSReader.names())
            } else {
              return R.concat(a, R.map(Model.cName, modelLHSReader.names()))
            }
          } else {
            return a
          }
        },
        [],
        sortedVars()
      )
    )
  }
  //
  // Input/output section helpers
  //
  function outputSection(varNames) {
    // Emit output calls using varNames in C format.
    let code = R.map(varName => `  outputVar(${varName});`)
    let section = R.pipe(code, lines)
    return section(varNames)
  }
  function inputSection() {
    // If there was an I/O spec file, then emit code to parse input variables.
    // The user can replace this with a parser for a different serialization format.
    let inputVars = ''
    if (spec.inputVars && spec.inputVars.length > 0) {
      let inputVarPtrs = R.reduce((a, inputVar) => R.concat(a, `    &${inputVar},\n`), '', spec.inputVars)
      inputVars = `  static double* inputVarPtrs[] = {\n${inputVarPtrs}  };
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
`
    }
    return inputVars
  }
  function headerTitle(varName) {
    return Model.vensimName(varName).replace(/"/g, '\\"')
  }

  return {
    generate: generate,
  }
}

module.exports = { codeGenerator }
