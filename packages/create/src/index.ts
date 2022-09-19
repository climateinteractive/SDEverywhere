// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { relative, resolve as resolvePath } from 'path'

import degit from 'degit'
import { execa, execaCommand } from 'execa'
import { bgCyan, black, bold, cyan, dim, green, red, reset, yellow } from 'kleur/colors'
import type { Ora } from 'ora'
import ora from 'ora'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

export const TEMPLATES = [
  {
    title: 'Default project',
    description: 'Includes recommended structure with config files, app, core library, model-check, etc',
    value: 'template-default'
  },
  {
    title: 'Minimal project',
    description: 'Includes simple config for model-check',
    value: 'template-minimal'
  }
]

// Detect the package manager
const pkgManager = detectPackageManager()?.name || 'npm'

// Parse command line arguments
const args = yargs(process.argv)
prompts.override(args)

async function chooseProjectDir(): Promise<string> {
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
    const ack = ora({
      color: 'green',
      text: `Using "${bold(dir)}" as project directory.`
    })
    ack.succeed()
  }

  const showInvalidDirMsg = (dir: string) => {
    const reject = ora({
      color: 'red',
      text: `"${bold(dir)}" contains existing 'package.json' and/or 'packages' directory, stopping.`
    })
    reject.fail()
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

// XXX: This is mostly copied from Astro's create package:
//   https://github.com/withastro/astro/blob/main/packages/create-astro/src/index.ts
// It contains workarounds for degit issues that may or may not be relevant for SDE,
// so this should be re-evaluated later.
async function runDegit(templateTarget: string, hash: string, dstDir: string, spinner: Ora): Promise<void> {
  const emitter = degit(`${templateTarget}${hash}`, {
    cache: false
    // force: true
  })

  try {
    // emitter.on('info', info => {
    //   logger.debug(info.message)
    // })
    await emitter.clone(dstDir)

    // degit does not return an error when an invalid template is provided, as such we
    // need to handle this manually
    // if (isEmpty(cwd)) {
    //   fs.rmdirSync(cwd)
    //   throw new Error(`Error: The provided template (${cyan(options.template)}) does not exist`)
    // }
  } catch (e) {
    spinner.fail()

    // degit is compiled, so the stacktrace is pretty noisy. Only report the stacktrace when using verbose mode.
    // logger.debug(err)
    console.error(red(e.message))

    // TODO: Handle common degit issues like below; for now, just log the error and exit
    console.error(yellow('There was a problem copying the template.'))
    console.error(
      yellow(
        'Please file a new issue with the command output here: https://github.com/climateinteractive/sdeverywhere/issues'
      )
    )
    process.exit(1)

    // // Warning for issue #655 and other corrupted cache issue
    // if (e.message === 'zlib: unexpected end of file' || e.message === 'TAR_BAD_ARCHIVE: Unrecognized archive format') {
    //   console.log(
    //     yellow(
    //       // 'Local degit cache seems to be corrupted.'
    //       // 'For more information check out this issue: https://github.com/withastro/astro/issues/655.'
    //     )
    //   )
    //   const cacheIssueResponse = await prompts({
    //     type: 'confirm',
    //     name: 'cache',
    //     message: 'Would you like us to clear the cache and try again?',
    //     initial: true
    //   })
    //   if (cacheIssueResponse.cache) {
    //     const homeDirectory = os.homedir()
    //     const cacheDir = joinPath(homeDirectory, '.degit', 'github', '@sdeverywhere')
    //     rmSync(cacheDir, { recursive: true, force: true, maxRetries: 3 })
    //     spinner = ora('Copying project files...').start()
    //     try {
    //       await emitter.clone(dstDir)
    //     } catch (e) {
    //       // logger.debug(e)
    //       console.error(red(e.message))
    //     }
    //   } else {
    //     console.log(
    //       "Okay, no worries! To fix this manually, remove the folder '~/.degit/github/withastro' and rerun the command."
    //     )
    //   }
    // }

    // // Helpful message when encountering the "could not find commit hash for ..." error
    // if (e.code === 'MISSING_REF') {
    //   console.log(
    //     yellow(
    //       "This seems to be an issue with degit. Please check if you have 'git' installed on your system, and if you don't, go here to install: https://git-scm.com"
    //     )
    //   )
    //   console.log(
    //     yellow(
    //       "If you do have 'git' installed, please file a new issue with the command output here: https://github.com/climateinteractive/sdeverywhere/issues"
    //     )
    //   )
    // }

    // process.exit(1)
  }
}

async function chooseTemplate(projDir: string): Promise<void> {
  // Prompt the user
  const options = await prompts(
    [
      {
        type: 'select',
        name: 'template',
        message: 'Which template would you like to use?',
        choices: TEMPLATES
      }
    ],
    { onCancel: () => ora().info(dim('Operation cancelled.')) }
  )
  if (!options.template) {
    process.exit(1)
  }

  // Handle response
  const templateSpinner = ora('Copying project files...').start()
  const templateTarget = `climateinteractive/sdeverywhere/examples/${options.template}`
  // TODO: Fix this before branch is merged
  const hash = '#chris/228-create-package'

  // Copy the template files to the project directory
  if (!args.dryRun) {
    await runDegit(templateTarget, hash, projDir, templateSpinner)
  }

  templateSpinner.text = green('Template copied!')
  templateSpinner.succeed()
}

async function chooseInstall(projDir: string): Promise<void> {
  // Prompt the user
  const installResponse = await prompts(
    {
      type: 'confirm',
      name: 'install',
      message: `Would you like to install ${pkgManager} dependencies? ${reset(dim('(recommended)'))}`,
      initial: true
    },
    {
      onCancel: () => {
        ora().info(
          dim('Operation cancelled. Your project folder has been created, but no dependencies have been installed.')
        )
        process.exit(1)
      }
    }
  )

  // Handle response
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
  } else if (installResponse.install) {
    const installExec = execa(pkgManager, ['install'], { cwd: projDir })
    const installingPackagesMsg = 'Installing packages...'
    const installSpinner = ora(installingPackagesMsg).start()
    await new Promise<void>((resolve, reject) => {
      installExec.stdout?.on('data', function (data) {
        installSpinner.text = `${installingPackagesMsg}\n${bold(`[${pkgManager}]`)} ${data}`
      })
      installExec.on('error', error => reject(error))
      installExec.on('close', () => resolve())
    })
    installSpinner.text = green('Packages installed!')
    installSpinner.succeed()
  } else {
    ora().info(dim(`No problem! Remember to install dependencies after setup.`))
  }
}

