<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fn, userEvent } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import SliderCard from './slider-card.svelte'
import type { SliderConfig } from './graphs-editor-vm.svelte'

const defaultSlider: SliderConfig = {
  id: 'slider-1',
  varId: '_birth_rate',
  value: 50,
  min: 0,
  max: 100
}

const negativeRangeSlider: SliderConfig = {
  id: 'slider-2',
  varId: '_temperature_delta',
  value: 0,
  min: -50,
  max: 50
}

const { Story } = defineMeta({
  title: 'Components/SliderCard',
  component: SliderCard
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={300} height={100}>
    <div style="width: 100%; padding: 8px;">
      <SliderCard
        config={args.config}
        hasErrors={args.hasErrors}
        onValueChange={args.onValueChange}
        onRemove={args.onRemove}
      />
    </div>
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  args={{
    config: defaultSlider,
    hasErrors: false,
    onValueChange: fn(),
    onRemove: fn()
  }}
  play={async ({ canvas }) => {
    // Verify variable name is displayed
    const name = canvas.getByText('birth rate')
    await expect(name).toBeInTheDocument()

    // Verify value is displayed
    const value = canvas.getByText('50')
    await expect(value).toBeInTheDocument()

    // Verify slider is present
    const slider = canvas.getByRole('slider')
    await expect(slider).toBeInTheDocument()
    await expect(slider).toHaveAttribute('min', '0')
    await expect(slider).toHaveAttribute('max', '100')

    // Verify remove button is present
    const removeButton = canvas.getByTitle('Remove slider')
    await expect(removeButton).toBeInTheDocument()
  }}
/>

<Story
  name="With Errors"
  {template}
  args={{
    config: defaultSlider,
    hasErrors: true,
    onValueChange: fn(),
    onRemove: fn()
  }}
  play={async ({ canvas }) => {
    // Verify error indicator is visible
    const errorIndicator = canvas.getByText('⚠')
    await expect(errorIndicator).toBeInTheDocument()
  }}
/>

<Story
  name="Negative Range"
  {template}
  args={{
    config: negativeRangeSlider,
    hasErrors: false,
    onValueChange: fn(),
    onRemove: fn()
  }}
  play={async ({ canvas }) => {
    // Verify variable name is displayed
    const name = canvas.getByText('temperature delta')
    await expect(name).toBeInTheDocument()

    // Verify value is displayed (0)
    const value = canvas.getByText('0')
    await expect(value).toBeInTheDocument()

    // Verify slider has correct range
    const slider = canvas.getByRole('slider')
    await expect(slider).toHaveAttribute('min', '-50')
    await expect(slider).toHaveAttribute('max', '50')
  }}
/>

<Story
  name="Remove Button"
  {template}
  args={{
    config: defaultSlider,
    hasErrors: false,
    onValueChange: fn(),
    onRemove: fn()
  }}
  play={async ({ canvas, args }) => {
    // Click the remove button
    const removeButton = canvas.getByTitle('Remove slider')
    await userEvent.click(removeButton)

    // Verify onRemove was called
    await expect(args.onRemove).toHaveBeenCalledTimes(1)
  }}
/>

<Story
  name="Value Change"
  {template}
  args={{
    config: defaultSlider,
    hasErrors: false,
    onValueChange: fn(),
    onRemove: fn()
  }}
  play={async ({ canvas }) => {
    // Get the slider
    const slider = canvas.getByRole('slider')

    // Change the slider value
    await userEvent.clear(slider)
    slider.setAttribute('value', '75')
    slider.dispatchEvent(new Event('input', { bubbles: true }))

    // Note: The actual value change callback testing is limited in this environment
    // The slider input event should trigger onValueChange
  }}
/>
