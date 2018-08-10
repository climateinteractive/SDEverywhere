const R = require('ramda')
const { pr } = require('bufx')
const { canonicalName, readDat } = require('./Helpers')

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
  let vensimLog = readDat(vensimfile)
  let sdeLog = readDat(sdefile)
  let noDATDifference = true
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
            pr(`${varName} time=${t.toFixed(2)} vensim=${vensimValue} sde=${sdeValue} diff=${diffPct}%`)
            noDATDifference = false
          }
        }
      }
    }
  }
  if (noDATDifference) {
    pr(`Data were the same for ${vensimfile} and ${sdefile}`)
  }
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
