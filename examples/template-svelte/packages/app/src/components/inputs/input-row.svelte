<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import { _ } from 'svelte-i18n'
import type { WritableSliderInput } from '@model/app-model-inputs'
import Slider from './slider.svelte'

export let input: WritableSliderInput
export let idPrefix: string

// Format the slider value
function formatValue(value: number): string {
  // TODO: Exercise for the reader: use d3-format or similar to format the slider value
  if (input.spec.format === '.2f') {
    return value.toFixed(2)
  } else {
    return value.toFixed(1)
  }
}
</script>

<!-- TEMPLATE -->
<div class="input-row-container">
  <div class="label-row">
    <div class="label">{@html $_(input.spec.labelKey)}</div>
    <div class="spacer"></div>
    <div class="value">{formatValue($input)}</div>
    <div class="units">{@html $_(input.spec.unitsKey)}</div>
  </div>
  <div class="slider-row">
    <Slider {input} {idPrefix} />
  </div>
</div>

<!-- STYLE -->
<style lang="sass">
.input-row-container
  margin: .5rem 0

.spacer
  flex: 1

.label-row
  display: flex
  gap: .3rem

.label
  font-weight: bold

.slider-row
  position: relative
  width: 100%

.value
  min-width: 2rem
  text-align: right
  font-weight: bold
</style>
