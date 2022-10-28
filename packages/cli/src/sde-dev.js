// Copyright (c) 2022 Climate Interactive / New Venture Fund

import path from 'path'

import { build as runBuild } from '@sdeverywhere/build'

import { parentDirForFileUrl } from './utils.js'

export let command = 'dev [options]'
export let describe = 'run a model in a live development environment'
export let builder = {
  config: {
    describe: 'path to the config file (defaults to `sde.config.js` in the current directory)',
    type: 'string',
    alias: 'c'
  },
  verbose: {
    describe: 'enable verbose log messages',
    type: 'boolean'
  }
}
export let handler = argv => {
  dev(argv.config, argv.verbose)
}
export let dev = async (configPath, verbose) => {
  const logLevels = ['error', 'info']
  if (verbose) {
    logLevels.push('verbose')
  }
  const srcDir = parentDirForFileUrl(import.meta.url)
  const sdeDir = path.resolve(srcDir, '..')
  const sdeCmdPath = path.resolve(srcDir, 'main.js')
  const result = await runBuild('development', {
    config: configPath,
    logLevels,
    sdeDir,
    sdeCmdPath
  })

  // Exit with a non-zero code if any step failed, otherwise keep the
  // builder process alive
  if (!result.isOk()) {
    console.error(`ERROR: ${result.error.message}\n`)
    process.exit(1)
  }
}

export default {
  command,
  describe,
  builder,
  handler,
  dev
}
