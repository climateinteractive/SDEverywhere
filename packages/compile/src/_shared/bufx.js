import * as fs from 'node:fs'
import stripBom from 'strip-bom'

// Numeric value of a string or number
let num = x => (typeof x === 'number' ? x : Number.parseFloat(x))
// Split a string into lines that may have Windows, Unix, or old Mac line endings.
let lines = s => s.split(/\r\n|\n|\r/)
// Print a string to the console
let print = s => {
  console.log(s)
}
// Read a UTF-8 file into a string. Strip the BOM if present.
let read = pathname => stripBom(fs.readFileSync(pathname, 'utf8'))
// Write a string to a UTF-8 file
let write = (s, pathname) => {
  fs.writeFileSync(pathname, s, { encoding: 'utf8' })
}

// Output buffer
let bufs = { _: '' }
// Open a buffer for writing
let open = channel => (bufs[channel] = '')
// Emit a string to a buffer
let emit = (a, channel = null) => {
  channel = channel || '_'
  bufs[channel] += a
}
// Emit a string to a buffer terminated by a newline
let emitLine = (a, channel = null) => {
  channel = channel || '_'
  bufs[channel] += a + '\n'
}
// Print a buffer to the console
let printBuf = (channel = null) => {
  channel = channel || '_'
  print(bufs[channel])
}
// Write a buffer to a file
let writeBuf = (pathname, channel = null) => {
  channel = channel || '_'
  write(bufs[channel], pathname)
}
// Get buffer contents as a string
let getBuf = (channel = null) => {
  channel = channel || '_'
  return bufs[channel]
}
// Clear a buffer
let clearBuf = (channel = null) => {
  channel = channel || '_'
  bufs[channel] = ''
}

export default {
  clearBuf,
  emit,
  emitLine,
  getBuf,
  lines,
  num,
  open,
  printBuf,
  read,
  write,
  writeBuf
}
