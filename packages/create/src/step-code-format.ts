// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { bold, dim, green } from 'kleur/colors'
import ora from 'ora'
import prompts from 'prompts'

const promptMessage = `Would you like your project to use WebAssembly?`

const noDesc = `\
* Choose this if you want to get started using SDEverywhere quickly
and you don't want to install the Emscripten SDK.
* This will generate a model that uses JavaScript code only, which
doesn't require extra build tools, but runs slower than WebAssembly.`
const yesDesc = `\
* Choose this if you want this script to install the Emscripten SDK
for you, or if you already have it installed.
* This will generate a model that uses WebAssembly, which requires an
additional build step, but runs faster than pure JavaScript code.`

const FORMATS = [
  {
    title: 'No, generate a JavaScript model',
    description: noDesc,
    value: 'js'
  },
  {
    title: 'Yes, generate a WebAssembly model',
    description: yesDesc,
    value: 'c'
  }
]

export async function chooseCodeFormat(): Promise<string> {
  // Prompt the user
  const options = await prompts(
    [
      {
        type: 'select',
        name: 'format',
        message: promptMessage,
        choices: FORMATS
      }
    ],
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  const target = options.format === 'c' ? 'WebAssembly' : 'JavaScript'
  const successMessage = green(
    `Configuring your project to generate ${target}. See "${bold('sde.config.js')}" for details.`
  )
  ora(successMessage).succeed()

  return options.format
}
