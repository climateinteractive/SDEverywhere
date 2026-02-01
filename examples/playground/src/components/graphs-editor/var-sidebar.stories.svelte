<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fn } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import VarSidebar from './var-sidebar.svelte'
import type { VarInfo } from '../../app-vm.svelte'

const outputVariables: VarInfo[] = [
  { refId: '_population', varName: 'Population', references: [], hasInitValue: true, varType: 'level', modelLHS: 'Population', modelFormula: 'INTEG(Births - Deaths, 1000)' },
  { refId: '_births', varName: 'Births', references: ['_population'], hasInitValue: false, varType: 'aux', modelLHS: 'Births', modelFormula: 'Population * Birth Rate' },
  { refId: '_deaths', varName: 'Deaths', references: ['_population'], hasInitValue: false, varType: 'aux', modelLHS: 'Deaths', modelFormula: 'Population * Death Rate' },
  { refId: '_gdp_per_capita', varName: 'GDP per capita', references: [], hasInitValue: false, varType: 'aux', modelLHS: 'GDP per capita', modelFormula: 'GDP / Population' }
]

const inputVariables: VarInfo[] = [
  { refId: '_birth_rate', varName: 'Birth Rate', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Birth Rate', modelFormula: '0.03' },
  { refId: '_death_rate', varName: 'Death Rate', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Death Rate', modelFormula: '0.02' },
  { refId: '_initial_population', varName: 'Initial Population', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Initial Population', modelFormula: '1000' }
]

const mixedVariables: VarInfo[] = [
  { refId: '_stock_level', varName: 'Stock Level', references: [], hasInitValue: true, varType: 'level', modelLHS: 'Stock Level', modelFormula: 'INTEG(Flow Rate, 100)' },
  { refId: '_flow_rate', varName: 'Flow Rate', references: [], hasInitValue: false, varType: 'aux', modelLHS: 'Flow Rate', modelFormula: '10' },
  { refId: '_constant_value', varName: 'Constant Value', references: [], hasInitValue: false, varType: 'const', modelLHS: 'Constant Value', modelFormula: '42' },
  { refId: '_data_series', varName: 'Data Series', references: [], hasInitValue: false, varType: 'data', modelLHS: 'Data Series', modelFormula: 'GET XLS DATA(...)' }
]

const { Story } = defineMeta({
  title: 'Components/VarSidebar',
  component: VarSidebar
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={200} height={400}>
    <VarSidebar
      title={args.title}
      variables={args.variables}
      onDragStart={args.onDragStart}
      onDragEnd={args.onDragEnd}
    />
  </StoryDecorator>
{/snippet}

<Story
  name="Output Variables"
  {template}
  args={{
    title: 'Output Variables',
    variables: outputVariables,
    onDragStart: fn(),
    onDragEnd: fn()
  }}
  play={async ({ canvas }) => {
    // Verify header is visible
    const header = canvas.getByText('Output Variables')
    await expect(header).toBeInTheDocument()

    // Verify variables are visible
    const population = canvas.getByText('population')
    await expect(population).toBeInTheDocument()

    const births = canvas.getByText('births')
    await expect(births).toBeInTheDocument()

    // Verify type badges are visible
    const levelBadges = canvas.getAllByText('L')
    await expect(levelBadges.length).toBe(1)

    const auxBadges = canvas.getAllByText('A')
    await expect(auxBadges.length).toBe(3)
  }}
/>

<Story
  name="Input Variables"
  {template}
  args={{
    title: 'Input Variables',
    variables: inputVariables,
    onDragStart: fn(),
    onDragEnd: fn()
  }}
  play={async ({ canvas }) => {
    // Verify header is visible
    const header = canvas.getByText('Input Variables')
    await expect(header).toBeInTheDocument()

    // Verify all constant badges are visible
    const constBadges = canvas.getAllByText('C')
    await expect(constBadges.length).toBe(3)
  }}
/>

<Story
  name="Empty List"
  {template}
  args={{
    title: 'Variables',
    variables: [],
    onDragStart: fn(),
    onDragEnd: fn()
  }}
  play={async ({ canvas }) => {
    // Verify empty message is visible
    const emptyMessage = canvas.getByText('No variables')
    await expect(emptyMessage).toBeInTheDocument()
  }}
/>

<Story
  name="Mixed Variable Types"
  {template}
  args={{
    title: 'All Variables',
    variables: mixedVariables,
    onDragStart: fn(),
    onDragEnd: fn()
  }}
  play={async ({ canvas }) => {
    // Verify all type badges are visible
    const levelBadge = canvas.getByText('L')
    await expect(levelBadge).toBeInTheDocument()

    const auxBadge = canvas.getByText('A')
    await expect(auxBadge).toBeInTheDocument()

    const constBadge = canvas.getByText('C')
    await expect(constBadge).toBeInTheDocument()

    const dataBadge = canvas.getByText('D')
    await expect(dataBadge).toBeInTheDocument()
  }}
/>

<Story
  name="Draggable Items"
  {template}
  args={{
    title: 'Output Variables',
    variables: outputVariables,
    onDragStart: fn(),
    onDragEnd: fn()
  }}
  play={async ({ canvas }) => {
    // Verify items have draggable attribute
    const items = canvas.getAllByRole('listitem')
    await expect(items.length).toBe(4)

    for (const item of items) {
      await expect(item).toHaveAttribute('draggable', 'true')
    }
  }}
/>
