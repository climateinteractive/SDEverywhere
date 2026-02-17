// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { readdir } from 'fs/promises'
import { relative, resolve as resolvePath, sep, posix, extname } from 'path'

import { bold, dim, green, yellow } from 'kleur/colors'
import ora from 'ora'
import type { Choice } from 'prompts'
import prompts from 'prompts'

// The set of supported model file extensions; this should match the set defined in the cli package
const supportedModelFileExtensions = new Set(['.mdl', '.xmile', '.stmx', '.itmx'])

export async function chooseModelFile(projDir: string): Promise<string | undefined> {
  // Find all supported model files in the project directory
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
  const modelFiles = allFiles
    // Only include files that have a supported extension
    .filter(f => {
      const ext = extname(f).toLowerCase()
      return supportedModelFileExtensions.has(ext)
    })
    // Convert to a relative path with POSIX path separators (we want
    // paths in the 'sde.config.js' file to use POSIX path style only,
    // since that works on any OS including Windows)
    .map(f => relative(projDir, f).replaceAll(sep, posix.sep))
  const modelChoices = modelFiles.map(f => {
    return {
      title: f,
      value: f
    } as Choice
  })

  let modelFile: string
  if (modelFiles.length === 0) {
    // No model files found; return undefined so that the model from the template is copied over
    ora(
      yellow(`No model files were found in "${projDir}". The model file from the template will be used instead.`)
    ).warn()
    modelFile = undefined
  } else if (modelFiles.length === 1) {
    // Only one model file
    modelFile = modelFiles[0]
    ora().succeed(`Found "${modelFile}", will configure the project to use that model file.`)
  } else {
    // Multiple model files found; allow the user to choose one
    // TODO: Eventually we should allow the user to choose to flatten if there are multiple submodels
    const options = await prompts(
      [
        {
          type: 'select',
          name: 'modelFile',
          message: 'It looks like there are multiple model files. Which one would you like to use?',
          choices: modelChoices
        }
      ],
      {
        onCancel: () => {
          ora().info(dim('Operation cancelled.'))
          process.exit(0)
        }
      }
    )
    modelFile = options.modelFile
    ora(green(`Using "${bold(modelFile)}" as the model for the project.`)).succeed()
  }

  return modelFile
}
