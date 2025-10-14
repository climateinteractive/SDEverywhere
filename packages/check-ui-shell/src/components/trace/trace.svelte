<!-- Copyright (c) 2024 Climate Interactive / New Venture Fund -->

<!-- SCRIPT -->
<script lang="ts">
import Selector from '../_shared/selector.svelte'

import type { TraceTooltipViewModel } from './trace-tooltip-vm'
import type { TraceViewModel } from './trace-vm'

import Row from './trace-row.svelte'
import TraceTooltip from './trace-tooltip.svelte'

export let viewModel: TraceViewModel
const sourceSelector0 = viewModel.sourceSelector0
const sourceSelector1 = viewModel.sourceSelector1
const selectedSource0 = viewModel.sourceSelector0.selectedValue
const selectedSource1 = viewModel.sourceSelector1.selectedValue
const scenarioSelector0 = viewModel.scenarioSelector0
const scenarioSelector1 = viewModel.scenarioSelector1
const selectedScenarioSpec0 = viewModel.selectedScenarioSpec0
const selectedScenarioSpec1 = viewModel.selectedScenarioSpec1
const selectedDatText = viewModel.datText
const statusMessage = viewModel.statusMessage
const hideRowsWithNoDiffs = viewModel.hideRowsWithNoDiffs
const filteredGroups = viewModel.filteredGroups
const selectedSquareData = viewModel.selectedSquareData

let datText: string
let files: FileList
$: if (files && files[0]) {
  const file = files[0]
  const reader = new FileReader()
  reader.onload = () => {
    datText = reader.result as string
    viewModel.datText.set(datText)
  }
  reader.readAsText(file)
}

// XXX: This is heavy-handed, but the idea is to run immediately any time the options are changed
$: if ($selectedSource0 && ($selectedScenarioSpec0 || $selectedDatText) && $selectedSource1 && $selectedScenarioSpec1) {
  viewModel.run()
}

let tooltipViewModel: TraceTooltipViewModel | undefined = undefined
let tooltipX = 0
let tooltipY = 0

function positionTooltip(referenceX: number, referenceY: number, referenceLeft?: number): void {
  // Position tooltip near the reference point, but ensure it stays on screen.
  // Actual width: 400px width + 12px padding + 1px border = 426px total width
  // Actual height: 300px height + 12px padding + 1px border = 326px total height
  const tooltipWidth = 426
  const tooltipHeight = 326

  // Adjust if tooltip would go off the right edge
  const xMargin = 2
  let x = referenceX + xMargin
  if (x + tooltipWidth > window.innerWidth) {
    if (referenceLeft !== undefined) {
      // For square positioning: right edge of tooltip should be margin pixels from left edge of square
      x = referenceLeft - tooltipWidth - xMargin
    } else {
      // For mouse positioning: position tooltip to the left of the mouse cursor
      x = referenceX - tooltipWidth - xMargin
    }
  }

  // Adjust tooltip position up or down to keep row visible
  const yOffset = 6
  let y = referenceY + yOffset
  if (y + tooltipHeight > window.innerHeight) {
    // Adjust if tooltip would go off the bottom edge
    y = referenceY - tooltipHeight - yOffset
  }

  tooltipX = x
  tooltipY = y
}

function onShowTooltip(event: CustomEvent): void {
  const datasetKey = event.detail.datasetKey
  const varName = event.detail.varName
  const diffPoint = event.detail.diffPoint
  const eventX = event.detail.eventX
  const eventY = event.detail.eventY

  positionTooltip(eventX, eventY)
  tooltipViewModel = viewModel.createTooltipViewModel(datasetKey, varName, diffPoint)
}

function onHideTooltip(): void {
  tooltipViewModel?.clearData()
  tooltipViewModel = undefined
}

function onKeyDown(event: KeyboardEvent): void {
  viewModel.handleKeyDown(event)
}

function onSelectSquare(groupIndex: number, rowIndex: number, pointIndex: number): void {
  viewModel.selectSquareByIndices(groupIndex, rowIndex, pointIndex)
}

function scrollToSelectedSquare(selectedElement: Element): void {
  const scrollContainer = document.querySelector('.trace-scroll-container')
  if (!scrollContainer) return

  const containerRect = scrollContainer.getBoundingClientRect()
  const elementRect = selectedElement.getBoundingClientRect()

  // Calculate if the element is visible within the scroll container
  const isVisible = elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom

  if (!isVisible) {
    // Calculate the scroll position to center the element in the container
    const elementOffsetTop = selectedElement.getBoundingClientRect().top - containerRect.top + scrollContainer.scrollTop
    const containerHeight = containerRect.height
    const elementHeight = elementRect.height

    // Center the element vertically in the container
    const targetScrollTop = elementOffsetTop - containerHeight / 2 + elementHeight / 2

    // Smooth scroll to the target position
    scrollContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }
}

