import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import B from 'bufx'
import * as R from 'ramda'
import sh from 'shelljs'

import { canonicalName } from '@sdeverywhere/compile'

/**
 * Run a command line silently in the "sh" shell. Print error output on error.
 *
 * @return The exit code of the exec'd process.
 */
export function execCmd(cmd) {
  let exitCode = 0
  let result = sh.exec(cmd, { silent: true })
  if (result.code !== 0) {
    console.error(result.stderr)
    exitCode = result.code
  }
  return exitCode
}

/**
 * Normalize a model pathname that may or may not include the .mdl extension.
 * If there is not a path in the model argument, default to the current working directory.
 * Return an object with properties that look like this:
 *   modelDirname: '/Users/todd/src/models/arrays'
 *   modelName: 'arrays'
 *   modelPathname: '/Users/todd/src/models/arrays/arrays.mdl'
 *
 * @param model A path to a Vensim model file.
 * @return An object with the properties specified above.
 */
export function modelPathProps(model) {
  let p = R.merge({ ext: '.mdl' }, R.pick(['dir', 'name'], path.parse(model)))
  if (R.isEmpty(p.dir)) {
    p.dir = process.cwd()
  }
  return {
    modelDirname: p.dir,
    modelName: p.name,
    modelPathname: path.format(p)
  }
}

/**
 * Read and parse a model spec JSON file.
 *
 * @param specFilename The name of the model spec JSON file, relative to the
 * current working directory.
 * @return An object containing the model spec properties, or an empty object if
 * the spec file does not exist.
 */
export function parseSpec(specFilename) {
  // Parse the JSON file if it exists.
  let spec = {}
  try {
    let json = B.read(specFilename)
    spec = JSON.parse(json)
  } catch (ex) {
    // If the file doesn't exist, use an empty object without complaining.
    // TODO: This needs to be fixed to fail fast instead of staying silent
  }

  // Translate dimension families in the spec to canonical form.
  if (spec.dimensionFamilies) {
    let f = {}
    for (let dimName in spec.dimensionFamilies) {
      let family = spec.dimensionFamilies[dimName]
      f[canonicalName(dimName)] = canonicalName(family)
    }
    spec.dimensionFamilies = f
  }

  return spec
}

/**
 * Return the absolute path to the directory in which the given (source)
 * file is located.  (This is a replacement for `__dirname`, which is not
 * available in an ESM context.)
 *
 * @param srcFileUrl The URL for the source file (i.e., `import.meta.url`).
 */
export function parentDirForFileUrl(srcFileUrl) {
  return path.dirname(fileURLToPath(srcFileUrl))
}

/**
 * Ensure the output directory exists for a given output file path.
 */
export function outputDir(outfile, modelDirname) {
  if (outfile) {
    outfile = path.dirname(outfile)
  }
  return ensureDir(outfile, 'output', modelDirname)
}

/**
 * Ensure the given build directory or {modelDir}/build exists.
 */
export function buildDir(build, modelDirname) {
  return ensureDir(build, 'build', modelDirname)
}

/**
 * Ensure the directory exists as given or under the model directory.
 */
function ensureDir(dir, defaultDir, modelDirname) {
  let dirName = dir || path.join(modelDirname, defaultDir)
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true })
  }
  return dirName
}
