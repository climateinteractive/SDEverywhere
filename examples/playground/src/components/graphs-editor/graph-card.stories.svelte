<!-- Copyright (c) 2026 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, fn, userEvent } from 'storybook/test'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import GraphCard from './graph-card.svelte'
import type { GraphConfig } from './graphs-editor-vm.svelte'

const emptyGraph: GraphConfig = {
  id: 'graph-1',
  title: 'Empty Graph',
  variables: []
}

const singleVarGraph: GraphConfig = {
  id: 'graph-2',
  title: 'Population Over Time',
  variables: [
    {
      id: 'var-1',
      varId: '_population',
      label: 'Population',
      color: '#4fc3f7',
      style: 'solid'
    }
  ]
}

const multiVarGraph: GraphConfig = {
  id: 'graph-3',
  title: 'Demographics',
  variables: [
    {
      id: 'var-1',
      varId: '_population',
      label: 'Population',
      color: '#4fc3f7',
      style: 'solid'
    },
    {
      id: 'var-2',
      varId: '_births',
      label: 'Births',
      color: '#81c784',
      style: 'dashed'
    },
    {
      id: 'var-3',
      varId: '_deaths',
      label: 'Deaths',
      color: '#f06292',
      style: 'solid'
    }
  ]
}

const graphWithInvalidVar: GraphConfig = {
  id: 'graph-4',
  title: 'Graph With Missing Variable',
  variables: [
    {
      id: 'var-1',
      varId: '_population',
      label: 'Population',
      color: '#4fc3f7',
      style: 'solid'
    },
    {
      id: 'var-2',
      varId: '_missing_var',
      label: 'Missing',
      color: '#ff0000',
      style: 'solid'
    }
  ]
}

/**
 * Generate mock graph data points.
 *
 * @param varId The variable ID.
 * @returns Array of data points.
 */
function getMockGraphData(varId: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  for (let x = 0; x <= 100; x += 10) {
    let y: number
    switch (varId) {
      case '_population':
        y = 1000 + x * 10 + Math.sin(x / 10) * 50
        break
      case '_births':
        y = 50 + Math.sin(x / 15) * 20
        break
      case '_deaths':
        y = 30 + Math.cos(x / 12) * 15
        break
      default:
        y = x
    }
    points.push({ x, y })
  }
  return points
}

/**
 * Check if a variable is valid.
 *
 * @param varId The variable ID.
 * @returns True if valid.
 */
function isVarValidMock(varId: string): boolean {
  return !varId.includes('missing')
}

const { Story } = defineMeta({
  title: 'Components/GraphCard',
  component: GraphCard
})
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={450} height={500}>
    <div style="width: 100%; padding: 8px;">
      <GraphCard
        config={args.config}
        getGraphData={args.getGraphData}
        isDropTarget={args.isDropTarget}
        hasErrors={args.hasErrors}
        isVarValid={args.isVarValid}
        onTitleChange={args.onTitleChange}
        onVariableUpdate={args.onVariableUpdate}
        onVariableRemove={args.onVariableRemove}
        onVariablesReorder={args.onVariablesReorder}
        onRemove={args.onRemove}
        onDragOver={args.onDragOver}
        onDrop={args.onDrop}
      />
    </div>
  </StoryDecorator>
{/snippet}

<Story
  name="Empty Graph"
  {template}
  args={{
    config: emptyGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas }) => {
    // Verify title input is present
    const titleInput = canvas.getByPlaceholderText('Graph title')
    await expect(titleInput).toBeInTheDocument()
    await expect(titleInput).toHaveValue('Empty Graph')

    // Verify "no data" message is displayed
    const noData = canvas.getByText('No valid variables to display')
    await expect(noData).toBeInTheDocument()

    // Verify remove button is present
    const removeButton = canvas.getByTitle('Remove graph')
    await expect(removeButton).toBeInTheDocument()
  }}
/>

<Story
  name="Single Variable"
  {template}
  args={{
    config: singleVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas }) => {
    // Verify title is displayed
    const titleInput = canvas.getByDisplayValue('Population Over Time')
    await expect(titleInput).toBeInTheDocument()

    // Verify legend is displayed
    const legend = canvas.getByText('Population')
    await expect(legend).toBeInTheDocument()

    // Verify variable table row exists
    const varName = canvas.getByText('_population')
    await expect(varName).toBeInTheDocument()
  }}
/>

<Story
  name="Multiple Variables"
  {template}
  args={{
    config: multiVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas }) => {
    // Verify all legend items are displayed
    const populationLegend = canvas.getByText('Population')
    await expect(populationLegend).toBeInTheDocument()

    const birthsLegend = canvas.getByText('Births')
    await expect(birthsLegend).toBeInTheDocument()

    const deathsLegend = canvas.getByText('Deaths')
    await expect(deathsLegend).toBeInTheDocument()

    // Verify all variables are in the table
    const popVar = canvas.getByText('_population')
    await expect(popVar).toBeInTheDocument()

    const birthsVar = canvas.getByText('_births')
    await expect(birthsVar).toBeInTheDocument()

    const deathsVar = canvas.getByText('_deaths')
    await expect(deathsVar).toBeInTheDocument()
  }}
/>

<Story
  name="Drop Target State"
  {template}
  args={{
    config: singleVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: true,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas }) => {
    // Verify the card has drop target styling (blue border)
    // This is a visual test - the card should have a blue border
    const titleInput = canvas.getByDisplayValue('Population Over Time')
    await expect(titleInput).toBeInTheDocument()
  }}
/>

<Story
  name="With Invalid Variable"
  {template}
  args={{
    config: graphWithInvalidVar,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: true,
    isVarValid: isVarValidMock,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas }) => {
    // Verify error badge is visible in header
    const errorBadges = canvas.getAllByText('⚠')
    await expect(errorBadges.length).toBeGreaterThanOrEqual(1)

    // Verify missing variable is shown in table
    const missingVar = canvas.getByText('_missing_var')
    await expect(missingVar).toBeInTheDocument()
  }}
/>

<Story
  name="Title Editing"
  {template}
  args={{
    config: singleVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas, args }) => {
    // Find the title input
    const titleInput = canvas.getByDisplayValue('Population Over Time')

    // Clear and type new title
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'New Graph Title')

    // Verify onTitleChange was called
    await expect(args.onTitleChange).toHaveBeenCalled()
  }}
/>

<Story
  name="Remove Graph"
  {template}
  args={{
    config: singleVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas, args }) => {
    // Click the remove button
    const removeButton = canvas.getByTitle('Remove graph')
    await userEvent.click(removeButton)

    // Verify onRemove was called
    await expect(args.onRemove).toHaveBeenCalledTimes(1)
  }}
/>

<Story
  name="Remove Variable"
  {template}
  args={{
    config: multiVarGraph,
    getGraphData: getMockGraphData,
    isDropTarget: false,
    hasErrors: false,
    isVarValid: () => true,
    onTitleChange: fn(),
    onVariableUpdate: fn(),
    onVariableRemove: fn(),
    onVariablesReorder: fn(),
    onRemove: fn(),
    onDragOver: fn(),
    onDrop: fn()
  }}
  play={async ({ canvas, args }) => {
    // Find and click a variable remove button
    const removeButtons = canvas.getAllByTitle('Remove variable')
    await expect(removeButtons.length).toBe(3)

    await userEvent.click(removeButtons[0])

    // Verify onVariableRemove was called
    await expect(args.onVariableRemove).toHaveBeenCalledTimes(1)
  }}
/>
