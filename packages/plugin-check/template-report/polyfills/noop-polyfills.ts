// Copyright (c) 2022 Climate Interactive / New Venture Fund

/*
 * This file contains no-op polyfills for the small set of Node APIs that are
 * referenced by the Node implementation of the threads.js package (which is
 * used by the default generated bundle any custom bundle that uses the
 * `@sdeverywhere/runtime-async` package).  These polyfills are not actually
 * used at runtime in the browser because they are only referenced in the
 * (unused) Node code path.
 */

// from 'events'
export class EventEmitter {}

// from 'os'
export function cpus(): number {
  return 1
}

// from 'path'
export function dirname(): string {
  return ''
}

// from 'path'
export function isAbsolute(): boolean {
  return false
}

// from 'path'
export function join(): string {
  return ''
}

// from 'util'
export function fileURLToPath(): string {
  return ''
}
