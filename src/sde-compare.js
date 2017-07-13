const fs = require('fs-extra')
const R = require('ramda')
const { vlog } = require('./Helpers')

// The epsilon value determines the required precision for value comparisons.
let ε = 1e-5

let command = 'compare [options] <vensimlog> <sdelog>'
let describe = 'compare Vensim and SDEverywhere log files in DAT format'
let builder = {
  precision: {
    describe: 'precision to which values must agree (default 1e-5)',
    type: 'number',
    alias: 'p'
  },
  name: {
    describe: 'single Vensim variable name to compare',
    type: 'string',
    alias: 'n'
  },
  times: {
    describe: 'limit comparisons to times separated by spaces',
    type: 'array',
    alias: 't'
  }
}
let handler = argv => {
  compare(argv.vensimlog, argv.sdelog, argv)
}
let compare = (vensimfile, sdefile, opts) => {
  if (opts.precision) {
    ε = opts.precision
  }
  let vensimLog = readLog(vensimfile)
  let sdeLog = readLog(sdefile)
  for (let varName of vensimLog.keys()) {
    let sdeValues = sdeLog.get(varName)
    // Ignore variables that are not found in the SDE log file.
    if (sdeValues && (!opts.name || varName === opts.name)) {
      let vensimValue = undefined
      let vensimValues = vensimLog.get(varName)
      // Filter on time t, the key in the values list.
      for (let t of vensimValues.keys()) {
        if (!opts.times || R.find(time => isEqual(time, t), opts.times)) {
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
let readLog = logfile => {
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
let isZero = value => {
  return Math.abs(value) < ε
}
let difference = (x, y) => {
  let diff = 0
  if (isZero(x) || isZero(y)) {
    diff = Math.abs(x - y)
  } else {
    diff = Math.abs(1 - x / y)
  }
  return diff
}
let isEqual = (x, y) => {
  return difference(x, y) < ε
}

module.exports = {
  command,
  describe,
  builder,
  handler,
  compare
}
