// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { resolve as resolvePath } from 'path'

import { bold, dim, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

export async function chooseProjectDir(args: Arguments): Promise<string> {
  /**
   * Return true if the given directory does not exist, or it does not contain important files
   * like `package.json`.
   */
  function isValidDir(dir: string): boolean {
    const packageJson = resolvePath(dir, 'package.json')
    const packagesDir = resolvePath(dir, 'packages')
    return !existsSync(dir) || (!existsSync(packageJson) && !existsSync(packagesDir))
  }

  const showValidDirMsg = (dir: string) => {
    ora({
      color: 'green',
      text: green(`Using "${bold(dir)}" as the project directory.`)
    }).succeed()
  }

  const showInvalidDirMsg = (dir: string) => {
    ora({
      color: 'red',
      text: `"${bold(dir)}" contains existing 'package.json' and/or 'packages' directory, stopping.`
    }).fail()
  }

  // See if project directory is provided on command line
  let projDir = args['_'][2] as string
  if (projDir) {
    // Directory was provided, see if it is valid
    if (isValidDir(projDir)) {
      // The provided directory is valid, so proceed
      showValidDirMsg(projDir)
    } else {
      // The provided directory is not valid, so show error message and exit
      showInvalidDirMsg(projDir)
      process.exit(1)
    }
  } else {
    // Directory was not provided, so prompt the user
    const dirResponse = await prompts(
      {
        type: 'text',
        name: 'directory',
        message: 'Where would you like to create your new project?',
        initial: '<current directory>'
        // validate(value) {
        //   if (value === '<current directory>') {
        //     value = process.cwd()
        //   }
        //   if (!isValidDir(value)) {
        //     return notValidMsg(value)
        //   }
        //   return true
        // }
      },
      { onCancel: () => ora().info(dim('Operation cancelled.')) }
    )
    if (!projDir) {
      process.exit(1)
    }
    projDir = dirResponse.directory
    if (projDir === '<current directory>') {
      projDir = process.cwd()
    }
    if (isValidDir(projDir)) {
      showValidDirMsg(projDir)
    } else {
      showInvalidDirMsg(projDir)
      process.exit(1)
    }
  }

  return projDir
}
