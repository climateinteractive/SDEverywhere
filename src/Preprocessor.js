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
  // Open output channels.
  B.open('rm')
  B.open('pp')
  // Read the model file.
  let mdl = fs.readFileSync(mdlFilename, 'utf8')

  // Remove the macro section.
  let inMacroSection = false
  for (let line of B.lines(mdl)) {
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
  }
  mdl = B.getBuf('pp')
  B.clearBuf('pp')

  // Split the model into an array of equations and groups.
  // let eqns = R.map(eqn => eqn.trim(), mdl.split('|'))
  let eqns = mdl.split('|')
  // Remove some equations into the removals channel.
  for (let eqn of eqns) {
    if (R.contains('\\---/// Sketch', eqn)) {
      // Skip everything starting with the first sketch section.
      break
    } else if (R.contains('********************************************************', eqn)) {
      // Skip groups
    } else if (R.contains('TABBED ARRAY', eqn) || R.any(x => R.contains(x, eqn), removalKeys)) {
      // Remove tabbed arrays and equations containing removal key strings from the spec.
      B.emit(eqn, 'rm')
      B.emit('|', 'rm')
    } else if (!R.isEmpty(eqn)) {
      // Emit the equation.
      B.emit(eqn, 'pp')
      B.emit('|', 'pp')
    }
  }
  mdl = B.getBuf('pp')
  B.clearBuf('pp')

  // Join lines continued with trailing backslash characters.
  let prevLine = ''
  for (let line of B.lines(mdl)) {
    // Join a previous line with a backslash ending to the current line.
    if (!R.isEmpty(prevLine)) {
      line = prevLine + line.trim()
      prevLine = ''
    }
    let continuation = line.match(/\\\s*$/)
    if (continuation) {
      // If there is a backslash ending on this line, save it without the backslash.
      prevLine = line.substr(0, continuation.index).replace(/\s+$/, ' ')
    } else {
      // With no continuation on this line, go ahead and emit it.
      B.emitLine(line, 'pp')
    }
  }

  // Write removals to a file in the model directory.
  if (writeRemovals && B.getBuf('rm').length > 0) {
    let rmPathname = path.join(path.dirname(mdlFilename), 'removals.txt')
    B.writeBuf(rmPathname, 'rm')
  }
  // Return the preprocessed model as a string.
  return B.getBuf('pp')
}

module.exports = { preprocessModel }
