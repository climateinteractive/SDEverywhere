// Copyright (c) 2024 Climate Interactive / New Venture Fund

declare namespace svelteHTML {
  interface HTMLAttributes {
    // XXX: Declare the event handler attributes used by the `clickOutside` action
    // so that Svelte doesn't complain
    'on:clickout'?: () => void
  }
}

// XXX: Workaround for issue where svelte-check fails to resolve the `yaml` package types
// referenced by the `check-core` package because we use `"moduleResolution": "bundler"`,
// which causes the `yaml/browser` directory to be picked up and that one doesn't include
// a `.d.ts` file.  Using `declare module` is enough to silence the error and should have
// no impact on normal builds.
declare module 'yaml'
