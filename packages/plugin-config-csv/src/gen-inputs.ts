// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ConfigContext, CsvRow } from './context'
import { optionalNumber, optionalString } from './read-config'
import type { InputId, InputSpec, SliderSpec, StringKey, SwitchSpec } from './spec-types'
import { genStringKey, htmlToUtf8 } from './strings'
import { sdeNameForVensimVarName } from './var-names'

// TODO: For now, all strings use the same "layout" specifier; this could be customized
// to provide a "maximum length" hint for a group of strings to the translation tool
const layout = 'default'

/**
 * Convert the `config/inputs.csv` file to config specs that can be used in
 * the core package.
 */
export function generateInputsConfig(context: ConfigContext): Map<InputId, InputSpec> {
  // Convert `inputs.csv` to input specs
  const inputsCsv = context.readConfigCsvFile('inputs')
  const inputSpecs: Map<InputId, InputSpec> = new Map()
  for (const row of inputsCsv) {
    const spec = inputSpecFromCsv(row, context)
    if (spec) {
      inputSpecs.set(spec.id, spec)
    }
  }

  return inputSpecs
}

function inputSpecFromCsv(r: CsvRow, context: ConfigContext): InputSpec | undefined {
  const strings = context.strings

  function requiredString(key: string): string {
    const value = r[key]
    if (value === undefined || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Must specify '${key}' for input ${r.id}`)
    }
    return value
  }

  function requiredNumber(key: string): number {
    const stringValue = requiredString(key)
    const numValue = Number(stringValue)
    if (numValue === undefined) {
      throw new Error(`Must specify numeric '${key}' for input ${r.id}`)
    }
    return numValue
  }

  // Extract required fields
  const inputIdParts = requiredString('id').split(';')
  const inputId = inputIdParts[0]
  const viewId = optionalString(r['viewid'])
  const label = optionalString(r['label']) || ''
  const inputType = requiredString('input type')

  // Skip rows that have an empty `viewid` value; this can be used to omit inputs
  // from the product until they've been fully reviewed and approved
  if (!viewId) {
    context.log('info', `Skipping input ${inputId} (${label})`)
    return undefined
  }

  // Extract optional fields
  const description = optionalString(r['description'])

  // Helper that creates a string key prefix
  const key = (kind: string) => `input_${inputId.padStart(3, '0')}_${kind}`

  // For now, use the group name defined in `inputs.csv`
  const groupTitle = optionalString(r['group name'])
  if (!groupTitle) {
    throw new Error(`Must specify 'group name' for input ${inputId}`)
  }
  const groupTitleKey = genStringKey('input_group_title', groupTitle)
  strings.add(groupTitleKey, groupTitle, layout, 'Input Group Title')

  let typeLabel: string
  switch (inputType) {
    case 'slider':
      typeLabel = 'Slider'
      break
    case 'switch':
      typeLabel = 'Switch'
      break
    case 'checkbox':
      typeLabel = 'Checkbox'
      break
    case 'checkbox group':
      typeLabel = 'Checkbox Group'
      break
    default:
      throw new Error(`Unexpected input type ${inputType}`)
  }

  // Helper that creates a string context
  const strCtxt = (kind: string) => {
    const labelText = htmlToUtf8(label).replace('&amp;', '&')
    return `${typeLabel} ${kind}: ${groupTitle} > ${labelText}`
  }

  const labelKey = strings.add(key('label'), label, layout, strCtxt('Label'))

  const listingLabel = optionalString(r['listing label'])
  let listingLabelKey: StringKey
  if (listingLabel) {
    listingLabelKey = strings.add(key('action_label'), listingLabel, layout, strCtxt('Action Label'))
  }

  let descriptionKey: StringKey
  if (description) {
    descriptionKey = strings.add(key('description'), description, layout, strCtxt('Description'), 'slider-descriptions')
  }

  // Converts a slider row in `inputs.csv` to a `SliderSpec`
  function sliderSpecFromCsv(): SliderSpec {
    const varName = requiredString('varname')
    const varId = sdeNameForVensimVarName(varName)

    const defaultValue = requiredNumber('slider/switch default')
    const minValue = requiredNumber('slider min')
    const maxValue = requiredNumber('slider max')
    const step = requiredNumber('slider step')
    const reversed = optionalString(r['reversed']) === 'yes'

    if (defaultValue < minValue || defaultValue > maxValue) {
      let e = `Default value for slider ${inputId} is out of range: `
      e += `default=${defaultValue} min=${minValue} max=${maxValue}`
      throw new Error(e)
    }
    context.addInputVariable(varName, defaultValue, minValue, maxValue)

    const format = optionalString(r['format']) || '.0f'

    const units = optionalString(r['units'])
    let unitsKey: StringKey
    if (units) {
      unitsKey = strings.add(genStringKey('input_units', units), units, layout, 'Slider Units')
    }

    const rangeInfo = getSliderRangeInfo(r, maxValue, context)
    const rangeLabelKeys = rangeInfo.labelKeys
    const rangeDividers = rangeInfo.dividers

    return {
      kind: 'slider',
      id: inputId,
      varId,
      varName,
      defaultValue,
      minValue,
      maxValue,
      step,
      reversed,
      labelKey,
      listingLabelKey,
      descriptionKey,
      unitsKey,
      rangeLabelKeys,
      rangeDividers,
      format
    }
  }

  // Converts a switch row in `inputs.csv` to a `SwitchSpec`
  function switchSpecFromCsv(): SwitchSpec {
    const varName = requiredString('varname')
    const varId = sdeNameForVensimVarName(varName)

    const onValue = requiredNumber('enabled value')
    const offValue = requiredNumber('disabled value')
    const defaultValue = requiredNumber('slider/switch default')
    if (defaultValue !== onValue && defaultValue !== offValue) {
      throw new Error(
        `Invalid default value for switch ${inputId}: off=${offValue} on=${onValue} default=${defaultValue}`
      )
    }

    const minValue = Math.min(offValue, onValue)
    const maxValue = Math.max(offValue, onValue)
    context.addInputVariable(varName, defaultValue, minValue, maxValue)

    // The `controlled input ids` field dictates which rows are active
    // when this switch is on or off.  Examples of the format of this field:
    //   1;2;3|4;5;6
    //   1|2;3;4;5
    //   |1
    // On the left side of the '|' are the rows that are active when the
    // switch is in an off position, and on the right side are the rows
    // that are active when the switch is in an on position.  Usually the
    // "active when off" rows are above the switch in the UI, and the
    // "active when on" rows are below the switch.
    const controlledInputIds = requiredString('controlled input ids')
    const controlledParts = controlledInputIds.split('|')
    const rowsActiveWhenOff = controlledParts[0].split(';').filter(id => id.trim().length > 0)
    const rowsActiveWhenOn = controlledParts[1].split(';').filter(id => id.trim().length > 0)

    return {
      kind: 'switch',
      id: inputId,
      varId,
      varName,
      labelKey,
      listingLabelKey,
      descriptionKey,
      defaultValue,
      offValue,
      onValue,
      slidersActiveWhenOff: rowsActiveWhenOff,
      slidersActiveWhenOn: rowsActiveWhenOn
    }
  }

  // Call a different converter function depending on the input type
  let inputSpec: SliderSpec | SwitchSpec
  switch (inputType) {
    case 'slider': {
      inputSpec = sliderSpecFromCsv()
      break
    }
    case 'switch':
    case 'checkbox': {
      inputSpec = switchSpecFromCsv()
      break
    }
    case 'checkbox group':
      // TODO
      // XXX: For now, we specify the checkbox IDs as a semicolon separated list
      // in the "varname" cell
      // const checkboxIds = row['varname'].split(';')
      break
    default:
      throw new Error(`Unexpected input type ${inputType}`)
  }

  return inputSpec
}

interface SliderRangeInfo {
  labelKeys: StringKey[]
  dividers: number[]
}

function getSliderRangeInfo(r: CsvRow, maxValue: number, context: ConfigContext): SliderRangeInfo {
  const strings = context.strings
  const labelKeys: StringKey[] = []
  const dividers: number[] = []

  // Get all labels to determine the number of ranges
  let rangeNum = 1
  while (rangeNum <= 5) {
    const label = optionalString(r[`range ${rangeNum} label`])
    if (!label) {
      break
    }
    const labelKey = strings.add(genStringKey('input_range', label), label, layout, 'Slider Range Label')
    if (!labelKey) {
      break
    }
    labelKeys.push(labelKey)
    rangeNum++
  }

  // Find dividing points between ranges; the absence of a final dividing point
  // indicates the use of discrete values
  const numRanges = rangeNum - 1
  for (rangeNum = 2; rangeNum <= numRanges; rangeNum++) {
    let divider = optionalNumber(r[`range ${rangeNum} start`])
    if (divider === undefined) {
      // Fall back on the slider max value when a divider is missing
      divider = maxValue
    }
    dividers.push(divider)
  }

  return {
    labelKeys,
    dividers
  }
}