async function chooseGitInit(projDir: string): Promise<void> {
  // Prompt the user
  const gitResponse = await prompts(
    {
      type: 'confirm',
      name: 'git',
      message: `Would you like to initialize a new git repository? ${reset(dim('(optional)'))}`,
      initial: true
    },
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled. Your project folder has already been created.'))
        process.exit(1)
      }
    }
  )
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
  } else if (gitResponse.git) {
    await execaCommand('git init', { cwd: projDir })
    ora().succeed('Git repository created!')
  } else {
    ora().info(dim(`No problem! You can come back and run ${cyan(`git init`)} later.`))
  }
}

export async function main(): Promise<void> {
  // Display welcome message
  console.log(`\n${bold('Welcome to SDEverywhere!')}`)
  console.log(`Let's create a new SDEverywhere project for your model.\n`)

  // Prompt the user to select a project directory
  const projDir = await chooseProjectDir()

  // Prompt the user to select a template
  await chooseTemplate(projDir)

  // Prompt the user to install dependencies
  await chooseInstall(projDir)

  // Prompt the user to initialize a git repo
  await chooseGitInit(projDir)

  // TODO: See if project contains an mdl file, if not, use hello-world
  // TODO: Set up sde.config.js file to use selected mdl file
  // TODO: Fill in default values for config files

  ora({ text: green('Setup complete!') }).succeed()

  console.log(`\n${bgCyan(black(' Next steps '))}\n`)

  const relProjDir = relative(process.cwd(), projDir)
  const devCmd = pkgManager === 'npm' ? 'npm run dev' : `${pkgManager} dev`

  // If the project dir is the current dir, no need to tell users to cd
  if (relProjDir !== '') {
    console.log(`You can now ${bold(cyan('cd'))} into the ${bold(cyan(relProjDir))} project directory.`)
  }
  console.log(`Run ${bold(cyan(devCmd))} to start the local dev server. ${bold(cyan('CTRL-C'))} to close.`)
  console.log('')
}
