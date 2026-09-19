// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { test, expect } from './support/fixtures'

//
// These tests verify that a check bundle can run the generated model in a Web Worker
// when loaded in a browser.  Note that the `bundle-selector` tests only exercise the
// loading and selection of bundles; the worker is not spawned until the model is
// actually run, which is what these tests cover.
//

/** The URL of the current check bundle, as served by the test bundles server. */
const bundleUrl = 'http://localhost:9000/sde-prep/check-bundle.js'

/**
 * Load the current check bundle in the browser, initialize the model (which spawns a
 * Web Worker), and run the model for the given scenario.
 *
 * @param page The Playwright page used to evaluate the script.
 * @param position The position that all inputs are set to for the scenario.
 * @returns The data points for the `Total inventory` output variable.
 */
async function runModelInBrowser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  position: 'at-default' | 'at-minimum' | 'at-maximum'
): Promise<{ x: number; y: number }[]> {
  return page.evaluate(
    async ([url, inputPosition]: [string, string]) => {
      const { createBundle } = await import(/* @vite-ignore */ url)

      const bundle = createBundle()

      // Find the dataset key for the `Total inventory` output variable
      const outputVars = bundle.modelSpec.outputVars as Map<string, { varName: string }>
      let datasetKey: string
      for (const [key, outputVar] of outputVars) {
        if (outputVar.varName === 'Total inventory') {
          datasetKey = key
          break
        }
      }
      if (datasetKey === undefined) {
        throw new Error('Failed to find the dataset key for the `Total inventory` variable')
      }

      // Initialize the model; this is what spawns the Web Worker
      const bundleModel = await bundle.initModel()

      // Run the model with all inputs at the given position
      const scenario = {
        kind: 'all-inputs',
        uid: `all_inputs_at_${inputPosition}`,
        position: inputPosition
      }
      const result = await bundleModel.getDatasetsForScenario(scenario, [datasetKey])

      const dataset = result.datasetMap.get(datasetKey)
      if (dataset === undefined) {
        throw new Error('The result did not include the requested dataset')
      }

      // Convert the dataset (a map of time -> value) to an array of points so that it
      // can be returned across the Playwright boundary
      return [...dataset.entries()].map(([x, y]) => ({ x, y }))
    },
    [bundleUrl, position]
  )
}

test.describe('Model runs in a Web Worker', () => {
  test.beforeEach(async ({ app }) => {
    // Open the report page so that the bundle is imported from a normal page origin
    await app.visitReport()
  })

  test('should run the model and return output data', async ({ app }) => {
    const points = await runModelInBrowser(app.page, 'at-default')

    // Verify that we got a full series of data points back from the worker
    expect(points.length).toBeGreaterThan(0)
    for (const point of points) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }
  })

  test('should return different data for different scenarios', async ({ app }) => {
    const minPoints = await runModelInBrowser(app.page, 'at-minimum')
    const maxPoints = await runModelInBrowser(app.page, 'at-maximum')

    expect(minPoints.length).toBe(maxPoints.length)

    // The `Total inventory` output is driven by the production inputs, so the series
    // for the min and max scenarios must differ; this proves that the inputs were
    // actually transferred to the worker and used when running the model
    expect(minPoints).not.toEqual(maxPoints)
  })

  test('should run the model repeatedly using the same worker', async ({ app }) => {
    // Run the model several times in a row using a single bundle model instance, which
    // exercises the transfer of the I/O buffer to and from the worker on each run
    const allPoints = await app.page.evaluate(async (url: string) => {
      const { createBundle } = await import(/* @vite-ignore */ url)

      const bundle = createBundle()
      const outputVars = bundle.modelSpec.outputVars as Map<string, { varName: string }>
      const datasetKey = [...outputVars.keys()][0]

      const bundleModel = await bundle.initModel()

      const results: number[][] = []
      for (const position of ['at-default', 'at-minimum', 'at-maximum', 'at-default']) {
        const scenario = {
          kind: 'all-inputs',
          uid: `all_inputs_at_${position}`,
          position
        }
        const result = await bundleModel.getDatasetsForScenario(scenario, [datasetKey])
        results.push([...result.datasetMap.get(datasetKey).values()])
      }
      return results
    }, bundleUrl)

    expect(allPoints.length).toBe(4)
    for (const points of allPoints) {
      expect(points.length).toBeGreaterThan(0)
    }

    // The first and last runs use the same scenario, so they must produce the same data
    expect(allPoints[0]).toEqual(allPoints[3])
  })
})
