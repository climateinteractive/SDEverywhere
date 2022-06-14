<!-- Copyright (c)2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { onMount } from 'svelte'

export let visible = false

let container: HTMLElement

onMount(() => {
  // Wait for the container to become visible before loading the child component
  let observer = new IntersectionObserver(entries => {
    const intersecting = entries[0].isIntersecting
    if (intersecting && !visible) {
      // Show the child component when the container comes into view
      visible = true
    } else if (!intersecting && visible) {
      // Hide the child component when the container goes out of view
      visible = false
    }
  }, {
    // Use the browser viewport for visibility checking
    root: null
  })
  observer.observe(container)

  return () => {
    // Stop observing visibility changes when the component is unmounted
    visible = false
    observer.disconnect()
  }
})

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.lazy-container(bind:this!='{container}')
  +if('visible')
    slot

</template>




<!-- STYLE -->
<style lang='sass'>

.lazy-container
  position: relative
  display: flex
  flex: 1
  height: 100%

</style>
