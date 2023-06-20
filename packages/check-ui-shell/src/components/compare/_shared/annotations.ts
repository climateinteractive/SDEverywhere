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

  interface InputError {
    requestedName: string
    kind: 'unknown-input' | 'invalid-value'
  }
  const errorsInBoth: InputError[] = []
  const errorsInL: InputError[] = []
  const errorsInR: InputError[] = []
  for (const input of scenario.settings.inputs) {
    const kindL = input.stateL.error?.kind
    const kindR = input.stateR.error?.kind

    const uiL = kindL === 'unknown-input'
    const uiR = kindR === 'unknown-input'

    const ivL = kindL === 'invalid-value'
    const ivR = kindR === 'invalid-value'

    if (uiL || uiR) {
      const err: InputError = { requestedName: input.requestedName, kind: 'unknown-input' }
      if (uiL && uiR) {
        errorsInBoth.push(err)
      } else if (uiL) {
        errorsInL.push(err)
      } else if (uiR) {
        errorsInR.push(err)
      }
    } else if (ivL || ivR) {
      const err: InputError = { requestedName: input.requestedName, kind: 'invalid-value' }
      if (ivL && ivR) {
        errorsInBoth.push(err)
      } else if (ivL) {
        errorsInL.push(err)
      } else if (ivR) {
        errorsInR.push(err)
      }
    }
  }

  // unknown inputs 'X', 'Y'
  // value out of range for 'X', 'Y'
  function messageForErrorKind(errors: InputError[], kind: 'unknown-input' | 'invalid-value'): string | undefined {
    const inputs = errors.filter(e => e.kind === kind).map(e => `'${e.requestedName}'`)
    if (inputs.length === 0) {
      return undefined
    } else {
      if (kind === 'unknown-input') {
        const subject = inputs.length === 1 ? 'input' : 'inputs'
        return `unknown ${subject} ${inputs.join(', ')}`
      } else {
        return `value out of range for ${inputs.join(', ')}`
      }
    }
  }

  // If there are "unknown input" errors, those take precedence over other errors like
  // "invalid value"
  function message(errors: InputError[]): string {
    return messageForErrorKind(errors, 'unknown-input') || messageForErrorKind(errors, 'invalid-value')
  }

  // If there are any errors in both, those take precendence over errors in one side only
  //   invalid scenario: {inputMessages}
  //   scenario not valid in {left}: {inputMessages}
  //   scenario not valid in {right}: {inputMessages}
  if (errorsInBoth.length > 0) {
    annotations.push(annotationSpan('err', `invalid scenario: ${message(errorsInBoth)}`))
  } else if (errorsInL.length > 0) {
    const firstPart = `scenario not valid in ${datasetSpan(bundleNameL, 'left')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${message(errorsInL)}`))
  } else if (errorsInR.length > 0) {
    const firstPart = `scenario not valid in ${datasetSpan(bundleNameR, 'right')}`
    annotations.push(annotationSpan('warn', `${firstPart}: ${message(errorsInR)}`))
  }

  return annotations
}

function annotationSpan(kind: 'err' | 'warn', s: string): string {
  const statusClass = `status-color-${kind === 'err' ? 'failed' : 'warning'}`
  const statusChar = kind === 'err' ? '✗' : '‼'
  return `<span class="annotation"><span class="${statusClass}">${statusChar}</span>&ensp;${s}</span>`
}
