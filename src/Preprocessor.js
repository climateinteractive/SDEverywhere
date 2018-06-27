const path = require('path')
const R = require('ramda')
const B = require('bufx')

let preprocessModel = (mdlFilename, spec, profile = 'genc', writeRemovals = false) => {
  const MACROS_FILENAME = 'macros.txt'
  const REMOVALS_FILENAME = 'removals.txt'
  const ENCODING = '{UTF-8}'
  let profiles = {
    // simplified but still runnable model
    genc: {
      emitEncoding: true,
      emitCommentMarkers: true,
      joinFormulaLines: false
    },
    // even simpler model that does not run
    analysis: {
      emitEncoding: false,
      emitCommentMarkers: false,
      joinFormulaLines: true
    }
  }
  let opts = profiles[profile]
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
  let emitPP = str => {
    if (str) {
      B.emit(str, 'pp')
    }
  }
  // Open output channels.
  B.open('rm')
  B.open('macros')
  B.open('pp')
  // Read the model file.
  mdl = B.read(mdlFilename)

  // Remove the macro section.
  let inMacroSection = false
  for (let line of B.lines(mdl)) {
    if (!inMacroSection && R.contains(':MACRO:', line)) {
      B.emitLine(line, 'macros')
      inMacroSection = true
    } else if (inMacroSection) {
      B.emitLine(line, 'macros')
      if (R.contains(':END OF MACRO:', line)) {
        B.emit('\n', 'macros')
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
      emitPP(eqn)
      emitPP('|')
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

  // Emit formula lines without comment contents.
  eqns = mdl.split('|')
  for (let eqn of eqns) {
    let i = eqn.indexOf('~')
    if (i >= 0) {
      let formula = B.lines(eqn.substr(0, i))
      for (let i = 0; i < formula.length; i++) {
        if (i === 0) {
          if (formula[i] === ENCODING) {
            if (opts.emitEncoding) {
              B.emitLine(ENCODING, 'pp')
            }
          } else {
            emitPP(formula[i])
          }
        } else {
          if (opts.joinFormulaLines) {
            emitPP(formula[i].replace(/^\t+/, ''))
          } else {
            B.emitLine('', 'pp')
            emitPP(formula[i])
          }
        }
      }
      if (opts.emitCommentMarkers) {
        emitPP('~~|')
      } else {
        B.emitLine('', 'pp')
      }
    }
  }
  getMdlFromPPBuf()

  // Write removals to a file in the model directory.
  if (writeRemovals) {
    if (B.getBuf('macros')) {
      let macrosPathname = path.join(path.dirname(mdlFilename), MACROS_FILENAME)
      B.writeBuf(macrosPathname, 'macros')
    }
    if (B.getBuf('rm')) {
      let rmPathname = path.join(path.dirname(mdlFilename), REMOVALS_FILENAME)
      B.writeBuf(rmPathname, 'rm')
    }
  }

  // Return the preprocessed model as a string.
  return mdl
}

module.exports = { preprocessModel }
