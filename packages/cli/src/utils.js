import fs from 'fs'
import path from 'path'

import R from 'ramda'
import sh from 'shelljs'

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
