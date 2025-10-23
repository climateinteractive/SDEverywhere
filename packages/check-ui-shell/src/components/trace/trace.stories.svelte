<!-- Copyright (c) 2025 Climate Interactive / New Venture Fund -->

<script module lang="ts">
import { defineMeta, type Args } from '@storybook/addon-svelte-csf'
import { expect, waitFor } from 'storybook/test'

import type { BundleModel, Config, ImplVar, ImplVarGroup, ModelSpec, SuiteReport } from '@sdeverywhere/check-core'
import { ComparisonDataCoordinator, createConfig, runSuite } from '@sdeverywhere/check-core'

import { mockBundleModel, mockNamedBundle } from '../../_mocks/mock-bundle'
import { mockConfigOptions } from '../../_mocks/mock-config'
import { mockDataset } from '../../_mocks/mock-data'
import { implVar, inputVar, outputVar } from '../../_mocks/mock-vars'

import StoryDecorator from '../_storybook/story-decorator.svelte'

import { createTraceViewModel } from './trace-vm'
import Trace from './trace.svelte'

const { Story } = defineMeta({
  title: 'Components/Trace',
  component: Trace
})

const varsPerGroup = 100

function mockModelSpec(): ModelSpec {
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

async function runComparisons(config: Config): Promise<SuiteReport> {
  return await new Promise((resolve, reject) => {
    runSuite(config, {
      onComplete: report => resolve(report),
      onError: error => reject(error)
    })
  })
}

async function createTraceViewModelForStory(deltaR = 0) {
  const modelSpec = mockModelSpec()
  const bundleL = mockNamedBundle('left', createBundleModel(modelSpec, 0))
  const bundleR = mockNamedBundle('right', createBundleModel(modelSpec, deltaR))

  const configOptions = mockConfigOptions(bundleL, bundleR, { comparisonsEnabled: true })
  const config = await createConfig(configOptions)
  const comparisonConfig = config.comparison
  const dataCoordinator = new ComparisonDataCoordinator(comparisonConfig.bundleL.model, comparisonConfig.bundleR.model)

  // XXX: Run the comparisons to get the terse summaries
  const suiteReport = await runComparisons(config)
  const terseSummaries = suiteReport.comparisonReport?.testReports.map(report => ({
    s: report.scenarioKey,
    d: report.datasetKey,
    md: report.diffReport.maxDiff
  }))

  return createTraceViewModel(comparisonConfig, dataCoordinator, terseSummaries, undefined, undefined)
}
</script>

{#snippet template(args: Args<typeof Story>)}
  <StoryDecorator width={1200} height={600}>
    <Trace {...args} />
  </StoryDecorator>
{/snippet}

<Story
  name="Models Without Differences"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where the models produce identical data
    args.viewModel = await createTraceViewModelForStory(0)
  }}
/>

<Story
  name="Models With Differences"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where even-numbered variables have different values
    args.viewModel = await createTraceViewModelForStory(5)
  }}
/>

<Story
  name="DAT and Model With Differences"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where the models produce identical data (but we will
    // compare to a DAT file with different data)
    args.viewModel = await createTraceViewModelForStory(0)
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for the component to render
    await waitFor(() => {
      const sourceSelector = canvasElement.querySelector('select[aria-label="Source 1"]')
      expect(sourceSelector).not.toBeNull()
    })

    // Select the "DAT file" option from Source 1 selector
    const source1Selector = canvas.getByLabelText('Source 1')
    await userEvent.selectOptions(source1Selector, 'dat')

    // Create a mock .dat file with fake content (all values set to 20)
    let datContent = ''
    function addDataForVar(varName: string) {
      datContent += `${varName}\n`
      for (let i = 2000; i <= 2100; i++) {
        datContent += `${i}\t20\n`
      }
    }
    function addDataForVarsInGroup(varKind: string) {
      for (let i = 0; i < varsPerGroup; i++) {
        addDataForVar(`${varKind} ${i + 1}`)
      }
    }
    addDataForVarsInGroup('Constant')
    addDataForVarsInGroup('Level')
    addDataForVarsInGroup('Output')
    const mockFile = new File([datContent], 'test-data.dat', {
      type: 'text/plain'
    })

    // Find the file input element
    const fileInput = canvasElement.querySelector('#trace-dat-file') as HTMLInputElement

    // XXX: Simulate selecting a local file by creating a FileList and triggering events.
    // This works around the issue where HTMLInputElement.files is read-only, which
    // prevents `userEvent.upload` from working.
    const fileList = {
      0: mockFile,
      length: 1,
      item: (index: number) => (index === 0 ? mockFile : null),
      [Symbol.iterator]: function* () {
        yield mockFile
      }
    } as FileList

    // Override the `files` property temporarily
    Object.defineProperty(fileInput, 'files', {
      value: fileList,
      writable: true,
      configurable: true
    })

    // Trigger the change event to simulate file selection.  This will cause the Svelte
    // reactive statement to run and process the file.
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))

    // Wait for the file to be processed
    await waitFor(() => {
      const statusMessage = canvasElement.querySelector('.trace-tooltip')
      expect(statusMessage).not.toBeNull()
    })

    // Verify that the tooltip is shown for "Constant 1"
    const tooltip = canvasElement.querySelector('.trace-tooltip')
    await expect(tooltip).not.toBeNull()
    await expect(tooltip.querySelector('.tooltip-title')).toHaveTextContent('Constant 1')
    const dataRows = tooltip.querySelectorAll('.data-point')
    await expect(dataRows.length).toBe(3)
    await expect(dataRows[0]).toHaveTextContent('Time: 2000')
    await expect(dataRows[1]).toHaveTextContent('Value 1: 20.000000')
    await expect(dataRows[2]).toHaveTextContent('Value 2: 10.000000')
  }}
