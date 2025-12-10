import { dirname, join as joinPath } from 'path'
import { fileURLToPath } from 'url'

import { checkPlugin } from '@sdeverywhere/plugin-check'
import { configProcessor } from '@sdeverywhere/plugin-config'
import { deployPlugin } from '@sdeverywhere/plugin-deploy'
import { vitePlugin } from '@sdeverywhere/plugin-vite'
import { wasmPlugin } from '@sdeverywhere/plugin-wasm'
import { workerPlugin } from '@sdeverywhere/plugin-worker'

//
// Set the base URL for the deployed project.  This is used for determining the URLs
// for remote bundle files used by model-check and for other purposes.
//
// If you leave this undefined, the `deployPlugin` step will be disabled, and the
// project will not be automatically deployed to GitHub Pages.
//
// If `deployBaseUrl` is defined, this project will be deployed automatically to
// GitHub Pages every time you push changes to GitHub.  You should set `deployBaseUrl`
// using the following template (replace the {GH} placeholders with the actual values):
//   baseUrl = 'https://{GH_USERNAME_OR_ORG}.github.io/{GH_REPO_NAME}'
//
// For example, if your GitHub username is "sdmodeler123", and your GitHub repository
// is called "my-sd-model", you should set `baseUrl` as follows:
//   baseUrl = 'https://sdmodeler123.github.io/my-sd-model'
//
// IMPORTANT: If you set up GitHub Pages to use a custom domain, be sure to update
// this variable to use that custom domain, otherwise model-check may fail to load
// bundles due to cross origin redirect issues, for example:
//   baseUrl = 'https://sdmodeler123.com/my-sd-model'
//
// If you use a different host/server (AWS, GitLab, etc) or publish to a different
// directory structure, you can update this variable to suit your needs, for example:
//   baseUrl: 'https://sdmodeler123.com/projects/my-model'
//
// const deployBaseUrl = 'https://{GH_USERNAME_OR_ORG}.github.io/{GH_REPO_NAME}'
const deployBaseUrl = undefined

// If building the model-check report that is deployed to the web server, configure
// the baseline and current bundle options
let baselineBundle
let currentBundle
if (deployBaseUrl && process.env.NODE_ENV !== 'development') {
  // Configure the name of the branch that is used as the baseline for comparisons
  // when building the model-check report that is deployed to the web server
  const baseBranchName = 'main'
  const baseBranchBundleUrl = `${deployBaseUrl}/branch/${baseBranchName}/extras/check-bundle.js`

  // Configure the baseline bundle that is used for comparisons when building the
  // model-check report (in local development mode, we leave this undefined since
  // the local report allows the user to choose bundles at runtime)
  baselineBundle = {
    name: baseBranchName,
    url: baseBranchBundleUrl
  }

  // Use the current branch name as the "current" bundle name, otherwise (in local
  // development mode) leave it undefined so that the default value is used
  currentBundle = {
    name: process.env.GITHUB_REF_NAME || 'current'
  }
}

//
// NOTE: This template can generate a model as a WebAssembly module (runs faster,
// but requires additional tools to be installed) or in pure JavaScript format (runs
// slower, but is simpler to build).  Regardless of which approach you choose, the
// same APIs (e.g., `ModelRunner`) can be used to run the generated model.
//
// If `genFormat` is 'c', the sde compiler will generate C code, but `plugin-wasm`
// is needed to convert the C code to a WebAssembly module, in which case
// the Emscripten SDK must be installed (the `@sdeverywhere/create` package can
// help with this; see "Quick Start" instructions).
//
// If `genFormat` is 'js', the sde compiler will generate JavaScript code that runs
// in the browser or in Node.js without the additional Emscripten build step.
//
const genFormat = 'js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configDir = joinPath(__dirname, 'config')
const packagePath = (...parts) => joinPath(__dirname, 'packages', ...parts)
const appPath = (...parts) => packagePath('app', ...parts)
const corePath = (...parts) => packagePath('core', ...parts)

export async function config() {
  return {
    // Specify the format of the generated code, either 'js' or 'c'
    genFormat,

    // Specify the Vensim model to read
    modelFiles: ['model/MODEL_NAME.mdl'],

    // The following files will be hashed to determine whether the model needs
    // to be rebuilt when watch mode is active
    modelInputPaths: ['model/MODEL_NAME.mdl'],

    // The following files will cause the model to be rebuilt when watch mode is
    // is active.  Note that these are globs so we use forward slashes regardless
    // of platform.
    watchPaths: ['config/**', 'model/MODEL_NAME.mdl'],

    // Read csv files from `config` directory
    modelSpec: configProcessor({
      config: configDir,
      out: corePath()
    }),

    plugins: [
      // If targeting WebAssembly, generate a `generated-model.js` file
      // containing the Wasm model
      genFormat === 'c' && wasmPlugin(),

      // Generate a `worker.js` file that runs the model asynchronously on a
      // worker thread for improved responsiveness
      workerPlugin({
        outputPaths: [corePath('src', 'model', 'generated', 'worker.js')]
      }),

      // Build or serve the model-check report
      checkPlugin({
        baseline: baselineBundle,
        current: currentBundle,
        remoteBundlesUrl: deployBaseUrl && `${deployBaseUrl}/metadata/bundles.json`
      }),

      // Build or serve the model explorer app
      vitePlugin({
        name: 'app',
        apply: {
          development: 'serve'
        },
        config: {
          configFile: appPath('vite.config.js')
        }
      }),

      // Deploy the app and model-check report to GitHub Pages (only if `deployBaseUrl` is defined)
      ...(deployBaseUrl
        ? [
            deployPlugin({
              baseUrl: deployBaseUrl
            })
          ]
        : [])
    ]
  }
}
