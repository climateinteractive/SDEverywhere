<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import { _ } from 'svelte-i18n'

import type { WritableSliderInput } from '@model/app-model-inputs'

export let input: WritableSliderInput
export let label: string
export let min: number
export let max: number
export let step: number = 1

let sliderElem: HTMLInputElement

// When the slider value changes, update the model input value
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = parseFloat(target.value)
  input.set(newValue)
}

// Format the slider value
function formatValue(value: number): string {
  // TODO: Exercise for the reader: use d3-format or similar to format the slider value
  if (input.spec.format === '.2f') {
    return value.toFixed(2)
  } else {
    return value.toFixed(1)
  }
}

onMount(() => {
  // When the model input value changes, update the slider view
  const unsubscribe = input.subscribe(newValue => {
    if (sliderElem) {
      sliderElem.value = newValue.toString()
    }
  })

  return () => {
    unsubscribe?.()
  }
})
</script>

<!-- TEMPLATE -->
<div class="slider-container">
  <div class="label-row">
    <div class="label">{@html label}</div>
    <div class="spacer"></div>
    <div class="value">{formatValue($input)}</div>
    <div class="units">{$_(input.spec.unitsKey)}</div>
  </div>
  <div class="slider-row">
    <input
      bind:this={sliderElem}
      type="range"
      value={$input}
      {min}
      {max}
      {step}
      on:input={handleInput}
    />
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.slider-container
  margin: 1rem 0

.spacer
  flex: 1

.label-row
  display: flex
  gap: .3rem

.label, .value
  font-weight: bold

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
