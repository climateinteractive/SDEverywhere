<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'

import type { WritableSliderInput } from '../../model/app-model-inputs'

export let input: WritableSliderInput
export let label: string
export let min: number
export let max: number
export let step: number = 1

let value = input.get()
let sliderElem: HTMLInputElement

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = parseFloat(target.value)
  input.set(newValue)
  value = newValue
}

onMount(() => {
  // When the model input value changes, update the slider view
  const unsubscribe = input.subscribe(newValue => {
    if (sliderElem) {
      sliderElem.value = newValue.toString()
      value = newValue
    }
  })

  return () => {
    unsubscribe?.()
  }
})
</script>

<!-- TEMPLATE -->
<div class="slider-container">
  <label for={input.varId}>{@html label}</label>
  <div class="slider-row">
    <input
      bind:this={sliderElem}
      type="range"
      id={input.varId}
      bind:value
      {min}
      {max}
      {step}
      on:input={handleInput}
    />
    <span class="value">{value.toFixed(1)}</span>
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.slider-container
  margin: 1rem 0

.slider-row
  display: flex
  align-items: center
  gap: 1rem

input[type="range"]
  flex: 1

.value
  min-width: 2rem
  text-align: right
</style>
