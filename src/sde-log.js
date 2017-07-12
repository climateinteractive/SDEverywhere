const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const F = require('./futil')

exports.command = 'log [options] <logfile>'
exports.describe = 'process an SDEverywhere log file'
exports.builder = {
  dat: {
    describe: 'convert a TSV log file to a Vensim DAT file',
    type: 'boolean',
    alias: 'd'
  }
}
exports.handler = argv => {
  if (argv.dat) {
    let logPathname = argv.logfile
    let p = path.parse(logPathname)
    let datPathname = path.format({ dir: p.dir, name: p.name, ext: '.dat' })
    exportDat(logPathname, datPathname)
  }
  process.exit(0)
}

let exportDat = (logPathname, datPathname) => {
  let lines = fs.readFileSync(logPathname, 'utf8').split(/\r?\n/)
  let varNames = []
  let steps = []
  for (let line of lines) {
    if (R.isEmpty(varNames)) {
      varNames = R.map(v => v.toLowerCase(), line.split('\t'))
    } else if (!R.isEmpty(line)) {
      steps.push(R.zipObj(varNames, line.split('\t')))
    }
  }
  for (let varName of varNames) {
    if (varName !== 'time') {
      F.emitLine(varName)
      for (let step of steps) F.emitLine(`${step.time}\t${step[varName]}`)
    }
  }
  F.writeBuf(datPathname)
}
