<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'

import Selector from '../_shared/selector.svelte'

import type { WizardCardPredicatesViewModel } from './wizard-card-predicates-vm'

export let viewModel: WizardCardPredicatesViewModel
export let editing: boolean

const selectedOpLabel = viewModel.selectedOpLabel
const constantValue = viewModel.constantValue
const timeStart = viewModel.timeStart
const timeEnd = viewModel.timeEnd

type RefOption = 'constant' | 'dataset'
let selectedRefOption: RefOption = 'constant'

type TimeOption = 'single' | 'range'
let selectedTimeOption: TimeOption = 'single'
</script>

<!-- TEMPLATE -->
<div class="content">
  {#if editing}
    <div class="editor" transition:slide>
      <div class="question">
        <div class="icon-wrapper">
          <Icon class="icon" data={faCircleCheck} />
        </div>
        What should we verify for each of those variables?
      </div>
      <div class="answer">
        <div class="ref-intro">
          <span>Verify that each value in&nbsp;</span>
          <span class="varname">Temperature change from 1850</span>
          <span>&nbsp;is&nbsp;</span>
          <Selector viewModel={viewModel.opSelector} />
          <span>&nbsp;...</span>
        </div>
        <div class="row">
          <label for="constant">
            <input type="radio" id="constant" name="constant" bind:group={selectedRefOption} value="constant" />
            a constant value
            {#if selectedRefOption === 'constant'}
              <input type="number" id="constant-val" bind:value={$constantValue} />
            {/if}
          </label>
        </div>
        <div class="row">
          <label for="variable">
            <input type="radio" id="variable" name="variable" bind:group={selectedRefOption} value="variable" />
            another variable
          </label>
        </div>
        <div class="time-intro">
          <span>Time range:</span>
        </div>
        <div class="row">
          <label for="time-single">
            <input type="radio" id="time-single" name="time-single" bind:group={selectedTimeOption} value="single" />
            a single year
          </label>
        </div>
        <div class="row">
          <label for="time-range">
            <input type="radio" id="time-range" name="time-range" bind:group={selectedTimeOption} value="range" />
            a range of years
          </label>
        </div>
        {#if selectedTimeOption === 'range'}
          <div class="row">
            <label for="time-after">
              <input type="checkbox" id="time-after" name="time-after" />
              after
              <input type="number" id="time-after-val" bind:value={$timeStart} min="1850" max="2100" />
            </label>
          </div>
          <div class="row">
            <label for="time-before">
              <input type="checkbox" id="time-before" name="time-before" />
              before
              <input type="number" id="time-after-val" bind:value={$timeEnd} min="1850" max="2100" />
            </label>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if !editing}
    <div class="summary" transition:slide>
      <div class="icon-wrapper">
        <Icon class="icon" data={faCircleCheck} />
      </div>
      <span>Verify that each value in&nbsp;</span>
      <span class="varname">Temperature change from 1850</span>
      <span>&nbsp;is&nbsp;</span>
      <span class="varname">{$selectedOpLabel}</span>
      <span>{$constantValue}</span>
    </div>
  {/if}
</div>

<!-- STYLE -->
<style lang="scss">
.content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.icon-wrapper {
  display: flex;
  justify-content: center;
  width: 1.5rem;
  margin-right: 0.8rem;
}

.question {
  display: flex;
  align-items: center;
}

.answer {
  margin-top: 1rem;
  margin-left: 2.3rem;
}

.ref-intro {
  margin-bottom: 0.5rem;
}

.row {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-left: 1.2rem;
}

input[type='radio'] {
  margin-right: 0.4rem;
}

.time-intro {
  margin-top: 0.8rem;
  margin-bottom: 0.5rem;
}

input[type='checkbox'] {
  margin-left: 3rem;
  margin-right: 0.4rem;
}

input[type='number'] {
  width: 4rem;
  margin-left: 0.3rem;
  margin-right: 0.4rem;
}

.summary {
  display: flex;
  align-items: center;
}

.varname {
  border-radius: 0.4rem;
  padding: 0.08rem 0.3rem;
  background-color: #ddd;
  font-weight: 700;
}
</style>
