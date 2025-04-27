// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { posix, relative, resolve as resolvePath } from 'path'

import { bgCyan, black, bold, cyan, dim, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

import { chooseCodeFormat } from './step-code-format'
import { chooseGenConfig, generateSampleYamlFiles, updateSdeConfig } from './step-config'
import { chooseInstallDeps } from './step-deps'
import { chooseProjectDir } from './step-directory'
import { chooseInstallEmsdk } from './step-emsdk'
import { chooseGitInit } from './step-git'
import { chooseMdlFile } from './step-mdl'
import { chooseTemplate, copyTemplate } from './step-template'

export async function main(): Promise<void> {
  // Detect the package manager
  const pkgManager = detectPackageManager()?.name || 'npm'

  // Parse command line arguments
  const args = yargs(process.argv)
  prompts.override(args)

  if (args.dryRun) {
    console.log()
    ora().info(dim(`--dry-run enabled, no files will be written.`))
  }

  // Display welcome message
  console.log(`\n${bold('Welcome to SDEverywhere!')}`)
  console.log(`Let's create a new SDEverywhere project for your model.\n`)

  // Prompt the user to select a project directory
  const projDir = await chooseProjectDir(args)
  console.log()

  // See if there is a pre-existing `config` directory
  const configDirExisted = existsSync(resolvePath(projDir, 'config'))

  // Prompt the user to select a template
  const template = await chooseTemplate(args)
  console.log()

  // Prompt the user to select an mdl file
  let mdlPath = await chooseMdlFile(projDir)
  const mdlExisted = mdlPath !== undefined
  console.log()

  if (!args.dryRun) {
    // Copy the template files to the project directory
    await copyTemplate(template, projDir, pkgManager, configDirExisted, mdlExisted)
    console.log()
  }

  if (mdlPath === undefined) {
    // There wasn't already an mdl file in the project directory, so we will use
    // the one supplied by the template.  The template is expected to have a
    // `model/MODEL_NAME.mdl` file, which gets renamed to `model/sample.mdl`
    // in the `copyTemplate` step.  Note that `chooseMdlFile` returns a
    // POSIX-style relative path, so we will also use a relative path here.
    mdlPath = `model${posix.sep}sample.mdl`
  }

  // Prompt the user to select a code generation format
  const genFormat = await chooseCodeFormat()

  if (!args.dryRun) {
    // Update the `sde.config.js` file to use the chosen mdl file
    await updateSdeConfig(projDir, mdlPath, genFormat)

    // Generate sample `checks.yaml` and `comparisons.yaml` files if needed
    const modelCheckFilesExist =
      existsSync(resolvePath(projDir, 'model', 'checks')) || existsSync(resolvePath(projDir, 'model', 'comparisons'))
    if (!modelCheckFilesExist) {
      await generateSampleYamlFiles(projDir)
    }
  }
  console.log()

  // If the user chose a template that has a `config` directory, and there wasn't
  // already a `config` directory, but there was an mdl file, offer to set up CSV files
  if (configDirExisted) {
    // There was already a `config` directory, so don't offer to set up CSV files
    ora().succeed(`Found existing "${bold('config')}" directory.`)
    ora().info(
      dim(`You can edit the files in the "${cyan('config')}" directory later to configure graphs and sliders.`)
    )
    console.log()
  } else {
    // There wasn't already a `config` directory, but there was already an mdl file,
    // so offer to set up CSV files
    const configDirExistsNow = existsSync(resolvePath(projDir, 'config'))
    if (configDirExistsNow && mdlExisted && !args.dryRun) {
      await chooseGenConfig(projDir, mdlPath)
      console.log()
    }
  }

  // If the user chose C as the code generation format, prompt the user to
  // install Emscripten SDK
  if (genFormat === 'c') {
    await chooseInstallEmsdk(projDir, args)
    console.log()
  }

  // Prompt the user to install dependencies
  await chooseInstallDeps(projDir, args, pkgManager)
  console.log()

  // Prompt the user to initialize a git repo
  await chooseGitInit(projDir, args)
  console.log()

  ora(green('Setup complete!')).succeed()

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
