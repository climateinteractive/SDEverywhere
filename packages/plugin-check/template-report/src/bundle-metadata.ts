// Copyright (c) 2025 Climate Interactive / New Venture Fund

/**
 * Identifies one side of the model-check comparison.
 */
export type BundleSide = 'left' | 'right'

/**
 * Describes the bundle that is selected for one side of the comparison.
 */
export interface BundleMetadata {
  /** The name of the bundle. */
  name: string
  /** The URL of the bundle, or 'current' for the bundle built into the report app. */
  url: string
}

/**
 * Return the `LocalStorage` key used to hold the selected bundle for the given side.
 *
 * @param side The side of the comparison.
 * @returns The `LocalStorage` key.
 */
function keyForSide(side: BundleSide): string {
  return `sde-check-selected-bundle-${side}`
}

/**
 * Return the metadata for the bundle that was previously selected for the given side.
 *
 * @param side The side of the comparison.
 * @returns The saved bundle metadata, or undefined if there is no valid saved metadata.
 */
export function loadBundleMetadata(side: BundleSide): BundleMetadata | undefined {
  const metadataJson = localStorage.getItem(keyForSide(side))
  if (metadataJson) {
    try {
      const parsed = JSON.parse(metadataJson)
      if (parsed.name && parsed.url) {
        return parsed as BundleMetadata
      }
    } catch (_e) {
      // Treat malformed metadata the same as if no bundle was selected
    }
  }
  return undefined
}

/**
 * Save the metadata for the bundle that is selected for the given side.
 *
 * @param side The side of the comparison.
 * @param metadata The bundle metadata to be saved.
 */
export function saveBundleMetadata(side: BundleSide, metadata: BundleMetadata): void {
  localStorage.setItem(keyForSide(side), JSON.stringify(metadata))
}

/**
 * Forget the bundle that is selected for the given side.
 *
 * @param side The side of the comparison.
 */
export function clearBundleMetadata(side: BundleSide): void {
  localStorage.removeItem(keyForSide(side))
}
