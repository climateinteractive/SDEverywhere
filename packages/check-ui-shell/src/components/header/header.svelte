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
const controlsVisible = viewModel.controlsVisible
const zoom = viewModel.zoom
const consistentYRange = viewModel.consistentYRange

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
        {#if (import.meta as any).hot}
          <button class="icon-button filter" on:click={onToggleFilters} aria-label="Filter">
            <Icon class="icon" data={faFilter} />
          </button>
        {/if}
        <button class="icon-button controls" on:click={onToggleControls} aria-label="Controls">
          <Icon class="icon" data={faCog} />
        </button>
      </div>
    {/if}
  </div>
  {#if $controlsVisible}
    <div class="header-controls">
      <div class="spacer-flex"></div>
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

.icon-button.filter {
  margin-right: 1rem;
}

.label:not(:last-child) {
  margin-right: 1rem;
}

select {
  margin-right: 1rem;
  font-family: Roboto, sans-serif;
  font-size: 1em;
  // XXX: Remove browser-provided background, but preserve arrow; based on:
  //   https://stackoverflow.com/a/57510283
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding: 0.2rem 1.6rem 0.2rem 0.4rem;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23555'><polygon points='0,0 100,0 50,60'/></svg>")
    no-repeat;
  background-size: 0.8rem;
  background-position: calc(100% - 0.4rem) 70%;
  background-repeat: no-repeat;
  background-color: #353535;
  border: none;
  border-radius: 0.4rem;
}

.header-controls {
  display: flex;
  flex-direction: row;
  margin: 0.4rem 0;
  align-items: center;
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
