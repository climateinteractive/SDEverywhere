<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import App from './app.svelte'
import type { AppViewModel } from './app-vm'

// Importing the `global.css` file here will ensure that it is positioned to
// override other styles from Svelte files
import './global.css'

export let appViewModel: AppViewModel

</script>




<!-- TEMPLATE -->
<template lang='pug'>

+if('appViewModel')
  App(viewModel!='{appViewModel}')

</template>
