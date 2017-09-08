const VarNameReader = require('./VarNameReader')
const R = require('ramda')
const ModelLHSReader = require('./ModelLHSReader')
const EquationGen = require('./EquationGen')
const Model = require('./Model')
const {
  sub,
  allDimensions,
  allMappings,
  isDimension,
  subscriptFamilies,
  printSubscripts
} = require('./Subscript')
const { asort, lines, list, strlist, vlog } = require('./Helpers')

let codeGenerator = (parseTree, spec, operation, codeGenOpts) => {
  // Set true when in the init section, false in the eval section
  let initMode = false
  // Set true to output all variables when there is no model run spec.
  let outputAllVars = R.isEmpty(spec) ? true : false
  // Function to generate a section of the code
  let generateSection = R.map(v => new EquationGen(v, initMode).generate())
  let section = R.pipe(generateSection, R.flatten, lines)

  function generate() {
    // Read variables and subscript ranges from the model parse tree.
    Model.read(parseTree, spec)
    // In list mode, print variables to the console instead of generating code.
    if (operation === 'printVarList') {
      printSubscripts()
      Model.printVarList()
    } else if (operation === 'printRefIdTest') {
      Model.printRefIdTest()
    } else if (operation === 'convertNames') {
      // Prevent code generation only.
    } else if (operation === 'generateC') {
      // Generate code for each variable in the proper order.
      let code = emitDeclCode()
      code += emitInitCode()
      code += emitEvalCode()
      code += outputAllVars ? emitIOCodeAllVars() : emitIOCode()
      return code
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

`
  }
  //
  // Initialization section
  //
  function emitInitCode() {
    initMode = true
    return `// Internal state
bool lookups_initialized = false;

void initConstants() {
  // Initialize constants.
${section(Model.constVars())}

  // Initialize lookups.
if (!lookups_initialized) {
${section(Model.lookupVars())}
  lookups_initialized = true;
}
}
void initLevels() {
  // Initialize variables with initialization values, such as levels, and the variables they depend on.
${section(Model.initVars())}
}

`
  }
  //
  // Evaluation section
  //
  function emitEvalCode() {
    initMode = false
    return `void evalAux() {
  // Evaluate auxiliaries in order from the bottom up.
${section(Model.auxVars())}
}

void evalLevels() {
  // Evaluate levels.
${section(Model.levelVars())}
}

`
  }
  //
  // Input/output section
  //
  function emitIOCode() {
    initMode = false
    return `void setInputs(const char* inputData) {
${inputSection()}}
void writeHeader() {
  writeText("${R.map(v => v.replace(/"/g, ''), spec.outputVars).join('\\t')}");
}

void storeOutputData() {
  startOutput();
${outputSection(spec.outputVars)}
  writeOutputData();
}
`
  }

  function emitIOCodeAllVars() {
    initMode = false
    return `void setInputs(const char* inputData) {
${inputSection()}}

void writeHeader() {
  writeText("${allModelVars().join('\\t')}");
}

void storeOutputData() {
  startOutput();
${outputSection(allModelVars())}
  writeOutputData();
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
      let varType = v.isLookup() ? 'Lookup* ' : 'double '
      let families = subscriptFamilies(v.subscripts)
      return varType + v.varName + R.map(family => `[${sub(family).size}]`, families).join('')
    }
    // Non-apply-to-all variables are declared multiple times, but coalesce using uniq.
    let decls = R.pipe(R.map(v => `${decl(v)};`), R.uniq, asort, lines)
    return decls(Model.allVars())
  }
  function internalVarsSection() {
    // Declare internal variables to run the model.
    if (outputAllVars) {
      return `const int numOutputs = ${allModelVars().length + 1};`
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
  function allModelVars() {
    // Return a list of Vensim model var names for all variables.
    function sortedVars() {
      // Return a list of all vars sorted by the model LHS var name (without subscripts), case insensitive.
      return R.sortBy(v => {
        let modelLHSReader = new ModelLHSReader()
        modelLHSReader.read(v.modelLHS)
        return modelLHSReader.varName.replace(/"/g, '').toUpperCase()
      }, Model.variables)
    }
    // Accumulate a list of model var names with subscripted vars expanded into separate vars with each index.
    // This matches the export format for Vensim DAT files.
    return R.uniq(
      R.reduce(
        (a, v) => {
          if (v.varType != 'lookup') {
            let modelLHSReader = new ModelLHSReader()
            modelLHSReader.read(v.modelLHS)
            return R.concat(a, modelLHSReader.names())
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
  function outputSection(modelVarNames) {
    // Read the model var name and emit the output call using the C var name.
    let code = R.map(modelVarName => `  outputVar(${new VarNameReader().read(modelVarName)});`)
    // Emit code to output the variables.
    let section = R.pipe(code, lines)
    return section(modelVarNames)
  }

  function inputSection() {
    var inputVarArray = ''
    //if there was a modelSpec, then generate the list of input variables
    if (spec.inputVars) {
      for (let inputVar of spec.inputVars) {
        inputVarArray += `&${new VarNameReader().read(inputVar)},\n    `
      }
    }
    //c array of inputVar pointers
    var inputVars = `  static double* inputVarPtrs[] = {
    ${inputVarArray}
  };
`
    //if compiling for web, include this input string parser
    //TODO: put in own .js file in the /src/web folder
    if (codeGenOpts.setInputs_web) {
      var parseFunc = `  char* inputs = (char*)inputData;
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
      inputVars += parseFunc
    }
    return inputVars
  }

  return {
    generate: generate
  }
}

module.exports = { codeGenerator }
