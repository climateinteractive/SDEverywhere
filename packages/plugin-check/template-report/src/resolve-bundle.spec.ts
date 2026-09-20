// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Bundle } from '@sdeverywhere/check-core'

import type { BundleMetadata } from './bundle-metadata'
import { loadBundleMetadata, saveBundleMetadata } from './bundle-metadata'
import type { BundleResult } from './load-bundle'
import type { ResolveBundleDeps } from './resolve-bundle'
import { resolveBundle } from './resolve-bundle'

/**
 * A minimal in-memory implementation of the parts of the `Storage` API that are
 * used by the bundle metadata functions.
 */
class FakeStorage {
  private readonly items: Map<string, string> = new Map()

  getItem(key: string): string | null {
    const value = this.items.get(key)
    return value !== undefined ? value : null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }
}

const currentBundle = { version: 1 } as unknown as Bundle
const remoteBundle = { version: 1 } as unknown as Bundle

const remoteMetadata: BundleMetadata = { name: 'remote-2', url: 'http://localhost:9000/remote-2.js' }

function deps(loadBundle: ResolveBundleDeps['loadBundle']): ResolveBundleDeps {
  return {
    loadBundle,
    createCurrentBundle: () => currentBundle
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new FakeStorage())
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('resolveBundle', () => {
  it('should use the current bundle if no metadata is provided', async () => {
    const loadBundle = vi.fn()
    const result = await resolveBundle('right', undefined, deps(loadBundle))
    expect(result).toEqual({ bundle: currentBundle, bundleName: 'current', bundleUrl: 'current' })
    expect(loadBundle).not.toHaveBeenCalled()
  })

  it('should use the current bundle if the saved metadata refers to the current bundle', async () => {
    const loadBundle = vi.fn()
    const metadata: BundleMetadata = { name: 'current', url: 'current' }
    const result = await resolveBundle('right', metadata, deps(loadBundle))
    expect(result).toEqual({ bundle: currentBundle, bundleName: 'current', bundleUrl: 'current' })
    expect(loadBundle).not.toHaveBeenCalled()
  })

  it('should use the loaded bundle and keep the saved metadata if the bundle is loaded successfully', async () => {
    saveBundleMetadata('right', remoteMetadata)
    const loaded: BundleResult = {
      bundle: remoteBundle,
      bundleName: remoteMetadata.name,
      bundleUrl: remoteMetadata.url
    }
    const loadBundle = vi.fn(async () => loaded)
    const result = await resolveBundle('right', remoteMetadata, deps(loadBundle))
    expect(result).toEqual(loaded)
    expect(loadBundle).toHaveBeenCalledWith(remoteMetadata)
    expect(loadBundleMetadata('right')).toEqual(remoteMetadata)
  })

  it('should fall back to the current bundle and clear the saved metadata if the bundle cannot be loaded', async () => {
    saveBundleMetadata('right', remoteMetadata)
    const loadBundle = vi.fn(async () => undefined)
    const result = await resolveBundle('right', remoteMetadata, deps(loadBundle))
    expect(result).toEqual({ bundle: currentBundle, bundleName: 'current', bundleUrl: 'current' })
    expect(loadBundleMetadata('right')).toBeUndefined()
  })

  it('should fall back to the current bundle and clear the saved metadata if the load fails with an error', async () => {
    saveBundleMetadata('left', remoteMetadata)
    const loadBundle = vi.fn(async () => {
      throw new Error('fetch failed')
    })
    const result = await resolveBundle('left', remoteMetadata, deps(loadBundle))
    expect(result).toEqual({ bundle: currentBundle, bundleName: 'current', bundleUrl: 'current' })
    expect(loadBundleMetadata('left')).toBeUndefined()
  })

  it('should clear the saved metadata for the failing side only', async () => {
    const localMetadata: BundleMetadata = { name: 'previous', url: 'file:///previous.js' }
    saveBundleMetadata('left', localMetadata)
    saveBundleMetadata('right', remoteMetadata)
    const loadBundle = vi.fn(async () => undefined)
    await resolveBundle('right', remoteMetadata, deps(loadBundle))
    expect(loadBundleMetadata('left')).toEqual(localMetadata)
    expect(loadBundleMetadata('right')).toBeUndefined()
  })
})
