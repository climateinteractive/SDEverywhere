<!-- Copyright (c)2020-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { onMount } from 'svelte'

export let visible = false

let container: HTMLElement

onMount(() => {
  // XXX: It appears that `rootMargin` does not work if `root` is null
  // (see https://stackoverflow.com/a/58625634) so we will use the scroll
  // container as the root
  const rootContainer = container.closest('.scroll-container')
  if (rootContainer === undefined) {
    throw new Error(`Lazy component requires an ancestor marked with the 'scroll-container' class`)
  }

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
    // Use the scroll container for visibility checking
    root: rootContainer,
    // XXX: For now, increase the size of the root bounds so that items are loaded
    // before they become fully visible.  We use 200% for the right/bottom margins
    // so that up to two "viewports" worth of items are loaded before scrolling
    // down or to the right, and we use 100% for the others so that up to one
    // "viewport" is loaded before scrolling up or to the left.  This means that
    // we potentially keep more items in memory than strictly necessary, which
    // may have memory pressure implications, but it is much more efficient than
    // not using the lazy component at all, and provides a better UX (less flashing)
    // compared to the default `rootMargin`.
    rootMargin: '100% 200% 200% 100%'
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
  height: 100%

</style>
