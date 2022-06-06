import path from 'path'
import R from 'ramda'
import B from 'bufx'
import { splitEquations, replaceDelimitedStrings } from './_shared/helpers.js'

export let preprocessModel = (mdlFilename, spec, profile = 'genc', writeFiles = false, outDecls = []) => {
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
    B.emitLine('', 'pp')
  }
  if (insertions) {
    B.emitLine(insertions, 'pp')
  }

  // Split into separate equations
  eqns = splitEquations(mdl)

  // Extract the LHS variable name for each equation, which we will use to sort
  // the equations alphabetically
  const unsorted = outDecls
  for (let eqn of eqns) {
    // Ignore the encoding
    eqn = eqn.replace('{UTF-8}', '')
    // Remove ":RAW:" flag; it is not needed by SDE and causes problems if left in
    eqn = eqn.replace(/:RAW:/g, '')
    // Remove inline comments
    eqn = replaceDelimitedStrings(eqn, '{', '}', '')
    // Remove whitespace
    eqn = eqn.trim()
    if (eqn.length > 0) {
      // Remove newlines so that we look at the full equation as a single line
      let line = eqn.replace(/\n/g, ' ').trim()
      let kind
      let key = line
      // Remove everything after the comment delimiters
      key = key.split('~')[0]
      // Strip the ":INTERPOLATE:"; it should not be included in the key
      key = key.replace(/:INTERPOLATE:/g, '')
      if (key.includes('=')) {
        // The line contains an '='; treat this as an equation
        kind = 'eqn'
        key = key.split('=')[0].trim()
      } else if (key.includes(':')) {
        // The line contains a ':'; treat this as an subscript declaration
        kind = 'sub'
        key = key.split(':')[0].trim()
      } else {
        // Treat this as a general declaration
        kind = 'decl'
      }
      // Ignore double quotes
      key = key.replace(/\"/g, '')
      // Ignore the lookup data if it starts on the first line
      key = key.split('(')[0]
      // Ignore any whitespace that remains
      key = key.trim()
      // Remove whitespace on the inside of the brackets
      key = key.replace(/\[\s*/g, '[')
      key = key.replace(/\s*\]/g, ']')
      // Ignore case
      key = key.toLowerCase()
      unsorted.push({
        key,
        kind,
        originalDecl: eqn
      })
    }
  }

  // Sort the equations alphabetically by LHS variable name
  const sorted = unsorted.sort((a, b) => {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
  })

  // Emit formula lines without comment contents.
  for (const elem of sorted) {
    const eqn = elem.originalDecl
    let processedDecl = eqn
    let iComment = eqn.indexOf('~')
    if (iComment >= 0) {
      processedDecl = ''
      let formula = B.lines(eqn.substr(0, iComment))
      for (let i = 0; i < formula.length; i++) {
        let line = formula[i]
        // Remove trailing whitespace
        line = line.replace(/\s+$/, '')
        if (i === 0) {
          if (line !== ENCODING) {
            emitPP(line)
            processedDecl += line
          }
        } else {
          if (opts.joinFormulaLines) {
            // Remove any leading tabs
            const lineWithoutLeadingTabs = line.replace(/^\t+/, '')
            emitPP(lineWithoutLeadingTabs)
            processedDecl += lineWithoutLeadingTabs
          } else {
            // Only emit the line if it has non-whitespace characters
            if (line.length > 0) {
              emitPP(`\n${line}`)
              processedDecl += `\n${line}`
            }
          }
        }
      }
      // Emit the last line
      if (opts.emitCommentMarkers) {
        const declEnd = '\n\t~~|'
        B.emitLine(`${declEnd}\n`, 'pp')
        processedDecl += declEnd
      } else {
        B.emitLine('', 'pp')
      }
    }
    elem.processedDecl = processedDecl
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
