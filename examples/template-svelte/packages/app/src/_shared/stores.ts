import type { Readable, StartStopNotifier } from 'svelte/store'
import { writable } from 'svelte/store'

/**
 * A Svelte store that provides direct, synchronous access to its current value.
 * This interface and its subtypes are compatible with the built-in `Readable`
 * type, but assume that a value is always available.
 *
 * This is more efficient and convenient than the built-in `get` function provided
 * by Svelte, which works by subscribing and unsubscribing to read a value.
 */
export interface SyncReadable<T> extends Readable<T> {
  /** Return the current value for this store. */
  get: () => T
}

/**
 * A Svelte store that allows for setting its current value and synchronously
 * reading it.
 *
 * This is more efficient and convenient than the built-in `get` function provided
 * by Svelte, which works by subscribing and unsubscribing to read a value.
 */
export interface SyncWritable<T> extends SyncReadable<T> {
  /**
   * Set a new value for this store and inform subscribers.
   * @param newValue The value to set.
   */
  set: (newValue: T) => void

  /**
   * Update value using callback and inform subscribers.
   * @param updater The update callback.
   */
  update: (updater: (value: T) => T) => void
}

/**
 * Return a mutable Svelte store that allows for synchronous access to its
 * current value.
 */
export function syncWritable<T>(initialValue: T, start?: StartStopNotifier<T>): SyncWritable<T> {
  let currentValue = initialValue
  const { subscribe, set } = writable(initialValue, start)

  const _get = () => {
    return currentValue
  }

  const _set = (newValue: T) => {
    currentValue = newValue
    set(newValue)
  }

  const _update = (updater: (value: T) => T) => {
    _set(updater(currentValue))
  }

  return {
    subscribe,
    get: _get,
    set: _set,
    update: _update
  }
}

/**
 * Return a Svelte store that holds a constant value.
 */
export function constantStore<T>(constantValue: T): SyncReadable<T> {
  const { subscribe } = writable(constantValue)

  return {
    subscribe,
    get: () => {
      return constantValue
    }
  }
}
