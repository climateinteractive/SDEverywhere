// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { writeFileSync } from 'fs'
import pico from 'picocolors'

export type LogLevel = 'error' | 'info' | 'verbose'

const activeLevels: Set<LogLevel> = new Set(['error', 'info'])

let overlayFile: string
let overlayEnabled = false
let overlayHtml = ''

/**
 * Set the active logging levels.  By default, only 'error' and 'info'
 * messages are emitted.
 *
 * @param logLevels The logging levels to include.
 */
export function setActiveLevels(logLevels: LogLevel[]): void {
  activeLevels.clear()
  for (const level of logLevels) {
    activeLevels.add(level)
  }
}

/**
 * Set the path to the `messages.html` file where overlay messages will be written.
 *
 * @param file The absolute path to the HTML file where messages will be written.
 * @param enabled Whether to write messages to the file; if false, the file will be
 * emptied and no further messages will be written.
 */
export function setOverlayFile(file: string, enabled: boolean): void {
  overlayFile = file
  overlayEnabled = enabled

  // Write an empty file by default; this will ensure that messages from a previous
  // build aren't included in the current build
  writeFileSync(overlayFile, '')
}

/**
 * Log a message to the console and/or overlay.
 *
 * @param level The logging level.
 * @param msg The message to emit.
 */
export function log(level: LogLevel, msg: string): void {
  if (activeLevels.has(level)) {
    if (level === 'error') {
      console.error(pico.red(msg))
      logToOverlay(msg)
    } else {
      console.log(msg)
      logToOverlay(msg)
    }
  }
}

/**
 * Log an error to the console and/or overlay.
 *
 * @param e The error to log.
 */
export function logError(e: Error): void {
  // Remove the first part of the stack trace (which contains the message)
  // so that we can control the formatting of the message separately, then
  // only include up to 3 lines of the stack to keep the log cleaner
  const stack = e.stack || ''
  const stackLines = stack.split('\n').filter(s => s.match(/^\s+at/))
  const trace = stackLines.slice(0, 3).join('\n')

  // Log the error message followed by the stack trace
  console.error(pico.red(`\nERROR: ${e.message}`))
  console.error(pico.dim(pico.red(`${trace}\n`)))
  logToOverlay(`\nERROR: ${e.message}`, true)
  logToOverlay(`${trace}\n`, true)
}

function writeOverlayFiles(): void {
  writeFileSync(overlayFile, overlayHtml)
}

export function clearOverlay(): void {
  if (!overlayEnabled) {
    return
  }

  overlayHtml = ''
  writeOverlayFiles()
}

const indent = '&nbsp;'.repeat(4)

export function logToOverlay(msg: string, error = false): void {
  if (!overlayEnabled) {
    return
  }

  if (error) {
    msg = `<span class="overlay-error">${msg}</span>`
  }
  const msgHtml = msg.replace(/\n/g, '\n<br/>').replace(/\s{2}/g, indent)
  if (overlayHtml) {
    overlayHtml += `<br/>${msgHtml}`
  } else {
    overlayHtml = `${msgHtml}`
  }
  writeOverlayFiles()
}

export function clearConsole(): void {
  // TODO: This is disabled for now; maybe re-enable it under an optional flag
  // console.log('\x1Bc')
}
