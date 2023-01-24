import { existsSync } from 'fs'

import { pr } from 'bufx'
import R from 'ramda'

import { readDat } from '@sdeverywhere/compile'

// The epsilon value determines the required precision for value comparisons.
let ε = 1e-5

export let command = 'compare [options] <vensimlog> <sdelog>'
export let describe = 'compare Vensim and SDEverywhere log files in DAT format'
export let builder = {
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
export let handler = argv => {
  compare(argv.vensimlog, argv.sdelog, argv)
}
export let compare = async (vensimfile, sdefile, opts) => {
  if (!existsSync(vensimfile)) {
    throw new Error(`Vensim DAT file not found: ${vensimfile}`)
  }
  if (!existsSync(sdefile)) {
    throw new Error(`SDEverywhere DAT file not found: ${sdefile}`)
  }

  let vensimLog = await readDat(vensimfile)
  let sdeLog = await readDat(sdefile)

  if (vensimLog.size === 0) {
    throw new Error(`Vensim DAT file did not contain data: ${vensimfile}`)
  }
  if (sdeLog.size === 0) {
    throw new Error(`SDEverywhere DAT file did not contain data: ${sdefile}`)
  }

  if (opts.precision) {
    ε = opts.precision
  }

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
    return true
  } else {
    pr(`Data differences detected for ${vensimfile} and ${sdefile}`)
    return false
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

export default {
  command,
  describe,
  builder,
  handler,
  compare
}
