// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { Plugin } from 'vite'

/**
 * Return a Vite plugin that replaces literal strings in source files before
 * Vite's own transforms run.
 *
 * This is a minimal replacement for `@rollup/plugin-replace` (as previously
 * configured with empty delimiters, i.e., plain string substitution).  We use
 * this instead of Vite's built-in `define` feature because `define`
 * replacements are not applied before Vite's `import.meta.glob` handler runs,
 * and the glob handler requires the glob pattern to appear as a literal in
 * the source.
 *
 * @param values A map of literal search strings to their replacement strings.
 */
export function injectLiteralsPlugin(values: Record<string, string>): Plugin {
  const entries = Object.entries(values)
  return {
    name: 'vite-plugin-inject-literals',
    transform(code: string) {
      let transformed = code
      let changed = false
      for (const [find, replacement] of entries) {
        if (transformed.includes(find)) {
          transformed = transformed.replaceAll(find, replacement)
          changed = true
        }
      }
      if (changed) {
        return {
          code: transformed,
          map: null
        }
      } else {
        return undefined
      }
    }
  }
}
