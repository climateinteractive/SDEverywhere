// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { execaCommand } from 'execa'
import { cyan, dim, green, reset, yellow } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

export async function chooseGitInit(projDir: string, args: Arguments): Promise<void> {
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
        process.exit(0)
      }
    }
  )

  // Handle response
  if (args.dryRun) {
    ora().info(dim(`--dry-run enabled, skipping.`))
    return
  } else if (!gitResponse.git) {
    ora().info(dim(`No problem! You can come back and run ${cyan(`git init`)} later.`))
    return
  }

  // Init git repo
  try {
    await execaCommand('git init', { cwd: projDir })
    ora().succeed(green('Git repository initialized!'))
  } catch {
    ora().warn(
      yellow(
        `There was a problem initializing the Git repository, but no problem, you can run ${cyan(`git init`)} later.`
      )
    )
  }
}
