<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<!-- SCRIPT -->
<script lang="ts">
import { derived, writable } from 'svelte/store'
import fuzzysort from 'fuzzysort'

import type { BundleSpec } from './bundle-spec'

export let bundles: BundleSpec[]
export let loading: boolean
export let error: string | undefined
export let onReload: (() => void) | undefined = undefined
export let onSelect: ((bundle: BundleSpec) => void) | undefined = undefined
export let onDownload: ((bundle: BundleSpec) => void) | undefined = undefined

const searchTerm = writable('')
const sortBy = writable<'date' | 'name'>('date')
const sortDirection = writable<'asc' | 'desc'>('desc')

const filteredBundles = derived([searchTerm, sortBy, sortDirection], ([$searchTerm, $sortBy, $sortDirection]) => {
  let filtered = bundles

  // Apply search filter if there's a search term
  if ($searchTerm) {
    // Create searchable objects with name at top level
    const searchableBundles = bundles.map(bundle => ({
      bundle,
      name: bundle.remote?.name || bundle.local?.name || ''
    }))

    const results = fuzzysort.go($searchTerm, searchableBundles, {
      keys: ['name'],
      threshold: -10000
    })
    filtered = results.map(result => result.obj.bundle)
  }

  // Sort the results
  return filtered.sort((a, b) => {
    const multiplier = $sortDirection === 'asc' ? 1 : -1
    if ($sortBy === 'date') {
      const aLastModified = a.remote?.lastModified || a.local?.lastModified || ''
      const bLastModified = b.remote?.lastModified || b.local?.lastModified || ''
      return multiplier * (new Date(aLastModified).getTime() - new Date(bLastModified).getTime())
    } else {
      const aName = a.remote?.name || a.local?.name || ''
      const bName = b.remote?.name || b.local?.name || ''
      return multiplier * aName.localeCompare(bName)
    }
  })
})

function toggleSort(column: 'date' | 'name') {
  if ($sortBy === column) {
    sortDirection.update(d => (d === 'asc' ? 'desc' : 'asc'))
  } else {
    sortBy.set(column)
    sortDirection.set('desc')
  }
}

function isDownloaded(bundle: BundleSpec): boolean {
  return bundle.local !== undefined
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]
}
</script>

<!-- TEMPLATE -->
<div class="bundle-selector">
  <div class="bundle-selector-header">
    <div class="bundle-selector-search-bar">
      <input
        type="text"
        placeholder="Search versions..."
        bind:value={$searchTerm}
        class="bundle-selector-search-input"
        role="searchbox"
        aria-label="Search versions"
      />
    </div>
  </div>

  <div class="bundle-selector-list-container">
    <div class="bundle-selector-list-header">
      <div class="bundle-selector-header-download"></div>
      <button class="bundle-selector-sort-button" onclick={() => toggleSort('name')}>
        Name
        {#if $sortBy === 'name'}
          <span class="bundle-selector-sort-indicator">{$sortDirection === 'asc' ? '↑' : '↓'}</span>
        {/if}
      </button>
      <button class="bundle-selector-sort-button" onclick={() => toggleSort('date')}>
        Last Modified
        {#if $sortBy === 'date'}
          <span class="bundle-selector-sort-indicator">{$sortDirection === 'asc' ? '↑' : '↓'}</span>
        {/if}
      </button>
    </div>

    <div class="bundle-selector-list-content">
      {#if error}
        <div class="bundle-selector-error">{error}</div>
      {:else if loading}
        <div class="bundle-selector-loading">Loading bundles...</div>
      {:else if bundles.length === 0}
        <div class="bundle-selector-empty">No bundles found</div>
      {:else}
        {#each $filteredBundles as bundle}
          <div
            class="bundle-selector-list-row"
            role="option"
            aria-selected="false"
            tabindex="0"
            onclick={() => onSelect?.(bundle)}
            onkeydown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.(bundle)
              }
            }}
          >
            <div class="bundle-selector-list-download">
              <button
                class="bundle-selector-download-button"
                disabled={isDownloaded(bundle)}
                onclick={(e) => {
                  e.stopPropagation()
                  onDownload?.(bundle)
                }}
                aria-label="Download bundle"
              >
                ↓
              </button>
            </div>
            <span class="bundle-selector-list-bundle-name">{bundle.remote?.name || bundle.local?.name || ''}</span>
            <span class="bundle-selector-list-bundle-date"
              >{formatDate(bundle.remote?.lastModified || bundle.local?.lastModified || '')}</span
            >
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="bundle-selector-status-bar">
    <div class="bundle-selector-status-message">
      {#if loading}
        Loading...
      {:else if error}
        {error}
      {:else}
        {bundles.length} {bundles.length === 1 ? 'bundle' : 'bundles'}
      {/if}
    </div>
    <button
      class="bundle-selector-reload-button"
      onclick={() => onReload?.()}
      disabled={loading}
      aria-label="Reload"
    >
      ↻
    </button>
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.bundle-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #272727;
  border: 1px solid var(--border-color-normal);
  border-radius: 0.375rem;
  overflow: hidden;
}

.bundle-selector-header {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color-normal);
}

.bundle-selector-search-bar {
  width: 100%;
}

.bundle-selector-search-input {
  width: 100%;
  height: 2rem;
  padding: 0.5rem;
  background-color: #444;
  border: 1px solid var(--border-color-normal);
  border-radius: 0.25rem;
  color: var(--text-color-primary);
  font-family: inherit;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: var(--border-color-focused);
    box-shadow: 0 0 0 1px var(--border-color-focused);
  }
}

.bundle-selector-loading,
.bundle-selector-empty,
.bundle-selector-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 4rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.bundle-selector-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bundle-selector-list-header {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  gap: 1rem;
  padding: 0.75rem;
  background-color: #333;
  border-bottom: 1px solid var(--border-color-normal);
  font-weight: 700;
}

.bundle-selector-header-download {
  width: 3rem;
}

.bundle-selector-sort-button {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--text-color-primary);
  font: inherit;
  cursor: pointer;

  &:hover {
    color: var(--link-color-hover);
  }
}

.bundle-selector-sort-indicator {
  font-size: 0.875rem;
  margin-top: -0.1rem;
}

.bundle-selector-list-content {
  flex: 1;
  overflow-y: auto;
}

.bundle-selector-list-row {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  user-select: none;
  cursor: pointer;

  &:hover {
    background-color: #444;
  }

  &:last-child {
    border-bottom: none;
  }
}

.bundle-selector-list-download {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bundle-selector-download-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  background-color: #555;
  border: 1px solid var(--border-color-normal);
  border-radius: 0.25rem;
  color: var(--text-color-primary);
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;

  .bundle-selector-list-row:hover & {
    opacity: 1;
  }

  &:disabled {
    opacity: 1;
    cursor: not-allowed;
    background-color: #333;
    color: var(--text-color-secondary);
  }

  &:not(:disabled):hover {
    background-color: #666;
    border-color: var(--border-color-focused);
  }
}

.bundle-selector-list-bundle-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bundle-selector-list-bundle-date {
  color: var(--text-color-secondary);
  white-space: nowrap;
}

.bundle-selector-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #333;
  border-top: 1px solid var(--border-color-normal);
  font-size: 0.875rem;
}

.bundle-selector-status-message {
  color: var(--text-color-secondary);
}

.bundle-selector-reload-button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  background-color: #555;
  border: 1px solid var(--border-color-normal);
  border-radius: 0.25rem;
  color: var(--text-color-primary);
  font-size: 1.25rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: #666;
    border-color: var(--border-color-focused);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
