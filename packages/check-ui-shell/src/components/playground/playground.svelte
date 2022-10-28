<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang='ts'>

import { slide } from 'svelte/transition'

import CheckGraphBox from '../check/summary/check-summary-graph-box.svelte'

import type { PlaygroundViewModel } from './playground-vm'
import WizardCardDesc from './wizard-card-desc.svelte'
import WizardCardInputs from './wizard-card-inputs.svelte'
import WizardCardOutputs from './wizard-card-outputs.svelte'
import WizardCardPredicates from './wizard-card-predicates.svelte'

export let viewModel: PlaygroundViewModel

const cards = viewModel.cards
const graphBox = viewModel.graphBox

let maxCompleted = -1
let activeCard = 0

$: showNextButton = maxCompleted < 3

function onCardClicked(index: number) {
  activeCard = index
}

function onNextClicked() {
  // TODO: Only increment maxCompleted if...
  maxCompleted++
  activeCard++
}

</script>




<!-- TEMPLATE -->
<template lang='pug'>

.playground-container
  .scroll-container
    .wizard-container
      .card-container
        .card(class:editing!='{activeCard === 0}' on:click!='{() => onCardClicked(0)}')
          WizardCardDesc(viewModel!='{cards.desc}' editing!='{activeCard === 0}')
        +if('maxCompleted >= 0')
          .spacer-fixed
          .card(class:editing!='{activeCard === 1}' transition:slide on:click!='{() => onCardClicked(1)}')
            WizardCardOutputs(viewModel!='{cards.outputs}' editing!='{activeCard === 1}')
        +if('maxCompleted >= 1')
          .spacer-fixed
          .card(class:editing!='{activeCard === 2}' transition:slide on:click!='{() => onCardClicked(2)}')
            WizardCardInputs(viewModel!='{cards.inputs}' editing!='{activeCard === 2}')
        +if('maxCompleted >= 2')
          .spacer-fixed
          .card(class:editing!='{activeCard === 3}' transition:slide on:click!='{() => onCardClicked(3)}')
            WizardCardPredicates(viewModel!='{cards.predicates}' editing!='{activeCard === 3}')
        +if('showNextButton')
          .button-row
            .next-button(on:click!='{onNextClicked}') Next
      .graph-container
        +if('$graphBox')
          CheckGraphBox(viewModel!='{$graphBox}')

</template>




<!-- STYLE -->
<style lang='sass'>

.playground-container
  display: flex
  flex-direction: column
  flex: 1

.scroll-container
  display: flex
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px
  flex-direction: column
  padding: 0 1rem
  overflow: auto

.wizard-container
  display: flex
  flex-direction: row

.card-container
  display: flex
  flex-direction: column
  width: 54rem

.spacer-fixed
  flex: 0 0 1rem

.card
  display: flex
  padding: 1.5rem
  background-color: #eee
  color: #000
  border-radius: 1rem
  cursor: pointer

.card.editing
  cursor: default

.button-row
  display: flex
  justify-content: flex-end

.next-button
  border-radius: .5rem
  margin-top: 1.5rem
  margin-bottom: 1rem
  padding: .625rem 2rem
  background-color: #007700
  color: #fff
  cursor: pointer
  user-select: none

.next-button:hover
  background-color: #008800

.graph-container
  display: flex
  flex-direction: column
  width: 42rem
  margin-left: 1rem
  padding-top: 2rem
  align-items: center

</style>
