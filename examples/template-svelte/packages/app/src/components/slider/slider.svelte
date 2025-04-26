<!-- SCRIPT -->
<script lang="ts">
import { onMount } from 'svelte'
import { _ } from 'svelte-i18n'
import type { WritableSliderInput } from '@model/app-model-inputs'
import { SliderView } from './slider-view'

export let input: WritableSliderInput
export let enabled = true

const sliderSpec = input.spec
let sliderView: SliderView
let inputElem: HTMLInputElement
let tickStyle: string

// Enable or disable the slider view when the prop changes
$: sliderView?.setEnabled(enabled)

function createSliderView() {
  // Update the tick position
  const def = sliderSpec.defaultValue
  const min = sliderSpec.minValue
  const max = sliderSpec.maxValue
  const reversed = sliderSpec.reversed
  let tickPct = ((def - min) / (max - min)) * 100
  if (reversed) {
    tickPct = 100 - tickPct
  }
  tickStyle = `margin-left: ${tickPct}%`

  // Destroy the old slider view (if one was already created
  // before the language direction changed)
  sliderView?.destroy()

  // Create the slider view and bind it to the input element
  sliderView = new SliderView(inputElem, input)

  // When the slider view updates its value, update the qualifier
  sliderView.onChange = newValue => {
    updateQualKey(newValue)
  }
}

onMount(() => {
  // Create the slider view
  createSliderView()

  // When the model input value changes, update the slider view
  const unsubscribe = input.subscribe(newValue => {
    sliderView.updateRangeHighlights(newValue)
    sliderView.setValue(newValue)
  })

  return () => {
    unsubscribe?.()
    sliderView?.destroy()
    sliderView = undefined
  }
})
</script>

<!-- TEMPLATE -->
<div class="tick-container" style={tickStyle}>
  <div class="tick"></div>
</div>
<input bind:this={inputElem} />

<!-- STYLE -->
<style lang="sass">
.tick
  position: absolute
  top: 12px
  width: 4px
  height: 14px
  transform: translate(-2px, 0)
  border-radius: 4px
  background: #ccc

/*
 * Customizations for bootstrap-slider
 */

:global(.slider.slider-horizontal)
  width: 100%
  height: 16px
  margin-top: 4px
  margin-bottom: 4px

:global(.slider.slider-horizontal .slider-track)
  height: 8px
  top: 4px // (slider-handle:height / 2) - (slider-track:height / 2)
  margin-top: 0
  background: #ccc

:global(.slider-rangeHighlight)
  background: #5588ff

:global(.slider-handle)
  width: 16px
  height: 16px
  background: #000

:global(.slider.slider-horizontal .slider-handle)
  margin-left: -8px
</style>
