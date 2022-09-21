// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join as joinPath, parse as parsePath, resolve as resolvePath } from 'path'

import { bold, cyan, dim, green, reset, yellow } from 'kleur/colors'
import ora from 'ora'
import type { Choice } from 'prompts'
import prompts from 'prompts'
import yaml from 'yaml'

import { parseAndGenerate, preprocessModel } from '@sdeverywhere/compile'

interface MdlConstVariable {
  kind: 'const'
  name: string
  value: number
}

interface MdlAuxVariable {
  kind: 'aux'
  name: string
}

interface MdlLevelVariable {
  kind: 'level'
  name: string
}

type MdlVariable = MdlConstVariable | MdlAuxVariable | MdlLevelVariable

export async function updateSdeConfig(projDir: string, mdlPath: string): Promise<void> {
  // Read the `sde.config.js` file from the template
  const configPath = joinPath(projDir, 'sde.config.js')
  let configText = await readFile(configPath, 'utf8')

  // Replace instances of `MODEL_NAME.mdl` with the path to the chosen mdl file
  configText = configText.replaceAll('MODEL_NAME.mdl', mdlPath)

  // Write the updated file
  await writeFile(configPath, configText)
}

export async function chooseGenConfig(projDir: string, mdlPath: string): Promise<void> {
  // TODO: For now we eagerly read the mdl file; maybe change this to only load it if
  // the user chooses to generate graph and/or slider config
  let mdlVars: MdlVariable[]
  try {
    // Get the list of variables available in the model
    mdlVars = await readModelVars(projDir, mdlPath)
  } catch (e) {
    console.log(e)
    ora(
      yellow('The mdl file failed to load. We will continue setting things up, and you can diagnose the issue later.')
    ).warn()
    return
  }

  // See if the user wants to generate graph config
  await chooseGenGraphConfig(projDir, mdlVars)
  console.log()

  // See if the user wants to generate slider config
  await chooseGenSliderConfig(projDir, mdlVars)
}

async function chooseGenGraphConfig(projDir: string, mdlVars: MdlVariable[]): Promise<void> {
  // Prompt the user
  const genResponse = await prompts(
    {
      type: 'confirm',
      name: 'genGraph',
      message: `Would you like to configure a graph to get you started? ${reset(dim('(recommended)'))}`,
      initial: true
    },
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  // Handle response
  if (!genResponse.genGraph) {
    ora().info(dim(`No problem! You can edit the "${cyan('config/graphs.csv')}" file later.`))
    return
  }

  // Offer multi-select with available output variables
  const outputVarNames: string[] = []
  for (const mdlVar of mdlVars) {
    if (mdlVar.kind === 'aux' || mdlVar.kind === 'level') {
      outputVarNames.push(mdlVar.name)
    }
  }
  outputVarNames.sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })
  const choices = outputVarNames.map(f => {
    return {
      title: f,
      value: f
    } as Choice
  })
  const varsResponse = await prompts(
    {
      type: 'autocompleteMultiselect',
      name: 'vars',
      message: 'Choose up to three output variables to display in the graph',
      choices,
      max: 3
    },
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  if (varsResponse.vars.length === 0) {
    ora().info(dim(`No variables selected. You can edit the "${cyan('config/graphs.csv')}" file later.`))
    return
  }

  // Add line to `graphs.csv`
  const graphsCsvFile = joinPath(projDir, 'config', 'graphs.csv')
  const csvLine = graphsCsvLine(varsResponse.vars)
  let graphsCsvContent = await readFile(graphsCsvFile, 'utf8')
  graphsCsvContent += `${csvLine}\n`
  await writeFile(graphsCsvFile, graphsCsvContent)

  ora(
    green(`Added graph to "${bold('config/graphs.csv')}". ${dim('You can configure graphs in that file later.')}`)
  ).succeed()
}

// TODO: Ideally the `plugin-config` package would expose an API for generating CSV, but
// until then, we will generate a comma-separated line of values in hardcoded fashion
function graphsCsvLine(outputVarNames: string[]): string {
  const colors = ['blue', 'red', 'green']

  // Fill the line with blanks initially, then set the small subset of fields
  const a = Array(131).fill('')
  // id
  a[0] = '1'
  // parent menu
  a[2] = 'Graphs'
  // graph title
  a[3] = 'Graph Title'
  // kind
  a[7] = 'line'
  // Plots start at 26
  let index = 26
  let colorIndex = 0
  for (const outputVarName of outputVarNames) {
    // Surround the name in quotes if it contains a comma
    const escapedName = escapeCsvField(outputVarName)
    // plot N variable
    a[index + 0] = escapedName
    // plot N style
    a[index + 2] = 'line'
    // plot N label
    a[index + 3] = escapedName
    // plot N color
    a[index + 4] = colors[colorIndex]
    index += 7
    colorIndex++
  }

  return a.join(',')
}

