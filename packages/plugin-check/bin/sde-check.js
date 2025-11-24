#!/usr/bin/env node

/*
 * This is the entrypoint for the `sde-check` CLI, which provides commands
 * that work in conjunction with `@sdeverywhere/plugin-check`.
 */

import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join as joinPath } from 'path'

function printUsage() {
  console.log()
  console.log('Usage:')
  console.log('  sim-check save-current-bundle\t\tcopy the latest bundle to the `bundles` directory')
  console.log()
}

function timestamp() {
  const padL = (nr, len = 2, chr = `0`) => `${nr}`.padStart(len, chr)

  const d = new Date()
  const year = d.getFullYear()
  const month = padL(d.getMonth() + 1)
  const day = padL(d.getDate())
  const hours = padL(d.getHours())
  const minutes = padL(d.getMinutes())
  const seconds = padL(d.getSeconds())

  return `${year}-${month}-${day}--${hours}-${minutes}-${seconds}`
}

const args = process.argv.slice(2)
if (args.length !== 2 || args[0] !== 'save-current-bundle') {
  printUsage()
  process.exit(1)
}

// TODO: For now we make a number of assumptions (e.g., that the bundle will be copied to
// the `bundles` directory under the current working directory, that the bundle filename
// will contain the current timestamp); we should make these configurable
const prepDir = joinPath(process.cwd(), 'sde-prep')
const srcBundleFile = joinPath(prepDir, 'check-bundle.js')
if (!existsSync(srcBundleFile)) {
  console.error(`ERROR: No 'check-bundle.js' file found in 'sde-prep' directory`)
  process.exit(1)
}

const bundlesDir = joinPath(process.cwd(), 'bundles')
if (!existsSync(bundlesDir)) {
  mkdirSync(bundlesDir, { recursive: true })
}

const dstBundleFile = joinPath(bundlesDir, `${timestamp()}.js`)
copyFileSync(srcBundleFile, dstBundleFile)
