<!-- Copyright (c) 2021-2022 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import { slide } from 'svelte/transition'
import Icon from 'svelte-awesome/components/Icon.svelte'
import { faLightbulb } from '@fortawesome/free-regular-svg-icons'

import type { WizardCardDescViewModel } from './wizard-card-desc-vm'

export let viewModel: WizardCardDescViewModel
export let editing: boolean

const subject = viewModel.subject
const expectation = viewModel.expectation
</script>

<!-- TEMPLATE -->
<div class="content">
  {#if editing}
    <div class="editor" transition:slide>
      <div class="question">
        <div class="icon-wrapper">
          <Icon class="icon" data={faLightbulb} />
        </div>
        What part of the model are we checking? And what is the expected behavior?
      </div>
      <div class="answer">
        <input class="desc" placeholder="Part of the model" bind:value={$subject} />
        <div class="should">should</div>
        <input class="test" placeholder="have some expected behavior" bind:value={$expectation} />
      </div>
      <div class="examples">
        <div class="header">Examples:</div>
        <ul>
          <li>
            <span class="subject">Temperature increase</span>
            <span class="should">should</span>
            <span class="expect">never exceed 8.5 degC</span>
          </li>
          <li>
            <span class="subject">Population</span>
            <span class="should">should</span>
            <span class="expect">increase monotonically after 2030</span>
          </li>
          <li>
            <span class="subject">GHG emissions</span>
            <span class="should">should</span>
            <span class="expect">match historical data between 1990 and 2020</span>
          </li>
        </ul>
      </div>
    </div>
  {/if}
  {#if !editing}
    <div class="summary" transition:slide>
      <div class="icon-wrapper">
        <Icon class="icon" data={faLightbulb} />
      </div>
      <span class="subject">{$subject}</span>
      <span class="should">should</span>
      <span class="expect">{$expectation}</span>
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
  flex-direction: row;
  align-items: baseline;
  margin-top: 1rem;
  margin-left: 3.5rem;
}

input {
  outline: none;
  border: 1px solid #aaa;
  border-radius: 0.2rem;
  padding: 0.2rem 0.3rem;

  &:focus {
    border-color: blue;
  }
}

.desc {
  width: 11rem;
}

.test {
  width: 25rem;
}

.examples {
  margin-left: 2.3rem;
  opacity: 0.6;
}

.header {
  margin-top: 1rem;
  margin-bottom: 0;
}

ul {
  margin: 0;
  padding-left: 2.5rem;
}

li {
  margin: 0.3rem 0;
}

.subject,
.expect {
  border-radius: 0.4rem;
  padding: 0.08rem 0.2rem;
}

.subject {
  background-color: #ddddff;
  // color: #0000ff;
}

.expect {
  background-color: #ccddcc;
  // color: #00aa00;
}

.should {
  margin: 0 0.25rem;
}

.summary {
  display: flex;
  align-items: center;
}
</style>
