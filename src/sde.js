//  SDEverywhere
//  http://sdeverywhere.org
//  Copyright © 2016-17 Todd Fincannon and Climate Interactive
//  SDEverywhere may be freely distributed under the MIT license.

// usage: sde <command>
//
// Commands:
//   generate <model>              generate model code
//   log <logfile>                 process an SDEverywhere log file
//   compare <vensimlog> <sdelog>  compare Vensim and SDEverywhere log files
//
// Options:
//   -h, --help     Show help                                             [boolean]
//   -v, --version  Show version number                                   [boolean]

require('yargs')
  .strict()
  .usage('usage: $0 <command>')
  .command(require('./sdegen'))
  .command(require('./sdelog'))
  .command(require('./sdecmp'))
  .demandCommand(1)
  .help()
  .version()
  .alias('h', 'help')
  .alias('v', 'version')
  .argv
