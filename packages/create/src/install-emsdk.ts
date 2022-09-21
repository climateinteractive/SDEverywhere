// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, rmSync } from 'fs'
import { join as joinPath } from 'path'

import { execa } from 'execa'

// TODO: Make this configurable; we're using this older version for now because it is
// relatively stable and has been used to build En-ROADS and C-ROADS for a long time
const version = '2.0.34'

/**
 * Install the Emscripten SDK to the `emsdk` directory under the
 * given directory (if `emsdk` is not already present), then
 * activates the requested version (specified with `version`).
 *
 * The implementation is similar to the existing `setup-emsdk` action
 * (https://github.com/mymindstorm/setup-emsdk) except that one has issues
 * with the cache directory on Windows, so having our own script gives us
 * more control over installation and caching behavior.
 */
export async function installEmscripten(emsdkDir: string /*, options?: { verbose?: boolean }*/): Promise<void> {
  // Only download if the emsdk directory wasn't restored from a cache
  if (!existsSync(emsdkDir)) {
    console.log(`Downloading Emscripten SDK to ${emsdkDir}`)
    // console.log()
    await execa('git', ['clone', 'https://github.com/emscripten-core/emsdk.git', emsdkDir])
  } else {
    console.log(`Found existing Emscripten SDK directory: ${emsdkDir}`)
  }
  // console.log()

  if (process.env.CI) {
    // On GitHub Actions, remove the `.git` directory to keep the cache smaller.
    // When we update to a new version, the cache key will miss and the emsdk
    // repo will be redownloaded.
    console.log('CI detected, removing .git directory...')
    const gitDir = joinPath(emsdkDir, '.git')
    rmSync(gitDir, { recursive: true, force: true })
  } else {
    // For local development, pull to get the latest
    console.log('Local development detected, performing git pull...')
    await execa('git', ['pull'], { cwd: emsdkDir })
    // console.log()
  }

  const emsdkCmd = async (...args: string[]) => {
    return execa('python3', ['emsdk.py', ...args], { cwd: emsdkDir })
  }

  console.log(`Activating Emscripten SDK ${version}...`)
  await emsdkCmd('install', version)
  await emsdkCmd('activate', version)
}
