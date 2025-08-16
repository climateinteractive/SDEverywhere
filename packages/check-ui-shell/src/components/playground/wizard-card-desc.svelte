<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faLightbulb } from '@fortawesome/free-regular-svg-icons'

import type { WizardCardDescViewModel } from './wizard-card-desc-vm'

export let viewModel: WizardCardDescViewModel
export let editing: boolean

const subject = viewModel.subject
const expectation = viewModel.expectation
const should = ' should '

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.content
  +if('editing')
    .editor(transition:slide)
      .question
        .icon-wrapper
          Icon(class='icon' data!='{faLightbulb}')
        | What part of the model are we checking?  And what is the expected behavior?
      .answer
        input.desc(placeholder!='Part of the model' bind:value!='{$subject}')
        div.should should
        input.test(placeholder!='have some expected behavior' bind:value!='{$expectation}')
      .examples
        .header Examples:
        ul
          li
            span.subject Temperature increase
            span.should should
            span.expect never exceed 8.5 degC
          li
            span.subject Population
            span.should should
            span.expect increase monotonically after 2030
          li
            span.subject GHG emissions
            span.should should
            span.expect match historical data between 1990 and 2020
  +if('!editing')
    .summary(transition:slide)
      .icon-wrapper
        Icon(class='icon' data!='{faLightbulb}')
      span.subject { $subject }
      span.should should
      span.expect { $expectation }

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
  flex-direction: row
  align-items: baseline
  margin-top: 1rem
  margin-left: 3.5rem

input
  outline: none
  border: 1px solid #aaa
  border-radius: .2rem
  padding: .2rem .3rem

input:focus
  border-color: blue

.desc
  width: 11rem

.test
  width: 25rem

.examples
  margin-left: 2.3rem
  opacity: .6

.header
  margin-top: 1rem
  margin-bottom: 0

ul
  margin: 0
  padding-left: 2.5rem

li
  margin: .3rem 0

.subject, .expect
  border-radius: .4rem
  padding: .08rem .2rem

.subject
  background-color: #ddddff
  // color: #0000ff

.expect
  background-color: #ccddcc
  // color: #00aa00

.should
  margin: 0 .25rem

.summary
  display: flex
  align-items: center

</style>
