// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join as joinPath, relative } from 'node:path'
import { fileURLToPath } from 'url'

import type { InlineConfig, ViteDevServer } from 'vite'
import { build, createServer } from 'vite'

import type { BuildContext, Plugin, ResolvedConfig, ResolvedModelSpec } from '@sdeverywhere/build'

import type { Bundle, ConfigInitOptions, SuiteSummary } from '@sdeverywhere/check-core'
import { createConfig } from '@sdeverywhere/check-core'

import type { CheckBundle, CheckPluginOptions } from './options'
import { runTestSuite } from './run-suite'
import { createViteConfigForBundle } from './vite-config-for-bundle'
import { createViteConfigForReport } from './vite-config-for-report'
import { createViteConfigForTests } from './vite-config-for-tests'
import type { BundleSpec, LocalBundleSpec } from './bundle-spec'
import { downloadBundle } from './bundle-file-ops'

export function checkPlugin(options?: CheckPluginOptions): Plugin {
  return new CheckPlugin(options)
}

interface TestOptions {
  currentBundleSpec: BundleSpec
  baselineBundleSpec: BundleSpec | undefined
  testConfigPath: string
}

class CheckPlugin implements Plugin {
  private firstBuild = true

  constructor(private readonly options?: CheckPluginOptions) {}

  async watch(config: ResolvedConfig): Promise<void> {
    if (this.options?.testConfigPath === undefined) {
      // Test config was not provided, so generate a default config in watch mode.
      // The test template uses import.meta.glob so that checks are re-run
      // automatically when the `{checks/comparisons}/*.yaml` files are changed.
      await this.genTestConfig(config, 'watch')
    }

    // For development mode, run Vite in dev mode so that it serves the
    // model-check report locally (with live reload enabled).  When a model
    // test file is changed, the tests will be re-run in the browser.
    const testOptions = this.resolveTestOptions(config)
    const viteConfig = await this.createViteConfigForReport('watch', config, testOptions, undefined)
    const server: ViteDevServer = await createServer(viteConfig)
    await server.listen()
  }

