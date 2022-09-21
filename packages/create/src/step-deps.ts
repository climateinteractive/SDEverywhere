// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { execa } from 'execa'
import { bold, cyan, dim, green, reset, yellow } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'
import type { Arguments } from 'yargs-parser'

export async function chooseInstallDeps(projDir: string, args: Arguments, pkgManager: string): Promise<void> {
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
        process.exit(0)
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
    try {
      await new Promise<void>((resolve, reject) => {
        installExec.stdout?.on('data', function (data) {
          installSpinner.text = `${installingPackagesMsg}\n${bold(`[${pkgManager}]`)} ${data}`
        })
        installExec.stderr?.on('data', function (data) {
          installSpinner.text = `${installingPackagesMsg}\n${bold(`[${pkgManager}]`)} ${data}`
        })
        installExec.on('error', error => reject(error))
        installExec.on('exit', code => reject(`Install failed (code=${code})`))
        installExec.on('close', () => resolve())
      })
      installSpinner.text = green('Packages installed!')
      installSpinner.succeed()
    } catch (e) {
      installSpinner.text = yellow(
        `There was an error installing packages. Try running ${cyan(
          `${pkgManager} install`
        )} in your project directory later.`
      )
      installSpinner.warn()
    }
  } else {
    ora().info(dim(`No problem! Remember to install dependencies after setup.`))
  }
}
