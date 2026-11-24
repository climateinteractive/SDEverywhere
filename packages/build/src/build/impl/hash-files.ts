// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { basename, join as joinPath } from 'node:path'
import { pipeline } from 'node:stream/promises'

import { glob } from 'tinyglobby'

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
    // Include the files that match the glob patterns in the config file
    for (const globPath of config.modelInputPaths) {
      const paths = await glob(globPath, {
        cwd: config.rootDir,
        absolute: true,
        onlyFiles: true
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
    hash += await hashFile(inputFile)
  }

  return hash
}

/**
 * Asynchronously compute the hash of a single file.  The returned hash covers the
 * base name of the file followed by its contents, so that renaming a file changes
 * the hash even if its contents are unchanged.
 *
 * @param file The absolute path of the file to hash.
 * @returns The base64-encoded SHA-1 digest for the file.
 */
async function hashFile(file: string): Promise<string> {
  const hash = createHash('sha1')
  hash.update(basename(file))
  await pipeline(createReadStream(file), hash)
  return hash.digest('base64')
}
