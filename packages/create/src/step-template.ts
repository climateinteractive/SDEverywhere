// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'fs'
import { writeFile } from 'fs/promises'
import { copy } from 'fs-extra'
import { tmpdir } from 'os'
import { join as joinPath } from 'path'

import { downloadTemplate } from 'giget'
import { bold, dim, green, red, yellow } from 'kleur/colors'
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

interface Template {
  /** The template URI that can be passed to `giget` to download the template. */
  uri: string
  /** The template name that will be displayed to the user. */
  name: string
}

export async function chooseTemplate(args: Arguments): Promise<Template> {
  let templateName: string
  if (args.template) {
    // Allow template name or repository to be provided on command line
    templateName = args.template
  } else {
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
    templateName = options.template
  }

  // Allow branch name or commit hash to be overridden on command line
  const defaultRev = 'main'
  const commit = args.commit || defaultRev

  // Construct the template repository URL
  let baseTemplateUri: string
  if (templateName.includes(':')) {
    // Assume the template name is already in the form of a giget template, for example:
    //   github:owner/repo
    //   gitlab:owner/repo
    baseTemplateUri = templateName
  } else if (templateName.includes('/')) {
    // Assume the template name is a GitHub repository name, for example:
    //   owner/repo
    baseTemplateUri = `github:${templateName}`
  } else {
    // Otherwise, assume the template name is one of the available `template-*`
    // projects under `examples` in the SDEverywhere repository, for example:
    //  default
    //  svelte
    //  minimal
    baseTemplateUri = `github:climateinteractive/SDEverywhere/examples/template-${templateName}`
  }
  const templateUri = `${baseTemplateUri}#${commit}`

  ora(green(`Using "${bold(templateUri)}" as the template for the project.`)).succeed()

  return {
    uri: templateUri,
    name: templateName
  }
}

export async function copyTemplate(
  template: Template,
  projDir: string,
  pkgManager: string,
  configDirExisted: boolean,
  modelExisted: boolean
): Promise<void> {
  // Show a spinner while copying the template files
  const templateSpinner = ora('Copying template files...').start()

  try {
    // Make giget write to a temporary directory
    const tmpDir = mkdtempSync(joinPath(tmpdir(), 'sde-create-'))

    // Use giget to download the template (we will be writing to a temporary directory,
    // so `force` is safe)
    await downloadTemplate(template.uri, {
      force: true,
      dir: tmpDir
    })

    // In case giget doesn't return an error when an invalid template is provided, check
    // that the temporary directory is non-empty
    if (!existsSync(tmpDir) || readdirSync(tmpDir).length === 0) {
      throw new Error('Failed to download the requested template: the temporary directory is empty.')
    }

    if (configDirExisted) {
      // There is already a `config` directory in the project directory; remove the
      // `config` directory from the template so that we don't write files from the
      // template that conflict with the existing files
      rmSync(joinPath(tmpDir, 'config'), { recursive: true, force: true })
    }

    if (modelExisted) {
      // There is already a model file in the project directory; remove the `model`
      // directory (including the model file and the model-check yaml files) from the
      // template so that we don't copy them into the project directory
      rmSync(joinPath(tmpDir, 'model'), { recursive: true, force: true })
    }

    // Copy files to destination without overwriting
    await copy(tmpDir, projDir, {
      overwrite: false,
      errorOnExist: false
    })

    if (!modelExisted) {
      // There wasn't already a model file in the project directory, so we will use
      // the one supplied by the template.  Rename it from `MODEL_NAME.mdl` to
      // `sample.mdl`.
      // TODO: For now we assume that all templates include a sample model in Vensim
      // format.  This will need to be updated if we add templates that include a
      // sample model in a different format.
      renameSync(joinPath(projDir, 'model', 'MODEL_NAME.mdl'), joinPath(projDir, 'model', 'sample.mdl'))
    }

    // Remove the temporary directory
    rmSync(tmpDir, { recursive: true, force: true })
  } catch (e) {
    // The download failed; show an error message
    // TODO: Handle common download issues; for now, just log the error message and exit
    templateSpinner.fail()
    console.error(red(e.message))
    console.error(yellow('\nThere was a problem copying the template.'))
    console.error(
      yellow(
        'Please start a new discussion thread and include the command output so that we can help:\n  https://github.com/climateinteractive/SDEverywhere/discussions/categories/q-a\n'
      )
    )
    process.exit(0)
  }

  if (existsSync(joinPath(projDir, 'packages')) && pkgManager === 'pnpm') {
    // When using pnpm and the template has a `packages` folder (i.e., it has a monorepo
    // layout), we need to write a `pnpm-workspace.yaml` file since pnpm doesn't use the
    // "workspaces" config from `package.json` (like npm and yarn use)
    const workspaceFile = joinPath(projDir, 'pnpm-workspace.yaml')
    const workspaceContent = `packages:\n  - packages/*\n`
    await writeFile(workspaceFile, workspaceContent)
  }

  templateSpinner.text = green('Template copied!')
  templateSpinner.succeed()
}
