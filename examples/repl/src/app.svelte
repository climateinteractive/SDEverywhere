<!-- SCRIPT -->
<script lang='ts'>

import './global.css'

import { createCoreRunner } from '@sdeverywhere/runtime'

import type { GraphViewModel } from './components/graph/graph-vm'
import Graph from './components/graph/graph.svelte'

import type { GeneratedModel } from './app-vm'
import {
  createModelCore,
  readInlineModelAndGenerateJS
} from './app-vm'

const initialTime = 2000
const finalTime = 2005
// const numSavePoints = finalTime - initialTime + 1
const mdl = `\
x = TIME ~~|

y = x + 1 ~~|

INITIAL TIME = ${initialTime} ~~|
FINAL TIME = ${finalTime} ~~|
TIME STEP = 1 ~~|
SAVEPER = 1 ~~|
`
let generatedModel: GeneratedModel

let graphKey = 0
let graphViewModel: GraphViewModel

async function onGo() {
  // const outputVarNames = ['x', 'y']
  // generatedModel = readInlineModelAndGenerateJS(mdl, {
  //   inputVarNames: [],
  //   outputVarNames
  // })
  generatedModel = readInlineModelAndGenerateJS(mdl)
  // console.log(code)
  // console.log(generatedModel.outputVars)

  const core = await createModelCore(generatedModel.jsCode)
  console.log(core)

  const runner = createCoreRunner(core)
  let outputs = runner.createOutputs()
  outputs = runner.runModelSync([], outputs)
  console.log(outputs)

  // graphViewModel = {
  //   key: `${graphKey++}`,
  //   points: [
  //     {
  //       x: 2000,
  //       y: 100 + Math.random() * 50,
  //     },
  //     {
  //       x: 2001,
  //       y: 200
  //     },
  //     {
  //       x: 2002,
  //       y: 180
  //     }
  //   ]
  // }

  graphViewModel = {
    key: `${graphKey++}`,
    points: outputs.getSeriesForVar('_y').points
  }
}

</script>




<!-- TEMPLATE -->
<template>

<div class="app-container">
  <div class="column">
    <textarea spellcheck="false">{mdl}</textarea>
    <button on:click={onGo}>Go</button>
  </div>

  <div class="column">
    <textarea disabled>{generatedModel?.jsCode || ''}</textarea>
  </div>

  <div class="column">
    <div class="graph-container">
      {#if graphViewModel}
        <Graph viewModel={graphViewModel} width={400} height={300}/>
      {/if}
    </div>
  </div>
</div>

</template>




<!-- STYLE -->
<style lang='sass'>

.app-container
  display: flex
  flex-direction: row
  gap: 10px

.column
  display: flex
  flex-direction: column
  width: 400px

textarea
  font-family: monospace
  min-height: 600px
  background-color: black
  color: #fff
  border: none
  border-radius: 8px
  padding: 8px

button
  margin-top: 10px

.graph-container
  position: relative
  width: 400px
  height: 300px

</style>
