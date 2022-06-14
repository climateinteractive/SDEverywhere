<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome'
import { faArrowRightToBracket } from '@fortawesome/free-solid-svg-icons'

import type { WizardCardInputsViewModel } from './wizard-card-inputs-vm'

export let viewModel: WizardCardInputsViewModel
export let editing: boolean

type Option = 'matrix' | 'specify'
let selectedOption: Option = 'matrix'

const todo = viewModel.todo

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.content
  +if('editing')
    .editor(transition:slide)
      .question
        .icon-wrapper
          Icon(class='icon' data!='{faArrowRightToBracket}')
        | What input scenarios should we run?
      .answer
        .row
          label(for='matrix')
            input(type='radio' id='matrix' name='matrix' bind:group!='{selectedOption}' value='matrix')
            | Run the whole matrix of scenarios
        .row
          label(for='selected')
            input(type='radio' id='specify' name='specify' bind:group!='{selectedOption}' value='specify')
            | Run the following scenario...
  +if('!editing')
    .summary(transition:slide)
      .icon-wrapper
        Icon(class='icon' data!='{faArrowRightToBracket}')
      span Run&nbsp;
      span.scenario baseline scenario
      span &nbsp;and 5 others

</template>




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
