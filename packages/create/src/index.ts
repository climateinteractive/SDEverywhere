// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { relative } from 'path'

import { bgCyan, black, bold, cyan, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import detectPackageManager from 'which-pm-runs'
import yargs from 'yargs-parser'

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

  // Prompt the user to select a template
  await chooseTemplate(projDir, args)

  // Prompt the user to select an mdl file
  const mdlPath = await chooseMdlFile(projDir)
  // TODO
  console.log(mdlPath)

  // TODO: Prompt the user to choose input/output vars (if default template chosen)

  // Prompt the user to install Emscripten SDK
  await chooseInstallEmsdk(projDir, args)

  // Prompt the user to install dependencies
  await chooseInstallDeps(projDir, args, pkgManager)

  // Prompt the user to initialize a git repo
  await chooseGitInit(projDir, args)

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
