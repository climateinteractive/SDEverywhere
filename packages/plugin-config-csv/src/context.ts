// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { readFileSync } from 'fs'
import { join as joinPath } from 'path'

import parseCsv from 'csv-parse/lib/sync.js'

import type { BuildContext, InputSpec, LogLevel, OutputSpec } from '@sdeverywhere/build'

import type { InputVarId, OutputVarId } from './var-names'

export type CsvRow = { [key: string]: string }

export class ConfigContext {
  private readonly inputSpecs: Map<InputVarId, InputSpec> = new Map()
  private readonly outputVarNames: Map<OutputVarId, string> = new Map()

  constructor(
    private readonly buildContext: BuildContext,
    public readonly modelStartTime: number,
    public readonly modelEndTime: number
  ) {}

  /**
   * Log a message to the console and/or the in-browser overlay panel.
   *
   * @param level The log level (verbose, info, error).
   * @param msg The message.
   */
  log(level: LogLevel, msg: string): void {
    this.buildContext.log(level, msg)
  }

  /**
   * Write a file to the staged directory.
   *
   * This file will be copied (along with other staged files) into the destination
   * directory only after the build process has completed.  Copying all staged files
   * at once helps improve the local development experience by making it so that
   * live reloading tools only need to refresh once instead of every time a build
   * file is written.
   *
   * @param srcDir The directory underneath the configured `staged` directory where
   * the file will be written (this must be a relative path).
   * @param dstDir The absolute path to the destination directory where the staged
   * file will be copied when the build has completed.
   * @param filename The name of the file.
   * @param content The file content.
   */
  writeStagedFile(srcDir: string, dstDir: string, filename: string, content: string): void {
    this.buildContext.writeStagedFile(srcDir, dstDir, filename, content)
  }

  getOrderedInputs(): InputSpec[] {
    // TODO: It would be nice to alphabetize the inputs, but currently we have
    // code that assumes that the InputSpecs in the map have the same order
    // as the variables in the spec file and model config, so preserve the
    // existing order here for now
    return Array.from(this.inputSpecs.values())
  }

  getOrderedOutputs(): OutputSpec[] {
    // Sort the output variable names alphabetically
    const alphabetical = (a: string, b: string) => (a > b ? 1 : b > a ? -1 : 0)
    const varNames = Array.from(this.outputVarNames.values()).sort(alphabetical)
    return varNames.map(varName => {
      return {
        varName
      }
    })
  }

  writeStringsFiles(): void {
    // const dstDir = corePackageFilePath('strings')
    // this.strings.writeJsFiles(this.buildContext, dstDir, xlatLangs)
  }
}

export function createConfigContext(buildContext: BuildContext, configDir: string): ConfigContext {
  // Read basic app configuration from `model.csv`
  const modelCsv = readConfigCsvFile(configDir, 'model')[0]
  const modelStartTime = Number(modelCsv.startTime)
  const modelEndTime = Number(modelCsv.endTime)

  // Read the static strings from `strings.csv`
  // const strings = readStringsCsv()

  return new ConfigContext(buildContext, modelStartTime, modelEndTime /*, strings*/)
}

function configFilePath(configDir: string, name: string, ext: string): string {
  return joinPath(configDir, `${name}.${ext}`)
}

function readCsvFile(path: string): CsvRow[] {
  const data = readFileSync(path, 'utf8')
  return parseCsv(data, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
    skip_lines_with_empty_values: true
  })
}

function readConfigCsvFile(configDir: string, name: string): CsvRow[] {
  return readCsvFile(configFilePath(configDir, name, 'csv'))
}

/**
 * Initialize a `Strings` instance with the core strings from `strings.csv`.
 */
// function readStringsCsv(configDir: string): Strings {
//   const strings = new Strings()

//   const rows = readConfigCsvFile(configDir, 'strings')
//   for (const row of rows) {
//     const key = row['id']
//     let str = row['string']

//     str = str ? str.trim() : ''
//     if (str) {
//       strings.add(key, str, layout, strCtxt, 'primary')
//     }
//   }

//   return strings
// }
