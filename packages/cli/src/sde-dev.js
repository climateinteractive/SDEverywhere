// Copyright (c) 2022 Climate Interactive / New Venture Fund

import path from 'path'

import { build as runBuild } from '@sdeverywhere/build'

export let command = 'dev [options]'
export let describe = 'run a model in a live development environment'
export let builder = {
  config: {
    describe: 'path to the config file (defaults to `sde.config.js` in the current directory)',
    type: 'string',
    alias: 'c'
  }
}
export let handler = argv => {
  dev(argv.config)
}
export let dev = async configPath => {
  const srcDir = new URL('.', import.meta.url).pathname
  const sdeDir = path.resolve(srcDir, '..')
  const sdeCmdPath = path.resolve(srcDir, 'main.js')
  const result = await runBuild('development', {
    config: configPath,
    // TODO: Enable verbose only if `--verbose` flag is passed
    logLevels: ['error', 'info', 'verbose'],
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
