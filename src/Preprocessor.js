const fs = require('fs')
const path = require('path')
const R = require('ramda')
const F = require('./futil')

let preprocessModel = (mdlFilename, spec, writeRemovals = false) => {
  // Get the first line of an equation.
  let firstLine = (s) => {
    let i = s.indexOf('\n')
    if (i < 0) {
      return s.trim()
    } else {
      return s.slice(0, i).trim()
    }
  }
  // Emit an equation to the model output channel.
  let emit = (s) => {
    F.emitLine(s, 'pp')
    F.emit('\t|\n\n', 'pp')
  }
  // Emit an equation to the removals channel.
  let emitRemoval = (s) => {
    F.emitLine(s, 'rm')
    F.emit('\t|\n\n', 'rm')
  }

  // Open output channels.
  F.open('rm')
  F.open('pp')
  // Read the model file.
  let mdl = fs.readFileSync(mdlFilename, 'utf8')

  // Remove the macro section.
  let inMacroSection = false
  R.forEach(line => {
    if (!inMacroSection && R.contains(':MACRO:', line)) {
      F.emitLine(line, 'rm')
      inMacroSection = true
    } else if (inMacroSection) {
      F.emitLine(line, 'rm')
      if (R.contains(':END OF MACRO:', line)) {
        F.emit('\n', 'rm')
        inMacroSection = false
      }
    } else {
      F.emitLine(line, 'pp')
    }
  }, mdl.split(/\r?\n/))
  mdl = F.getBuf('pp')
  F.clearBuf('pp')

  // Split the model into an array of equations and groups.
  let eqns = R.map(eqn => eqn.trim(), mdl.split('|'))
  // Remove some equations into the removals channel.
  R.forEach(eqn => {
    // The syntax of the equation's first line determines what kind it is.
    let s = firstLine(eqn)
    if (R.contains('********************************************************', s)) {
      // Skip groups
    } else if (R.contains('TABBED ARRAY', s)) {
      emitRemoval(eqn)
    } else if (!R.isEmpty(eqn)) {
      emit(eqn)
    }
  }, eqns)
  mdl = F.getBuf('pp')
  F.clearBuf('pp')

  // Join lines continued with trailing backslash characters.
  let backslash = /\\\s*$/
  let prevLine = ''
  R.forEach(line => {
    if (!R.isEmpty(prevLine)) {
      line = prevLine + line.trim()
      prevLine = ''
    }
    let m = line.match(backslash)
    if (m) {
      prevLine = line.substr(0, m.index)
    }
    if (R.isEmpty(prevLine)) {
      F.emitLine(line, 'pp')
    }
  }, mdl.split(/\r?\n/))

  // Write removals to a file in the model directory.
  if (writeRemovals && F.getBuf('rm').length > 0) {
    let rmPathname = path.join(path.dirname(mdlFilename), 'removals.txt')
    F.writeBuf(rmPathname, 'rm')
  }
  // Return the preprocessed model as a string.
  return F.getBuf('pp')
}

module.exports = { preprocessModel }
