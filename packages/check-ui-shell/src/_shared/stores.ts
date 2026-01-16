// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'

/**
 * Return a Svelte writable number store that is backed by local storage.
 */
export function localStorageWritableNumber(key: string, defaultValue: number): Writable<number> {
  const initialStringValue = localStorage.getItem(key)
  let initialValue: number
  if (initialStringValue !== null) {
    const numberValue = parseFloat(initialStringValue)
    initialValue = !isNaN(numberValue) ? numberValue : defaultValue
  } else {
    initialValue = defaultValue
  }

  let currentValue = initialValue
  const { subscribe, set } = writable(initialValue)

  const _set = (newValue: number) => {
    currentValue = newValue
    localStorage.setItem(key, newValue.toString())
    set(newValue)
  }

  const _update = (updater: (value: number) => number) => {
    _set(updater(currentValue))
  }

  return {
    subscribe,
    set: _set,
    update: _update
  }
}

/**
 * Return a Svelte writable boolean store that is backed by local storage.
 */
export function localStorageWritableBoolean(key: string, defaultValue: boolean): Writable<boolean> {
  // TODO: Update callers to use `localStore` and then remove this variant
  const initialStringValue = localStorage.getItem(key)
  let initialValue: boolean
  if (initialStringValue !== null) {
    initialValue = initialStringValue === '1'
  } else {
    initialValue = defaultValue
  }

  let currentValue = initialValue
  const { subscribe, set } = writable(initialValue)

  const _set = (newValue: boolean) => {
    currentValue = newValue
    localStorage.setItem(key, newValue ? '1' : '0')
    set(newValue)
  }

  const _update = (updater: (value: boolean) => boolean) => {
    _set(updater(currentValue))
  }

  return {
    subscribe,
    set: _set,
    update: _update
  }
}

/**
 * Return a Svelte writable string store that is backed by local storage.
 */
export function localStorageWritableString<T extends string = string>(key: string, defaultValue: T): Writable<T> {
  const initialStringValue = localStorage.getItem(key)
  let initialValue: T
  if (initialStringValue !== null) {
    initialValue = initialStringValue as T
  } else {
    initialValue = defaultValue
  }

  let currentValue = initialValue
  const { subscribe, set } = writable(initialValue)

  const _set = (newValue: T) => {
    currentValue = newValue
    localStorage.setItem(key, newValue)
    set(newValue)
  }

  const _update = (updater: (value: T) => T) => {
    _set(updater(currentValue))
  }

  return {
    subscribe,
    set: _set,
    update: _update
  }
}
