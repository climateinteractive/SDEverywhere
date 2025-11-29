// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { mount } from 'svelte'

import type { ConfigOptions } from '@sdeverywhere/check-core'

import { initAppModel } from './model/app-model'

import type { AppShellOptions } from './app-shell-options'
import { default as AppShell } from './app-shell.svelte'
import { AppViewModel } from './app-vm'
import { BundleManager } from './components/bundle/bundle-manager.svelte'

export function initAppShell(configOptions: ConfigOptions, appShellOptions?: AppShellOptions): void {
  // Initialize the root Svelte component
  const containerId = appShellOptions?.containerId || 'app-shell-container'
  const containerElem = document.getElementById(containerId)

  // Initialize the app model asynchronously
  initAppModel(configOptions)
    .then(appModel => {
      // Create a `BundleManager` instance if local development mode is enabled
      let bundleManager: BundleManager | undefined = undefined
      if (appShellOptions?.remoteBundlesUrl || appShellOptions?.getLocalBundles) {
        bundleManager = new BundleManager({
          remoteBundlesUrl: appShellOptions.remoteBundlesUrl,
          getLocalBundles: appShellOptions.getLocalBundles,
          onDownloadBundle: appShellOptions.onDownloadBundle
        })
      }

      // Create the app view model
      const appViewModel = new AppViewModel(appModel, bundleManager, appShellOptions?.suiteSummary)

      // Update the AppShell component
      mount(AppShell, {
        target: containerElem,
        props: {
          appViewModel
        }
      })
    })
    .catch(e => {
      // TODO: If any step fails here, show an error screen instead of the app
      console.error(`ERROR: Failed to initialize app model: ${e.message}`)
    })
}
