<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, waitFor } from 'storybook/test'

import type { ModelSpec, ImplVarGroup, ImplVar, BundleModel } from '@sdeverywhere/check-core'
import { mockBundleModel, mockNamedBundle } from './_mocks/mock-bundle'
import { mockConfigOptions } from './_mocks/mock-config'
import { mockDataset } from './_mocks/mock-data'
import { inputVar, outputVar, implVar } from './_mocks/mock-vars'

import StoryDecorator from './components/_storybook/story-decorator.svelte'

import { initAppModel } from './model/app-model'

import { AppViewModel } from './app-vm'
import AppShell from './app-shell.svelte'

const { Story } = defineMeta({
  title: 'Components/AppShell',
  component: AppShell
})

function mockModelSpec(): ModelSpec {
  const varsPerGroup = 10

  const inputVarNames = Array.from({ length: varsPerGroup }, (_, i) => `Constant ${i + 1}`)
  const inputVars = new Map(inputVarNames.map((varName, i) => inputVar(`${i + 1}`, varName)))

  const outputVarNames = Array.from({ length: varsPerGroup }, (_, i) => `Output ${i + 1}`)
  const outputVars = new Map(outputVarNames.map(varName => outputVar(varName)))

  const constants = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Constant ${i + 1}`, 'const'))
  const levelVars = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Level ${i + 1}`, 'level'))
  const auxVars = Array.from({ length: varsPerGroup }, (_, i) => implVar(`Output ${i + 1}`, 'aux'))
  const implVars = new Map([...constants, ...levelVars, ...auxVars])

  const implVarGroups: ImplVarGroup[] = []
  function addGroup(fn: string, vars: [string, ImplVar][]) {
    implVarGroups.push({
      title: fn,
      fn,
      datasetKeys: vars.map(([key]) => key)
    })
  }
  addGroup('initConstants', constants)
  addGroup('initLevels', levelVars)
  addGroup('evalLevels', levelVars)
  addGroup('evalAux', auxVars)

  return {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars,
    outputVars,
    implVars,
    implVarGroups,
    startTime: 2000,
    endTime: 2100
  }
}

function createBundleModel(modelSpec: ModelSpec, delta = 0): BundleModel {
  return mockBundleModel(modelSpec, (_, datasetKeys) => {
    const datasetMap = new Map()
    for (const datasetKey of datasetKeys) {
      // Apply delta only for every even-numbered variable, otherwise use 0
      const match = datasetKey.match(/_(\d+)$/)
      const variableNumber = match ? parseInt(match[1], 10) : 0
      const effectiveDelta = variableNumber % 2 === 0 ? delta : 0
      datasetMap.set(datasetKey, mockDataset(effectiveDelta))
    }
    return datasetMap
  })
}

async function createAppViewModel(): Promise<AppViewModel> {
  const modelSpec = mockModelSpec()
  const bundleL = mockNamedBundle('left', createBundleModel(modelSpec, 0))
  const bundleR = mockNamedBundle('right', createBundleModel(modelSpec, 0))
  const configOptions = mockConfigOptions(bundleL, bundleR)
  const appModel = await initAppModel(configOptions)
  return new AppViewModel(appModel)
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={1200} height={600}>
    <AppShell {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Default"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel()
  }}
/>

<Story
  name="Open Check Scenario in Trace View"
  {template}
  beforeEach={async ({ args }) => {
    args.appViewModel = await createAppViewModel()
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the check tests to appear
    await waitFor(() => {
      const testRows = canvasElement.querySelectorAll('.row.test')
      expect(testRows.length).toBeGreaterThan(0)
    })

    // Click the first test row
    const firstTestRow = canvas.getByText('should be positive')
    await userEvent.click(firstTestRow)

    // Right click the first scenario row
    const firstScenarioRow = canvas.getByText('Constant 1')
    await userEvent.pointer({ keys: '[MouseRight]', target: firstScenarioRow })

    // Click the "Open Scenario in Trace View" button in the context menu
    const openScenarioItem = canvas.getByRole('menuitem', { name: 'Open Scenario in Trace View' })
    await userEvent.click(openScenarioItem)

    // Verify that the trace view is shown
    const traceView = canvasElement.querySelector('.trace-container')
    await expect(traceView).toBeDefined()

    // Verify that the first source option is "left"
    const source1Select = canvas.getByLabelText('Source 1')
    await expect(source1Select).toHaveTextContent('left')

    // Verify that the first scenario option is "All inputs at default"
    const scenario1Select = canvas.getByLabelText('Scenario 1')
    await expect(scenario1Select).toHaveTextContent('All inputs at default')

    // Verify that the second source option is "right"
    const source2Select = canvas.getByLabelText('Source 2')
    await expect(source2Select).toHaveTextContent('right')

    // Verify that the second scenario option is "Selected scenario from check test"
    const scenario2Select = canvas.getByLabelText('Scenario 2')
    await expect(scenario2Select).toHaveTextContent('Selected scenario from check test')
  }}
/>
