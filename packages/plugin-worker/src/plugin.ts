// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { basename, dirname, join as joinPath } from 'path'

import { build } from 'vite'

import type { BuildContext, Plugin } from '@sdeverywhere/build'

import type { WorkerPluginOptions } from './options'
import { createViteConfig } from './vite-config'

export function workerPlugin(options?: WorkerPluginOptions): Plugin {
  return new WorkerPlugin(options)
}

class WorkerPlugin implements Plugin {
  constructor(private readonly options?: WorkerPluginOptions) {}

  async postGenerate(context: BuildContext): Promise<boolean> {
    const log = context.log
    log('info', 'Building worker')

    // Locate the generated model file in the staged directory.  Note that this
    // relies on the `build` package writing the JS model (or the `plugin-wasm`
    // package writing the Wasm model) to a file called `generated-model.js`
    // in the `staged/model` directory.
    // TODO: Allow for customizing the file name/path
    const prepDir = context.config.prepDir
    const srcDir = 'model'
    const stagedModelDir = joinPath(prepDir, 'staged', srcDir)
    const inModelJsFile = 'generated-model.js'
    const outWorkerJsFile = 'worker.js'

    // If `outputPaths` is undefined, write the `worker.js` to the prep dir
    const outputPaths = this.options?.outputPaths || [joinPath(prepDir, outWorkerJsFile)]

    // Add staged file entries; this will cause the generated worker to be copied
    // to the configured output paths during the "copy staged files" step
    // TODO: This assumes that other plugins that use the generated worker files
    // will run after the "copy staged files" step.  There might be use cases
    // where a plugin needs access to these in `postGenerate`, in which case the
    // files will not have been copied already.  Need to reconsider the ordering
    // of plugins and the "copy staged files" step(s).
    for (const outputPath of outputPaths) {
      const dstDir = dirname(outputPath)
      const dstFile = basename(outputPath)
      context.prepareStagedFile(srcDir, outWorkerJsFile, dstDir, dstFile)
    }

    // Build the worker and write generated file to the `staged/model` directory
    const viteConfig = createViteConfig(stagedModelDir, inModelJsFile, outWorkerJsFile)
    await build(viteConfig)

    // log('info', 'Done!')

    return true
  }
}
