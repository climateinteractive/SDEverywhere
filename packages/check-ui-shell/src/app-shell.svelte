<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import App from './app.svelte'
import type { AppViewModel } from './app-vm'

import type { BundleLocation, BundleSpec } from './components/bundle/bundle-spec'

// Importing the `global.css` file here will ensure that it is positioned to
// override other styles from Svelte files
import './global.css'

export let appViewModel: AppViewModel
export let getLocalBundles: (() => Promise<BundleLocation[]>) | undefined = undefined
export let onDownloadBundle: ((bundle: BundleSpec) => void) | undefined = undefined
</script>

<!-- TEMPLATE -->
{#if appViewModel}
  <App viewModel={appViewModel} {getLocalBundles} {onDownloadBundle} />
{/if}
