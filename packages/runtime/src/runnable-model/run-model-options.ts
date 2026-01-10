// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { ConstantDef, LookupDef } from '../_shared'

/**
 * Additional options that can be passed to a `runModel` call to influence the model run.
 */
export interface RunModelOptions {
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

  /**
   * If defined, override the values for the specified constant variables.
   *
   * Note that UNLIKE lookups (which persist across calls), constant overrides do
   * NOT persist after the `runModel` call.  Because `initConstants` is called at
   * the beginning of each `runModel` call, all constants are reset to their default
   * values.  If you want to override constants, you must provide them in the options
   * for each `runModel` call.  To reset constants to their original values, simply
   * stop passing them in the options (or pass an empty array).
   */
  constants?: ConstantDef[]
}
