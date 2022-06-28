import path from 'path'

import { build as runBuild } from '@sdeverywhere/build'

export let command = 'build [options]'
export let describe = 'build a model as specified by a config file'
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
  build(argv.config, argv.verbose)
}
export let build = async (configPath, verbose) => {
  const logLevels = ['error', 'info']
  if (verbose) {
    logLevels.push('verbose')
  }
  const srcDir = new URL('.', import.meta.url).pathname
  const sdeDir = path.resolve(srcDir, '..')
  const sdeCmdPath = path.resolve(srcDir, 'main.js')
  const result = await runBuild('production', {
    config: configPath,
    logLevels,
    sdeDir,
    sdeCmdPath
  })
  if (result.isOk()) {
    // Exit with the specified code
    console.log()
    process.exit(result.exitCode)
  } else {
    // Exit with a non-zero code if any step failed
    console.error(`ERROR: ${result.error.message}\n`)
    process.exit(1)
  }
}

export default {
  command,
  describe,
  builder,
  handler,
  build
}
