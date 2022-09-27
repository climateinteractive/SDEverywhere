// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'

/**
 * Return a Svelte writable store that is backed by local storage.
 */
export function localStorageWritableBoolean(key: string, defaultValue: boolean): Writable<boolean> {
  const initialStringValue = localStorage.getItem(key)
  let initialValue: boolean
  if (initialStringValue !== undefined) {
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
