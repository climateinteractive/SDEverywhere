<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!--
Based on example code by @dukenmarga from:
  https://svelte.dev/repl/6fb90919e24942b2b47d9ad154386b0c?version=3.49.0
-->

<script context="module" lang="ts">

export interface ContextMenuItem {
  key: string
  iconClass?: string
  displayText: string
}

</script>

<script lang="ts">

import { createEventDispatcher } from 'svelte'

import { clickOutside } from './click-outside'

export let items: ContextMenuItem[]
export let parentElem: HTMLElement
export let initialEvent: MouseEvent

const dispatch = createEventDispatcher()

// Cursor position of the initial event
let pos = { x: 0, y: 0 }

// Whether to show or hide the menu
let showMenu = false

$: if (initialEvent) {
  const bounds = parentElem.getBoundingClientRect()
  pos = {
    x: initialEvent.clientX - bounds.left,
    y: initialEvent.clientY - bounds.top
  }
  showMenu = true
} else {
  showMenu = false
}

function onItemSelected(cmd: string) {
  dispatch('item-selected', cmd)
}

</script>

{#if showMenu}
  <nav use:clickOutside on:clickout style="position: absolute; top:{pos.y}px; left:{pos.x}px">
    <div class="navbar" id="navbar">
      <ul>
        {#each items as item}
          {#if item.key == "hr"}
            <hr>
          {:else}
            <li><button on:click={() => onItemSelected(item.key)}><i class={item.iconClass}></i>{item.displayText}</button></li>
          {/if}
        {/each}
      </ul>
    </div>
  </nav>
{/if}

<style lang="sass">

*
  padding: 0
  margin: 0

nav
  z-index: 200

.navbar
  display: inline-flex
  border: 1px #999 solid
  width: 170px
  background-color: #fff
  border-radius: 10px
  overflow: hidden
  flex-direction: column

.navbar ul
  margin: 6px

ul li
  display: block
  list-style-type: none
  width: 1fr

ul li button
  font-family: Roboto, sans-serif
  font-weight: 700
  font-size: 1rem
  color: #222
  width: 100%
  height: 30px
  text-align: left
  border: 0px
  background-color: #fff

ul li button:hover
  color: #000
  text-align: left
  border-radius: 5px
  background-color: #eee

ul li button i
  padding: 0px 15px 0px 10px

hr
  border: none
  border-bottom: 1px solid #ccc
  margin: 5px 0px

</style>
