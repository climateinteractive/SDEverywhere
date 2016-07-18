let fs = require('fs');
import * as R from 'ramda';

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
  },
};
exports.handler = argv => {
  if (argv.dat) {
    exportDat(argv.logfile);
  }
  process.exit(0);
};

function exportDat(filename) {
  let lines = fs.readFileSync(filename).toString().split(/\r?\n/);
  let varNames = [];
  let steps = [];
  R.forEach(line => {
    if (R.isEmpty(varNames)) {
      varNames = line.split('\t');
    }
    else if (!R.isEmpty(line)) {
      steps.push(R.zipObj(varNames, line.split('\t')));
    }
  }, lines);
  R.forEach(varName => {
    if (varName != 'Time') {
      console.log(varName);
      R.forEach(step => {
        console.log(`${step.Time}\t${step[varName]}`);
      }, steps);
    }
  }, varNames);
}
