// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { Outputs } from '../_shared'
import { ReferencedRunModelParams } from '../runnable-model'
import { initJsModel, type JsModel } from './js-model'

/**
 * Run the given model synchronously and log the output values to the console in
 * TSV (tab-separated values) format.
 *
 * This is mainly intended for use in implementing the `sde exec` command.
 *
 * @param jsModel A `JsModel` instance.
 */
export function execJsModel(jsModel: JsModel): void {
  // Create a `RunnableModel` from the given `JsModel`
  const runnableModel = initJsModel(jsModel)

  // For now we only support running the model with default parameters (no user-specified
  // inputs).  By using an empty array here, the model will skip the `setInputs` step.
  const inputs: number[] = []

  // Create the `Outputs` instance into which the model outputs will be stored
  const outputVarIds = jsModel.getOutputVarIds()
  const startTime = jsModel.getInitialTime()
  const endTime = jsModel.getFinalTime()
  const saveFreq = jsModel.getSaveFreq()
  const outputs = new Outputs(outputVarIds, startTime, endTime, saveFreq)

  // Run the model
  const params = new ReferencedRunModelParams()
  params.updateFromParams(inputs, outputs)
  runnableModel.runModel(params)

  // Write the header (escaping quotes as needed)
  const outputVarNames = jsModel.getOutputVarNames().map(name => name.replace(/"/g, '\\"'))
  const header = outputVarNames.join('\t')
  console.log(header)

  // Write tab-delimited output data, one line per output time step
  for (let i = 0; i < outputs.seriesLength; i++) {
    const rowValues = []
    for (const series of outputs.varSeries) {
      rowValues.push(series.points[i].y)
    }
    console.log(rowValues.join('\t'))
  }
}
