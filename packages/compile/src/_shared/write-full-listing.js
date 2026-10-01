// Copyright (c) 2026 Climate Interactive / New Venture Fund

import * as fs from 'node:fs'

// Flush the in-memory buffer to disk when it grows past this many bytes
// (approximated as string length). Chosen to amortize syscall overhead
// while keeping peak memory well below V8's ~512 MB max string length.
const FLUSH_THRESHOLD = 4 * 1024 * 1024

// The number of spaces per indentation level, matching `JSON.stringify(x, null, 2)`.
const INDENT = '  '

/**
 * Write the "full" model listing to a JSON file incrementally.
 *
 * A single `JSON.stringify(full, null, 2)` call can exceed V8's maximum string
 * length (~512 MB) for very large models and throw `RangeError: Invalid string
 * length`. This writer serializes each element of the outer `dimensions`,
 * `variables`, and `varInstances.*` arrays individually and streams the
 * encoded bytes to disk, so no single intermediate string grows unbounded.
 *
 * The output is byte-compatible with the pretty-printed form produced by
 * `JSON.stringify(full, null, 2)`, with the same field ordering.
 *
 * @param pathname The absolute path of the file to write.
 * @param full The full listing object, with fields `dimensions`, `variables`,
 * and `varInstances` (a nested object of variable instance arrays).
 */
export function writeFullListing(pathname, full) {
  const fd = fs.openSync(pathname, 'w')
  let buffer = ''

  const flush = () => {
    if (buffer.length > 0) {
      fs.writeSync(fd, buffer)
      buffer = ''
    }
  }

  const write = s => {
    buffer += s
    if (buffer.length >= FLUSH_THRESHOLD) {
      flush()
    }
  }

  // Write an array whose opening bracket is on a line indented by `indent`.
  // Each element is pretty-printed on its own and then shifted right by one
  // level beyond `indent`. Re-indenting by replacing newlines is safe because
  // `JSON.stringify` always escapes newlines inside string values. Elements
  // that are not serializable (e.g., `undefined`) become `null`, as they do
  // with `JSON.stringify`.
  const writeArray = (items, indent) => {
    if (items.length === 0) {
      write('[]')
      return
    }
    const itemIndent = indent + INDENT
    write('[')
    let first = true
    for (const item of items) {
      write(first ? '\n' : ',\n')
      first = false
      const json = JSON.stringify(item, null, INDENT) ?? 'null'
      write(itemIndent)
      write(json.replace(/\n/g, '\n' + itemIndent))
    }
    write('\n' + indent + ']')
  }

  try {
    write('{\n' + INDENT + '"dimensions": ')
    writeArray(full.dimensions, INDENT)
    write(',\n' + INDENT + '"variables": ')
    writeArray(full.variables, INDENT)
    write(',\n' + INDENT + '"varInstances": ')
    const groupKeys = Object.keys(full.varInstances)
    if (groupKeys.length === 0) {
      write('{}')
    } else {
      const groupIndent = INDENT + INDENT
      write('{')
      for (let i = 0; i < groupKeys.length; i++) {
        const key = groupKeys[i]
        write(i > 0 ? ',\n' : '\n')
        write(groupIndent + JSON.stringify(key) + ': ')
        writeArray(full.varInstances[key], groupIndent)
      }
      write('\n' + INDENT + '}')
    }
    write('\n}')
    flush()
  } finally {
    fs.closeSync(fd)
  }
}
