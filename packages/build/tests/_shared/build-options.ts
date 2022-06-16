// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { join as joinPath, resolve as resolvePath } from 'path'

import type { BuildOptions, UserConfig } from '../../src'

export function buildOptions(config: string | UserConfig): BuildOptions {
  // TODO: These will not be needed once we have tighter integration with the `cli` package
  const sdeDir = resolvePath(__dirname, '..', '..', '..', 'cli')
  const sdeCmdPath = joinPath(sdeDir, 'src', 'main.js')
  return {
    config,
    logLevels: [],
    sdeDir,
    sdeCmdPath
  }
}
