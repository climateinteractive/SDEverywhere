// Copyright (c) 2024 Climate Interactive / New Venture Fund

/**
 * Additional options that can be passed to a `runModel` call to influence the model run.
 */
export interface RunModelOptions {
  /**
   * If defined, the model will run up to and including the given time instead of
   * running to the normal "final time" defined in the model.  When this is defined,
   * values will be set to `undefined` for data points after this stop time.
   */
  stopAfterTime?: number
}
