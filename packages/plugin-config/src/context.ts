// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { readFileSync } from 'fs'
import { join as joinPath } from 'path'

import parseCsv from 'csv-parse/lib/sync.js'

import type { BuildContext, InputSpec, LogLevel, OutputSpec } from '@sdeverywhere/build'

import type { HexColor } from './spec-types'
import { Strings } from './strings'
import type { InputVarId, OutputVarId } from './var-names'
import { sdeNameForVensimVarName } from './var-names'

export type CsvRow = { [key: string]: string }
export type ColorId = string

export class ConfigContext {
  private readonly inputSpecs: Map<InputVarId, InputSpec> = new Map()
  private readonly outputVarNames: Map<OutputVarId, string> = new Map()
  private readonly staticVarNames: Map<string, Set<string>> = new Map()

  constructor(
    private readonly buildContext: BuildContext,
    private readonly configDir: string,
    public readonly strings: Strings,
    private readonly colorMap: Map<ColorId, HexColor>,
    public readonly modelStartTime: number,
    public readonly modelEndTime: number,
    public readonly graphDefaultMinTime: number,
    public readonly graphDefaultMaxTime: number
  ) {}

  /**
   * Read a CSV file of the given name from the config directory.
   *
   * @param name The base name of the CSV file.
   */
  readConfigCsvFile(name: string): CsvRow[] {
    return readConfigCsvFile(this.configDir, name)
  }

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

  addInputVariable(inputVarName: string, defaultValue: number, minValue: number, maxValue: number): void {
    // We use the C name as the key to avoid redundant entries in cases where
    // the csv file refers to variables with different capitalization
    const varId = sdeNameForVensimVarName(inputVarName)
    if (this.inputSpecs.get(varId)) {
      // Fail if the variable was already added (there should only be one spec
      // per input variable)
      console.error(`ERROR: Input variable ${inputVarName} was already added`)
    }
    this.inputSpecs.set(varId, {
      varName: inputVarName,
      defaultValue,
      minValue,
      maxValue
    })
  }

  addOutputVariable(outputVarName: string): void {
    // We use the C name as the key to avoid redundant entries in cases where
    // the csv file refers to variables with different capitalization
    const varId = sdeNameForVensimVarName(outputVarName)
    this.outputVarNames.set(varId, outputVarName)
  }

  addStaticVariable(sourceName: string, varName: string): void {
    const sourceVarNames = this.staticVarNames.get(sourceName)
    if (sourceVarNames) {
      sourceVarNames.add(varName)
    } else {
      const varNames: Set<string> = new Set()
      varNames.add(varName)
      this.staticVarNames.set(sourceName, varNames)
    }
  }

  getHexColorForId(colorId: ColorId): HexColor {
    return this.colorMap.get(colorId)
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

  writeStringsFiles(dstDir: string): void {
    this.strings.writeJsFiles(this.buildContext, dstDir /*, xlatLangs*/)
  }
}

export function createConfigContext(buildContext: BuildContext, configDir: string): ConfigContext {
  // Read basic model configuration from `model.csv`
  const modelCsv = readConfigCsvFile(configDir, 'model')[0]
  const modelStartTime = Number(modelCsv['model start time'])
  const modelEndTime = Number(modelCsv['model end time'])
  const graphDefaultMinTime = Number(modelCsv['graph default min time'])
  const graphDefaultMaxTime = Number(modelCsv['graph default max time'])

  // Read the static strings from `strings.csv`
  const strings = readStringsCsv(configDir)

  // Read color configuration from `colors.csv`
  const colorsCsv = readConfigCsvFile(configDir, 'colors')
  const colors = new Map()
  for (const row of colorsCsv) {
    const colorId = row['id']
    const hexColor = row['hex code']
    colors.set(colorId, hexColor)
  }

  return new ConfigContext(
    buildContext,
    configDir,
    strings,
    colors,
    modelStartTime,
    modelEndTime,
    graphDefaultMinTime,
    graphDefaultMaxTime
  )
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
function readStringsCsv(configDir: string): Strings {
  const strings = new Strings()

  // TODO: For now we use the same "layout" and "context" for all core strings
  const layout = 'default'
  const context = 'Core'

  const rows = readConfigCsvFile(configDir, 'strings')
  for (const row of rows) {
    const key = row['id']
    let str = row['string']
    str = str ? str.trim() : ''
    if (str) {
      strings.add(key, str, layout, context)
    }
  }

  return strings
}
