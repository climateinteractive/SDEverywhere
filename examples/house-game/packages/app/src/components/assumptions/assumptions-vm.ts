import { ModelInputs } from '../../model/app-state'

export interface AssumptionRow {
  label: string
  value: string
}

export interface AssumptionsViewModel {
  rows: AssumptionRow[]
}

export function createAssumptionsViewModel(inputs: ModelInputs): AssumptionsViewModel {
  const rows: AssumptionRow[] = []

  if (inputs.avgLife !== undefined) {
    let value: string
    if (inputs.avgLife < 0) {
      value = '&mdash;'
    } else if (!isFinite(inputs.avgLife)) {
      value = 'infinite'
    } else {
      value = `${inputs.avgLife} months`
    }
    rows.push({
      label: 'Average house life',
      value
    })
  }

  if (inputs.currentRate !== undefined) {
    rows.push({
      label: 'Current build rate',
      value: `${inputs.currentRate} houses/month`
    })
  }

  if (inputs.timeToPlan !== undefined) {
    rows.push({
      label: 'Time to plan',
      value: '3 months'
    })
  }

  if (inputs.timeToBuild !== undefined) {
    rows.push({
      label: 'Time to build',
      value: '6 months'
    })
  }

  if (inputs.timeToRespond !== undefined) {
    rows.push({
      label: 'Time to respond to gap',
      value: '8 months'
    })
  }

  return {
    rows
  }
}
