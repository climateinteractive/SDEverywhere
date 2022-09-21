// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs'
import { readdir } from 'fs/promises'
import { copy } from 'fs-extra'
import { tmpdir } from 'os'
import { relative, join as joinPath, resolve as resolvePath } from 'path'

import degit from 'degit'
import { execa, execaCommand } from 'execa'
import { bgCyan, black, bold, cyan, dim, green, red, reset, yellow } from 'kleur/colors'
import type { Ora } from 'ora'
import ora from 'ora'
import type { Choice } from 'prompts'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

import { installEmscripten } from './install-emsdk'

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

// XXX: This is mostly copied from Astro's create package:
//   https://github.com/withastro/astro/blob/main/packages/create-astro/src/index.ts
// It contains workarounds for degit issues that may or may not be relevant for SDE,
// so this should be re-evaluated later.
async function runDegit(templateTarget: string, hash: string, dstDir: string, spinner: Ora): Promise<void> {
  // Enable verbose degit logging if the --verbose flag is used
  const verbose = args.verbose

  // Set up degit (we will be writing to a temporary directory, so force is safe)
  const emitter = degit(`${templateTarget}${hash}`, {
    cache: false,
    force: true,
    verbose
  })

  try {
    if (verbose) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter.on('info', (info: any) => {
        console.log(info.message)
      })
    }

    // Make degit write to a temporary directory
    const tmpDir = mkdtempSync(joinPath(tmpdir(), 'sde-create-'))
    await emitter.clone(tmpDir)

    // degit does not return an error when an invalid template is provided, as such we
    // need to handle this manually
    if (!existsSync(tmpDir) || readdirSync(tmpDir).length === 0) {
      throw new Error('The requested template failed to download')
    }

    // Copy files to destination without overwriting
    await copy(tmpDir, dstDir, {
      overwrite: false,
      errorOnExist: false
    })

    // Remove the temporary directory
    rmSync(tmpDir, { recursive: true, force: true })
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
  const templateTarget = `climateinteractive/SDEverywhere/examples/${options.template}`
  // TODO: Fix this before branch is merged
  const hash = '#chris/228-create-package'

  // Copy the template files to the project directory
  if (!args.dryRun) {
    await runDegit(templateTarget, hash, projDir, templateSpinner)
  }

  templateSpinner.text = green('Template copied!')
  templateSpinner.succeed()
}

async function chooseMdlFile(projDir: string): Promise<string> {
  // Find all `.mdl` files in the project directory
  // From https://stackoverflow.com/a/45130990
  async function getFiles(dir: string): Promise<string[]> {
    const dirents = await readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      dirents.map(dirent => {
        const res = resolvePath(dir, dirent.name)
        return dirent.isDirectory() ? getFiles(res) : res
      })
    )
    return files.flat()
  }
  const allFiles = await getFiles(projDir)
  const mdlFiles = allFiles.filter(f => f.endsWith('.mdl')).map(f => relative(projDir, f))
  const mdlChoices = mdlFiles.map(f => {
    return {
      title: f,
      value: f
    } as Choice
  })

  let mdlFile: string
  if (mdlFiles.length === 0) {
    // No mdl files found; print error message and exit
    // TODO: Offer to add a basic mdl to get the user started
    ora({
      color: 'red',
      text: `No mdl files were found in "${projDir}". Add your mdl file to that directory and try again.`
    }).fail()
    process.exit(1)
  } else if (mdlFiles.length === 1) {
    // Only one mdl file
    ora().succeed(`Found "${mdlFiles[0]}", will configure the project to use that mdl file.`)
    mdlFile = mdlFiles[0]
  } else {
    // Multiple mdl files found; allow the user to choose one
    // TODO: Eventually we should allow the user to choose to flatten if there are multiple submodels
    const options = await prompts(
      [
        {
          type: 'select',
          name: 'mdlFile',
          message: 'It looks like there are multiple mdl files. Which one would you like to use?',
          choices: mdlChoices
        }
      ],
      { onCancel: () => ora().info(dim('Operation cancelled.')) }
    )
    if (!options.mdlFile) {
      process.exit(1)
    }
    mdlFile = options.mdlFile
  }

  ora({
    color: 'green',
    text: green(`Using "${bold(mdlFile)}" as the model for the project.`)
  }).succeed()

  return mdlFile
}

async function chooseInstallEmsdk(projDir: string): Promise<void> {
  // TODO: Use findUp and skip this step if emsdk directory already exists

  // Prompt the user
  const underParentDir = resolvePath(projDir, '..', 'emsdk')
  const underProjDir = joinPath(projDir, 'emsdk')
  const installResponse = await prompts(
    {
      type: 'select',
      name: 'install',
      message: `Would you like to install the Emscripten SDK?`,
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
        process.exit(1)
      }
    }
  )

  // Handle response
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
    return
  } else if (installResponse.install === 'skip') {
    ora().info(
      dim('No problem! Be sure to install the Emscripten SDK and configure it in `sde.config.js` after setup.')
    )
    return
  }

  const installDir = installResponse.install === 'parent' ? underParentDir : underProjDir
  try {
    // TODO: Use spinner here
    await installEmscripten(installDir)
  } catch (e) {
    ora({
      color: 'red',
      text: red(`Failed to install Emscripten SDK: ${e.message}`)
    }).fail()
    process.exit(1)
  }

  ora({
    color: 'green',
    text: green(`Installed the Emscripten SDK in "${bold(installDir)}"`)
  }).succeed()
}

async function chooseInstallDeps(projDir: string): Promise<void> {
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
    ora().succeed(green('Git repository created!'))
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

  if (args.TODO) {
    // Prompt the user to select a template
    await chooseTemplate(projDir)

    // Prompt the user to select an mdl file
    const mdlPath = await chooseMdlFile(projDir)
    // TODO
    console.log(mdlPath)
  }

  // TODO: Prompt the user to choose input/output vars (if default template chosen)

  // Prompt the user to install Emscripten SDK
  await chooseInstallEmsdk(projDir)

  // Prompt the user to install dependencies
  await chooseInstallDeps(projDir)

  // Prompt the user to initialize a git repo
  await chooseGitInit(projDir)

  console.log()
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
