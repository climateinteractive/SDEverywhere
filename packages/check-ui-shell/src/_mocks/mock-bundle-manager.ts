// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { BundleManager } from '../components/bundle/bundle-manager.svelte'
import type { BundleLocation, BundleSpec } from '../components/bundle/bundle-spec'

export function mockBundleSpec(branchName: string, lastModified: string, hasLocal = false): BundleSpec {
  return {
    remote: {
      url: `https://example.com/branch/${branchName}/bundles/check-bundle.js`,
      name: branchName,
      lastModified
    },
    local: hasLocal
      ? {
          url: `file:///bundles/${branchName}/check-bundle.js`,
          name: branchName,
          lastModified
        }
      : undefined
  }
}

export const remoteBundles: BundleSpec[] = [
  mockBundleSpec('chris/123-feature', '2025-05-13T19:15:00.000Z'),
  mockBundleSpec('chris/456-another-feature', '2025-03-03T23:24:24.000Z'),
  mockBundleSpec('main', '2025-05-14T10:00:00.000Z'),
  mockBundleSpec('release/25.1.0', '2025-01-01T15:30:00.000Z'),
  mockBundleSpec('release/25.2.0', '2025-02-01T15:30:00.000Z'),
  mockBundleSpec('release/25.3.0', '2025-03-01T15:30:00.000Z'),
  mockBundleSpec('release/25.4.0', '2025-04-01T15:30:00.000Z'),
  mockBundleSpec('release/25.5.0', '2025-05-01T15:30:00.000Z')
]

export const localBundles: BundleLocation[] = [
  {
    url: 'file:///bundles/main.js',
    name: 'main',
    lastModified: '2025-05-14T10:00:00.000Z'
  },
  {
    url: 'file:///bundles/local-only.js',
    name: 'local-only',
    lastModified: '2025-05-12T10:00:00.000Z'
  }
]

export function bundleManagerFromBundles(bundles: BundleSpec[]): BundleManager {
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
  const remoteMetadataUrl =
    remoteBundlesList.length > 0 ? 'data:application/json;base64,' + btoa(JSON.stringify(remoteBundlesList)) : undefined

  return new BundleManager({
    remoteMetadataUrl,
    getLocalBundles: localBundlesList.length > 0 ? async () => localBundlesList : undefined
  })
}
