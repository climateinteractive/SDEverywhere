// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { relative, resolve as resolvePath } from 'path'

import { bgCyan, black, bold, cyan, dim, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

import { chooseCodeFormat } from './step-code-format'
import { chooseGenConfig, generateCheckYaml, updateSdeConfig } from './step-config'
import { chooseInstallDeps } from './step-deps'
import { chooseProjectDir } from './step-directory'
import { chooseInstallEmsdk } from './step-emsdk'
import { chooseGitInit } from './step-git'
import { chooseMdlFile } from './step-mdl'
import { chooseTemplate } from './step-template'

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
  const templateName = await chooseTemplate(projDir, args, pkgManager)
  console.log()

  // Prompt the user to select an mdl file
  const mdlPath = await chooseMdlFile(projDir)
  console.log()

  // Prompt the user to select a code generation format
  const genFormat = await chooseCodeFormat()

  // Update the `sde.config.js` file to use the chosen mdl file and
  // generate a sample `.check.yaml` file
  if (!args.dryRun) {
    await updateSdeConfig(projDir, mdlPath, genFormat)
    await generateCheckYaml(projDir, mdlPath)
  }
  console.log()

  // If the user chose the default template, and there isn't already an
  // existing `config` directory, offer to set up CSV files
  if (templateName === 'template-default') {
    if (configDirExisted) {
      ora().succeed(`Found existing "${bold('config')}" directory.`)
      ora().info(
        dim(`You can edit the files in the "${cyan('config')}" directory later to configure graphs and sliders.`)
      )
      console.log()
    } else {
      if (!args.dryRun) {
        await chooseGenConfig(projDir, mdlPath)
        console.log()
      }
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