/>

<Story
  name="Keyboard Navigation"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where even-numbered variables have different values
    args.viewModel = await createTraceViewModelForStory(5)
  }}
  play={async ({ canvas, canvasElement, userEvent }) => {
    // Wait for trace points to appear (this indicates the component has finished loading)
    await waitFor(() => {
      const tracePoints = canvasElement.querySelectorAll('.trace-point')
      expect(tracePoints.length).toBeGreaterThan(0)
    })

    // Find the trace container by looking for the div with tabindex="0"
    const genericElements = canvas.getAllByRole('generic')
    const traceContainer = genericElements.find(el => el.getAttribute('tabindex') === '0')
    if (!traceContainer) {
      throw new Error('Trace container not found')
    }

    // Focus the container to enable keyboard events
    await userEvent.click(traceContainer)

    // Find all trace points using canvasElement (manual query since squares don't have semantic text)
    const tracePoints = canvasElement.querySelectorAll('.trace-point')
    if (tracePoints.length === 0) {
      throw new Error('No trace points found')
    }

    // Find the initially selected point
    const initiallySelected = canvasElement.querySelector('.trace-point.selected')
    if (!initiallySelected) {
      throw new Error('No initially selected point found')
    }

    // Test ArrowRight navigation - should move to next red square
    await userEvent.keyboard('{ArrowRight}')

    // Verify the selection moved
    await expect(initiallySelected).not.toHaveClass('selected')
    const nextSelected = canvasElement.querySelector('.trace-point.selected')
    await expect(nextSelected).toBeTruthy()
    await expect(nextSelected).not.toBe(initiallySelected)

    // Test ArrowLeft navigation - should move back to previous red square
    await userEvent.keyboard('{ArrowLeft}')

    // Verify we're back to the original selection
    await expect(initiallySelected).toHaveClass('selected')
    await expect(nextSelected).not.toHaveClass('selected')

    // Test Home key - should go to first red square
    await userEvent.keyboard('{Home}')

    // Find the first red square (should be selected)
    const firstRedSquare = canvasElement.querySelector('.trace-point[style*="crimson"]')
    if (firstRedSquare) {
      await expect(firstRedSquare).toHaveClass('selected')
    }

    // Test End key - should go to last red square
    await userEvent.keyboard('{End}')

    // XXX: Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 20))

    // Find the last red square (should be selected)
    const redSquares = canvasElement.querySelectorAll('.trace-point[style*="crimson"]')
    if (redSquares.length > 0) {
      const lastRedSquare = redSquares[redSquares.length - 1]
      await expect(lastRedSquare).toHaveClass('selected')
    }

    // Go back to first red square
    await userEvent.keyboard('{Home}')

    // Test 'n' key - should go to next output variable with differences
    await userEvent.keyboard('n')

    // XXX: Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 20))

    const selectedAfterN = canvasElement.querySelector('.trace-point.selected') as HTMLElement | null
    await expect(selectedAfterN).not.toBeNull()

    // Verify the selected square is red (crimson) and belongs to an Output row
    const styleAttr = selectedAfterN?.getAttribute('style') || ''
    await expect(styleAttr.includes('crimson')).toBe(true)
    const parentRow = selectedAfterN?.closest('.trace-row') as HTMLElement | null
    await expect(parentRow).not.toBeNull()
    const varName = parentRow?.getAttribute('data-var-name') || ''
    await expect(varName.startsWith('Output ')).toBe(true)
  }}
/>

<Story
  name="Mouse Selection"
  {template}
  beforeEach={async ({ args }) => {
    // Create a view model where even-numbered variables have different values
    args.viewModel = await createTraceViewModelForStory(5)
  }}
  play={async ({ canvasElement, userEvent }) => {
    // Wait for trace points to render
    await waitFor(() => {
      const tracePoints = canvasElement.querySelectorAll('.trace-point')
      expect(tracePoints.length).toBeGreaterThan(0)
    })

    // Choose a crimson (diff) square to click; fall back to any square if none
    const crimsonSquares = canvasElement.querySelectorAll('.trace-point[style*="crimson"]')
    const target = crimsonSquares[0] ?? canvasElement.querySelector('.trace-point')
    if (!target) {
      throw new Error('No trace point found to click')
    }

    // Click the target
    await userEvent.click(target as Element)

    // Verify it is selected
    await expect(target).toHaveClass('selected')
  }}
/>
