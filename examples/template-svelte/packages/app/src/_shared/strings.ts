import { addMessages, init as initSvelteIntl } from 'svelte-i18n'

import enStrings from '@core-strings/en'

// NOTE: This constant is exported only for HMR handling within this file;
// it is not intended to be consumed by outside modules.
export const strings = {
  en: enStrings
}

// In dev mode (with HMR enabled), when strings are updated in the `<lang>.js`
// files, reload them into `svelte-i18n` here instead of having the change
// event propagate up to `app-shell.svelte`.  This makes the HMR event more
// precise and makes the string change show up immediately without having
// to reload other parts of the app.
if (import.meta.hot) {
  import.meta.hot.accept(newModule => {
    for (const key of Object.keys(newModule.strings)) {
      addMessages(key, newModule.strings[key])
    }
  })
}

/**
 * Initialize the strings for the available languages.
 */
export function initStrings() {
  // Initialize svelte-i18n
  addMessages('en', strings['en'])
  initSvelteIntl({
    initialLocale: 'en',
    fallbackLocale: 'en'
  })
}
