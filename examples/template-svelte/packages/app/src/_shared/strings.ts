import enStrings from '@core-strings/en'

import { addMessages, initI18n } from './i18n'

// NOTE: This file works in conjunction with `i18n.ts` to provide access
// to translated strings for the app.  This file must be kept separate from
// `i18n.ts` so that the HMR events are handled correctly in local dev mode.
// When strings are updated in the `<lang>.js` files, the HMR event will be
// handled by this file so that strings are updated immediately in the UI.

// NOTE: This constant is exported only for HMR handling within this file;
// it is not intended to be consumed by outside modules.
export const strings = {
  en: enStrings
}

// In dev mode (with HMR enabled), when strings are updated in the `<lang>.js`
// files, reload them into the i18n library here instead of having the change
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
  const defaultLang = 'en'
  initI18n(strings, defaultLang)
}
