// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { relative } from 'path'

import { bgCyan, black, bold, cyan, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

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

  // Display welcome message
  console.log(`\n${bold('Welcome to SDEverywhere!')}`)
  console.log(`Let's create a new SDEverywhere project for your model.\n`)

  // Prompt the user to select a project directory
  const projDir = await chooseProjectDir(args)
  console.log()

  // Prompt the user to select a template
  const templateName = await chooseTemplate(projDir, args, pkgManager)
  console.log()

  // Prompt the user to select an mdl file
  const mdlPath = await chooseMdlFile(projDir)

  // Update the `sde.config.js` file to use the chosen mdl file and
  // generate a sample `.check.yaml` file
  await updateSdeConfig(projDir, mdlPath)
  await generateCheckYaml(projDir, mdlPath)
  console.log()

  // If the user chose the default template, offer to set up CSV files
  if (templateName === 'template-default' && !args.dryRun) {
    await chooseGenConfig(projDir, mdlPath)
    console.log()
  }

  // Prompt the user to install Emscripten SDK
  await chooseInstallEmsdk(projDir, args)
  console.log()

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
