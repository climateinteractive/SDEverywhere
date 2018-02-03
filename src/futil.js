const fs = require('fs')
const R = require('ramda')
const prettier = require('prettier')

// Numeric value of a string or number
let num = x => (typeof x === 'number' ? x : Number.parseFloat(x))
// String sort comparison function
let acmp = R.comparator((a, b) => a < b)
// Numeric string sort comparison function
let ncmp = R.comparator((a, b) => num(a) < num(b))
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
// Split a string into lines that may have Windows or Unix line endings.
let lines = s => s.split(/\r?\n/)
// Print a string
let print = s => {
  console.log(s)
}
let pr = print
let read = pathname => fs.readFileSync(pathname, 'utf8')
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
  let json = JSON.stringify(o)
  channel = channel || '_'
  bufs[channel] += prettier.format(json, { parser: 'json' })
}
let emitJs = (js, opts = null) => {
  let options = opts || { semi: false, singleQuote: true }
  emit(prettier.format(js, options))
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

// Determine if two arrays or objects are equal by value using deep inspection.
// Ref: https://gomakethings.com/check-if-two-arrays-or-objects-are-equal-with-javascript/
let isEqual = (value, other) => {
  // Get the value type.
  let type = Object.prototype.toString.call(value)
  // If the two objects are not the same type, return false.
  if (type !== Object.prototype.toString.call(other)) return false
  // If items are not an object or array, return false.
  if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false
  // Compare the length of the two items.
  let valueLen = type === '[object Array]' ? value.length : Object.keys(value).length
  let otherLen = type === '[object Array]' ? other.length : Object.keys(other).length
  if (valueLen !== otherLen) return false
  // Compare two items.
  let compare = (item1, item2) => {
    // Get the object type.
    let itemType = Object.prototype.toString.call(item1)
    // If an object or array, compare recursively.
    if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
      if (!isEqual(item1, item2)) return false
    } else {
      // Otherwise, do a simple comparison.
      // If the two items are not the same type, return false.
      if (itemType !== Object.prototype.toString.call(item2)) return false
      // If it's a function, convert to a string and compare.
      if (itemType === '[object Function]') {
        if (item1.toString() !== item2.toString()) return false
      } else {
        // Otherwise, just compare.
        if (item1 !== item2) return false
      }
    }
  }
  // Compare properties.
  if (type === '[object Array]') {
    for (let i = 0; i < valueLen; i++) {
      if (compare(value[i], other[i]) === false) return false
    }
  } else {
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        if (compare(value[key], other[key]) === false) return false
      }
    }
  }
  // If nothing failed, return true.
  return true
}

module.exports = {
  allUniq,
  clearBuf,
  emit,
  emitJson,
  emitJs,
  emitLine,
  getBuf,
  isEqual,
  lines,
  num,
  open,
  pr,
  print,
  printa,
  printBuf,
  printJson,
  printu,
  read,
  sorta,
  sortn,
  sortu,
  write,
  writeBuf
}
