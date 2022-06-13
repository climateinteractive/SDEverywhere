// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConfigOptions, SuiteSummary } from '@sdeverywhere/check-core'

import { initAppModel } from './model/app-model'

import { default as AppShell } from './app-shell.svelte'
import { AppViewModel } from './app-vm'

export function initAppShell(
  configOptions: ConfigOptions,
  suiteSummary?: SuiteSummary,
  containerId = 'app-shell-container'
): AppShell {
  // Initialize the root Svelte component
  const appShell = new AppShell({
    target: document.getElementById(containerId),
    props: {
      appViewModel: undefined
    }
  })

  // Initialize the app model asynchronously
  initAppModel(configOptions)
    .then(appModel => {
      // Create the app view model and update the AppShell component
      const appViewModel = new AppViewModel(appModel, suiteSummary)
      appShell.$set({
        appViewModel
      })
    })
    .catch(e => {
      // TODO: If any step fails here, show an error screen instead of the app
      console.error(`ERROR: Failed to initialize app model: ${e.message}`)
    })

  return appShell
}
