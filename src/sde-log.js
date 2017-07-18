const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const { canonicalName } = require('./Helpers')
const F = require('./futil')

let command = 'log [options] <logfile>'
let describe = 'process an SDEverywhere log file'
let builder = {
  dat: {
    describe: 'convert a TSV log file to a Vensim DAT file',
    type: 'boolean',
    alias: 'd'
  }
}
let handler = argv => {
  log(argv.logfile, argv)
}
let log = (logPathname, opts) => {
  if (opts.dat) {
    let p = path.parse(logPathname)
    let datPathname = path.format({ dir: p.dir, name: p.name, ext: '.dat' })
    exportDat(logPathname, datPathname)
  }
}
let exportDat = (logPathname, datPathname) => {
  let lines = fs.readFileSync(logPathname, 'utf8').split(/\r?\n/)
  let varNames = {}
  let varKeys = []
  let steps = []
  for (let line of lines) {
    if (R.isEmpty(varNames)) {
      // Turn the var names in the header line into acceptable keys in canonical format.
      let header = line.split('\t')
      varKeys = R.map(v => canonicalName(v), header)
      varNames = R.zipObj(varKeys, header)
    } else if (!R.isEmpty(line)) {
      // Add an object with values at this time step.
      steps.push(R.zipObj(varKeys, line.split('\t')))
    }
  }
  // Emit all time step values for each var name.
  for (let varKey of varKeys) {
    if (varKey !== '_time') {
      F.emitLine(varNames[varKey])
      for (let step of steps) {
        F.emitLine(`${step['_time']}\t${step[varKey]}`)
      }
    }
  }
  F.writeBuf(datPathname)
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  log
}
