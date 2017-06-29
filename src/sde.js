//  SDEverywhere
//  https://sdeverywhere.org
//  Copyright © 2016-17 Todd Fincannon and Climate Interactive
//  SDEverywhere may be freely distributed under the MIT license.

// sde --help
// sde -h
//
// sde generate <model>
// sde generate <model> --spec <specfile>
// sde generate <model> --list
// sde generate <model> --refidtest
//
// sde build <model>
//
// sde log <logfile>
//
// sde compare <vensimlog> <sdelog>
// sde compare <vensimlog> <sdelog> --precision <epsilon>
// sde compare <vensimlog> <sdelog> --variable <varname>

require('yargs')
  .strict()
  .usage('usage: $0 <command> [options]')
  .command(require('./sdegen'))
  // .command('build <model>', 'build the generated model', require('./sdebuild'))
  .command(require('./sdelog'))
  .command(require('./sdecmp'))
  .help('h')
  .alias('h', 'help')
  .version('v', '0.2.1')
  .alias('v', 'version').argv