  // TODO: Note that this plugin runs as a `postBuild` step because it currently
  // needs to run after other plugins, and those plugins need to run after the
  // staged files are copied to their final destination(s).  We should probably
  // make it configurable so that it can either be run as a `postGenerate` or a
  // `postBuild` step.
  async postBuild(context: BuildContext, modelSpec: ResolvedModelSpec): Promise<boolean> {
    const firstBuild = this.firstBuild
    this.firstBuild = false

    // For both production builds and local development, generate default bundle
    // in this post-build step each time a source file is changed
    // TODO: We could potentially use watch mode for the bundle similar to
    // what we do for the test config, but the bundle depends on the ModelSpec,
    // which currently isn't made available to the `watch` function
    if (this.options?.current === undefined) {
      // Path to current bundle was not provided, so generate a default bundle
      if (context.config.mode === 'development') {
        // Copy the previous bundle to the `bundles` directory so that
        // we automatically have it available as a baseline for comparison
        await this.copyPreviousBundle(context.config)
      }
      context.log('info', 'Generating model check bundle...')
      await this.genCurrentBundle(context, modelSpec)
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

  private async copyPreviousBundle(config: ResolvedConfig): Promise<void> {
    // Only copy if the current bundle exists
    const currentBundleFile = joinPath(config.prepDir, 'check-bundle.js')
    if (existsSync(currentBundleFile)) {
      // TODO: Use the bundles directory from the config (not yet available)
      const bundlesDir = joinPath(config.rootDir, 'bundles')
      if (!existsSync(bundlesDir)) {
        await mkdir(bundlesDir, { recursive: true })
      }
      const previousBundleFile = joinPath(bundlesDir, 'previous.js')
      await copyFile(currentBundleFile, previousBundleFile)
    }
  }

  private async genCurrentBundle(context: BuildContext, modelSpec: ResolvedModelSpec): Promise<void> {
    const viteConfig = await createViteConfigForBundle(context, modelSpec)
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

    type BundleModule = { createBundle(): Bundle }
    async function importBundleModule(bundleSpec: BundleSpec): Promise<BundleModule> {
      if (bundleSpec.kind === 'local') {
        return import(relativeToSourcePath(bundleSpec.path))
      } else {
        return import(bundleSpec.url)
      }
    }

    // Load the bundles used by the model check/compare configuration.  We
    // always initialize the "current" bundle.
    const moduleR = await importBundleModule(testOptions.currentBundleSpec)
    const bundleR = moduleR.createBundle() as Bundle
    const bundleNameR = testOptions.currentBundleSpec.name

    // Only initialize the "baseline" bundle if it is defined and the version
    // is the same as the "current" one.  If the baseline bundle has a different
    // version, we will skip the comparison tests and only run the checks on the
    // current bundle.
    let bundleL: Bundle
    let bundleNameL: string
    if (testOptions.baselineBundleSpec !== undefined) {
      const moduleL = await importBundleModule(testOptions.baselineBundleSpec)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawBundleL: any = moduleL.createBundle() as any
      if (rawBundleL.version === bundleR.version) {
        bundleL = rawBundleL as Bundle
        bundleNameL = testOptions.baselineBundleSpec.name || 'base'
      } else {
        console.warn(
          'WARNING: Bundle version mismatch ' +
            `(baseline=${rawBundleL.version} current=${bundleR.version}); ` +
            'check tests will be run but comparisons will be skipped'
        )
      }
    }

    // Get the model check/comparison configuration
    const testConfigModule = await import(relativeToSourcePath(testOptions.testConfigPath))
    const configInitOptions: ConfigInitOptions = {
      bundleNameL,
      bundleNameR
    }
    const configOptions = await testConfigModule.getConfigOptions(bundleL, bundleR, configInitOptions)

    // Run the suite of checks and comparisons
    const checkConfig = await createConfig(configOptions)
    const result = await runTestSuite(context, checkConfig, /*verbose=*/ false)

    // Build the report (using Vite)
    context.log('info', 'Building model check report')
    const viteConfig = await this.createViteConfigForReport('bundle', context.config, testOptions, result.suiteSummary)
    await build(viteConfig)

    // context.log('info', 'Done!')

    return result.allChecksPassed
  }

  private resolveTestOptions(config: ResolvedConfig): TestOptions {
    function resolveBundleSpec(bundle: CheckBundle | undefined): BundleSpec | undefined {
      if (bundle?.path !== undefined) {
        // Use the provided local bundle path
        return {
          kind: 'local',
          name: bundle.name,
          path: bundle.path
        }
      } else if (bundle?.url !== undefined) {
        // Use the provided remote bundle URL
        return {
          kind: 'remote',
          name: bundle.name,
          url: bundle.url
        }
      } else {
        // No bundle spec was provided, so use the generated "current" bundle
        return {
          kind: 'local',
          name: 'current',
          path: joinPath(config.prepDir, 'check-bundle.js')
        }
      }
    }

    // Resolve the current bundle spec
    const currentBundleSpec = resolveBundleSpec(this.options?.current)

    // Only resolve the baseline bundle spec if defined in the config; if
    // it is undefined, we will only load the "current" bundle and run the
    // check tests (no comparisons will be run)
    let baselineBundleSpec: BundleSpec | undefined
    if (this.options?.baseline) {
      baselineBundleSpec = resolveBundleSpec(this.options.baseline)
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
      currentBundleSpec,
      baselineBundleSpec,
      testConfigPath
    }
  }

  private async createViteConfigForReport(
    mode: 'bundle' | 'watch',
    config: ResolvedConfig,
    testOptions: TestOptions,
    suiteSummary: SuiteSummary | undefined
  ): Promise<InlineConfig> {
    // Note that `createViteConfigForReport` currently only supports loading
    // from a local bundle file.  If `originalBundleSpec` points to a remote
    // bundle, we need to first download it to the local bundles directory.
    async function getLocalBundle(originalBundleSpec: BundleSpec): Promise<LocalBundleSpec> {
      if (originalBundleSpec.kind === 'local') {
        // The bundle is already local
        return originalBundleSpec
      } else {
        // The bundle is remote, so download it to the local `bundles` directory
        const localBundlePath = await downloadBundle(
          originalBundleSpec.url,
          originalBundleSpec.name,
          // TODO: We don't know the last modified time of the remote bundle here, so we use
          // undefined (which means the local file will be created with the current timestamp)
          undefined,
          joinPath(config.rootDir, 'bundles')
        )
        return {
          kind: 'local',
          name: originalBundleSpec.name,
          path: localBundlePath
        }
      }
    }

    // Ensure that we have a local version of the current bundle.  If this step fails,
    // an error will be thrown and the build will fail, since this is a required step
    // for creating the model-check report.
    const localCurrentBundleSpec = await getLocalBundle(testOptions.currentBundleSpec)

    // Ensure that we have a local version of the baseline bundle, if defined.  This
    // step is allowed to fail, since the first time we create the report, the baseline
    // bundle may not already exist on the remote server.  If downloading fails, log the
    // error and continue with the build; the report will contain check tests but no
    // comparison tests will be run.
    let localBaselineBundleSpec: LocalBundleSpec | undefined
    if (mode === 'bundle' && testOptions.baselineBundleSpec) {
      try {
        localBaselineBundleSpec = await getLocalBundle(testOptions.baselineBundleSpec)
      } catch (e) {
        const spec = testOptions.baselineBundleSpec
        const name = spec.name
        const loc = spec.kind === 'local' ? spec.path : spec.url
        console.warn(
          `WARNING: Failed to load '${name}' bundle from '${loc}'; ` +
            'check tests will be run but comparisons will be skipped. ' +
            'Cause:',
          e
        )
      }
    }

    return createViteConfigForReport(
      mode,
      this.options,
      config.rootDir,
      config.prepDir,
      localCurrentBundleSpec,
      localBaselineBundleSpec,
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
