// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConfigOptions, SuiteSummary } from '@sdeverywhere/check-core'

import { initAppModel } from './model/app-model'

import { default as AppShell } from './app-shell.svelte'
import { AppViewModel } from './app-vm'

export interface AppShellOptions {
  suiteSummary?: SuiteSummary
  containerId?: string
  bundleNames?: string[]
}

export function initAppShell(configOptions: ConfigOptions, appShellOptions?: AppShellOptions): AppShell {
  // Initialize the root Svelte component
  const containerId = appShellOptions?.containerId || 'app-shell-container'
  const appShell = new AppShell({
    target: document.getElementById(containerId),
    props: {
      appViewModel: undefined
    }
  })

  // Initialize the app model asynchronously
  initAppModel(configOptions)
    .then(appModel => {
      // Create the app view model
      const appViewModel = new AppViewModel(appModel, appShellOptions?.suiteSummary)

      if (appShellOptions?.bundleNames) {
        // Set the list of available bundle names
        // TODO: Pass these to AppViewModel constructor instead of setting them here
        appViewModel.headerViewModel.bundleNamesL.set(appShellOptions.bundleNames)
        appViewModel.headerViewModel.bundleNamesR.set(appShellOptions.bundleNames)
      }

      // Update the AppShell component
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
