let fs = require('fs')
import * as R from 'ramda'
import { vlog } from './Helpers'

// The epsilon value determines the required precision for value comparisons.
let ε = 1e-5

exports.command = 'compare <vensimlog> <sdelog>'
exports.describe = 'compare Vensim and SDEverywhere log files'
exports.builder = {
  vensimlog: {
    describe: 'filename of a Vensim log file in DAT format',
    type: 'string'
  },
  sdelog: {
    describe: 'filename of an SDE log file in DAT format',
    type: 'string'
  },
  precision: {
    describe: 'precision to which values must agree to match (default 1e-5)',
    type: 'number',
    alias: 'p'
  },
  name: {
    describe: 'single Vensim variable name to compare',
    type: 'string',
    alias: 'n'
  },
  times: {
    describe: 'limit comparisons to one or more times separated by spaces',
    type: 'array',
    alias: 't'
  }
}
exports.handler = argv => {
  if (argv.precision) {
    ε = argv.precision
  }
  compareDat(argv.vensimlog, argv.sdelog, argv.name, argv.times)
  process.exit(0)
}

function compareDat(vensimfile, sdefile, name, times) {
  let vensimLog = readLog(vensimfile)
  let sdeLog = readLog(sdefile)
  for (let varName of vensimLog.keys()) {
    let sdeValues = sdeLog.get(varName)
    // Ignore variables that are not found in the SDE log file.
    if (sdeValues && (!name || varName === name)) {
      let vensimValue = undefined
      let vensimValues = vensimLog.get(varName)
      // Filter on time t, the key in the values list.
      for (let t of vensimValues.keys()) {
        if (!times || R.find(time => isEqual(time, t), times)) {
          // In Vensim log files, const vars only have one value at the initial time.
          if (vensimValues.size > 1 || !vensimValue) {
            vensimValue = vensimValues.get(t)
          }
          let sdeValue = sdeValues.get(t)
          let diff = difference(sdeValue, vensimValue)
          if (diff > ε) {
            let diffPct = (diff * 100).toFixed(6)
            console.log(`${varName} time=${t.toFixed(2)} vensim=${vensimValue} sde=${sdeValue} diff=${diffPct}%`)
          }
        }
      }
    }
  }
}
function readLog(logfile) {
  let log = new Map()
  let varName = ''
  let varValues = new Map()
  let lines = fs.readFileSync(logfile, 'utf8').split(/\r?\n/)
  R.forEach(line => {
    if (line.includes('\t')) {
      // Data lines in Vensim DAT format have {time}\t{value} format.
      let values = line.split('\t')
      let t = Number.parseFloat(values[0])
      let value = Number.parseFloat(values[1])
      // Save the value at time t in the varValues map.
      if (Number.isNaN(t) || Number.isNaN(value)) {
        console.error(`${varName} value is NaN at time=${t}`)
      } else {
        varValues.set(t, value)
      }
    } else {
      // Lines without a tab are variable names that start a data section.
      // Save the values for the current var if we are not on the first one with no values yet.
      if (varName != '') {
        log.set(varName, varValues)
      }
      // Start a new map for this var.
      varName = line.replace(/"/g, '')
      varValues = new Map()
    }
  }, lines)
  return log
}
function isZero(value) {
  return Math.abs(value) < ε
}
function difference(x, y) {
  let diff = 0
  if (isZero(x) || isZero(y)) {
    diff = Math.abs(x - y)
  } else {
    diff = Math.abs(1 - x / y)
  }
  return diff
}
function isEqual(x, y) {
  return difference(x, y) < ε
}
