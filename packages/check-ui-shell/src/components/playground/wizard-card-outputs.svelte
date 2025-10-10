<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'

import SearchList from './search-list.svelte'
import SelList from './sel-list.svelte'
import type { WizardCardOutputsViewModel } from './wizard-card-outputs-vm'

export let viewModel: WizardCardOutputsViewModel
export let editing: boolean

type Option = 'all_outputs' | 'all_in_group' | 'specify'
let selectedOption: Option = 'all_outputs'
</script>

<!-- TEMPLATE -->
<div class="content">
  {#if editing}
    <div class="editor" transition:slide>
      <div class="question">
        <div class="icon-wrapper">
          <Icon class="icon" data={faArrowRightFromBracket} />
        </div>
        What variables should we check?
      </div>
      <div class="answer">
        <div class="row">
          <label for="all_outputs">
            <input type="radio" id="all_outputs" name="all_outputs" bind:group={selectedOption} value="all_outputs" />
            Check all output variables
          </label>
        </div>
        <div class="row">
          <label for="in_group">
            <input
              type="radio"
              id="all_in_group"
              name="all_in_group"
              bind:group={selectedOption}
              value="all_in_group"
            />
            Check all variables in a predefined group
          </label>
        </div>
        <div class="row">
          <label for="selected">
            <input type="radio" id="specify" name="specify" bind:group={selectedOption} value="specify" />
            Check the following variables...
            {#if selectedOption === 'specify'}
              <div class="row-content">
                <div class="available-items-container">
                  <SearchList viewModel={viewModel.availableOutputs} />
                </div>
                <div class="selected-items-container">
                  <SelList viewModel={viewModel.selectedOutputs} />
                </div>
              </div>
            {/if}
          </label>
        </div>
      </div>
    </div>
  {/if}
  {#if !editing}
    <div class="summary" transition:slide>
      <div class="icon-wrapper">
        <Icon class="icon" data={faArrowRightFromBracket} />
      </div>
      <span>Check&nbsp;</span>
      <span class="varname">Temperature change from 1850</span>
      <span>&nbsp;and 3 others</span>
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
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: 1rem;
  margin-left: 3rem;
}

.row {
  display: flex;
  flex-direction: column;
  flex: 1;
}

input[type='radio'] {
  margin-right: 0.4rem;
}

.row-content {
  display: flex;
  flex-direction: row;
}

.available-items-container {
  display: flex;
  flex-direction: column;
  width: 20rem;
  margin-top: 0.4rem;
  margin-left: 2rem;
}

.selected-items-container {
  display: flex;
  flex-direction: column;
  width: 20rem;
  margin-top: 0.4rem;
  margin-left: 2rem;
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
