// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { isAbsolute, join as joinPath } from 'node:path'

import type { BuildContext } from '@sdeverywhere/build'

import type { ResolvedPluginOptions } from './options'

/**
 * Copy the build products to the deployment directory.
 *
 * @param context The build context.
 * @param options The resolved plugin options.
 */
export function copyProducts(context: BuildContext, options: ResolvedPluginOptions): void {
  // Helper function to copy a file or directory to the deployment directory
  function copyToDeployDir(src: string, dst: string): void {
    // Resolve the path to the source file or directory
    let fullSrcPath: string
    if (isAbsolute(src)) {
      fullSrcPath = src
    } else {
      fullSrcPath = joinPath(context.config.rootDir, src)
    }

    // Skip this product if we are copying the default products and the source file/dir doesn't exist
    const skipIfNotExists = options.defaultProducts
    if (skipIfNotExists && !existsSync(fullSrcPath)) {
      return
    }

    context.log('verbose', `Copying '${src}' to '${dst}'...`)

    // Resolve the path to the destination file or directory
    const fullDstPath = joinPath(options.deployDir, dst)

    // Create the destination directories, if needed
    if (existsSync(fullDstPath)) {
      mkdirSync(fullDstPath, { recursive: true })
    }

    // Copy the file or directory to the destination
    cpSync(fullSrcPath, fullDstPath, { recursive: true })
  }

  // Copy each build product to the deployment directory
  for (const product of Object.values(options.products)) {
    copyToDeployDir(product.srcPath, product.dstPath)
  }
}
