const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')
const B = require('bufx')

let preprocessModel = (mdlFilename, spec, writeRemovals = false) => {
  // Equations that contain a string in the removalKeys list in the spec file will be removed.
  let removalKeys = (spec && spec.removalKeys) || []
  // Get the first line of an equation.
  let firstLine = s => {
    let i = s.indexOf('\n')
    if (i < 0) {
      return s.trim()
    } else {
      return s.slice(0, i).trim()
    }
  }
  // Emit an equation to the model output channel.
  let emit = s => {
    B.emitLine(s, 'pp')
    B.emit('\t|\n\n', 'pp')
  }
  // Emit an equation to the removals channel.
  let emitRemoval = s => {
    B.emitLine(s, 'rm')
    B.emit('\t|\n\n', 'rm')
  }

  // Open output channels.
  B.open('rm')
  B.open('pp')
  // Read the model file.
  let mdl = fs.readFileSync(mdlFilename, 'utf8')

  // Remove the macro section.
  let inMacroSection = false
  R.forEach(line => {
    if (!inMacroSection && R.contains(':MACRO:', line)) {
      B.emitLine(line, 'rm')
      inMacroSection = true
    } else if (inMacroSection) {
      B.emitLine(line, 'rm')
      if (R.contains(':END OF MACRO:', line)) {
        B.emit('\n', 'rm')
        inMacroSection = false
      }
    } else {
      B.emitLine(line, 'pp')
    }
  }, mdl.split(/\r?\n/))
  mdl = B.getBuf('pp')
  B.clearBuf('pp')

  // Split the model into an array of equations and groups.
  let eqns = R.map(eqn => eqn.trim(), mdl.split('|'))
  // Remove some equations into the removals channel.
  R.forEach(eqn => {
    if (R.contains('********************************************************', eqn)) {
      // Skip groups
    } else if (R.contains('TABBED ARRAY', eqn)) {
      emitRemoval(eqn)
    } else if (R.any(x => R.contains(x, eqn), removalKeys)) {
      emitRemoval(eqn)
    } else if (!R.isEmpty(eqn)) {
      emit(eqn)
    }
  }, eqns)
  mdl = B.getBuf('pp')
  B.clearBuf('pp')

  // Join lines continued with trailing backslash characters.
  let backslashEnding = /\\\s*$/
  let lineBuf = ''
  R.forEach(line => {
    let continuation = line.match(backslashEnding)
    if (continuation) {
      lineBuf += line.substr(0, continuation.index)
    } else {
      lineBuf += line.trim()
      B.emitLine(lineBuf, 'pp')
      lineBuf = ''
    }
  }, mdl.split(/\r?\n/))

  // Write removals to a file in the model directory.
  if (writeRemovals && B.getBuf('rm').length > 0) {
    let rmPathname = path.join(path.dirname(mdlFilename), 'removals.txt')
    B.writeBuf(rmPathname, 'rm')
  }
  // Return the preprocessed model as a string.
  return B.getBuf('pp')
}

module.exports = { preprocessModel }
