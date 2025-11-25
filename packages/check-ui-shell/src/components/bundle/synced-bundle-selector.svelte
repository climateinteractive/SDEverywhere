<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'

import type { BundleSpec } from './bundle-spec'
import type { BundleManager } from './bundle-manager'

import BundleSelector from './bundle-selector.svelte'

export let bundleManager: BundleManager
export let onSelect: ((bundle: BundleSpec) => void) | undefined = undefined

const bundles = bundleManager.bundles
const loading = bundleManager.loading
const error = bundleManager.error

function handleDownload(bundle: BundleSpec) {
  bundleManager.downloadBundle(bundle)
}

function handleReload() {
  bundleManager.load()
}

onMount(() => {
  bundleManager.load()
})
</script>

<!-- TEMPLATE -->
<BundleSelector
  bundles={$bundles}
  loading={$loading}
  error={$error}
  {onSelect}
  onDownload={handleDownload}
  onReload={handleReload}
/>
