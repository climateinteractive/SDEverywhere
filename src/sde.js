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
// build - generate, compile
// run - generate, compile, exec
// test - build, run, log, compare

require('yargs')
  .strict()
  .usage('usage: $0 <command>')
  .command(require('./sde-generate'))
  .command(require('./sde-compile'))
  .command(require('./sde-exec'))
  .command(require('./sde-log'))
  .command(require('./sde-compare'))
  .command(require('./sde-build'))
  .command(require('./sde-run'))
  .command(require('./sde-test'))
  .demandCommand(1)
  .help()
  .version()
  .alias('h', 'help')
  .alias('v', 'version')
  .argv
