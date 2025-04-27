// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, resolve as resolvePath } from 'path'
import type { Readable, Writable } from 'stream'
import { fileURLToPath } from 'url'

import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const testsDir = dirname(fileURLToPath(import.meta.url))
const dirs = {
  scratch: './fixtures/scratch-dir'
}

const promptMessages = {
  directory: 'Where would you like to create your new project?',
  template: 'Which template would you like to use?',
  wasm: 'Would you like your project to use WebAssembly?',
  configGraph: 'Would you like to configure a graph to get you started?',
  chooseOutputs: 'Choose up to three output variables to display in the graph',
  configSliders: 'Would you like to configure a few sliders to get you started?',
  chooseInputs: 'Choose up to three input variables to control with sliders',
  deps: 'Would you like to install pnpm dependencies?',
  git: 'Would you like to initialize a new git repository?'
}

const keyCodes = {
  space: '\x20',
  enter: '\x0D',
  down: '\x1B\x5B\x42'
}

function runCreate(args: string[] = []) {
  const { stdout, stdin } = execa('../bin/create-sde.js', [...args], { cwd: testsDir })
  return {
    stdin,
    stdout
  }
}

async function respondAndWaitForPrompt(
  stdin: Writable,
  stdout: Readable,
  response: string | undefined,
  prompt: string
) {
  return new Promise(resolve => {
    stdout.removeAllListeners('data')
    let chunks: string = ''
    stdout.on('data', chunk => {
      chunks += chunk.toString()
      if (chunks.includes(prompt)) {
        resolve(undefined)
      }
    })
    if (response) {
      stdin?.write(response)
    }
  })
}

