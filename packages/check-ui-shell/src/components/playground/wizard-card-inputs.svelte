<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faArrowRightToBracket } from '@fortawesome/free-solid-svg-icons'

import type { WizardCardInputsViewModel } from './wizard-card-inputs-vm'

export let viewModel: WizardCardInputsViewModel
export let editing: boolean

type Option = 'matrix' | 'specify'
let selectedOption: Option = 'matrix'

// XXX: This is just so `viewModel` is referenced
console.log(viewModel.todo)

// XXX: This is just so `selectedOption` is read
$: console.log(selectedOption)

</script>




<!-- TEMPLATE -->
<div class="content">
  {#if editing}
    <div class="editor" transition:slide>
      <div class="question">
        <div class="icon-wrapper">
          <Icon class="icon" data={faArrowRightToBracket} />
        </div>
        What input scenarios should we run?
      </div>
      <div class="answer">
        <div class="row">
          <label for="matrix">
            <input type="radio" id="matrix" name="matrix" bind:group={selectedOption} value="matrix" />
            Run the whole matrix of scenarios
          </label>
        </div>
        <div class="row">
          <label for="selected">
            <input type="radio" id="specify" name="specify" bind:group={selectedOption} value="specify" />
            Run the following scenario...
          </label>
        </div>
      </div>
    </div>
  {/if}
  {#if !editing}
    <div class="summary" transition:slide>
      <div class="icon-wrapper">
        <Icon class="icon" data={faArrowRightToBracket} />
      </div>
      <span>Run&nbsp;</span>
      <span class="scenario">baseline scenario</span>
      <span>&nbsp;and 5 others</span>
    </div>
  {/if}
</div>




<!-- STYLE -->
<style lang='sass'>

.content
  display: flex
  flex-direction: column
  flex: 1

.icon-wrapper
  display: flex
  justify-content: center
  width: 1.5rem
  margin-right: .8rem

.question
  display: flex
  align-items: center

.answer
  display: flex
  flex-direction: column
  flex: 1
  margin-top: 1rem
  margin-left: 3rem

.row
  display: flex
  flex-direction: column
  flex: 1

input[type="radio"]
  margin-right: .4rem

.summary
  display: flex
  align-items: center

.scenario
  border-radius: .4rem
  padding: .08rem .3rem
  background-color: #ddd
  font-weight: 700

</style>
