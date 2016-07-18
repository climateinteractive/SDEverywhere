let fs = require('fs');
let child_process = require('child_process');
let path = require('path');
let antlr4 = require('antlr4/index');
let ModelLexer = require('./ModelLexer').ModelLexer;
let ModelParser = require('./ModelParser').ModelParser;
import { codeGenerator } from './CodeGen';
import { preprocess } from './Helpers';
import 'babel-polyfill';
import { install } from 'source-map-support';
install();

let modelDirname;
let modelBasename;

exports.command = 'generate <model>';
exports.describe = 'generate model code';
exports.builder = {
  spec: {
    describe: 'filename of the I/O specification JSON file',
    type: 'string',
    alias: 's'
  },
  list: {
    describe: 'list model variables',
    type: 'boolean',
    alias: 'l'
  },
  refidtest: {
    describe: 'test reference ids',
    type: 'boolean',
    alias: 'r'
  },
};
exports.handler = argv => {
  // Parse input files and then hand data to the code generator.
  modelDirname = path.dirname(argv.model);
  modelBasename = path.basename(argv.model).replace(/\.mdl/i, '');
  let parseTree = parseModel(argv.model);
  let spec = parseSpec(argv.spec);
  let subscripts = parseSubscripts();
  let listMode = '';
  if (argv.list) {
    listMode = 'printVarList';
  }
  else if (argv.refidtest) {
    listMode = 'printRefIdTest';
  }
  let code = codeGenerator(parseTree, spec, subscripts, listMode).generate();
  // Print the generated code.
  if (!(argv.list || argv.refidtest)) {
    console.log(code);
  }
  process.exit(0);
}
function parseModel(modelFilename) {
  // Read the mdl file and return a parse tree.
  let input = preprocess(modelFilename);
  let chars = new antlr4.InputStream(input);
  let lexer = new ModelLexer(chars);
  let tokens = new antlr4.CommonTokenStream(lexer);
  let parser = new ModelParser(tokens);
  parser.buildParseTrees = true;
  return parser.model();
}
function parseSpec(specFilename) {
  return parseJsonFile(specFilename);
}
function parseSubscripts() {
  // TODO read subscript dimensions and mappings in the grammar
  let jsFilename = path.join(modelDirname, `${modelBasename}_subs.js`);
  let jsonFilename = path.join(modelDirname, `${modelBasename}_subs.json`);
  preprocessSubsFile(jsFilename, jsonFilename);
  return parseJsonFile(jsonFilename);
}
function parseJsonFile(filename) {
  // Parse the JSON file if it exists.
  let result = {};
  try {
    let json = fs.readFileSync(filename);
    result = JSON.parse(json);
    // console.error(`loaded ${filename}`);
  }
  catch(ex) {
    // If the file doesn't exist, return an empty object without complaining.
  }
  return result;
}
function preprocessSubsFile(jsFilename, jsonFilename) {
  let uglifyjs = `${process.env.SDE_HOME}/tools/node_modules/.bin/uglifyjs`;
  try {
    fs.accessSync(jsFilename, fs.R_OK);
    let cmd = `${uglifyjs} --beautify quote-keys --expr ${jsFilename} >${jsonFilename} 2>/dev/null`
    child_process.execSync(cmd);
  }
  catch (e) {
  }
}
