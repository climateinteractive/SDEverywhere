// Copyright (c) 2026 Climate Interactive / New Venture Fund

/**
 * Matches an argument that includes both the `-s` flag and the option name in a single
 * string, for example `-s STRICT=1`.  The captured group is the option part, for example
 * `STRICT=1`.
 */
const flagWithSpace = /^-s\s+(.+)$/

/**
 * Normalize the given array of `emcc` arguments.
 *
 * Each argument is passed to `emcc` as a separate command line argument (without going
 * through a shell), so an argument that contains both the `-s` flag and the option name
 * (for example `-s STRICT=1`) will not be understood by `emcc`.  This function rewrites
 * such an argument to use the no-space notation that is recommended by the Emscripten
 * documentation (for example `-sSTRICT=1`).  It also removes surrounding whitespace and
 * drops empty arguments.
 *
 * @param args The arguments to normalize.
 * @returns The normalized arguments.
 */
export function normalizeEmccArgs(args: string[]): string[] {
  const normalizedArgs: string[] = []
  for (const arg of args) {
    const trimmedArg = arg.trim()
    if (trimmedArg.length === 0) {
      continue
    }
    const match = trimmedArg.match(flagWithSpace)
    normalizedArgs.push(match ? `-s${match[1]}` : trimmedArg)
  }
  return normalizedArgs
}
