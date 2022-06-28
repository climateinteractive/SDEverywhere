#!/usr/bin/env node

//  SDEverywhere
//  https://sdeverywhere.org
//  Copyright © 2021 Todd Fincannon and Climate Interactive
//  SDEverywhere may be freely distributed under the MIT license.

// Commands:
// bundle
// dev
// generate
// flatten
// compile
// exec
// log
// compare
// clean
// build - generate, compile
// run - build, exec
// test - run, log, compare
// names
// causes
// which

import fs from 'fs'
import path from 'path'

import yargs from 'yargs'
import sdeBundle from './sde-bundle.js'
import sdeDev from './sde-dev.js'
import sdeGenerate from './sde-generate.js'
import sdeFlatten from './sde-flatten.js'
import sdeCompile from './sde-compile.js'
import sdeExec from './sde-exec.js'
import sdeLog from './sde-log.js'
import sdeCompare from './sde-compare.js'
import sdeClean from './sde-clean.js'
import sdeBuild from './sde-build.js'
import sdeRun from './sde-run.js'
import sdeTest from './sde-test.js'
import sdeNames from './sde-names.js'
import sdeCauses from './sde-causes.js'
import sdeWhich from './sde-which.js'

// Workaround yargs issue where it doesn't find version from package.json
// automatically in all cases in ESM context
const srcDir = new URL('.', import.meta.url).pathname
const pkgFile = path.resolve(srcDir, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgFile))

const yarg = yargs(process.argv.slice(2))
yarg
  .strict()
  .scriptName('sde')
  .usage('usage: $0 <command>')
  .command(sdeBundle)
  .command(sdeDev)
  .command(sdeGenerate)
  .command(sdeFlatten)
  .command(sdeCompile)
  .command(sdeExec)
  .command(sdeLog)
  .command(sdeCompare)
  .command(sdeClean)
  .command(sdeBuild)
  .command(sdeRun)
  .command(sdeTest)
  .command(sdeNames)
  .command(sdeCauses)
  .command(sdeWhich)
  .demandCommand(1)
  .help()
  .version(pkg.version)
  .alias('h', 'help')
  .alias('v', 'version')
  .wrap(yarg.terminalWidth())
  .parse()
