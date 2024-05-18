// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { LookupDef } from '../_shared'

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

  /**
   * If defined, override the data for the specified lookups and/or data variables.
   *
   * If data was already defined in the generated model, the data provided in a
   * `LookupDef` here will override the default data in the generated model.
   *
   * Note that unlike the `inputs` parameter for `runModel` (which must be provided
   * with each call), the data overrides provided here persist after the `runModel`
   * call.  If you pass `lookups` in your Nth `runModel` call, that lookup data will
   * still be in effect for the (N+1)th call.  In other words, if your lookup data
   * is not changing, you do not need to supply it with every `runModel` call.
   */
  lookups?: LookupDef[]
}
