import 'bootstrap-slider/dist/css/bootstrap-slider.css'
import type { ChangeValue } from 'bootstrap-slider'
import Slider from 'bootstrap-slider'
import type { WritableSliderInput } from '@model/app-model-inputs'

/** Wraps a `bootstrap-slider` Slider element. */
export class SliderView {
  private slider: Slider
  private previousValue: number

  /** Called when the slider value has changed (by drag or click). */
  public onChange?: (newValue: number) => void

  constructor(
    element: HTMLInputElement,
    private readonly modelInput: WritableSliderInput
  ) {
    const value = modelInput.get()
    const spec = modelInput.spec

    // Create the slider control and add it to the DOM
    this.slider = new Slider(element, {
      value,
      min: spec.minValue,
      max: spec.maxValue,
      step: spec.step,
      reversed: spec.reversed,
      selection: 'none',
      rangeHighlights: [{ start: spec.defaultValue, end: value }],
      tooltip: 'hide'
    })
    this.updateRangeHighlights(value)

    // The `slideStart` event is emitted when the user starts dragging the slider
    this.slider.on('slideStart', () => {
      // Clear the "earlier" previous value here; we will capture the previous
      // value in the `change` callback
      this.previousValue = undefined
    })

    // The `change` event is emitted when the slider is dragged
    // or the track is clicked
    this.slider.on('change', (change: ChangeValue) => {
      if (this.previousValue === undefined) {
        this.previousValue = change.oldValue as number
      }
      const newValue = change.newValue as number
      this.updateRangeHighlights(newValue)
      this.modelInput.set(newValue)
      this.onChange?.(newValue)
    })
  }

  /**
   * Highlight the track between the default and current positions.
   * This must be called before `setValue` because `setValue` triggers layout.
   */
  updateRangeHighlights(value: number): void {
    const start = this.modelInput.spec.defaultValue
    const end = value
    this.slider?.setAttribute('rangeHighlights', [{ start, end }])
  }

  setValue(value: number): void {
    this.slider?.setValue(value)
  }

  setEnabled(enabled: boolean): void {
    if (!this.slider) {
      return
    }
    if (enabled && !this.slider.isEnabled()) {
      this.slider.enable()
    } else if (!enabled && this.slider.isEnabled()) {
      this.slider.disable()
    }
  }

  destroy(): void {
    this.slider?.destroy()
    this.slider = undefined
  }
}