async function chooseGenSliderConfig(projDir: string, mdlVars: MdlVariable[]): Promise<void> {
  // Prompt the user
  const genResponse = await prompts(
    {
      type: 'confirm',
      name: 'genSliders',
      message: `Would you like to configure a few sliders to get you started? ${reset(dim('(recommended)'))}`,
      initial: true
    },
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  // Handle response
  if (!genResponse.genSliders) {
    ora().info(dim(`No problem! You can edit the "${cyan('config/inputs.csv')}" file later.`))
    return
  }

  // Offer multi-select with available input variables
  const inputVarNames: string[] = []
  for (const mdlVar of mdlVars) {
    if (mdlVar.kind === 'const') {
      inputVarNames.push(mdlVar.name)
    }
  }
  inputVarNames.sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })
  const choices = inputVarNames.map(f => {
    return {
      title: f,
      value: f
    } as Choice
  })
  const varsResponse = await prompts(
    {
      type: 'autocompleteMultiselect',
      name: 'vars',
      message: 'Choose up to three input variables to control with sliders',
      choices,
      max: 3
    },
    {
      onCancel: () => {
        ora().info(dim('Operation cancelled.'))
        process.exit(0)
      }
    }
  )

  if (varsResponse.vars.length === 0) {
    ora().info(dim(`No variables selected. You can edit the "${cyan('config/inputs.csv')}" file later.`))
    return
  }

  // Add lines to `inputs.csv`
  const inputsCsvFile = joinPath(projDir, 'config', 'inputs.csv')
  let inputsCsvContent = await readFile(inputsCsvFile, 'utf8')
  let idNumber = 1
  for (const inputVarName of varsResponse.vars) {
    const inputVar = mdlVars.find(v => v.name === inputVarName)
    if (inputVar && inputVar.kind === 'const') {
      const defaultValue = inputVar.value
      const csvLine = inputsCsvLine(inputVarName, defaultValue, idNumber.toString())
      inputsCsvContent += `${csvLine}\n`
      idNumber++
    }
  }
  await writeFile(inputsCsvFile, inputsCsvContent)

  const slidersText = varsResponse.vars.length > 1 ? 'sliders' : 'sliders'
  ora(
    green(
      `Added ${slidersText} to "${bold('config/inputs.csv')}". ${dim('You can configure sliders in that file later.')}`
    )
  ).succeed()
}

// TODO: Ideally the `plugin-config` package would expose an API for generating CSV, but
// until then, we will generate a comma-separated line of values in hardcoded fashion
function inputsCsvLine(inputVarName: string, defaultValue: number, id: string): string {
  // Surround the name in quotes if it contains a comma
  const escapedName = escapeCsvField(inputVarName)

  // TODO: Be smarter about automatically choosing min/max/step values
  const minValue = defaultValue - 1
  const maxValue = defaultValue + 1
  const step = 0.1

  // Fill the line with blanks initially, then set the small subset of fields
  const a = Array(28).fill('')
  // id
  a[0] = id
  // input type
  a[1] = 'slider'
  // viewid
  a[2] = 'view1'
  // varname
  a[3] = escapedName
  // label
  a[4] = escapedName
  // group name
  a[6] = 'Sliders'
  // slider min
  a[7] = minValue
  // slider max
  a[8] = maxValue
  // slider default
  a[9] = defaultValue
  // slider step
  a[10] = step
  // units
  a[11] = '(units)'

  return a.join(',')
}

function escapeCsvField(s: string): string {
  // Surround the value in quotes if it contains a comma
  // TODO: Escape double quotes as well
  return s.includes(',') ? `"${s}"` : s
}

async function readModelVars(projDir: string, mdlPath: string): Promise<MdlVariable[]> {
  // TODO: This function contains a subset of the logic from `sde-generate.js` in
  // the `cli` package; should revisit
  // let { modelDirname, modelName, modelPathname } = modelPathProps(model)

  // Ensure the `build` directory exists (under the `sde-prep` directory)
  const buildDir = resolvePath(projDir, 'sde-prep', 'build')
  await mkdir(buildDir, { recursive: true })

  // Use an empty model spec; this will make SDE look at all variables in the mdl
  const spec = {}

  // Try parsing the mdl file to generate the list of variables
  // TODO: This depends on some `compile` package APIs that are not yet considered stable.
  // Ideally we'd use an API that does not write files but instead returns an in-memory
  // object in a specified format.

  // Read and preprocess the model
  const mdlFile = resolvePath(projDir, mdlPath)
  const preprocessed = preprocessModel(mdlFile, spec, 'genc', /*writeFiles=*/ false)

  // Parse the model and generate the variable list
  const mdlDir = dirname(mdlFile)
  const mdlName = parsePath(mdlFile).name
  await parseAndGenerate(preprocessed, spec, 'printVarList', mdlDir, mdlName, buildDir)

  // Read `build/{mdl}_vars.yaml`
  // TODO: For now the printVarList code only outputs txt and yaml files; we'll use the
  // yaml file for now, but that means we have a dependency on the `yaml` package.  Once
  // we change the `compile` package to output JSON, we'll need to change this code.
  const varsYamlFile = joinPath(buildDir, `${mdlName}_vars.yaml`)
  const varsYamlContent = await readFile(varsYamlFile, 'utf8')
  const varObjs = yaml.parse(varsYamlContent)

  // Create a simplified array of variables
  const mdlVars: MdlVariable[] = []
  for (const varObj of varObjs) {
    // Skip special control variables
    const varName = varObj.modelLHS.toLowerCase()
    switch (varName) {
      case 'final time':
      case 'initial time':
      case 'saveper':
      case 'time':
      case 'time step':
        continue
      default:
        break
    }

    // Only include certain variables for now
    // TODO: Include "data" vars
    switch (varObj.varType) {
      case 'const':
        mdlVars.push({
          kind: 'const',
          name: varObj.modelLHS,
          value: Number.parseFloat(varObj.modelFormula)
        })
        break
      case 'aux':
        mdlVars.push({
          kind: 'aux',
          name: varObj.modelLHS
        })
        break
      case 'level':
        mdlVars.push({
          kind: 'level',
          name: varObj.modelLHS
        })
        break
      default:
        break
    }
  }

  return mdlVars
}
