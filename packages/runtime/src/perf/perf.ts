// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

let isWeb: boolean

/**
 * Return a timestamp that can be passed to `perfElapsed` for calculating the elapsed
 * time of an operation.
 *
 * @hidden This is not part of the public API; exposed only for use in performance testing.
 */
export function perfNow(): unknown {
  // Note that `self` resolves to the window (in browser context) or the worker global scope
  // (in a Web Worker context)
  if (isWeb === undefined) {
    isWeb = typeof self !== 'undefined' && self?.performance !== undefined
  }
  if (isWeb) {
    return self.performance.now()
  } else {
    // XXX: We only use `process` in two places; we bypass type checking instead of
    // setting up type declarations
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return process?.hrtime()
  }
}

/**
 * Return the elapsed time between the given timestamp (created by `perfNow`) and now.
 *
 * @hidden This is not part of the public API; exposed only for use in performance testing.
 */
export function perfElapsed(t0: unknown): number {
  if (isWeb) {
    const t1 = self.performance.now()
    return (t1 as number) - (t0 as number)
  } else {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const elapsed = process.hrtime(t0) as number[]
    // Convert from nanoseconds to milliseconds
    return (elapsed[0] * 1000000000 + elapsed[1]) / 1000000
  }
}
