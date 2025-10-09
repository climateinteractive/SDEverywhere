// Copyright (c) 2024 Climate Interactive / New Venture Fund

declare namespace svelteHTML {
  interface HTMLAttributes {
    // XXX: Declare the event handler attributes used by the `clickOutside` action
    // so that Svelte doesn't complain
    'on:clickout'?: () => void
  }
}

// XXX: Workaround for issue where svelte-check fails to resolve the `yaml` package
// referenced by the `check-core` package because we use `"moduleResolution": "bundler"`,
// which causes...
declare module 'yaml'
