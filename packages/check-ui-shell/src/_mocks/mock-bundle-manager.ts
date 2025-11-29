// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { BundleManager } from '../components/bundle/bundle-manager.svelte'
import type { BundleLocation, BundleSpec } from '../components/bundle/bundle-spec'

export function mockBundleSpec(kind: 'remote' | 'local', branchName: string, lastModified: string): BundleSpec {
  let url: string
  if (kind === 'remote') {
    url = `https://example.com/branch/${branchName}/check-bundle.js`
  } else {
    url = `file:///bundles/${branchName.replace('/', '-')}.js`
  }
  const location: BundleLocation = {
    url,
    name: branchName,
    lastModified
  }
  if (kind === 'remote') {
    return { remote: location }
  } else {
    return { local: location }
  }
}

export const remoteBundles: BundleSpec[] = [
  mockBundleSpec('remote', 'chris/123-feature', '2025-05-13T19:15:00.000Z'),
  mockBundleSpec('remote', 'chris/456-another-feature', '2025-03-03T23:24:24.000Z'),
  mockBundleSpec('remote', 'main', '2025-05-14T10:00:00.000Z'),
  mockBundleSpec('remote', 'release/25.1.0', '2025-01-01T15:30:00.000Z'),
  mockBundleSpec('remote', 'release/25.2.0', '2025-02-01T15:30:00.000Z'),
  mockBundleSpec('remote', 'release/25.3.0', '2025-03-01T15:30:00.000Z'),
  mockBundleSpec('remote', 'release/25.4.0', '2025-04-01T15:30:00.000Z'),
  mockBundleSpec('remote', 'release/25.5.0', '2025-05-01T15:30:00.000Z')
]

export const localBundles: BundleSpec[] = [
  mockBundleSpec('local', 'previous', '2025-05-14T10:00:00.000Z'),
  mockBundleSpec('local', 'local-only', '2025-05-12T10:00:00.000Z')
]

export const allBundles: BundleSpec[] = [...remoteBundles, ...localBundles]

export function bundleManagerFromBundles(bundles: BundleSpec[] = allBundles): BundleManager {
  // Extract remote and local bundles for testing
  const remoteBundlesList: BundleLocation[] = bundles
    .filter(b => b.remote)
    .map(b => ({
      url: b.remote!.url,
      name: b.remote!.name,
      lastModified: b.remote!.lastModified
    }))

  const localBundlesList: BundleLocation[] = bundles
    .filter(b => b.local)
    .map(b => ({
      url: b.local!.url,
      name: b.local!.name,
      lastModified: b.local!.lastModified
    }))

  // Create a simple remote metadata response
  const remoteBundlesUrl =
    remoteBundlesList.length > 0 ? 'data:application/json;base64,' + btoa(JSON.stringify(remoteBundlesList)) : undefined

  return new BundleManager({
    remoteBundlesUrl,
    getLocalBundles: localBundlesList.length > 0 ? async () => localBundlesList : undefined
  })
}
