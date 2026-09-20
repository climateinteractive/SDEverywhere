// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearBundleMetadata, loadBundleMetadata, saveBundleMetadata } from './bundle-metadata'

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

let storage: FakeStorage

beforeEach(() => {
  storage = new FakeStorage()
  vi.stubGlobal('localStorage', storage)
})

describe('loadBundleMetadata', () => {
  it('should return undefined if no bundle was saved for the given side', () => {
    expect(loadBundleMetadata('left')).toBeUndefined()
  })

  it('should return the metadata that was saved for the given side', () => {
    storage.setItem('sde-check-selected-bundle-left', JSON.stringify({ name: 'baseline', url: 'file:///baseline.js' }))
    storage.setItem('sde-check-selected-bundle-right', JSON.stringify({ name: 'remote-2', url: 'http://x/r2.js' }))
    expect(loadBundleMetadata('left')).toEqual({ name: 'baseline', url: 'file:///baseline.js' })
    expect(loadBundleMetadata('right')).toEqual({ name: 'remote-2', url: 'http://x/r2.js' })
  })

  it('should return undefined if the saved metadata is incomplete', () => {
    storage.setItem('sde-check-selected-bundle-left', JSON.stringify({ name: 'baseline' }))
    expect(loadBundleMetadata('left')).toBeUndefined()
  })

  it('should return undefined if the saved metadata is not valid JSON', () => {
    storage.setItem('sde-check-selected-bundle-left', 'not-json')
    expect(loadBundleMetadata('left')).toBeUndefined()
  })
})

describe('saveBundleMetadata', () => {
  it('should save the metadata for the given side only', () => {
    saveBundleMetadata('right', { name: 'remote-2', url: 'http://x/r2.js' })
    expect(storage.getItem('sde-check-selected-bundle-right')).toEqual(
      JSON.stringify({ name: 'remote-2', url: 'http://x/r2.js' })
    )
    expect(storage.getItem('sde-check-selected-bundle-left')).toBeNull()
  })
})

describe('clearBundleMetadata', () => {
  it('should remove the metadata for the given side only', () => {
    saveBundleMetadata('left', { name: 'baseline', url: 'file:///baseline.js' })
    saveBundleMetadata('right', { name: 'remote-2', url: 'http://x/r2.js' })
    clearBundleMetadata('right')
    expect(loadBundleMetadata('left')).toEqual({ name: 'baseline', url: 'file:///baseline.js' })
    expect(loadBundleMetadata('right')).toBeUndefined()
  })

  it('should do nothing if no bundle was saved for the given side', () => {
    clearBundleMetadata('left')
    expect(loadBundleMetadata('left')).toBeUndefined()
  })
})
