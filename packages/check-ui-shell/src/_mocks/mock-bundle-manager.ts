// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { BundleManager } from '../components/bundle/bundle-manager.svelte'
import type { BundleLocation, BundleSpec } from '../components/bundle/bundle-spec'

export function mockBundleUrl(kind: 'remote' | 'local', branchName: string): string {
  if (kind === 'remote') {
    return `https://example.com/branch/${branchName}/check-bundle.js`
  } else {
    if (branchName === 'current') {
      return 'current'
    } else {
      return `file:///bundles/${branchName.replace('/', '-')}.js`
    }
  }
}

export function mockBundleSpec(kind: 'remote' | 'local', branchName: string, lastModified: string): BundleSpec {
  const location: BundleLocation = {
    url: mockBundleUrl(kind, branchName),
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
  mockBundleSpec('local', 'current', '2025-06-15T10:00:00.000Z'),
  mockBundleSpec('local', 'previous', '2025-05-14T10:00:00.000Z'),
  mockBundleSpec('local', 'local-only', '2025-05-12T10:00:00.000Z')
]

export const allBundles: BundleSpec[] = [...remoteBundles, ...localBundles]

export function bundleManagerFromBundles(options?: {
  bundles: BundleSpec[]
  bundleUrlL?: string
  bundleUrlR?: string
}): BundleManager {
  const bundles = options?.bundles || allBundles
  const bundleUrlL = options?.bundleUrlL || mockBundleUrl('remote', 'main')
  const bundleUrlR = options?.bundleUrlR || mockBundleUrl('local', 'current')

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
    bundleUrlL,
    bundleUrlR,
    remoteBundlesUrl,
    getLocalBundles: localBundlesList.length > 0 ? async () => localBundlesList : undefined
  })
}
