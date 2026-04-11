// Copyright (c) 2025 Climate Interactive / New Venture Fund

/**
 * Describes the location of a model-check bundle file.
 */
export interface BundleLocation {
  /** The URL for the bundle JS file. */
  url: string
  /** The display name of the bundle. */
  name: string
  /** The last modified date of the bundle in ISO 8601 format. */
  lastModified: string
}

/**
 * Describes a model-check bundle file that can be loaded from the network or from a local file.
 */
export interface BundleSpec {
  /** The remote location of the bundle file. */
  remote?: BundleLocation
  /** The local location of the bundle file. */
  local?: BundleLocation
}
