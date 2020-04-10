const path = require('path')
const R = require('ramda')
const B = require('bufx')
const { splitEquations } = require('./Helpers')

let preprocessModel = (mdlFilename, spec, profile = 'genc', writeFiles = false) => {
  const MACROS_FILENAME = 'macros.txt'
  const REMOVALS_FILENAME = 'removals.txt'
  const INSERTIONS_FILENAME = 'mdl-edits.txt'
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
  // Optional insertions can be used to add expanded macros back into the model.
  let insertions = ''
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
  // Read the optional insertions file into the model unless we are doing a pass that writes removals.
  try {
    if (!writeFiles) {
      let insPathname = path.join(path.dirname(mdlFilename), INSERTIONS_FILENAME)
      insertions = B.read(insPathname)
    }
  } catch (error) {}
  // Read the model file.
  try {
    mdl = B.read(mdlFilename)
  } catch (error) {
    console.error(error.message)
    return
  }
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
  eqns = splitEquations(mdl)
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

  // Emit the encoding line and optional insertions.
  if (opts.emitEncoding) {
    B.emitLine(ENCODING, 'pp')
  }
  if (insertions) {
    B.emitLine(insertions, 'pp')
  }
  // Emit formula lines without comment contents.
  eqns = splitEquations(mdl)
  for (let eqn of eqns) {
    let iComment = eqn.indexOf('~')
    if (iComment >= 0) {
      let formula = B.lines(eqn.substr(0, iComment))
      for (let i = 0; i < formula.length; i++) {
        if (i === 0) {
          if (formula[i] !== ENCODING) {
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
  if (writeFiles) {
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
