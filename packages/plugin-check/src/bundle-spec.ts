// Copyright (c) 2025 Climate Interactive / New Venture Fund

export interface LocalBundleSpec {
  kind: 'local'
  name: string
  path: string
}

export interface RemoteBundleSpec {
  kind: 'remote'
  name: string
  url: string
}

export type BundleSpec = LocalBundleSpec | RemoteBundleSpec
