// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs'
import { writeFile } from 'fs/promises'
import { copy } from 'fs-extra'
import { tmpdir } from 'os'
import { join as joinPath } from 'path'

import degit from 'degit'
import { dim, green, red, yellow } from 'kleur/colors'
import type { Ora } from 'ora'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

const TEMPLATES = [
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

  // Copy the template files to the project directory
  const templateTarget = `climateinteractive/SDEverywhere/examples/${options.template}`
  // TODO: Fix this before branch is merged
  const hash = '#chris/228-create-package'
  const templateSpinner = ora('Copying project files...').start()
  await runDegit(templateTarget, hash, projDir, args, templateSpinner)
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

// XXX: This is mostly copied from Astro's create package:
//   https://github.com/withastro/astro/blob/main/packages/create-astro/src/index.ts
// It contains workarounds for degit issues that may or may not be relevant for SDE,
// so this should be re-evaluated later.
async function runDegit(
  templateTarget: string,
  hash: string,
  dstDir: string,
  args: Arguments,
  spinner: Ora
): Promise<void> {
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
    process.exit(0)

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
