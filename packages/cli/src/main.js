#!/usr/bin/env node

//  SDEverywhere
//  https://sdeverywhere.org
//  Copyright © 2021 Todd Fincannon and Climate Interactive
//  SDEverywhere may be freely distributed under the MIT license.

// Commands:
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

import yargs from 'yargs'
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

yargs(process.argv.slice(2))
  .strict()
  .usage('usage: $0 <command>')
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
  .version()
  .alias('h', 'help')
  .alias('v', 'version')
  .parse()
