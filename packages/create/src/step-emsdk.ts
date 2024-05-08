// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, rmSync } from 'fs'
import { join as joinPath, resolve as resolvePath } from 'path'

import { execa } from 'execa'
import { bold, cyan, dim, green, red } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

// TODO: Make this configurable; we're using this older version for now because it is
// relatively stable and has been used to build En-ROADS and C-ROADS for a long time
const version = '2.0.34'

export async function chooseInstallEmsdk(projDir: string, args: Arguments): Promise<void> {
  // TODO: Use findUp and skip this step if emsdk directory already exists

  // Prompt the user
  const underParentDir = resolvePath(projDir, '..', 'emsdk')
  const underProjDir = joinPath(projDir, 'emsdk')
  const installResponse = await prompts(
    {
      type: 'select',
      name: 'install',
      message: `Would you like to install the Emscripten SDK that is used to generate WebAssembly?`,
      choices: [
        // ${reset(dim('(recommended)'))
        {
          title: `Install under parent directory (${bold(underParentDir)})`,
          description: 'This is recommended so that it can be shared by multiple projects',
          value: 'parent'
        },
        {
          title: `Install under project directory (${bold(underProjDir)})"`,
          description: 'This is useful for keeping everything under a single project directory',
          value: 'project'
        },
        {
          title: `Don't install`,
          description: `It's OK, you can install it later`,
          value: 'skip'
        }
      ]
    },
    {
      onCancel: () => {
        ora().info(
          dim(
            'Operation cancelled. Your project folder has been created, but the Emscripten SDK and other dependencies have not been installed.'
          )
        )
        process.exit(0)
      }
    }
  )

  // Handle response
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
    return
  } else if (installResponse.install === 'skip') {
    ora().info(
      dim(
        `No problem! Be sure to install the Emscripten SDK and configure it in "${cyan('sde.config.js')}" after setup.`
      )
    )
    return
  }

  const installDir = installResponse.install === 'parent' ? underParentDir : underProjDir
  try {
    // TODO: Use spinner here
    await installEmscripten(installDir)
  } catch (e) {
    ora(red(`Failed to install Emscripten SDK: ${e.message}`)).fail()
    process.exit(0)
  }

  ora(green(`Installed the Emscripten SDK in "${bold(installDir)}"`)).succeed()
}

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
async function installEmscripten(emsdkDir: string /*, options?: { verbose?: boolean }*/): Promise<void> {
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
