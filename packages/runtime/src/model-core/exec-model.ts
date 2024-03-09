// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { ModelCore } from './model-core'
import { runModelCore } from './model-core-runner'

/**
 * Run the given model and log the output values to the console in TSV (tab-separated values) format.
 *
 * This is mainly intended for use in implementing the `sde run` command.
 *
 * @param core A `ModelCore` instance.
 */
export function execModel(core: ModelCore): void {
  const outputs = runModelCore(core)

  // Write the header (escaping quotes as needed)
  const outputVarNames = core.getOutputVarNames().map(name => name.replace(/"/g, '\\"'))
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
