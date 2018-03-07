//  SDEverywhere
//  http://sdeverywhere.org
//  Copyright © 2016-17 Todd Fincannon and Climate Interactive
//  SDEverywhere may be freely distributed under the MIT license.

// Commands:
// generate
// compile
// exec
// log
// compare
// clean
// build - generate, compile
// run - build, exec
// test - run, log, compare
// names
// graph

const util = require('util')

let exitCode = require('yargs')
  .strict()
  .usage('usage: $0 <command>')
  .command(require('./sde-generate'))
  .command(require('./sde-compile'))
  .command(require('./sde-exec'))
  .command(require('./sde-log'))
  .command(require('./sde-compare'))
  .command(require('./sde-clean'))
  .command(require('./sde-build'))
  .command(require('./sde-run'))
  .command(require('./sde-test'))
  .command(require('./sde-names'))
  .command(require('./sde-graph'))
  .demandCommand(1)
  .help()
  .version()
  .alias('h', 'help')
  .alias('v', 'version')
  .argv
