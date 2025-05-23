// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join as joinPath, parse as parsePath, relative, resolve as resolvePath } from 'path'

import { bold, cyan, dim, green, reset, yellow } from 'kleur/colors'
import ora from 'ora'
import type { Choice } from 'prompts'
import prompts from 'prompts'

import { parseAndGenerate } from '@sdeverywhere/compile'

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

const sampleChecksContent = `\
# yaml-language-server: $schema=SCHEMA_PATH

#
# This file contains "check" tests that exercise your model under different input
# scenarios.  For more guidance, consult this wiki page:
#   https://github.com/climateinteractive/SDEverywhere/wiki/Testing-and-Comparing-Your-Model
#

# NOTE: The following is an example of a simple check just to get you started.
# Replace "Some output" with the name of some variable you'd like to test.
- describe: Some output
  tests:
    - it: should be > 0 for all input scenarios
      scenarios:
        - preset: matrix
      datasets:
        - name: Some output
      predicates:
        - gt: 0
`

const sampleComparisonsContent = `\
# yaml-language-server: $schema=SCHEMA_PATH

#
# This file contains definitions of custom comparison scenarios, which allow you to see
# how the behavior of the model compares to that of previous versions.  For more guidance,
# consult the following wiki page:
#   https://github.com/climateinteractive/SDEverywhere/wiki/Testing-and-Comparing-Your-Model
#

# NOTE: The following is an example of a custom scenario just to get you started.
# Replace "Some input" and "Another input" with the names of some variables you'd
# like to test.
- scenario:
    title: Custom scenario
    subtitle: gradual ramp-up
    with:
      - input: Some input
        at: 10
      - input: Another input
        at: 20
`

export async function updateSdeConfig(projDir: string, mdlPath: string, genFormat: string): Promise<void> {
  // Read the `sde.config.js` file from the template
  const configPath = joinPath(projDir, 'sde.config.js')
  let configText = await readFile(configPath, 'utf8')

  // Set the code generation format to the chosen format
  configText = configText.replace(`const genFormat = 'js'`, `const genFormat = '${genFormat}'`)

  // Replace instances of `model/MODEL_NAME.mdl` with the path to the chosen mdl file
  configText = configText.replaceAll('model/MODEL_NAME.mdl', mdlPath)

  // Write the updated file
  await writeFile(configPath, configText)
}

async function generateYaml(projDir: string, kind: 'checks' | 'comparisons', template: string): Promise<void> {
  const yamlDir = joinPath(projDir, 'model', kind)
  const yamlPath = joinPath(yamlDir, `${kind}.yaml`)
  if (!existsSync(yamlPath)) {
    // Get relative path from yaml file parent dir to project dir
    let relProjPath = relative(dirname(yamlPath), projDir)
    if (relProjPath.length === 0) {
      relProjPath = './'
    }

    // Create the directory for the yaml file, if needed
    await mkdir(yamlDir, { recursive: true })

    // TODO: This path is normally different depending on whether using npm/yarn or
    // pnpm. For npm/yarn, `check-core` is hoisted under top-level `node_modules`,
    // but for pnpm, it is nested under `node_modules/.pnpm`.  As an ugly workaround
    // the templates declare `check-core` as a direct dependency even though it is
    // not really needed (a transitive dependency via `plugin-check` would normally
    // suffice).  This allows us to use the same path here that works for all
    // three package managers.
    const nodeModulesPart = joinPath(relProjPath, 'node_modules')
    const schemaName = kind === 'checks' ? 'check' : 'comparison'
    const checkCorePart = `@sdeverywhere/check-core/schema/${schemaName}.schema.json`
    const schemaPath = `${nodeModulesPart}/${checkCorePart}`
    const yamlContent = template.replace('SCHEMA_PATH', schemaPath)
    await writeFile(yamlPath, yamlContent)
  }
}

