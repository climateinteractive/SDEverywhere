// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { ComparisonDataset, ComparisonScenario } from '@sdeverywhere/check-core'
import { datasetSpan } from './spans'

/**
 * Return an array of HTML strings containing an element that can be used to display
 * annotations for a given dataset.
 */
export function getAnnotationsForDataset(
  dataset: ComparisonDataset,
  bundleNameL: string,
  bundleNameR: string
): string[] {
  const annotations: string[] = []

  if (dataset.outputVarL && dataset.outputVarR) {
    if (dataset.outputVarR.varName !== dataset.outputVarL.varName) {
      annotations.push(annotationSpan('warn', `variable renamed, previously '${dataset.outputVarL.varName}'`))
    }
  } else {
    if (dataset.outputVarL !== undefined) {
      annotations.push(annotationSpan('warn', `variable only defined in ${datasetSpan(bundleNameL, 'left')}`))
    } else if (dataset.outputVarR !== undefined) {
      annotations.push(annotationSpan('warn', `variable only defined in ${datasetSpan(bundleNameR, 'right')}`))
    }
  }

  return annotations
}

/**
 * Return an array of HTML strings containing an element that can be used to display
 * annotations for a given scenario.
 */
export function getAnnotationsForScenario(
  scenario: ComparisonScenario,
  bundleNameL: string,
  bundleNameR: string
): string[] {
  const annotations: string[] = []

  if (scenario.settings.kind === 'all-inputs-settings') {
    // No issues for "all inputs at position" scenarios
    return []
  }

  type InputErrorKind = 'unknown-input' | 'unknown-input-setting-group'
  interface InputError {
    requestedName: string
    kind: InputErrorKind
  }
  type InputWarningKind = 'value-out-of-range'
  interface InputWarning {
    requestedName: string
    kind: InputWarningKind
  }
  const errorsInBoth: InputError[] = []
  const errorsInL: InputError[] = []
  const errorsInR: InputError[] = []
  const warningsInBoth: InputWarning[] = []
  const warningsInL: InputWarning[] = []
  const warningsInR: InputWarning[] = []
  for (const input of scenario.settings.inputs) {
    const errKindL = input.stateL.error?.kind
    const errKindR = input.stateR.error?.kind
    const warnKindL = input.stateL.warning?.kind
    const warnKindR = input.stateR.warning?.kind

    const uisgL = errKindL === 'unknown-input-setting-group'
    const uisgR = errKindR === 'unknown-input-setting-group'

    const uiL = errKindL === 'unknown-input'
    const uiR = errKindR === 'unknown-input'

    const oorL = warnKindL === 'value-out-of-range'
    const oorR = warnKindR === 'value-out-of-range'

    if (uisgL || uisgR) {
      const err: InputError = { requestedName: input.requestedName, kind: 'unknown-input-setting-group' }
      if (uisgL && uisgR) {
        errorsInBoth.push(err)
      } else if (uisgL) {
        errorsInL.push(err)
      } else if (uisgR) {
        errorsInR.push(err)
      }
    }
    if (uiL || uiR) {
      const err: InputError = { requestedName: input.requestedName, kind: 'unknown-input' }
      if (uiL && uiR) {
        errorsInBoth.push(err)
      } else if (uiL) {
        errorsInL.push(err)
      } else if (uiR) {
        errorsInR.push(err)
      }
    }
    if (oorL || oorR) {
      const warn: InputWarning = { requestedName: input.requestedName, kind: 'value-out-of-range' }
      if (oorL && oorR) {
        warningsInBoth.push(warn)
      } else if (oorL) {
        warningsInL.push(warn)
      } else if (oorR) {
        warningsInR.push(warn)
      }
    }
  }

  // unknown inputs 'X', 'Y'
  // unknown input setting group 'Z'
  function messageForErrorKind(errors: InputError[], kind: InputErrorKind): string | undefined {
    const inputs = errors.filter(e => e.kind === kind).map(e => `'${e.requestedName}'`)
    if (inputs.length === 0) {
      return undefined
    } else if (kind === 'unknown-input') {
      const subject = inputs.length === 1 ? 'input' : 'inputs'
      return `unknown ${subject} ${inputs.join(', ')}`
    } else {
      return `unknown input setting group ${inputs[0]}`
    }
  }

  // If there are "unknown input setting group" errors, those take precedence over other
  // errors like "unknown input"
  function errorMessage(errors: InputError[]): string {
    const parts = [
      messageForErrorKind(errors, 'unknown-input-setting-group'),
      messageForErrorKind(errors, 'unknown-input')
    ]
    return parts.filter(p => p !== undefined).join('; ')
  }

  // value out of range for 'X', 'Y'
  function warningMessage(warnings: InputWarning[]): string {
    const inputs = warnings.map(w => `'${w.requestedName}'`)
    return `value out of range for ${inputs.join(', ')}`
  }

  // If there are any fatal errors in both, those take precedence over errors in one side
  // only:
  //   invalid scenario: {inputMessages}
  //   scenario not valid in {left}: {inputMessages}
  //   scenario not valid in {right}: {inputMessages}
  if (errorsInBoth.length > 0) {
    annotations.push(annotationSpan('err', `invalid scenario: ${errorMessage(errorsInBoth)}`))
  }
  if (errorsInL.length > 0) {
    const firstPart = `scenario not valid in ${datasetSpan(bundleNameL, 'left')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${errorMessage(errorsInL)}`))
  }
  if (errorsInR.length > 0) {
    const firstPart = `scenario not valid in ${datasetSpan(bundleNameR, 'right')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${errorMessage(errorsInR)}`))
  }

  // Non-fatal warnings: the scenario still runs, so always render as yellow.  If there are
  // any warnings in both, those take precedence over errors in one side only:
  //   warning: {inputMessages}
  //   warning for {left}: {inputMessages}
  //   warning for {right}: {inputMessages}
  if (warningsInBoth.length > 0) {
    annotations.push(annotationSpan('warn', `warning: ${warningMessage(warningsInBoth)}`))
  }
  if (warningsInL.length > 0) {
    const firstPart = `warning for ${datasetSpan(bundleNameL, 'left')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${warningMessage(warningsInL)}`))
  }
  if (warningsInR.length > 0) {
    const firstPart = `warning for ${datasetSpan(bundleNameR, 'right')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${warningMessage(warningsInR)}`))
  }

  // Add a warning if the settings differ between the two models
  if (scenario.settings.settingsDiffer === true) {
    annotations.push(annotationSpan('warn', 'input settings differ between the two models'))
  }

  return annotations
}

function annotationSpan(kind: 'err' | 'warn', s: string): string {
  const statusClass = `status-color-${kind === 'err' ? 'failed' : 'warning'}`
  const statusChar = kind === 'err' ? '✗' : '‼'
  return `<span class="annotation"><span class="${statusClass}">${statusChar}</span>&ensp;${s}</span>`
}