// Auto-show tooltip for selected square and scroll to reveal it
$: if ($selectedSquareData) {
  const selectedInfo = viewModel.getSelectedSquareInfo()
  if (selectedInfo) {
    // Find the selected square's DOM element and position tooltip to its right
    setTimeout(() => {
      const selectedElement = document.querySelector('.trace-point.selected')
      if (selectedElement) {
        const rect = selectedElement.getBoundingClientRect()
        // Position tooltip to the right of the square, with proper left-edge positioning when needed
        positionTooltip(rect.right, rect.top, rect.left)

        // Scroll to reveal the selected square
        scrollToSelectedSquare(selectedElement)
      } else {
        // Fallback to center if element not found
        tooltipX = window.innerWidth / 2 - 200
        tooltipY = window.innerHeight / 2 - 150
      }
    }, 0)

    tooltipViewModel = viewModel.createTooltipViewModel(
      selectedInfo.datasetKey,
      selectedInfo.varName,
      selectedInfo.diffPoint
    )
  }
}
</script>

<!-- TEMPLATE -->
<div class="trace-container" tabindex="0" on:keydown={onKeyDown}>
  <div class="trace-header-container">
    <div class="trace-header-content">
      <div class="trace-source-selector-label">Source 1:</div>
      <Selector viewModel={sourceSelector0} ariaLabel="Source 1" />
      {#if $selectedSource0 === 'dat'}
        <div class="trace-scenario-selector-label">File:</div>
        <input
          bind:files
          type="file"
          class="trace-dat-file-chooser"
          id="trace-dat-file"
          name="trace-dat-file"
          accept=".dat"
        />
      {:else}
        <div class="trace-scenario-selector-label">Scenario:</div>
        <Selector viewModel={$scenarioSelector0} ariaLabel="Scenario 1" />
      {/if}
      <div class="trace-source-selector-label">Source 2:</div>
      <Selector viewModel={sourceSelector1} ariaLabel="Source 2" />
      <div class="trace-scenario-selector-label">Scenario:</div>
      <Selector viewModel={$scenarioSelector1} ariaLabel="Scenario 2" />
    </div>
    <div class="trace-options">
      <label class="trace-checkbox-label">
        <input type="checkbox" bind:checked={$hideRowsWithNoDiffs} />
        Hide rows with no diffs
      </label>
    </div>
  </div>
  <div class="trace-scroll-container">
    {#if $statusMessage}
      <div>{$statusMessage}</div>
    {:else if $filteredGroups.length === 0}
      <div>No differences detected</div>
    {:else}
      {#each $filteredGroups as group, groupIndex}
        <div class="trace-group">
          <div class="trace-group-title">{group.title}</div>
          {#each group.rows as row, rowIndex}
            {@const selectedPointIndex =
              $selectedSquareData?.groupIndex === groupIndex && $selectedSquareData?.rowIndex === rowIndex
                ? $selectedSquareData.pointIndex
                : undefined}
            <Row
              viewModel={row}
              {selectedPointIndex}
              on:show-tooltip={onShowTooltip}
              on:hide-tooltip={onHideTooltip}
              on:select={e => onSelectSquare(groupIndex, rowIndex, e.detail.pointIndex)}
            />
          {/each}
        </div>
      {/each}
    {/if}

    {#if tooltipViewModel}
      <TraceTooltip viewModel={tooltipViewModel} x={tooltipX} y={tooltipY} />
    {/if}
  </div>
</div>

<!-- STYLE -->
<style lang="scss">
.trace-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.trace-container:focus-within {
  outline: none;
}

.trace-header-container {
  display: flex;
  // XXX: Use negative margin to make the shadow stretch all the way
  // across, then use extra padding to compensate
  margin: 0 -1rem;
  padding: 0 2rem 1rem 2rem;
  box-shadow: 0 1rem 0.5rem -0.5rem rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.trace-header-content {
  display: grid;
  grid-template-columns: auto auto auto auto;
  // XXX: Use a fixed height for the rows so that they don't bounce around when the file chooser is shown
  grid-template-rows: 24px 24px;
  align-items: center;
  gap: 0.5rem 0.5rem;
}

.trace-header-content :global(select) {
  max-width: 300px;
}

.trace-source-selector-label,
.trace-scenario-selector-label {
  text-align: right;
}

.trace-scenario-selector-label {
  margin-left: 0.7rem;
}

.trace-dat-file-chooser {
  width: auto;
  font-family: inherit;
  font-size: inherit;
  margin: 0;
}

.trace-options {
  margin-top: 6px;
  margin-left: 32px;
}

.trace-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
  font-size: inherit;
  cursor: pointer;

  input[type='checkbox'] {
    margin: 0;
  }
}

.trace-scroll-container {
  display: flex;
  // XXX: We use 1px here for flex-basis, otherwise in Firefox and Chrome the
  // whole page will scroll instead of just this container.  See also:
  //   https://stackoverflow.com/a/52489012
  flex: 1 1 1px;
  flex-direction: column;
  overflow: auto;
  padding: 2rem 1rem;
  align-items: flex-start;
  outline: none;
  background-color: #3c3c3c;
}

.trace-group {
  display: flex;
  flex-direction: column;
  &:not(:first-child) {
    margin-top: 20px;
  }
}

.trace-group-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}
</style>