export async function generateSampleYamlFiles(projDir: string): Promise<void> {
  // Generate a sample `checks.yaml` file if one doesn't already exist
  await generateYaml(projDir, 'checks', sampleChecksContent)

  // Generate a sample `comparisons.yaml` file if one doesn't already exist
  await generateYaml(projDir, 'comparisons', sampleComparisonsContent)
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

  // Extract `INITIAL TIME` and `FINAL TIME` values and remove special control variables from the list
  let initialTime: number
  let finalTime: number
  const validVars: MdlVariable[] = []
  for (const v of mdlVars) {
    const varName = v.name.toLowerCase()
    let skip = false
    switch (varName) {
      case 'final time':
        skip = true
        if (v.kind === 'const') {
          finalTime = v.value
        }
        break
      case 'initial time':
        skip = true
        if (v.kind === 'const') {
          initialTime = v.value
        }
        break
      case 'saveper':
      case 'time':
      case 'time step':
        skip = true
        break
      default:
        break
    }
    if (!skip) {
      validVars.push(v)
    }
  }

  // Set the values in `model.csv`
  if (initialTime === undefined) {
    initialTime = 0
  }
  if (finalTime === undefined) {
    finalTime = 100
  }

  // TODO: Auto-detect dat files that are referenced by the mdl and include them here
  const datFiles: string[] = []
  const datPart = datFiles.join(';')

  // Preserve the `model.csv` header but drop other existing content (if any)
  const modelCsvFile = joinPath(projDir, 'config', 'model.csv')
  const origModelCsvContent = await readFile(modelCsvFile, 'utf8')
  const modelCsvHeader = origModelCsvContent.split('\n')[0]

  // Disable bundled listing and customization features by default
  const bundleListing = 'false'
  const customLookups = 'false'
  const customOutputs = 'false'

  // Add line and write out updated `model.csv`
  const modelCsvLine = `${initialTime},${finalTime},${datPart},${bundleListing},${customLookups},${customOutputs}`
  const newModelCsvContent = `${modelCsvHeader}\n${modelCsvLine}\n`
  await writeFile(modelCsvFile, newModelCsvContent)

  // See if the user wants to generate graph config
  await chooseGenGraphConfig(projDir, validVars)
  console.log()

  // See if the user wants to generate slider config
  await chooseGenSliderConfig(projDir, validVars)
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

  // Preserve the `graphs.csv` header but drop other existing content (if any)
  const graphsCsvFile = joinPath(projDir, 'config', 'graphs.csv')
  const origGraphsCsvContent = await readFile(graphsCsvFile, 'utf8')
  const graphsCsvHeader = origGraphsCsvContent.split('\n')[0]

  // Write the updated `graphs.csv` file
  let newGraphsCsvContent = `${graphsCsvHeader}\n`
  if (varsResponse.vars.length > 0) {
    // Add line to `graphs.csv`
    const csvLine = graphsCsvLine(varsResponse.vars)
    newGraphsCsvContent += `${csvLine}\n`
  }
  await writeFile(graphsCsvFile, newGraphsCsvContent)

  if (varsResponse.vars.length === 0) {
    ora().info(dim(`No variables selected. You can edit the "${cyan('config/graphs.csv')}" file later.`))
    return
  }

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

  // Preserve the `inputs.csv` header but drop other existing content (if any)
  const inputsCsvFile = joinPath(projDir, 'config', 'inputs.csv')
  const origInputsCsvContent = await readFile(inputsCsvFile, 'utf8')
  const inputsCsvHeader = origInputsCsvContent.split('\n')[0]

  // Write the updated `inputs.csv` file
  let newInputsCsvContent = `${inputsCsvHeader}\n`
  if (varsResponse.vars.length > 0) {
    // Add lines to `inputs.csv`
    let idNumber = 1
    for (const inputVarName of varsResponse.vars) {
      const inputVar = mdlVars.find(v => v.name === inputVarName)
      if (inputVar && inputVar.kind === 'const') {
        const defaultValue = inputVar.value
        const csvLine = inputsCsvLine(inputVarName, defaultValue, idNumber.toString())
        newInputsCsvContent += `${csvLine}\n`
        idNumber++
      }
    }
  }
  await writeFile(inputsCsvFile, newInputsCsvContent)

  if (varsResponse.vars.length === 0) {
    ora().info(dim(`No variables selected. You can edit the "${cyan('config/inputs.csv')}" file later.`))
    return
  }

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

  // Read the model file
  const mdlFile = resolvePath(projDir, mdlPath)
  const mdlContent = await readFile(mdlFile, 'utf8')

  // Parse the model and generate the variable list
  const mdlDir = dirname(mdlFile)
  const mdlName = parsePath(mdlFile).name
  await parseAndGenerate(mdlContent, spec, ['printVarList'], mdlDir, mdlName, buildDir)

  // Read `build/{mdl}.json`
  const jsonListFile = joinPath(buildDir, `${mdlName}.json`)
  const jsonListContent = await readFile(jsonListFile, 'utf8')
  const jsonList = JSON.parse(jsonListContent)
  const varObjs = jsonList.variables

  // Create a simplified array of variables
  const mdlVars: MdlVariable[] = []
  for (const varObj of varObjs) {
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
