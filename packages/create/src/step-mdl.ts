// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { readdir, writeFile } from 'fs/promises'
import { join as joinPath, relative, resolve as resolvePath } from 'path'

import { bold, cyan, dim, green, yellow } from 'kleur/colors'
import ora from 'ora'
import type { Choice } from 'prompts'
import prompts from 'prompts'

const sampleMdlContent = `\
{UTF-8}

X = TIME
  ~~|

Y = 0
  ~ [-10,10,0.1]
  ~
  |

Z = X + Y
  ~~|

INITIAL TIME = 2000 ~~|
FINAL TIME = 2100 ~~|
TIME STEP = 1 ~~|
SAVEPER = TIME STEP ~~|
`

export async function chooseMdlFile(projDir: string): Promise<string> {
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
    // No mdl files found; write a sample mdl to get the user started
    const sampleMdlFile = joinPath(projDir, 'sample.mdl')
    await writeFile(sampleMdlFile, sampleMdlContent)
    ora(
      yellow(
        `No mdl files were found in "${projDir}". A "${cyan(
          'sample.mdl'
        )}" file has been added to the project to get you started.`
      )
    ).warn()
    mdlFile = 'sample.mdl'
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
      {
        onCancel: () => {
          ora().info(dim('Operation cancelled.'))
          process.exit(0)
        }
      }
    )
    mdlFile = options.mdlFile
  }

  ora(green(`Using "${bold(mdlFile)}" as the model for the project.`)).succeed()

  return mdlFile
}
