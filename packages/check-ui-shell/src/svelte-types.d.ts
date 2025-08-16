// Copyright (c) 2024 Climate Interactive / New Venture Fund

declare namespace svelteHTML {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes {
    // XXX: Declare the event handler attributes used by the `clickOutside` action
    // so that Svelte doesn't complain
    'on:clickout'?: () => void
  }
}
