const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const B = require('bufx')
const byline = require('byline')
const { canonicalName } = require('./Helpers')

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
let exportDat = async (logPathname, datPathname) => {
  // Vensim var names found in the log file
  let varNames = {}
  // Vensim var names in canonical format serving as data keys
  let varKeys = []
  // Values at each time step
  let steps = []

  let readLog = async () => {
    return new Promise(resolve => {
      // Accumulate var values at each time step.
      let stream = byline(fs.createReadStream(logPathname, 'utf8'))
      stream.on('data', line => {
        if (R.isEmpty(varNames)) {
          // Turn the var names in the header line into acceptable keys in canonical format.
          let header = line.split('\t')
          varKeys = R.map(v => canonicalName(v), header)
          varNames = R.zipObj(varKeys, header)
        } else if (!R.isEmpty(line)) {
          // Add an object with values at this time step.
          steps.push(R.zipObj(varKeys, line.split('\t')))
        }
      })
      stream.on('end', () => resolve())
    })
  }
  let writeDat = async () => {
    // Emit all time step values for each log var  as (time, value) pairs.
    let stream = fs.createWriteStream(datPathname, 'utf8')
    let iVarKey = 0
    let finished = () => {}
    let writeContinuation = () => {
      while (iVarKey < varKeys.length) {
        let varKey = varKeys[iVarKey++]
        if (varKey !== '_time') {
          B.clearBuf()
          B.emitLine(varNames[varKey])
          for (let step of steps) {
            B.emitLine(`${step['_time']}\t${step[varKey]}`)
          }
          let status = stream.write(B.getBuf())
          // Handle backpressure by waiting for the drain event to continue when the write buffer is congested.
          if (!status) {
            stream.once('drain', writeContinuation)
            return
          }
        }
      }
      stream.end()
      finished()
    }
    return new Promise(resolve => {
      // Start the write on the next event loop tick so we can return immediately.
      process.nextTick(writeContinuation)
      // Hold on to the resolve function to call when we are finished.
      finished = resolve
    })
  }
  await readLog()
  await writeDat()
}
module.exports = {
  command,
  describe,
  builder,
  handler,
  log
}
