import fs from 'fs'
import B from 'bufx'
import byline from 'byline'
import R from 'ramda'

import { canonicalVensimName } from './helpers.js'

/**
 * Read a Vensim `dat` file with static data and return a Map.
 * Each dataset consists of a key (the variable name in the canonical
 * format used by SDE) and a map of time/value pairs.
 *
 * @param pathname The absolute path to the dat file.
 * @param prefix An optional prefix string prepended to var names.
 * @return A Map containing the datasets.
 */
export async function readDat(pathname, prefix = '') {
  let log = new Map()
  let varName = ''
  let varValues = new Map()
  let lineNum = 1

  let splitDatLine = line => {
    const f = line.split('\t').map(s => s.trim())
    if (f.length < 2 || !R.isEmpty(f[1])) {
      return f
    } else {
      return [f[0]]
    }
  }

  let addValues = () => {
    if (varName !== '' && varValues.size > 0) {
      log.set(prefix + varName, varValues)
    }
  }

  return new Promise(resolve => {
    let stream = byline(fs.createReadStream(pathname, 'utf8'))
    stream.on('data', line => {
      let values = splitDatLine(line)
      if (values.length === 1) {
        // Lines with a single value are variable names that start a data section.
        // Save the values for the current var if we are not on the first one.
        addValues()
        // Start a new map for this var.
        // Convert the var name to canonical form so it is the same in both logs.
        varName = canonicalVensimName(values[0])
        varValues = new Map()
      } else if (values.length > 1) {
        // Data lines in Vensim DAT format have {time}\t{value} format with optional comments afterward.
        let t = B.num(values[0])
        let value = B.num(values[1])
        // Save the value at time t in the varValues map.
        if (Number.isNaN(t)) {
          console.error(`DAT file ${pathname}:${lineNum} time value is NaN`)
        } else if (Number.isNaN(value)) {
          // console.error(`DAT file ${pathname}:${lineNum} var "${varName}" value is NaN at time=${t}`)
        } else {
          varValues.set(t, value)
        }
      }
      lineNum++
      // if (lineNum % 1e5 === 0) console.log(num(lineNum).format('0,0'))
    })
    stream.on('end', () => {
      addValues()
      resolve(log)
    })
  })
}
