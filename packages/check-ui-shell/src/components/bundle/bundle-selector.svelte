<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund. All rights reserved. -->

<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import fuzzysort from 'fuzzysort'

import ReloadButton from '../_shared/reload-button.svelte'

import type { BundleManager } from './bundle-manager.svelte'
import type { BundleSpec } from './bundle-spec'

interface Props {
  bundleManager: BundleManager
  onSelect?: (bundle: BundleSpec) => void
}

let { bundleManager, onSelect }: Props = $props()

let bundles = $derived(bundleManager.bundles)
let loading = $derived(bundleManager.loading)
let error = $derived(bundleManager.error)

function handleDownload(bundle: BundleSpec) {
  bundleManager.downloadBundle(bundle)
}

function handleReload() {
  bundleManager.load()
}

onMount(() => {
  bundleManager.load()
})

let searchTerm = $state('')
let sortBy = $state<'date' | 'name'>('date')
let sortDirection = $state<'asc' | 'desc'>('desc')

const filteredBundles = $derived.by(() => {
  let filtered = [...bundles]

  // Apply search filter if there's a search term
  if (searchTerm) {
    // Create searchable objects with name at top level
    const searchableBundles = bundles.map(bundle => ({
      bundle,
      name: bundle.remote?.name || bundle.local?.name || ''
    }))

    const results = fuzzysort.go(searchTerm, searchableBundles, {
      keys: ['name'],
      threshold: -10000
    })
    filtered = results.map(result => result.obj.bundle)
  }

  // Sort the results
  return filtered.sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1
    if (sortBy === 'date') {
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
  if (sortBy === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy = column
    sortDirection = 'desc'
  }
}

function isDownloaded(bundle: BundleSpec): boolean {
  return bundle.local !== undefined
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const dateString = date.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' })
  const timeString = date.toLocaleTimeString(undefined, { hour12: true, hour: 'numeric', minute: '2-digit' })
  return `${dateString} at ${timeString}`
}
</script>

<!-- TEMPLATE -->
<div class="bundle-selector">
  <div class="bundle-selector-header">
    <div class="bundle-selector-search-bar">
      <input
        type="text"
        placeholder="Search bundles..."
        bind:value={searchTerm}
        class="bundle-selector-search-input"
        role="searchbox"
        aria-label="Search bundles"
      />
    </div>
  </div>

  <div class="bundle-selector-list-container">
    <div class="bundle-selector-list-header">
      <div class="bundle-selector-header-download"></div>
      <button class="bundle-selector-sort-button" onclick={() => toggleSort('name')}>
        Name
        {#if sortBy === 'name'}
          <span class="bundle-selector-sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        {/if}
      </button>
      <button class="bundle-selector-sort-button" onclick={() => toggleSort('date')}>
        Last Modified
        {#if sortBy === 'date'}
          <span class="bundle-selector-sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        {/if}
      </button>
    </div>

    <div class="bundle-selector-list-content">
      {#if error || loading}
        <div class="bundle-selector-empty"></div>
      {:else if bundles.length === 0}
        <div class="bundle-selector-empty">No bundles found</div>
      {:else}
        {#each filteredBundles as bundle}
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
                onclick={e => {
                  e.stopPropagation()
                  handleDownload(bundle)
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
    <ReloadButton disabled={loading} onClick={() => handleReload()} />
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.bundle-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--panel-bg);
  overflow: hidden;
}

.bundle-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--panel-header-bg);
  border-bottom: 1px solid var(--panel-border);
  border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
}

.bundle-selector-search-bar {
  display: flex;
  flex: 1;
}

.bundle-selector-search-input {
  width: 100%;
  height: 2rem;
  padding: 0.5rem;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-family: inherit;

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
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.bundle-selector-list-header {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  gap: 1rem;
  padding: 0.5rem 1.5rem;
  background-color: #333;
  border-bottom: 1px solid var(--panel-border);
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
  padding: 0.5rem 1.5rem;
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
  width: var(--button-icon-size);
  height: var(--button-icon-size);
  padding: 0;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border-normal);
  border-radius: var(--input-border-radius);
  color: var(--text-color-primary);
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0;

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
    background-color: var(--button-bg-hover);
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
  padding: 1rem;
  background-color: var(--panel-footer-bg);
  border-top: 1px solid var(--panel-border);
}

.bundle-selector-status-message {
  color: var(--text-color-secondary);
}
</style>