describe('step - read model variables and create config files', () => {
  it('should read model variables and suggest input/output variables to include', async () => {
    // Create a scratch directory
    const scratchDir = resolvePath(testsDir, dirs.scratch)
    if (existsSync(scratchDir)) {
      rmSync(scratchDir, { recursive: true, force: true })
    }
    mkdirSync(scratchDir)

    // Add a sample model file to the scratch directory
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
    writeFileSync(resolvePath(scratchDir, 'sample.mdl'), sampleMdlContent)

    // Run the create command
    // TODO: Remove the --commit flag once the updated template is on main
    const { stdin, stdout } = runCreate(['--commit', 'a860f70', dirs.scratch])

    // Wait for the template prompt
    await respondAndWaitForPrompt(stdin!, stdout!, undefined, promptMessages.template)

    // Press enter to accept the default template then wait for the wasm prompt
    await respondAndWaitForPrompt(stdin!, stdout!, keyCodes.enter, promptMessages.wasm)

    // Press enter to accept the default project kind (JS) then wait for the configure graph prompt
    await respondAndWaitForPrompt(stdin!, stdout!, keyCodes.enter, promptMessages.configGraph)

    // Press enter to accept the default choice (yes, configure a graph)
    await respondAndWaitForPrompt(stdin!, stdout!, keyCodes.enter, promptMessages.chooseOutputs)

    // Select the two suggested variables, press enter to accept, then wait for the configure sliders prompt
    await respondAndWaitForPrompt(
      stdin!,
      stdout!,
      `${keyCodes.space}${keyCodes.down}${keyCodes.space}${keyCodes.enter}`,
      promptMessages.configSliders
    )

    // Press enter to accept the default choice (yes, configure sliders)
    await respondAndWaitForPrompt(stdin!, stdout!, keyCodes.enter, promptMessages.chooseInputs)

    // Select the one suggested variable, press enter to accept, then wait for the install dependencies prompt
    await respondAndWaitForPrompt(stdin!, stdout!, `${keyCodes.space}${keyCodes.enter}`, promptMessages.deps)

    // Enter "n" to skip installing dependencies
    await respondAndWaitForPrompt(stdin!, stdout!, `n${keyCodes.enter}`, promptMessages.git)

    // Enter "n" to skip initializing a git repository
    const msg = `\
You can now cd into the fixtures/scratch-dir project directory.
Run pnpm dev to start the local dev server. CTRL-C to close.`
    await respondAndWaitForPrompt(stdin!, stdout!, `n${keyCodes.enter}`, msg)

    // Verify the generated `config/colors.csv` file
    const expectedColors = `\
id,hex code,name,comment
blue,#0072b2,,
red,#d33700,,
green,#53bb37,,
gray,#a7a9ac,,
black,#000000,,
`
    const actualColors = readFileSync(resolvePath(scratchDir, 'config', 'colors.csv'), 'utf8')
    expect(actualColors).toEqual(expectedColors)

    // Verify the generated `config/graphs.csv` file
    const expectedGraphs = `\
id,side,parent menu,graph title,menu title,mini title,vensim graph,kind,modes,units,alternate,unused 1,unused 2,unused 3,x axis min,x axis max,x axis label,unused 4,unused 5,y axis min,y axis max,y axis soft max,y axis label,y axis format,unused 6,unused 7,plot 1 variable,plot 1 source,plot 1 style,plot 1 label,plot 1 color,plot 1 unused 1,plot 1 unused 2,plot 2 variable,plot 2 source,plot 2 style,plot 2 label,plot 2 color,plot 2 unused 1,plot 2 unused 2,plot 3 variable,plot 3 source,plot 3 style,plot 3 label,plot 3 color,plot 3 unused 1,plot 3 unused 2,plot 4 variable,plot 4 source,plot 4 style,plot 4 label,plot 4 color,plot 4 unused 1,plot 4 unused 2,plot 5 variable,plot 5 source,plot 5 style,plot 5 label,plot 5 color,plot 5 unused 1,plot 5 unused 2,plot 6 variable,plot 6 source,plot 6 style,plot 6 label,plot 6 color,plot 6 unused 1,plot 6 unused 2,plot 7 variable,plot 7 source,plot 7 style,plot 7 label,plot 7 color,plot 7 unused 1,plot 7 unused 2,plot 8 variable,plot 8 source,plot 8 style,plot 8 label,plot 8 color,plot 8 unused 1,plot 8 unused 2,plot 9 variable,plot 9 source,plot 9 style,plot 9 label,plot 9 color,plot 9 unused 1,plot 9 unused 2,plot 10 variable,plot 10 source,plot 10 style,plot 10 label,plot 10 color,plot 10 unused 1,plot 10 unused 2,plot 11 variable,plot 11 source,plot 11 style,plot 11 label,plot 11 color,plot 11 unused 1,plot 11 unused 2,plot 12 variable,plot 12 source,plot 12 style,plot 12 label,plot 12 color,plot 12 unused 1,plot 12 unused 2,plot 13 variable,plot 13 source,plot 13 style,plot 13 label,plot 13 color,plot 13 unused 1,plot 13 unused 2,plot 14 variable,plot 14 source,plot 14 style,plot 14 label,plot 14 color,plot 14 unused 1,plot 14 unused 2,plot 15 variable,plot 15 source,plot 15 style,plot 15 label,plot 15 color,plot 15 unused 1,plot 15 unused 2
1,,Graphs,Graph Title,,,,line,,,,,,,,,,,,,,,,,,,X,,line,X,blue,,,Z,,line,Z,red,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
`
    const actualGraphs = readFileSync(resolvePath(scratchDir, 'config', 'graphs.csv'), 'utf8')
    expect(actualGraphs).toEqual(expectedGraphs)

    // Verify the generated `config/inputs.csv` file
    const expectedInputs = `\
id,input type,viewid,varname,label,view level,group name,slider min,slider max,slider/switch default,slider step,units,format,reversed,range 2 start,range 3 start,range 4 start,range 5 start,range 1 label,range 2 label,range 3 label,range 4 label,range 5 label,enabled value,disabled value,controlled input ids,listing label,description
1,slider,view1,Y,Y,,Sliders,-1,1,0,0.1,(units),,,,,,,,,,,,,,,,
`
    const actualInputs = readFileSync(resolvePath(scratchDir, 'config', 'inputs.csv'), 'utf8')
    expect(actualInputs).toEqual(expectedInputs)

    // Verify the generated `config/outputs.csv` file
    const expectedOutputs = `\
variable name
`
    const actualOutputs = readFileSync(resolvePath(scratchDir, 'config', 'outputs.csv'), 'utf8')
    expect(actualOutputs).toEqual(expectedOutputs)

    // Verify the generated `config/strings.csv` file
    const expectedStrings = `\
    id,string
    __model_name,My Model
    `
    const actualStrings = readFileSync(resolvePath(scratchDir, 'config', 'strings.csv'), 'utf8')
    expect(actualStrings).toEqual(expectedStrings)
  })
})
