const fs = require('fs')
const R = require('ramda')
const num = require('numeral')

// Numeric value of a string or number
let n = x => (typeof x === 'number' ? x : num(x).value())
// String sort comparison function
let acmp = R.comparator((a, b) => a < b)
// Numeric string sort comparison function
let ncmp = R.comparator((a, b) => n(a) < n(b))
// alphanumeric sort
let sorta = R.sort(acmp)
// numeric sort
let sortn = R.sort(ncmp)
// sort -u equivalent
let sortu = a => R.sort(acmp, R.uniq(a))
// Print an array
let printa = a => R.forEach(x => print(x), a)
// Print a sorted, unique array
let printu = a => printa(sortu(a))

// Print a string
let print = s => {
  console.log(s)
}
let write = (s, pathname) => {
  fs.writeFileSync(pathname, s, { encoding: 'utf8' })
}
// Print an array or object as json
let printJson = o => {
  print(JSON.stringify(o))
}
let writeJson = (o, pathname) => {
  write(JSON.stringify(o), pathname)
}

// Output buffer
let bufs = { _: '' }
let open = channel => (bufs[channel] = '')
let emit = (a, channel = null) => {
  channel = channel || '_'
  bufs[channel] += a
}
let emitLine = (a, channel = null) => {
  channel = channel || '_'
  bufs[channel] += a + '\n'
}
let emitJson = (o, channel = null) => {
  channel = channel || '_'
  bufs[channel] += JSON.stringify(o)
}
let printBuf = (channel = null) => {
  channel = channel || '_'
  print(bufs[channel])
}
let writeBuf = (pathname, channel = null) => {
  channel = channel || '_'
  write(bufs[channel], pathname)
}
let getBuf = (channel = null) => {
  channel = channel || '_'
  return bufs[channel]
}
let clearBuf = (channel = null) => {
  channel = channel || '_'
  bufs[channel] = ''
}

// Determine if all values in a list are unique.
let allUniq = list => {
  hash = {}
  for (let i = 0; i < list.length; i++) {
    let el = list[i]
    if (hash[el] != null) {
      // print(el)
      return false
    } else {
      hash[el] = true
    }
  }
  return true
}

exports.sorta = sorta
exports.sortn = sortn
exports.sortu = sortu
exports.print = print
exports.write = write
exports.printa = printa
exports.printu = printu
exports.printJson = printJson
exports.allUniq = allUniq
exports.open = open
exports.emit = emit
exports.emitLine = emitLine
exports.emitJson = emitJson
exports.printBuf = printBuf
exports.writeBuf = writeBuf
exports.getBuf = getBuf
exports.clearBuf = clearBuf
