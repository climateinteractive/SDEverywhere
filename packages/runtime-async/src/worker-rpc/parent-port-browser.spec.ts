// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { afterEach, describe, expect, it, vi } from 'vitest'

import { parentWorkerPort } from './parent-port'

vi.mock('./node-runtime', () => ({
  isNodeEnvironment: () => false,
  nodeWorkerThreads: vi.fn()
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parentWorkerPort (in a browser environment)', () => {
  it('should reject the browser main window', () => {
    vi.stubGlobal('document', {})
    vi.stubGlobal('postMessage', vi.fn())

    expect(() => parentWorkerPort()).toThrow('must be called from a worker thread')
  })
})
