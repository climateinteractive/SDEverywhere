<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import GraphsEditor from './graphs-editor.svelte'
import type { GeneratedModelInfo, VarInfo } from '../../app-vm.svelte'

const outputVars: VarInfo[] = [
  { refId: '_population', varName: 'Population', references: [], hasInitValue: true, varType: 'level', modelLHS: 'Population', modelFormula: 'INTEG(Births - Deaths, 1000)' },
  { refId: '_births', varName: 'Births', references: ['_population'], hasInitValue: false, varType: 'aux', modelLHS: 'Births', modelFormula: 'Population * Birth Rate' },
  { refId: '_deaths', varName: 'Deaths', references: ['_population'], hasInitValue: false, varType: 'aux', modelLHS: 'Deaths', modelFormula: 'Population * Death Rate' },
  { refId: '_gdp', varName: 'GDP', references: [], hasInitValue: false, varType: 'aux', modelLHS: 'GDP', modelFormula: 'Population * GDP per capita' },
  { refId: '_emissions', varName: 'Emissions', references: [], hasInitValue: false, varType: 'aux', modelLHS: 'Emissions', modelFormula: 'GDP * Emission Factor' }
]

const inputVars: VarInfo[] = [
  { refId: '_birth_rate', varName: 'Birth Rate', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Birth Rate', modelFormula: '0.03' },
  { refId: '_death_rate', varName: 'Death Rate', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Death Rate', modelFormula: '0.02' },
  { refId: '_initial_population', varName: 'Initial Population', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Initial Population', modelFormula: '1000' },
  { refId: '_growth_factor', varName: 'Growth Factor', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Growth Factor', modelFormula: '1.05' }
]

const mockModelInfo: GeneratedModelInfo = {
  outputVars,
  inputVars,
  jsCode: '// Generated JavaScript code'
}

const { Story } = defineMeta({
  title: 'Components/GraphsEditor',
  component: GraphsEditor
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={800} height={600}>
    <GraphsEditor
      modelInfo={args.modelInfo}
      runner={args.runner}
      outputs={args.outputs}
    />
  </StoryDecorator>
{/snippet}

<Story
  name="Empty State"
  {template}
  args={{
    modelInfo: mockModelInfo,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify output variables sidebar is visible
    const outputHeader = canvas.getByText('Output Variables')
    await expect(outputHeader).toBeInTheDocument()

    // Verify input variables sidebar is visible
    const inputHeader = canvas.getByText('Input Variables')
    await expect(inputHeader).toBeInTheDocument()

    // Verify placeholder messages are visible
    const graphPlaceholder = canvas.getByText('Drag output variables here to create graphs')
    await expect(graphPlaceholder).toBeInTheDocument()

    const sliderPlaceholder = canvas.getByText('Drag input variables here to create sliders')
    await expect(sliderPlaceholder).toBeInTheDocument()
  }}
/>

<Story
  name="With Variables"
  {template}
  args={{
    modelInfo: mockModelInfo,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify output variables are listed
    const population = canvas.getByText('population')
    await expect(population).toBeInTheDocument()

    const births = canvas.getByText('births')
    await expect(births).toBeInTheDocument()

    // Verify input variables are listed
    const birthRate = canvas.getByText('birth rate')
    await expect(birthRate).toBeInTheDocument()

    const deathRate = canvas.getByText('death rate')
    await expect(deathRate).toBeInTheDocument()
  }}
/>

<Story
  name="Sidebar Variable Types"
  {template}
  args={{
    modelInfo: mockModelInfo,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify level badge exists for Population
    const levelBadges = canvas.getAllByText('L')
    await expect(levelBadges.length).toBeGreaterThanOrEqual(1)

    // Verify aux badges exist
    const auxBadges = canvas.getAllByText('A')
    await expect(auxBadges.length).toBeGreaterThanOrEqual(1)

    // Verify const badges exist for input variables
    const constBadges = canvas.getAllByText('C')
    await expect(constBadges.length).toBeGreaterThanOrEqual(1)
  }}
/>

<Story
  name="No Model Info"
  {template}
  args={{
    modelInfo: undefined,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify empty variable lists
    const noVarsMessages = canvas.getAllByText('No variables')
    await expect(noVarsMessages.length).toBe(2)
  }}
/>

<Story
  name="Draggable Variables"
  {template}
  args={{
    modelInfo: mockModelInfo,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify output variables are draggable
    const outputItems = canvas.getAllByRole('listitem')

    // Check that items have draggable attribute
    for (const item of outputItems) {
      await expect(item).toHaveAttribute('draggable', 'true')
    }
  }}
/>

<Story
  name="Drop Zones"
  {template}
  args={{
    modelInfo: mockModelInfo,
    runner: undefined,
    outputs: undefined
  }}
  play={async ({ canvas }) => {
    // Verify drop zones are present
    const graphDropZone = canvas.getByLabelText('Graphs drop zone')
    await expect(graphDropZone).toBeInTheDocument()

    const sliderDropZone = canvas.getByLabelText('Sliders drop zone')
    await expect(sliderDropZone).toBeInTheDocument()
  }}
/>
