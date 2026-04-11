import { derived, writable, type Readable, type Writable } from 'svelte/store'

// NOTE: This file implements a simple i18n (internationalization) library for the app.
// It is not intended to be a complete i18n library, but rather a simple implementation
// that is easy to understand.  It supports setting a "dictionary" of (key, string) pairs
// for each language.  It exports a global `_` store that can be used to get a translated
// string for a given key.  In a Svelte file, you can use `$_(key)` to get the translated
// string for the active language.  (We use a reactive Svelte property so that the text
// automatically updates in the UI when the active language changes.)  The API here is very
// close to that of the `svelte-i18n` library, so you could replace this implementation with
// that library, or use it as a starting point for your own implementation (maybe using
// the FormatJS libraries for string formatting).

export type LangCode = string
export type StringDictionary = Record<string, string>
export type LangStringDictionaries = Record<LangCode, StringDictionary>
export type Formatter = (key: string, values?: { [key: string]: string }) => string

const langStrings: LangStringDictionaries = {}
const writableLangStrings: Writable<LangStringDictionaries> = writable(langStrings)
const writableCurrentLang: Writable<LangCode | undefined> = writable('en')

// Derive a formatter function when the active language or translated strings change
const formatter: Readable<Formatter> = derived(
  [writableLangStrings, writableCurrentLang],
  ([$langStrings, $currentLang]) => {
    const strings = $langStrings[$currentLang]
    return createFormatter(strings || {})
  }
)

/**
 * The global store that returns a function that can be used to get a translated string for a given key.
 */
export const _: Readable<Formatter> = formatter

/**
 * Initialize the i18n library with the given strings and default language.  This must
 * be called once at app initialization time.
 */
export function initI18n(initialStrings: LangStringDictionaries, initialLang: LangCode) {
  // TODO: You could initialize a proper i18n library here (such as svelte-i18n), but
  // for now we will use a simple custom implementation
  for (const lang of Object.keys(initialStrings)) {
    addMessages(lang, initialStrings[lang])
  }
  setActiveLang(initialLang)
}

/**
 * Add messages (i.e., translated strings) for the given language.
 */
export function addMessages(lang: LangCode, messages: StringDictionary) {
  // TODO: You could initialize a proper i18n library here (such as svelte-i18n), but
  // for now we will use a simple custom implementation
  langStrings[lang] = messages
  writableLangStrings.set(langStrings)
}

/**
 * Set the active language.
 */
export function setActiveLang(lang: LangCode) {
  writableCurrentLang.set(lang)
}

function createFormatter(strings: StringDictionary): Formatter {
  return (key: string, values?: { [key: string]: string }) => {
    if (values) {
      throw new Error(
        'String parameters not yet supported (you could implement this yourself using FormatJS or similar libraries)'
      )
    }
    // TODO: Fall back on strings for the default language if a string is not
    // defined in the given language strings.  For now, if the string is not
    // defined for the active language, return the key itself.
    return strings[key] || key
  }
}
