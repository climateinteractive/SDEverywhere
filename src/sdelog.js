let fs = require('fs');
import * as R from 'ramda';
import * as F from './futil';

exports.command = 'log <logfile>';
exports.describe = 'process an SDEverywhere log file';
exports.builder = {
  logfile: {
    describe: 'filename of an SDE log file in TSV format',
    type: 'string'
  },
  dat: {
    describe: 'convert to Vensim DAT format',
    type: 'boolean',
    alias: 'd'
  }
};
exports.handler = argv => {
  if (argv.dat) {
    exportDat(argv.logfile);
  }
  process.exit(0);
};

function exportDat(filename) {
  let lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  let varNames = [];
  let steps = [];
  R.forEach(line => {
    if (R.isEmpty(varNames)) {
      varNames = R.map(v => v.toLowerCase(), line.split('\t'));
    } else if (!R.isEmpty(line)) {
      steps.push(R.zipObj(varNames, line.split('\t')));
    }
  }, lines);
  debugger;
  R.forEach(varName => {
    if (varName != 'time') {
      F.print(varName);
      R.forEach(step => {
        F.print(`${step.time}\t${step[varName]}`);
      }, steps);
    }
  }, varNames);
}
