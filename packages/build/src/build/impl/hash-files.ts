// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { join as joinPath } from 'path'
import { hashElement } from 'folder-hash'
import glob from 'tiny-glob'

import type { ResolvedConfig } from '../../_shared/resolved-config'

/**
 * Asynchronously compute the hash of the files that are inputs to the model
 * build process.
 */
export async function computeInputFilesHash(config: ResolvedConfig): Promise<string> {
  const inputFiles: string[] = []

  // Always include the `spec.json` file, since that is a primary input
  // to the model build process
  const specFile = joinPath(config.prepDir, 'spec.json')
  inputFiles.push(specFile)

  if (config.modelInputPaths && config.modelInputPaths.length > 0) {
    // Include the files that match the glob patterns in the config file.
    // Note that the folder-hash package supports glob patterns, but its
    // configuration is complicated, so it is easier if we resolve the
    // glob patterns here and pass each individual file to the
    // `hashElement` function.
    for (const globPath of config.modelInputPaths) {
      const paths = await glob(globPath, {
        cwd: config.rootDir,
        absolute: true,
        filesOnly: true
      })
      inputFiles.push(...paths)
    }
  } else {
    // Only use the mdl files to compute the hash
    inputFiles.push(...config.modelFiles)
  }

  // Compute the hash of each input file and concatenate into a single string
  let hash = ''
  for (const inputFile of inputFiles) {
    const result = await hashElement(inputFile)
    hash += result.hash
  }

  return hash
}
