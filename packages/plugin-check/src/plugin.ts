// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { dirname, join as joinPath, relative } from 'path'
import { fileURLToPath } from 'url'

import type { InlineConfig, ViteDevServer } from 'vite'
import { build, createServer } from 'vite'

import type { BuildContext, ModelSpec, Plugin, ResolvedConfig } from '@sdeverywhere/build'

import type { Bundle, SuiteSummary } from '@sdeverywhere/check-core'
import { createConfig } from '@sdeverywhere/check-core'

import type { CheckPluginOptions } from './options'
import { runTestSuite } from './run-suite'
import { createViteConfigForBundle } from './vite-config-for-bundle'
import { createViteConfigForReport } from './vite-config-for-report'
import { createViteConfigForTests } from './vite-config-for-tests'

export function checkPlugin(options?: CheckPluginOptions): Plugin {
  return new CheckPlugin(options)
}

interface TestOptions {
  currentBundleName: string
  currentBundlePath: string
  testConfigPath: string
}

class CheckPlugin implements Plugin {
  private firstBuild = true

  constructor(private readonly options?: CheckPluginOptions) {}

  async watch(config: ResolvedConfig): Promise<void> {
    if (this.options?.testConfigPath === undefined) {
      // Test config was not provided, so generate a default config in watch mode.
      // The test template uses import.meta.importGlob so that checks are re-run
      // automatically when the *.check.yaml files are changed.
      await this.genTestConfig(config, 'watch')
    }

    // For development mode, run Vite in dev mode so that it serves the
    // model-check report locally (with live reload enabled).  When a model
    // test file is changed, the tests will be re-run in the browser.
    const testOptions = this.resolveTestOptions(config)
    const viteConfig = this.createViteConfigForReport(config, testOptions, undefined)
    const server: ViteDevServer = await createServer(viteConfig)
    await server.listen()
  }

  // TODO: Note that this plugin runs as a `postBuild` step because it currently
  // needs to run after other plugins, and those plugins need to run after the
  // staged files are copied to their final destination(s).  We should probably
  // make it configurable so that it can either be run as a `postGenerate` or a
  // `postBuild` step.
  async postBuild(context: BuildContext, modelSpec: ModelSpec): Promise<boolean> {
    const firstBuild = this.firstBuild
    this.firstBuild = false

    // For both production builds and local development, generate default bundle
    // in this post-build step each time a source file is changed
    // TODO: We could potentially use watch mode for the bundle similar to
    // what we do for the test config, but the bundle depends on the ModelSpec,
    // which currently isn't made available to the `watch` function
    if (this.options?.current === undefined) {
      // Path to current bundle was not provided, so generate a default bundle
      context.log('info', 'Generating model check bundle...')
      await this.genCurrentBundle(context.config, modelSpec)
    }

    // For production builds (and for the initial build in local development mode),
    // generate default test config in this post-build step
    if (this.options?.testConfigPath === undefined) {
      if (context.config.mode === 'production' || firstBuild) {
        // Test config was not provided, so generate a default config
        context.log('info', 'Generating model check test configuration...')
        await this.genTestConfig(context.config, 'build')
      }
    }

    if (context.config.mode === 'production') {
      // For production builds, run the model checks/comparisons, and then
      // inject the results into the generated report
      const testOptions = this.resolveTestOptions(context.config)
      return this.runChecks(context, testOptions)
    } else {
      // Nothing to do here in dev mode; the dev server will refresh and
      // re-run the tests in the browser when changes are detected
      return true
    }
  }

  private async genCurrentBundle(config: ResolvedConfig, modelSpec: ModelSpec): Promise<void> {
    const prepDir = config.prepDir
    const viteConfig = await createViteConfigForBundle(prepDir, modelSpec)
    await build(viteConfig)
  }

  private async genTestConfig(config: ResolvedConfig, mode: 'build' | 'watch'): Promise<void> {
    const rootDir = config.rootDir
    const prepDir = config.prepDir
    const viteConfig = createViteConfigForTests(rootDir, prepDir, mode)
    await build(viteConfig)
  }

  private async runChecks(context: BuildContext, testOptions: TestOptions): Promise<boolean> {
    context.log('info', 'Running model checks...')

    // Load the bundles used by the model check/compare configuration.  We
    // always initialize the "current" bundle.
    const moduleR = await import(relativeToSourcePath(testOptions.currentBundlePath))
    const bundleR = moduleR.createBundle() as Bundle
    const nameR = testOptions.currentBundleName

    // Only initialize the "baseline" bundle if it is defined and the version
    // is the same as the "current" one.  If the baseline bundle has a different
    // version, we will skip the comparison tests and only run the checks on the
    // current bundle.
    let bundleL: Bundle
    let nameL: string
    if (this.options?.baseline) {
      const moduleL = await import(relativeToSourcePath(this.options.baseline.path))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawBundleL: any = moduleL.createBundle() as any
      if (rawBundleL.version === bundleR.version) {
        bundleL = rawBundleL as Bundle
        nameL = this.options.baseline.name
      }
    }

    // Get the model check/compare configuration
    const testConfigModule = await import(relativeToSourcePath(testOptions.testConfigPath))
    const checkOptions = await testConfigModule.getConfigOptions(bundleL, bundleR, {
      nameL,
      nameR
    })

    // Run the suite of checks and comparisons
    const checkConfig = await createConfig(checkOptions)
    const result = await runTestSuite(context, checkConfig, /*verbose=*/ false)

    // Build the report (using Vite)
    context.log('info', 'Building model check report')
    const viteConfig = this.createViteConfigForReport(context.config, testOptions, result.suiteSummary)
    await build(viteConfig)

    // context.log('info', 'Done!')

    return result.allChecksPassed
  }

  private resolveTestOptions(config: ResolvedConfig): TestOptions {
    let currentBundleName: string
    let currentBundlePath: string
    if (this.options?.current === undefined) {
      // Path to current bundle was not provided, so use a generated bundle
      currentBundleName = 'current'
      currentBundlePath = joinPath(config.prepDir, 'check-bundle.js')
    } else {
      // Use the provided bundle
      currentBundleName = this.options.current.name
      currentBundlePath = this.options.current.path
    }

    let testConfigPath: string
    if (this.options?.testConfigPath === undefined) {
      // Test config was not provided, so use a generated config
      testConfigPath = joinPath(config.prepDir, 'check-tests.js')
    } else {
      // Use the provided test config
      testConfigPath = this.options.testConfigPath
    }

    return {
      currentBundleName,
      currentBundlePath,
      testConfigPath
    }
  }

  private createViteConfigForReport(
    config: ResolvedConfig,
    testOptions: TestOptions,
    suiteSummary: SuiteSummary | undefined
  ): InlineConfig {
    return createViteConfigForReport(
      this.options,
      config.prepDir,
      testOptions.currentBundleName,
      testOptions.currentBundlePath,
      testOptions.testConfigPath,
      suiteSummary
    )
  }
}

/**
 * Return a Unix-style path (e.g. '../../foo.js') that is relative to the directory of
 * the current source file.  This can be used to construct a path that is safe for
 * dynamic import on either Unix or Windows.
 *
 * @param filePath The path to make relative.
 */
function relativeToSourcePath(filePath: string): string {
  const srcDir = dirname(fileURLToPath(import.meta.url))
  const relPath = relative(srcDir, filePath)
  return relPath.replaceAll('\\', '/')
}
