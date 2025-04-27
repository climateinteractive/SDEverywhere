// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs'
import { writeFile } from 'fs/promises'
import { copy } from 'fs-extra'
import { tmpdir } from 'os'
import { join as joinPath } from 'path'

import { downloadTemplate } from 'giget'
import { dim, green, red, yellow } from 'kleur/colors'
import type { Ora } from 'ora'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

const TEMPLATES = [
  {
    title: 'Default (jQuery) project',
    description: 'Includes recommended structure with config files, jQuery-based app, core library, model-check, etc',
    value: 'default'
  },
  {
    title: 'Svelte project',
    description: 'Includes recommended structure with config files, Svelte-based app, core library, model-check, etc',
    value: 'svelte'
  },
  {
    title: 'Minimal project',
    description: 'Includes simple config for model-check',
    value: 'minimal'
  }
]

export async function chooseTemplate(projDir: string, args: Arguments, pkgManager: string): Promise<string> {
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
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  // Handle response
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
    return
  }

  // Allow template name or repository to be provided on command line
  const templateName = args.template || options.template

  // Allow branch name or commit hash to be overridden on command line
  const defaultRev = 'main'
  const commit = args.commit || defaultRev

  // Construct the template repository URL
  let baseTemplateTarget: string
  if (templateName.includes(':')) {
    // Assume the template name is already in the form of a giget template, for example:
    //   github:owner/repo
    //   gitlab:owner/repo
    baseTemplateTarget = templateName
  } else if (templateName.includes('/')) {
    // Assume the template name is a GitHub repository name, for example:
    //   owner/repo
    baseTemplateTarget = `github:${templateName}`
  } else {
    // Otherwise, assume the template name is one of the available `template-*`
    // projects under `examples` in the SDEverywhere repository
    baseTemplateTarget = `github:climateinteractive/SDEverywhere/examples/template-${templateName}`
  }
  const templateTarget = `${baseTemplateTarget}#${commit}`

  // Copy the template files to the project directory
  const templateSpinner = ora('Copying project files...').start()
  await copyTemplate(templateTarget, projDir, templateSpinner)
  templateSpinner.text = green('Template copied!')
  templateSpinner.succeed()

  if (options.template === 'template-default' && pkgManager === 'pnpm') {
    // pnpm doesn't use the "workspaces" config from `package.json` (like npm and yarn use),
    // so in the case of pnpm, write a `pnpm-workspace.yaml` file so that the default
    // template monorepo layout is set up correctly
    const workspaceFile = joinPath(projDir, 'pnpm-workspace.yaml')
    const workspaceContent = `packages:\n  - packages/*\n`
    await writeFile(workspaceFile, workspaceContent)
  }

  return options.template
}

async function copyTemplate(templateTarget: string, dstDir: string, spinner: Ora): Promise<void> {
  try {
    // Make giget write to a temporary directory
    const tmpDir = mkdtempSync(joinPath(tmpdir(), 'sde-create-'))

    // Use giget to download the template (we will be writing to a temporary directory,
    // so `force` is safe)
    await downloadTemplate(`${templateTarget}`, {
      force: true,
      dir: tmpDir
    })

    // In case giget doesn't return an error when an invalid template is provided, check
    // that the temporary directory is non-empty
    if (!existsSync(tmpDir) || readdirSync(tmpDir).length === 0) {
      throw new Error('Failed to download the requested template: the temporary directory is empty.')
    }

    // Copy files to destination without overwriting
    await copy(tmpDir, dstDir, {
      overwrite: false,
      errorOnExist: false
    })

    // Remove the temporary directory
    rmSync(tmpDir, { recursive: true, force: true })
  } catch (e) {
    // The download failed; show an error message
    // TODO: Handle common download issues; for now, just log the error message and exit
    spinner.fail()
    console.error(red(e.message))
    console.error(yellow('\nThere was a problem copying the template.'))
    console.error(
      yellow(
        'Please start a new discussion thread and include the command output so that we can help:\n  https://github.com/climateinteractive/SDEverywhere/discussions/categories/q-a\n'
      )
    )
    process.exit(0)
  }
}
