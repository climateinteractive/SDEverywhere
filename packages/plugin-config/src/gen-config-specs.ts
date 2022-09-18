// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ConfigContext } from './context'
import { generateGraphSpecs } from './gen-graphs'
import { generateInputsConfig } from './gen-inputs'
import type { GraphId, GraphSpec, InputId, InputSpec } from './spec-types'

export interface ConfigSpecs {
  graphSpecs: Map<GraphId, GraphSpec>
  inputSpecs: Map<InputId, InputSpec>
}

/**
 * Convert the CSV files in the `config` directory to config specs that can be
 * used in the core package.
 */
export function generateConfigSpecs(context: ConfigContext): ConfigSpecs {
  // Convert `graphs.csv` to graph specs
  context.log('verbose', '  Reading graph specs')
  const graphSpecs = generateGraphSpecs(context)

  // Convert `inputs.csv` to input specs
  context.log('verbose', '  Reading input specs')
  const inputSpecs = generateInputsConfig(context)

  // Include extra output variables that should be included in the generated
  // model even though they are not referenced in any graph specs
  context.log('verbose', '  Reading extra output variables')
  const extraOutputsCsv = context.readConfigCsvFile('outputs')
  for (const row of extraOutputsCsv) {
    const varName = row['variable name']
    if (varName) {
      context.addOutputVariable(varName)
    }
  }

  return {
    graphSpecs,
    inputSpecs
  }
}

/**
 * Write the `config-specs.ts` file to the given destination directory.
 */
export function writeConfigSpecs(context: ConfigContext, config: ConfigSpecs, dstDir: string): void {
  // Generate one big string containing the TypeScript source that will be
  // loaded by `config.ts` at runtime
  let tsContent = ''
  function emit(s: string): void {
    tsContent += s + '\n'
  }

  emit('// This file is generated by `@sdeverywhere/plugin-config`; do not edit manually!')
  emit('')
  emit(`import type { GraphSpec, InputSpec } from './spec-types'`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emitArray(type: string, values: Iterable<any>): void {
    const varName = type.charAt(0).toLowerCase() + type.slice(1) + 's'
    const array = Array.from(values)
    const json = JSON.stringify(array, null, 2)
    emit('')
    emit(`export const ${varName}: ${type}[] = ${json}`)
  }

  emitArray('GraphSpec', config.graphSpecs.values())
  emitArray('InputSpec', config.inputSpecs.values())

  // Write the `config-specs.ts` file
  context.writeStagedFile('config', dstDir, 'config-specs.ts', tsContent)
}