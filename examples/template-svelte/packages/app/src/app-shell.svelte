<!-- SCRIPT -->
<script lang="ts">
import { getConfig } from '@core'

import { initStrings } from '@shared/strings'

import App from './app.svelte'
import DevOverlay from './components/dev/dev-overlay.svelte'

// Initialize the strings used throughout the app.  Note that we call this once
// when the app shell is loaded, but any updates to strings made in dev mode will
// be handled in `strings.ts`, which leads to better HMR behavior.
initStrings()

// Initialize the core configuration (graph specs, input specs, etc).  We load this
// just once in this top-level app shell file, which leads to better HMR behavior for
// local development when config specs are changed.
const coreConfig = getConfig()
</script>

<!-- TEMPLATE -->
<App {coreConfig} />
<DevOverlay />
