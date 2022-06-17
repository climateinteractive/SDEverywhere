// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { join as joinPath } from 'path'
import { pathToFileURL } from 'url'

// import type { ViteDevServer } from 'vite'
import { build /*, createServer*/ } from 'vite'

import type { BuildContext, Plugin /*, ResolvedConfig*/ } from '@sdeverywhere/build'

import type { Bundle } from '@sdeverywhere/check-core'
import { createConfig } from '@sdeverywhere/check-core'

import type { CheckPluginOptions } from './options'
import { runTestSuite } from './run-suite'
import { createViteConfigForBundle } from './vite-config-for-bundle'
import { createViteConfigForReport } from './vite-config-for-report'
import { createViteConfigForTests } from './vite-config-for-tests'

export function checkPlugin(options?: CheckPluginOptions): Plugin {
  return new CheckPlugin(options)
}

class CheckPlugin implements Plugin {
  constructor(private readonly options?: CheckPluginOptions) {}

  // TODO: Reimplement this
  // async watch(config: ResolvedConfig): Promise<void> {
  //   // For development mode, run Vite in dev mode so that it serves the
  //   // model-check report locally (with live reload enabled).  When a model
  //   // test file is changed, the tests will be re-run in the browser.
  //   const viteConfig = createViteConfigForReport(this.options, config.prepDir, undefined)
  //   const server: ViteDevServer = await createServer(viteConfig)
  //   await server.listen()
  // }

  // TODO: Note that this plugin runs as a `postBuild` step because it currently
  // needs to run after other plugins, and those plugins need to run after the
  // staged files are copied to their final destination(s).  We should probably
  // make it configurable so that it can either be run as a `postGenerate` or a
  // `postBuild` step.
  async postBuild(context: BuildContext): Promise<boolean> {
    if (context.config.mode === 'development') {
      // Nothing to do here in dev mode; the dev server will refresh and
      // re-run the tests when changes are detected
      return true
    } else {
      let currentBundlePath: string
      if (this.options?.current === undefined) {
        // Path to current bundle was not provided, so generate a default bundle
        currentBundlePath = await this.genCurrentBundle(context)
      } else {
        // Use the provided bundle
        currentBundlePath = this.options.current.path
      }

      let testConfigPath: string
      if (this.options?.testConfigPath === undefined) {
        // Test config was not provided, so generate a default config
        testConfigPath = await this.genTestConfig(context)
      } else {
        // Use the provided test config
        testConfigPath = this.options.testConfigPath
      }

      // For production builds, run the model checks/comparisons, and then
      // inject the results into the generated report
      return this.runChecks(context, currentBundlePath, testConfigPath)
    }
  }

  private async genCurrentBundle(context: BuildContext): Promise<string> {
    context.log('info', 'Generating model check bundle...')
    const prepDir = context.config.prepDir
    const viteConfig = createViteConfigForBundle(prepDir)
    await build(viteConfig)
    return joinPath(context.config.prepDir, 'check-bundle.js')
  }

  private async genTestConfig(context: BuildContext): Promise<string> {
    context.log('info', 'Generating model check test configuration...')
    const prepDir = context.config.prepDir
    const viteConfig = createViteConfigForTests(prepDir)
    await build(viteConfig)
    return joinPath(context.config.prepDir, 'check-tests.js')
  }

  private async runChecks(context: BuildContext, currentBundlePath: string, testConfigPath: string): Promise<boolean> {
    context.log('info', 'Running model checks...')

    // Load the bundles used by the model check/compare configuration.  We
    // always initialize the "current" bundle.   Note that on Windows the
    // dynamic import path must be a `file://` URL, so we have to convert.
    const moduleR = await import(pathToFileURL(this.options.current.path).toString())
    const bundleR = moduleR.createBundle() as Bundle
    const nameR = this.options.current.name

    // Only initialize the "baseline" bundle if it is defined and the version
    // is the same as the "current" one.  If the baseline bundle has a different
    // version, we will skip the comparison tests and only run the checks on the
    // current bundle.
    let bundleL: Bundle
    let nameL: string
    if (this.options?.baseline) {
      const moduleL = await import(pathToFileURL(this.options.baseline.path).toString())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawBundleL: any = moduleL.createBundle() as any
      if (rawBundleL.version === bundleR.version) {
        bundleL = rawBundleL as Bundle
        nameL = this.options.baseline.name
      }
    }

    // Get the model check/compare configuration
    const testConfigModule = await import(pathToFileURL(testConfigPath).toString())
    const checkOptions = await testConfigModule.getConfigOptions(bundleL, bundleR, {
      nameL,
      nameR
    })

    // Run the suite of checks and comparisons
    const checkConfig = await createConfig(checkOptions)
    const result = await runTestSuite(context, checkConfig, /*verbose=*/ false)

    // Build the report (using Vite)
    context.log('info', 'Building model check report')
    const prepDir = context.config.prepDir
    const viteConfig = createViteConfigForReport(
      this.options,
      prepDir,
      currentBundlePath,
      testConfigPath,
      result.suiteSummary
    )
    await build(viteConfig)

    // context.log('info', 'Done!')

    return result.allChecksPassed
  }
}
