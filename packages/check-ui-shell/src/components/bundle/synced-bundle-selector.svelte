<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'

import type { BundleLocation, BundleSpec } from './bundle-spec'

import BundleSelector from './bundle-selector.svelte'

export let remoteMetadataUrl: string | undefined = undefined
export let getLocalBundles: (() => Promise<BundleLocation[]>) | undefined = undefined
export let onDownload: ((bundle: BundleSpec) => void) | undefined = undefined
export let onSelect: ((bundle: BundleSpec) => void) | undefined = undefined

let bundles: BundleSpec[] = []
let loading = false
let error: string | undefined = undefined

async function loadBundles() {
  loading = true
  error = undefined

  const remoteBundlesPromise = loadRemoteBundles()
  const localBundlesPromise = loadLocalBundles()

  const [remoteBundles, localBundles] = await Promise.all([remoteBundlesPromise, localBundlesPromise])

  // Check if both sources failed
  if (!remoteBundles && !localBundles) {
    if (!remoteMetadataUrl && !getLocalBundles) {
      error = 'No bundles available'
    } else if (!error) {
      // Only set generic error if no specific error was set by load functions
      error = 'Failed to load bundles'
    }
    bundles = []
    loading = false
    return
  }

  // Merge remote and local bundles
  bundles = mergeBundles(remoteBundles || [], localBundles || [])
  loading = false
}

async function loadRemoteBundles(): Promise<BundleLocation[] | undefined> {
  if (!remoteMetadataUrl) {
    return undefined
  }

  try {
    const response = await fetch(remoteMetadataUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch remote bundles: ${response.statusText}`)
    }
    const data = await response.json()
    return data as BundleLocation[]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (error) {
      error += `; ${message}`
    } else {
      error = message
    }
    return undefined
  }
}

async function loadLocalBundles(): Promise<BundleLocation[] | undefined> {
  if (!getLocalBundles) {
    return undefined
  }

  try {
    return await getLocalBundles()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (error) {
      error += `; ${message}`
    } else {
      error = message
    }
    return undefined
  }
}

function mergeBundles(remoteBundles: BundleLocation[], localBundles: BundleLocation[]): BundleSpec[] {
  const bundleMap = new Map<string, BundleSpec>()

  // Add remote bundles
  for (const remote of remoteBundles) {
    bundleMap.set(remote.name, { remote })
  }

  // Add or merge local bundles
  for (const local of localBundles) {
    const existing = bundleMap.get(local.name)
    if (existing) {
      existing.local = local
    } else {
      bundleMap.set(local.name, { local })
    }
  }

  return Array.from(bundleMap.values())
}

function handleReload() {
  loadBundles()
}

onMount(() => {
  loadBundles()
})
</script>

<!-- TEMPLATE -->
<BundleSelector
  {bundles}
  {loading}
  {error}
  {onDownload}
  {onSelect}
  onReload={handleReload}
/>
