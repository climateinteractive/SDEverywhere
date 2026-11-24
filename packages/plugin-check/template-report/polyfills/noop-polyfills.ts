// Copyright (c) 2022 Climate Interactive / New Venture Fund

/*
 * This file contains no-op polyfills for the small set of Node APIs that are
 * referenced by check bundles built with an older version of plugin-check.
 * Those bundles used the threads.js package, whose Node implementation
 * referenced these modules; they are not actually used at runtime in the
 * browser because they only appear in the (unused) Node code path.
 *
 * Bundles built with the current version of plugin-check don't reference these
 * modules at all, but we keep these polyfills around so that an older bundle
 * can still be loaded as the baseline bundle for comparison purposes.
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
