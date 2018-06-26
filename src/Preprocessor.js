const path = require('path')
const R = require('ramda')
const B = require('bufx')

let preprocessModel = (mdlFilename, spec, writeRemovals = false) => {
  const REMOVALS_FILENAME = 'removals.txt'
  let mdl, eqns
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
  let getMdlFromPPBuf = () => {
    // Reset the mdl string from the preprocessor buffer.
    mdl = B.getBuf('pp')
    B.clearBuf('pp')
  }
  // Open output channels.
  B.open('rm')
  B.open('pp')
  // Read the model file.
  mdl = B.read(mdlFilename)

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
  getMdlFromPPBuf()

  // Split the model into an array of equations and groups.
  eqns = mdl.split('|')
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
  getMdlFromPPBuf()

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
  getMdlFromPPBuf()

  // Join formula lines.
  eqns = mdl.split('|')
  for (let eqn of eqns) {
    let i = eqn.indexOf('~')
    if (i >= 0) {
      // let formula = eqn.substr(0, i)
      // let comment = eqn.substr(i)
      // Join formula lines with no spaces.
      let formula = B.lines(eqn.substr(0, i))
      for (let i = 0; i < formula.length; i++) {
        if (i === 0 && formula[i] === '{UTF-8}') {
          B.emitLine(formula[i], 'pp')
        } else {
          B.emit(formula[i].replace(/^\t+/, ''), 'pp')
        }
      }
      // Emit the comment as-is with a leading tab to emulate Vensim.
      B.emit('\n\t', 'pp')
      B.emit(eqn.substr(i), 'pp')
      B.emitLine('|', 'pp')
    } else {
      // Emit an equation without a comment.
      if (!R.isEmpty(eqn.trim())) {
        B.emit(eqn, 'pp')
        B.emitLine('|', 'pp')
      }
    }
  }
  getMdlFromPPBuf()

  // Write removals to a file in the model directory.
  if (writeRemovals && B.getBuf('rm').length > 0) {
    let rmPathname = path.join(path.dirname(mdlFilename), REMOVALS_FILENAME)
    B.writeBuf(rmPathname, 'rm')
  }
  // Return the preprocessed model as a string.
  return mdl
}

module.exports = { preprocessModel }
