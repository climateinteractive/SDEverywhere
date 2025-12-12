import { writable, type Readable, type Writable } from 'svelte/store'
// import { addMessages, init as initSvelteIntl } from 'svelte-i18n'

import enStrings from '@core-strings/en'

export type Formatter = (key: string, values?: { [key: string]: string }) => string

// NOTE: This constant is exported only for HMR handling within this file;
// it is not intended to be consumed by outside modules.
export const strings = {
  en: enStrings
}

const currentLang = 'en'
const writableFormatter: Writable<Formatter> = writable(createFormatter(strings[currentLang]))

/**
 * The global store that returns a function that can be used to get a translated string for a given key.
 */
export const _: Readable<Formatter> = writableFormatter

// In dev mode (with HMR enabled), when strings are updated in the `<lang>.js`
// files, reload them into the i18n library here instead of having the change
// event propagate up to `app-shell.svelte`.  This makes the HMR event more
// precise and makes the string change show up immediately without having
// to reload other parts of the app.
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    for (const key of Object.keys(newModule.strings)) {
      // TODO: You could initialize a proper i18n library here (such as svelte-i18n), but
      // for now we will use a simple custom implementation
      // addMessages(key, newModule.strings[key])
      strings[key] = newModule.strings[key]
      if (key === currentLang) {
        writableFormatter.set(createFormatter(strings[key]))
      }
    }
  })
}

/**
 * Initialize the strings for the available languages.
 */
export function initStrings() {
  // TODO: You could initialize a proper i18n library here (such as svelte-i18n), but
  // for now we will use a simple custom implementation
  // addMessages('en', strings['en'])
  // initSvelteIntl({
  //   initialLocale: 'en',
  //   fallbackLocale: 'en'
  // })
  writableFormatter.set(createFormatter(strings[currentLang]))
}

function createFormatter(strings: Record<string, string>): Formatter {
  return (key: string, values?: { [key: string]: string }) => {
    if (values) {
      throw new Error('String parameters not yet supported (add your own i18n library for this)')
    }
    return strings[key] || key
  }
}
