// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join as joinPath } from 'node:path'

import type { ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { localBundlesPlugin } from './vite-local-bundles-plugin'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A message that the plugin sent back to the client. */
interface SentMessage {
  event: string
  data: any
}

/** A minimal stand-in for the parts of the Vite dev server that the plugin uses. */
interface FakeServer {
  /** The object that is passed to the plugin's `configureServer` hook. */
  devServer: ViteDevServer
  /** The event handlers that the plugin registered, keyed by event name. */
  handlers: Map<string, (data: any) => Promise<void> | void>
  /** The messages that the plugin sent back to the client. */
  sentMessages: SentMessage[]
  /** Simulate the dev server being closed. */
  close: () => void
}

function createFakeServer(): FakeServer {
  const handlers = new Map<string, (data: any) => Promise<void> | void>()
  const sentMessages: SentMessage[] = []
  const closeListeners: (() => void)[] = []

  const client = {
    send: (event: string, data: any) => {
      sentMessages.push({ event, data })
    }
  }

  const devServer = {
    ws: {
      on: (event: string, handler: (data: any, c: unknown) => Promise<void> | void) => {
        handlers.set(event, (data: any) => handler(data, client))
      },
      send: () => {
        // No-op
      }
    },
    httpServer: {
      on: (event: string, listener: () => void) => {
        if (event === 'close') {
          closeListeners.push(listener)
        }
      }
    }
  }

  return {
    devServer: devServer as unknown as ViteDevServer,
    handlers,
    sentMessages,
    close: () => {
      for (const listener of closeListeners) {
        listener()
      }
    }
  }
}

let bundlesDir: string
let fakeServer: FakeServer
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  bundlesDir = await mkdtemp(joinPath(tmpdir(), 'sde-local-bundles-'))
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  fakeServer = createFakeServer()
  const plugin = localBundlesPlugin(bundlesDir, joinPath(bundlesDir, 'current.js'))
  await (plugin.configureServer as any)(fakeServer.devServer)
})

afterEach(async () => {
  fakeServer.close()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await rm(bundlesDir, { recursive: true, force: true })
})

describe('localBundlesPlugin', () => {
  it('should log a concise message (without the raw error object) when a remote bundle cannot be fetched', async () => {
    // Simulate the kind of error (with a long stack trace) that is thrown when nothing
    // is listening at the configured remote bundle URL
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed')
      })
    )

    const url = 'http://localhost:9000/remote-2.js'
    await fakeServer.handlers.get('load-bundle')({ url, name: 'remote-2' })

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const args = errorSpy.mock.calls[0]
    expect(args).toHaveLength(1)
    expect(args[0]).toBe(`[sde-local-bundles] Failed to load bundle 'remote-2' from ${url}: fetch failed`)
  })

  it('should send an error message to the client when a bundle cannot be loaded', async () => {
    const url = 'file:///does/not/exist.js'
    await fakeServer.handlers.get('load-bundle')({ url, name: 'missing' })

    expect(fakeServer.sentMessages).toHaveLength(1)
    expect(fakeServer.sentMessages[0].event).toBe('load-bundle-error')
    expect(fakeServer.sentMessages[0].data.name).toBe('missing')
    expect(fakeServer.sentMessages[0].data.url).toBe(url)
    expect(fakeServer.sentMessages[0].data.error).toMatch(/ENOENT/)
  })

  it('should send the source code to the client when a remote bundle is fetched successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return { ok: true, text: async () => 'export function createBundle() {}' } as Response
      })
    )

    const url = 'http://localhost:9000/remote-2.js'
    await fakeServer.handlers.get('load-bundle')({ url, name: 'remote-2' })

    expect(errorSpy).not.toHaveBeenCalled()
    expect(fakeServer.sentMessages).toHaveLength(1)
    expect(fakeServer.sentMessages[0].event).toBe('load-bundle-success')
    expect(fakeServer.sentMessages[0].data.sourceCode).toBe('export function createBundle() {}')
  })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
