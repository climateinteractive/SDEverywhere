<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { createEventDispatcher } from 'svelte'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faCog, faFilter, faHome } from '@fortawesome/free-solid-svg-icons'

import type { HeaderViewModel } from './header-vm'

export let viewModel: HeaderViewModel
const thresholds = viewModel.thresholds
const bundleNamesL = viewModel.bundleNamesL
const bundleNamesR = viewModel.bundleNamesR
const generatedDateString = viewModel.generatedDateString
const controlsVisible = viewModel.controlsVisible
const zoom = viewModel.zoom
const consistentYRange = viewModel.consistentYRange
const concurrency = viewModel.concurrency

const dispatch = createEventDispatcher()

function onHome() {
  dispatch('command', { cmd: 'show-summary' })
}

function onToggleFilters() {
  dispatch('command', { cmd: 'toggle-filters' })
}

function onToggleControls() {
  viewModel.controlsVisible.update(v => !v)
}

function onSelectBundle(kind: string, name: string): void {
  const changeEvent = new CustomEvent('sde-check-bundle', {
    detail: {
      kind,
      name
    }
  })
  document.dispatchEvent(changeEvent)
}

function onSelectBundleL(e: Event) {
  onSelectBundle('left', (e.target as HTMLSelectElement).value)
}

function onSelectBundleR(e: Event) {
  onSelectBundle('right', (e.target as HTMLSelectElement).value)
}

function onConcurrencyChange(e: Event) {
  const value = parseInt((e.target as HTMLSelectElement).value)
  $concurrency = value
  document.dispatchEvent(new CustomEvent('sde-check-config-changed'))
}
</script>

<!-- TEMPLATE -->
<div class="header-container">
  <div class="header-content">
    <div class="header-group">
      <button class="icon-button home" on:click={onHome} aria-label="Home">
        <Icon class="icon" data={faHome} />
      </button>
    </div>
    <div class="spacer-flex"></div>
    {#if $generatedDateString}
      <div class="header-group">
        <div class="label">Generated:</div>
        <div class="label generated-date">{$generatedDateString}</div>
      </div>
    {/if}
    {#if viewModel.nameL || $bundleNamesL.length > 1}
      <div class="spacer-fixed"></div>
      <div class="header-group">
        <div class="label">Comparing:</div>
        {#if $bundleNamesL.length > 1}
          <select class="selector dataset-color-0" on:change={onSelectBundleL}>
            {#each $bundleNamesL as name}
              <option selected={name === viewModel.nameL}>{name}</option>
            {/each}
          </select>
        {:else}
          <div class="label dataset-color-0">{viewModel.nameL}</div>
        {/if}
        {#if $bundleNamesR.length > 1}
          <select class="selector dataset-color-1" on:change={onSelectBundleR}>
            {#each $bundleNamesR as name}
              <option selected={name === viewModel.nameR}>{name}</option>
            {/each}
          </select>
        {:else}
          <div class="label dataset-color-1">{viewModel.nameR}</div>
        {/if}
      </div>
      <div class="spacer-fixed"></div>
      <div class="header-group">
        <div class="label">Thresholds:</div>
        <div class="label bucket-color-0">{@html thresholds[0]}</div>
        <div class="label bucket-color-1">{@html thresholds[1]}</div>
        <div class="label bucket-color-2">{@html thresholds[2]}</div>
        <div class="label bucket-color-3">{@html thresholds[3]}</div>
        <div class="label bucket-color-4">{@html thresholds[4]}</div>
      </div>
      <div class="spacer-fixed"></div>
      <div class="header-group">
        {#if viewModel.devMode}
          <button class="icon-button filter" on:click={onToggleFilters} aria-label="Filters">
            <Icon class="icon" data={faFilter} />
          </button>
        {/if}
        <button class="icon-button controls" on:click={onToggleControls} aria-label="Controls">
          <Icon class="icon" data={faCog} />
        </button>
      </div>
    {:else}
      <div class="spacer-fixed"></div>
      <div class="header-group">
        {#if viewModel.devMode}
          <button class="icon-button filter" on:click={onToggleFilters} aria-label="Filters">
            <Icon class="icon" data={faFilter} />
          </button>
        {/if}
      </div>
    {/if}
  </div>
  {#if $controlsVisible}
    <div class="header-controls">
      <div class="spacer-flex"></div>
      {#if viewModel.devMode}
        <div class="control-label concurrency">Concurrency:</div>
        <select class="selector concurrency" on:change={onConcurrencyChange}>
          {#each Array.from({ length: Math.floor(navigator.hardwareConcurrency / 2) }, (_, i) => i + 1) as value}
            <option {value} selected={value === $concurrency}>{value}</option>
          {/each}
        </select>
        <div class="spacer-fixed"></div>
      {/if}
      <input class="checkbox" type="checkbox" name="toggle-consistent-y-range" bind:checked={$consistentYRange} />
      <label for="toggle-consistent-y-range">Consistent Y-Axis Ranges</label>
      <div class="spacer-fixed"></div>
      <div class="control-label">Graph Zoom:</div>
      <input type="range" min="0.3" max="2.5" step="0.1" bind:value={$zoom} />
      <div class="control-label">{`${$zoom.toFixed(1)}x`}</div>
    </div>
  {/if}
  <div class="line"></div>
</div>

<!-- STYLE -->
<style lang="scss">
.header-container {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: min(100%, 100vw);
  padding: 0 1rem;
  color: #aaa;
}

.header-content {
  display: flex;
  flex-direction: row;
  margin: 0.4rem 0;
}

.header-group {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.spacer-flex {
  flex: 1;
  min-width: 20px;
}

.spacer-fixed {
  width: 2rem;
}

.icon-button {
  background: none;
  border: none;
  padding: 0;
  color: #bbb;
  cursor: pointer;

  &:hover {
    color: #fff;
  }
}

.icon-button.controls {
  margin-left: 1rem;
}

.label:not(:last-child) {
  margin-right: 1rem;
}

.generated-date {
  color: #ddd;
}

.header-controls {
  display: flex;
  flex-direction: row;
  margin: 0.4rem 0;
  align-items: center;
}

.control-label.concurrency {
  margin-right: 0.4rem;
}

input[type='range'] {
  width: 10rem;
  margin: 0 0.4rem;
}

.line {
  min-height: 1px;
  margin-bottom: 1rem;
  background-color: #555;
}
</style>
