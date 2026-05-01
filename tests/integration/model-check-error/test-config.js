// Copyright (c) 2026 Climate Interactive / New Venture Fund

// This is a custom test config used by the bundle-runtime-error integration test.
// It wraps the right-hand bundle's `initModel` so that `getDatasetsForScenario`
// always throws, which exercises the error path in the SuiteRunner (i.e., the
// `onError` callback should fire and the CLI should report a non-zero exit code).

export async function getConfigOptions(bundleL, bundleR, opts) {
  // Wrap the bundle so that `getDatasetsForScenario` throws on every call
  function wrapBundle(bundle) {
    return {
      version: bundle.version,
      modelSpec: bundle.modelSpec,
      initModel: async () => {
        const model = await bundle.initModel()
        return {
          ...model,
          getDatasetsForScenario: async () => {
            throw new Error('Simulated runtime error from getDatasetsForScenario')
          }
        }
      }
    }
  }

  return {
    current: {
      name: opts?.bundleNameR || 'current',
      bundle: wrapBundle(bundleR)
    },
    check: {
      tests: [
        `
- describe: Force a runtime error
  tests:
    - it: should always run getDatasetsForScenario
      scenarios:
        - with_inputs: all
          at: default
      datasets:
        - name: Total inventory
      predicates:
        - eq: 0
        `
      ]
    }
  }
}
