// Copyright (c) 2022 Climate Interactive / New Venture Fund

// XXX: This is a workaround for an issue in which threads.js uses `fileURLToPath`
// (from Node's 'util' module), but that function is not included in the
// `rollup-plugin-node-polyfills` package we use in the Vite config, so we roll
// our own no-op polyfill here.  This does not actually get used at runtime
// in the browser because it is only referenced in the (unused) Node code path.
export function fileURLToPath(s: string): string {
  return s
}
