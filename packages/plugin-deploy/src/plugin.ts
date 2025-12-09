// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { isAbsolute, join as joinPath } from 'node:path'

import type { BuildContext, Plugin } from '@sdeverywhere/build'

import { copyProducts } from './copy-products'
import type { BuildProduct, DeployPluginOptions, ResolvedPluginOptions } from './options'
import { storeArtifacts } from './store-artifacts'
import { validateBranchName } from './validate-branch-name'

export function deployPlugin(options?: DeployPluginOptions): Plugin {
  return new DeployPlugin(options ?? {})
}

class DeployPlugin implements Plugin {
  constructor(private readonly userOptions: DeployPluginOptions) {}

  async init(): Promise<void> {
    // Validate branch name and fail the build if it is invalid
    const branchName = getCurrentBranchName()
    if (branchName) {
      validateBranchName(branchName)
    }
  }

  async postBuild(context: BuildContext): Promise<boolean> {
    if (context.config.mode !== 'production') {
      // No deployment in dev mode
      return true
    }

    context.log('info', 'Preparing to deploy build products...')

    // Resolve the plugin options
    const resolvedOptions = resolveOptions(context, this.userOptions)

    // Remove existing deploy directory if it exists
    const deployDir = resolvedOptions.deployDir
    if (existsSync(deployDir)) {
      context.log('verbose', 'Removing existing deploy directory...')
      rmSync(deployDir, { recursive: true, force: true })
    }

    // Create deploy directory
    context.log('verbose', 'Creating deploy directory...')
    mkdirSync(deployDir, { recursive: true })

    // Copy build products to the deploy directory
    context.log('verbose', 'Copying build products to deploy directory...')
    copyProducts(context, resolvedOptions)

    // XXX: Skip the `storeArtifacts` step if running tests
    if (process.env.VITEST === 'true') {
      context.log('info', 'Skipping `storeArtifacts` step in test mode...')
      return true
    }

    // Get the name of the current branch.  If `GITHUB_REF_NAME` is not defined,
    // skip storing artifacts.
    const currentBranchName = getCurrentBranchName()
    if (!currentBranchName) {
      // TODO: For now we will only proceed with the `storeArtifacts` step if `GITHUB_REF_NAME` is defined
      // so that the plugin can be tested locally (up through the `copyProducts` step).  We should make
      // this behavior configurable in the options.
      context.log(
        'info',
        'Failed to get the name of the current branch (GITHUB_REF_NAME is not defined); artifacts branch will not be updated'
      )
      return true
    }

    // Update the artifacts branch with the build products
    context.log('verbose', 'Updating artifacts branch with build products...')
    return storeArtifacts(context, resolvedOptions, currentBranchName)
  }
}

function getRepoOwnerAndName(): [string, string] | undefined {
  const ownerAndRepo = process.env.GITHUB_REPOSITORY
  if (ownerAndRepo) {
    const [owner, repo] = ownerAndRepo.split('/')
    return [owner, repo]
  } else {
    return undefined
  }
}

function getCurrentBranchName(): string | undefined {
  if (process.env.VITEST) {
    return process.env.TEST_BRANCH_NAME
  } else {
    return process.env.GITHUB_REF_NAME
  }
}

function resolveOptions(context: BuildContext, userOptions: DeployPluginOptions): ResolvedPluginOptions {
  // Resolve the base URL
  let baseUrl: string
  if (userOptions.baseUrl) {
    // Use the provided base URL
    baseUrl = userOptions.baseUrl
  } else {
    // Determine the default base URL from the repository owner and name
    // TODO: This assumes GitHub for now, but we should support other hosts
    const repoOwnerAndName = getRepoOwnerAndName()
    if (repoOwnerAndName) {
      const [owner, repo] = repoOwnerAndName
      baseUrl = `https://${owner}.github.io/${repo}`
    } else {
      context.log(
        'info',
        'Failed to get the name of the repository (GITHUB_REPOSITORY is not defined); the deploy directory will be populated, but the artifacts branch will not be updated'
      )
      baseUrl = undefined
    }
  }

  // Resolve the absolute path to the deploy directory
  let deployDir: string
  if (userOptions.deployDir) {
    if (isAbsolute(userOptions.deployDir)) {
      deployDir = userOptions.deployDir
    } else {
      deployDir = joinPath(context.config.rootDir, userOptions.deployDir)
    }
  } else {
    deployDir = joinPath(context.config.prepDir, 'deploy')
  }

  // Resolve the build products from the options, or if undefined, use default set
  let products: Record<string, BuildProduct>
  let defaultProducts: boolean
  if (userOptions.products) {
    products = userOptions.products
    defaultProducts = false
  } else {
    products = {
      app: {
        displayName: 'app',
        srcPath: 'packages/app/public',
        dstPath: 'app'
      },
      checkReport: {
        displayName: 'checks',
        srcPath: 'sde-prep/check-report',
        dstPath: 'extras/check-compare-to-base'
      },
      checkBundle: {
        srcPath: 'sde-prep/check-bundle.js',
        dstPath: 'extras/check-bundle.js'
      }
    }
    defaultProducts = true
  }

  return {
    baseUrl,
    deployDir,
    products,
    defaultProducts
  }
}
